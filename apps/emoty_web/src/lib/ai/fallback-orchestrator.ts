/**
 * AI Fallback Orchestrator
 * Manages seamless switching between online AI services and offline local generation
 * Ensures continuous functionality with quality optimization and user transparency
 */

import type { PatternState, PatternResponse, LocalizedString } from '@/types/pattern';
import type { PatternGenerationRequest, PatternGenerationResult } from './local/pattern-engine';
import { smartCache, type CacheEntry } from './cache/smart-cache';
import { localPatternEngine } from './local/pattern-engine';
import { localNameGenerator } from './local/name-generator';

export interface AIServiceConfig {
  name: string;
  priority: number; // Higher = preferred
  isAvailable: () => Promise<boolean>;
  generatePattern: (request: PatternGenerationRequest) => Promise<PatternResponse>;
  healthCheck: () => Promise<HealthCheckResult>;
  costPerRequest?: number; // Optional cost tracking
  maxRequestsPerMinute?: number; // Rate limiting
}

export interface HealthCheckResult {
  isHealthy: boolean;
  responseTime: number;
  errorRate: number;
  lastError?: string;
  quality: number; // 0-1
}

export interface FallbackMetrics {
  totalRequests: number;
  apiSuccesses: number;
  localFallbacks: number;
  cacheHits: number;
  avgResponseTime: number;
  userSatisfactionScore: number;
  costSavings: number;
}

export interface GenerationContext {
  isOffline: boolean;
  userPreference: 'api-first' | 'local-first' | 'balanced';
  maxLatency: number; // milliseconds
  qualityThreshold: number; // 0-1
  allowStaleCache: boolean;
  batteryLevel?: number; // 0-1
  networkQuality: 'slow' | 'medium' | 'fast';
}

export interface FallbackResult<T> {
  data: T;
  source: 'api' | 'local' | 'cache';
  quality: number;
  responseTime: number;
  cost: number;
  rationale: LocalizedString;
  alternatives?: T[];
}

/**
 * Main orchestrator that manages AI service fallbacks
 */
export class AIFallbackOrchestrator {
  private services: Map<string, AIServiceConfig>;
  private healthStatus: Map<string, HealthCheckResult>;
  private metrics: FallbackMetrics;
  private requestQueue: Map<string, Promise<any>>;
  private rateLimits: Map<string, RateLimitTracker>;
  private isOnline: boolean;
  private healthCheckInterval: NodeJS.Timeout | null;

  constructor() {
    this.services = new Map();
    this.healthStatus = new Map();
    this.requestQueue = new Map();
    this.rateLimits = new Map();
    this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    this.healthCheckInterval = null;

    this.metrics = {
      totalRequests: 0,
      apiSuccesses: 0,
      localFallbacks: 0,
      cacheHits: 0,
      avgResponseTime: 0,
      userSatisfactionScore: 0.8,
      costSavings: 0
    };

    this.initializeServices();
    this.startHealthMonitoring();
    this.setupNetworkListeners();
  }

  /**
   * Primary method to generate patterns with intelligent fallback
   */
  async generatePattern(
    request: PatternGenerationRequest,
    context: Partial<GenerationContext> = {}
  ): Promise<FallbackResult<PatternState>> {
    const startTime = performance.now();
    const requestId = this.generateRequestId(request);

    // Check for duplicate requests
    if (this.requestQueue.has(requestId)) {
      const result = await this.requestQueue.get(requestId)!;
      return result;
    }

    const fullContext: GenerationContext = {
      isOffline: !this.isOnline,
      userPreference: 'balanced',
      maxLatency: 5000,
      qualityThreshold: 0.7,
      allowStaleCache: true,
      networkQuality: 'medium',
      ...context
    };

    // Create promise for this request
    const requestPromise = this.executeGenerationStrategy(request, fullContext, startTime);
    this.requestQueue.set(requestId, requestPromise);

    try {
      const result = await requestPromise;
      this.updateMetrics(result, fullContext);
      return result;
    } finally {
      this.requestQueue.delete(requestId);
    }
  }

  /**
   * Execute the optimal generation strategy based on context
   */
  private async executeGenerationStrategy(
    request: PatternGenerationRequest,
    context: GenerationContext,
    startTime: number
  ): Promise<FallbackResult<PatternState>> {
    const strategies = this.getGenerationStrategies(context);
    
    for (const strategy of strategies) {
      try {
        const result = await strategy.execute(request, context, startTime);
        if (this.isResultAcceptable(result, context)) {
          return result;
        }
      } catch (error) {
        console.warn(`Strategy '${strategy.name}' failed:`, error);
        continue; // Try next strategy
      }
    }

    // Final fallback - always should work
    return await this.executeFinalFallback(request, context, startTime);
  }

  /**
   * Get ordered list of generation strategies based on context
   */
  private getGenerationStrategies(context: GenerationContext): GenerationStrategy[] {
    const baseStrategies: GenerationStrategy[] = [
      {
        name: 'cache-first',
        priority: context.allowStaleCache ? 10 : 5,
        execute: (req, ctx, start) => this.tryCacheStrategy(req, ctx, start)
      },
      {
        name: 'api-primary',
        priority: context.userPreference === 'api-first' ? 9 : (context.isOffline ? 0 : 7),
        execute: (req, ctx, start) => this.tryAPIStrategy(req, ctx, start)
      },
      {
        name: 'local-primary',
        priority: context.userPreference === 'local-first' ? 9 : 6,
        execute: (req, ctx, start) => this.tryLocalStrategy(req, ctx, start)
      },
      {
        name: 'hybrid-quality',
        priority: context.userPreference === 'balanced' ? 8 : 4,
        execute: (req, ctx, start) => this.tryHybridStrategy(req, ctx, start)
      }
    ];

    // Filter and sort strategies
    return baseStrategies
      .filter(strategy => strategy.priority > 0)
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Try cache-first strategy
   */
  private async tryCacheStrategy(
    request: PatternGenerationRequest,
    context: GenerationContext,
    startTime: number
  ): Promise<FallbackResult<PatternState>> {
    const cacheKey = this.generateCacheKey(request);
    const cached = await smartCache.get<PatternGenerationResult>(cacheKey);

    if (cached) {
      this.metrics.cacheHits++;

      return {
        data: cached.pattern,
        source: 'cache',
        quality: cached.confidence,
        responseTime: performance.now() - startTime,
        cost: 0,
        rationale: {
          en: 'Pattern retrieved from intelligent cache for instant results',
          fr: 'Motif récupéré du cache intelligent pour des résultats instantanés'
        },
        alternatives: cached.alternatives
      };
    }

    throw new Error('No suitable cache entry found');
  }

  /**
   * Try API-based strategy
   */
  private async tryAPIStrategy(
    request: PatternGenerationRequest,
    context: GenerationContext,
    startTime: number
  ): Promise<FallbackResult<PatternState>> {
    if (context.isOffline) {
      throw new Error('Cannot use API while offline');
    }

    const availableServices = await this.getAvailableServices();
    if (availableServices.length === 0) {
      throw new Error('No API services available');
    }

    const service = availableServices[0]; // Highest priority
    
    // Check rate limiting
    if (!this.isRateLimitOk(service.name)) {
      throw new Error(`Rate limit exceeded for ${service.name}`);
    }

    try {
      const response = await Promise.race([
        service.generatePattern(request),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('API timeout')), context.maxLatency)
        )
      ]);

      // Convert PatternResponse to PatternState
      const primaryPattern = response.patterns[0];
      if (!primaryPattern) {
        throw new Error('No patterns in API response');
      }

      const pattern: PatternState = {
        sequence: primaryPattern.sequence,
        insertionIndex: 0,
        patternSize: Math.ceil(Math.sqrt(primaryPattern.sequence.length * 4)),
        patternMode: 'concentric' as any,
        activeInsertionMode: 'concentric' as any,
        name: primaryPattern.name,
        description: primaryPattern.rationale,
        tags: primaryPattern.tags,
        metadata: {
          aiGenerated: true,
          complexity: request.complexity || 'moderate',
          language: request.language || 'en',
          userLevel: request.userLevel || 1,
          sourcePrompt: request.conceptPrompt
        }
      };

      // Cache the successful result
      await smartCache.cacheAIResponse(request, response, primaryPattern.confidence);

      this.metrics.apiSuccesses++;
      
      return {
        data: pattern,
        source: 'api',
        quality: primaryPattern.confidence,
        responseTime: performance.now() - startTime,
        cost: service.costPerRequest || 0,
        rationale: {
          en: `Generated using ${service.name} with ${Math.round(primaryPattern.confidence * 100)}% confidence`,
          fr: `Généré avec ${service.name} avec ${Math.round(primaryPattern.confidence * 100)}% de confiance`
        },
        alternatives: response.patterns.slice(1).map(p => ({
          sequence: p.sequence,
          insertionIndex: 0,
          patternSize: Math.ceil(Math.sqrt(p.sequence.length * 4)),
          patternMode: 'concentric' as any,
          activeInsertionMode: 'concentric' as any,
          name: p.name,
          tags: p.tags,
          metadata: {
            aiGenerated: true,
            complexity: request.complexity || 'moderate',
            language: request.language || 'en',
            userLevel: request.userLevel || 1
          }
        }))
      };

    } catch (error) {
      this.recordServiceError(service.name, error);
      throw error;
    }
  }

  /**
   * Try local generation strategy
   */
  private async tryLocalStrategy(
    request: PatternGenerationRequest,
    context: GenerationContext,
    startTime: number
  ): Promise<FallbackResult<PatternState>> {
    try {
      const result = await localPatternEngine.generatePatterns(request);
      
      // Cache the result for future use
      const cacheKey = this.generateCacheKey(request);
      await smartCache.set(cacheKey, result, {
        source: 'local',
        quality: result.confidence,
        priority: 'medium',
        tags: ['local-generated']
      });

      this.metrics.localFallbacks++;

      return {
        data: result.pattern,
        source: 'local',
        quality: result.confidence,
        responseTime: performance.now() - startTime,
        cost: 0,
        rationale: result.rationale,
        alternatives: result.alternatives
      };

    } catch (error) {
      throw new Error(`Local generation failed: ${error}`);
    }
  }

  /**
   * Try hybrid strategy (combine API and local)
   */
  private async tryHybridStrategy(
    request: PatternGenerationRequest,
    context: GenerationContext,
    startTime: number
  ): Promise<FallbackResult<PatternState>> {
    // Start both API and local generation in parallel
    const apiPromise = this.tryAPIStrategy(request, context, startTime).catch(() => null);
    const localPromise = this.tryLocalStrategy(request, context, startTime).catch(() => null);

    // Wait for first successful result or both to complete
    const results = await Promise.allSettled([apiPromise, localPromise]);
    
    let apiResult: FallbackResult<PatternState> | null = null;
    let localResult: FallbackResult<PatternState> | null = null;

    if (results[0].status === 'fulfilled' && results[0].value) {
      apiResult = results[0].value;
    }
    
    if (results[1].status === 'fulfilled' && results[1].value) {
      localResult = results[1].value;
    }

    // Choose best result based on quality and context
    if (apiResult && localResult) {
      const useAPI = this.shouldPreferAPI(apiResult, localResult, context);
      return useAPI ? apiResult : localResult;
    }

    if (apiResult) return apiResult;
    if (localResult) return localResult;

    throw new Error('Both API and local strategies failed');
  }

  /**
   * Final fallback - guaranteed to work
   */
  private async executeFinalFallback(
    request: PatternGenerationRequest,
    context: GenerationContext,
    startTime: number
  ): Promise<FallbackResult<PatternState>> {
    try {
      // Use simplest local generation with fallback parameters
      const simplifiedRequest: PatternGenerationRequest = {
        ...request,
        complexity: 'simple',
        theme: request.theme || 'general'
      };

      const result = await localPatternEngine.generatePatterns(simplifiedRequest);

      return {
        data: result.pattern,
        source: 'local',
        quality: Math.max(0.6, result.confidence), // Minimum quality guarantee
        responseTime: performance.now() - startTime,
        cost: 0,
        rationale: {
          en: 'Generated using reliable local algorithm as final fallback',
          fr: 'Généré avec algorithme local fiable comme solution de secours finale'
        },
        alternatives: result.alternatives
      };

    } catch (error) {
      // This should never happen, but provide absolute fallback
      const sequence = ['✨', '🎨', '🌟']; // Safe default
      const fallbackPattern: PatternState = {
        sequence,
        insertionIndex: 0,
        patternSize: 4,
        patternMode: 'concentric' as any,
        activeInsertionMode: 'concentric' as any,
        name: 'Safe Pattern',
        description: 'Emergency fallback pattern',
        tags: ['fallback', 'safe'],
        metadata: {
          aiGenerated: false,
          complexity: 'simple',
          language: request.language || 'en',
          userLevel: 1
        }
      };

      return {
        data: fallbackPattern,
        source: 'local',
        quality: 0.6,
        responseTime: performance.now() - startTime,
        cost: 0,
        rationale: {
          en: 'Emergency safe pattern - please try again',
          fr: 'Motif de sécurité d\'urgence - veuillez réessayer'
        }
      };
    }
  }

  /**
   * Register an AI service
   */
  registerService(config: AIServiceConfig): void {
    this.services.set(config.name, config);
    this.rateLimits.set(config.name, new RateLimitTracker(config.maxRequestsPerMinute || 60));
  }

  /**
   * Get system health and metrics
   */
  getSystemHealth(): SystemHealthReport {
    const serviceHealth = Array.from(this.services.entries()).map(([name, service]) => ({
      name,
      health: this.healthStatus.get(name) || {
        isHealthy: false,
        responseTime: 0,
        errorRate: 1,
        quality: 0
      }
    }));

    return {
      isOnline: this.isOnline,
      services: serviceHealth,
      metrics: this.metrics,
      cacheStats: smartCache.getStats(),
      overallHealth: this.calculateOverallHealth(serviceHealth)
    };
  }

  /**
   * Force specific generation method (for testing/debugging)
   */
  async forceMethod(
    method: 'api' | 'local' | 'cache',
    request: PatternGenerationRequest
  ): Promise<FallbackResult<PatternState>> {
    const startTime = performance.now();
    const context: GenerationContext = {
      isOffline: method === 'cache' || method === 'local',
      userPreference: method === 'api' ? 'api-first' : 'local-first',
      maxLatency: 10000,
      qualityThreshold: 0.5,
      allowStaleCache: true,
      networkQuality: 'fast'
    };

    switch (method) {
      case 'api':
        return this.tryAPIStrategy(request, context, startTime);
      case 'local':
        return this.tryLocalStrategy(request, context, startTime);
      case 'cache':
        return this.tryCacheStrategy(request, context, startTime);
    }
  }

  // Private helper methods

  private initializeServices(): void {
    // This would be configured with actual API services
    // For now, we'll register a mock Anthropic service
    this.registerService({
      name: 'anthropic-claude',
      priority: 10,
      isAvailable: async () => this.isOnline,
      generatePattern: async (request) => {
        // This would integrate with actual Anthropic API
        throw new Error('API integration not implemented in fallback system');
      },
      healthCheck: async () => ({
        isHealthy: this.isOnline,
        responseTime: 1200,
        errorRate: 0.05,
        quality: 0.92
      }),
      costPerRequest: 0.001,
      maxRequestsPerMinute: 20
    });
  }

  private async getAvailableServices(): Promise<AIServiceConfig[]> {
    const available: AIServiceConfig[] = [];
    
    for (const [name, service] of this.services) {
      try {
        if (await service.isAvailable()) {
          available.push(service);
        }
      } catch (error) {
        console.warn(`Service ${name} availability check failed:`, error);
      }
    }

    return available.sort((a, b) => b.priority - a.priority);
  }

  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      for (const [name, service] of this.services) {
        try {
          const health = await service.healthCheck();
          this.healthStatus.set(name, health);
        } catch (error) {
          this.healthStatus.set(name, {
            isHealthy: false,
            responseTime: 10000,
            errorRate: 1,
            quality: 0,
            lastError: String(error)
          });
        }
      }
    }, 60000); // Check every minute
  }

  private setupNetworkListeners(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
      });
      
      window.addEventListener('offline', () => {
        this.isOnline = false;
      });
    }
  }

  private generateRequestId(request: PatternGenerationRequest): string {
    return `req_${Date.now()}_${JSON.stringify(request).slice(0, 100)}`;
  }

  private generateCacheKey(request: PatternGenerationRequest): string {
    return `pattern_${JSON.stringify(request)}`.slice(0, 200);
  }

  private isResultAcceptable(result: FallbackResult<any>, context: GenerationContext): boolean {
    if (result.quality < context.qualityThreshold) return false;
    if (result.responseTime > context.maxLatency) return false;
    return true;
  }

  private shouldPreferAPI(
    apiResult: FallbackResult<PatternState>,
    localResult: FallbackResult<PatternState>,
    context: GenerationContext
  ): boolean {
    // Quality difference threshold
    const qualityDiff = apiResult.quality - localResult.quality;
    
    // Strong preference for local if API isn't significantly better
    if (context.userPreference === 'local-first' && qualityDiff < 0.2) {
      return false;
    }
    
    // Consider cost and speed
    if (apiResult.cost > 0 && localResult.responseTime < apiResult.responseTime * 0.5) {
      return qualityDiff > 0.3; // API must be significantly better to justify cost/speed
    }
    
    return qualityDiff > 0.1; // Default: prefer API if meaningfully better
  }

  private isRateLimitOk(serviceName: string): boolean {
    const tracker = this.rateLimits.get(serviceName);
    return tracker ? tracker.canMakeRequest() : true;
  }

  private recordServiceError(serviceName: string, error: any): void {
    const health = this.healthStatus.get(serviceName);
    if (health) {
      health.errorRate = Math.min(1, health.errorRate + 0.1);
      health.isHealthy = health.errorRate < 0.5;
      health.lastError = String(error);
    }
  }

  private updateMetrics(result: FallbackResult<PatternState>, context: GenerationContext): void {
    this.metrics.totalRequests++;
    
    if (result.source === 'api') {
      this.metrics.apiSuccesses++;
    } else if (result.source === 'local') {
      this.metrics.localFallbacks++;
    } else if (result.source === 'cache') {
      this.metrics.cacheHits++;
    }

    // Update average response time
    const totalTime = this.metrics.avgResponseTime * (this.metrics.totalRequests - 1);
    this.metrics.avgResponseTime = (totalTime + result.responseTime) / this.metrics.totalRequests;

    // Estimate cost savings from local/cache usage
    if (result.source !== 'api' && result.cost === 0) {
      this.metrics.costSavings += 0.001; // Estimated API cost per request
    }
  }

  private calculateOverallHealth(serviceHealth: Array<{name: string, health: HealthCheckResult}>): number {
    if (serviceHealth.length === 0) return 0.5; // Only local available
    
    const avgHealth = serviceHealth.reduce((sum, s) => 
      sum + (s.health.isHealthy ? s.health.quality : 0), 0
    ) / serviceHealth.length;
    
    // Factor in local fallback capability
    return Math.max(0.6, avgHealth); // Always at least 60% healthy due to local fallback
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    this.services.clear();
    this.healthStatus.clear();
    this.requestQueue.clear();
    this.rateLimits.clear();
  }
}

// Supporting classes and interfaces

class RateLimitTracker {
  private requests: number[] = [];
  private maxRequests: number;

  constructor(maxRequestsPerMinute: number) {
    this.maxRequests = maxRequestsPerMinute;
  }

  canMakeRequest(): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Remove old requests
    this.requests = this.requests.filter(time => time > oneMinuteAgo);
    
    if (this.requests.length >= this.maxRequests) {
      return false;
    }
    
    this.requests.push(now);
    return true;
  }
}

interface GenerationStrategy {
  name: string;
  priority: number;
  execute: (
    request: PatternGenerationRequest,
    context: GenerationContext,
    startTime: number
  ) => Promise<FallbackResult<PatternState>>;
}

export interface SystemHealthReport {
  isOnline: boolean;
  services: Array<{
    name: string;
    health: HealthCheckResult;
  }>;
  metrics: FallbackMetrics;
  cacheStats: any;
  overallHealth: number; // 0-1
}

// Export singleton instance
export const aiFallbackOrchestrator = new AIFallbackOrchestrator();