import { ClaudeService } from './claude-service';
import { LocalAIService, localAIService } from './local-ai-service';
import type { UserLevel, PatternSequence } from '@/db/types';
import { db } from '@/db/connection';

interface AIServiceConfig {
  enableClaude: boolean;
  enableLocal: boolean;
  fallbackToLocal: boolean;
  rateLimits: {
    beginner: { requestsPerHour: number; tokensPerHour: number };
    intermediate: { requestsPerHour: number; tokensPerHour: number };
    advanced: { requestsPerHour: number; tokensPerHour: number };
    expert: { requestsPerHour: number; tokensPerHour: number };
  };
  costLimits: {
    dailyBudgetUSD: number;
    monthlyBudgetUSD: number;
    userDailyLimitUSD: number;
  };
}

interface UsageRecord {
  userId: string;
  service: 'claude' | 'local';
  requestType: 'pattern_generation' | 'pattern_naming' | 'chat';
  tokensUsed: number;
  costUSD: number;
  timestamp: Date;
  success: boolean;
  cached: boolean;
}

interface RateLimitState {
  userId: string;
  requests: { timestamp: number; tokens: number }[];
  dailyCostUSD: number;
  lastReset: Date;
}

interface AIRequest {
  userId: string;
  userLevel: UserLevel;
  requestType: 'pattern_generation' | 'pattern_naming' | 'chat';
  data: any;
  language: 'en' | 'fr';
}

interface AIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  service: 'claude' | 'local';
  cached: boolean;
  tokensUsed: number;
  costUSD: number;
  rateLimitRemaining: number;
  fallbackUsed: boolean;
}

/**
 * AI Service Manager - Orchestrates AI services with rate limiting, cost control, and fallbacks
 */
export class AIServiceManager {
  private claudeService: ClaudeService;
  private localService: LocalAIService | null = null;
  private config: AIServiceConfig;
  private rateLimitStates = new Map<string, RateLimitState>();
  private dailyUsage = { cost: 0, requests: 0, lastReset: new Date() };

  // Token cost estimation (approximate for Claude 3 Haiku)
  private readonly TOKEN_COSTS = {
    input: 0.00025 / 1000, // $0.25 per 1M tokens
    output: 0.00125 / 1000, // $1.25 per 1M tokens
  };

  constructor(config: Partial<AIServiceConfig> = {}) {
    this.config = {
      enableClaude: config.enableClaude ?? true,
      enableLocal: config.enableLocal ?? true,
      fallbackToLocal: config.fallbackToLocal ?? true,
      rateLimits: {
        beginner: { requestsPerHour: 0, tokensPerHour: 0 }, // No AI access
        intermediate: { requestsPerHour: 10, tokensPerHour: 5000 },
        advanced: { requestsPerHour: 25, tokensPerHour: 15000 },
        expert: { requestsPerHour: 50, tokensPerHour: 30000 },
        ...config.rateLimits,
      },
      costLimits: {
        dailyBudgetUSD: 50.0,
        monthlyBudgetUSD: 1000.0,
        userDailyLimitUSD: 1.0,
        ...config.costLimits,
      },
    };

    this.claudeService = new ClaudeService();
    this.localService = localAIService;
    this.initializeRateLimitCleanup();
  }

  /**
   * Set local AI service (injected for testing/flexibility)
   */
  setLocalService(service: LocalAIService): void {
    this.localService = service;
  }

  /**
   * Generate pattern with AI assistance
   */
  async generatePattern(request: AIRequest): Promise<AIResponse<PatternSequence>> {
    try {
      // Check rate limits and permissions
      const rateLimitCheck = await this.checkRateLimit(request);
      if (!rateLimitCheck.allowed) {
        return {
          success: false,
          error: rateLimitCheck.reason,
          service: 'local',
          cached: false,
          tokensUsed: 0,
          costUSD: 0,
          rateLimitRemaining: rateLimitCheck.remaining,
          fallbackUsed: false,
        };
      }

      // Try Claude first if enabled and user has access
      if (this.config.enableClaude && this.canUseClaude(request.userLevel)) {
        try {
          const claudeResponse = await this.claudeService.generatePattern({
            prompt: request.data.prompt,
            language: request.language,
            difficulty: request.data.difficulty,
            size: request.data.size,
            style: request.data.style,
            availablePalettes: request.data.availablePalettes,
          });

          if (claudeResponse.success) {
            const costUSD = this.calculateCost(claudeResponse.tokensUsed || 0);
            await this.recordUsage({
              userId: request.userId,
              service: 'claude',
              requestType: 'pattern_generation',
              tokensUsed: claudeResponse.tokensUsed || 0,
              costUSD,
              timestamp: new Date(),
              success: true,
              cached: claudeResponse.cached || false,
            });

            this.updateRateLimit(request.userId, claudeResponse.tokensUsed || 0, costUSD);

            return {
              success: true,
              data: claudeResponse.pattern,
              service: 'claude',
              cached: claudeResponse.cached || false,
              tokensUsed: claudeResponse.tokensUsed || 0,
              costUSD,
              rateLimitRemaining: rateLimitCheck.remaining - 1,
              fallbackUsed: false,
            };
          }
        } catch (error) {
          console.warn('Claude service failed, attempting fallback:', error instanceof Error ? error.message : String(error));
        }
      }

      // Fallback to local service
      if (this.config.enableLocal && this.localService) {
        const localResponse = await this.localService.generatePattern({
          prompt: request.data.prompt,
          language: request.language,
          difficulty: request.data.difficulty,
          size: request.data.size,
          style: request.data.style,
          availablePalettes: request.data.availablePalettes,
        });

        if (localResponse.success) {
          await this.recordUsage({
            userId: request.userId,
            service: 'local',
            requestType: 'pattern_generation',
            tokensUsed: 0,
            costUSD: 0,
            timestamp: new Date(),
            success: true,
            cached: false,
          });

          return {
            success: true,
            data: localResponse.pattern,
            service: 'local',
            cached: false,
            tokensUsed: 0,
            costUSD: 0,
            rateLimitRemaining: rateLimitCheck.remaining - 1,
            fallbackUsed: this.config.enableClaude,
          };
        }
      }

      return {
        success: false,
        error: 'All AI services are currently unavailable',
        service: 'local',
        cached: false,
        tokensUsed: 0,
        costUSD: 0,
        rateLimitRemaining: rateLimitCheck.remaining,
        fallbackUsed: false,
      };

    } catch (error) {
      console.error('AI Service Manager error:', error);
      return {
        success: false,
        error: 'Internal AI service error',
        service: 'local',
        cached: false,
        tokensUsed: 0,
        costUSD: 0,
        rateLimitRemaining: 0,
        fallbackUsed: false,
      };
    }
  }

  /**
   * Generate pattern names with AI assistance
   */
  async generatePatternNames(request: AIRequest): Promise<AIResponse<string[]>> {
    try {
      const rateLimitCheck = await this.checkRateLimit(request);
      if (!rateLimitCheck.allowed) {
        return {
          success: false,
          error: rateLimitCheck.reason,
          service: 'local',
          cached: false,
          tokensUsed: 0,
          costUSD: 0,
          rateLimitRemaining: rateLimitCheck.remaining,
          fallbackUsed: false,
        };
      }

      // Try Claude first
      if (this.config.enableClaude && this.canUseClaude(request.userLevel)) {
        try {
          const claudeResponse = await this.claudeService.generatePatternNames({
            pattern: request.data.pattern,
            language: request.language,
            style: request.data.style,
          });

          if (claudeResponse.success) {
            const costUSD = this.calculateCost(claudeResponse.tokensUsed || 0);
            await this.recordUsage({
              userId: request.userId,
              service: 'claude',
              requestType: 'pattern_naming',
              tokensUsed: claudeResponse.tokensUsed || 0,
              costUSD,
              timestamp: new Date(),
              success: true,
              cached: claudeResponse.cached || false,
            });

            this.updateRateLimit(request.userId, claudeResponse.tokensUsed || 0, costUSD);

            return {
              success: true,
              data: claudeResponse.names,
              service: 'claude',
              cached: claudeResponse.cached || false,
              tokensUsed: claudeResponse.tokensUsed || 0,
              costUSD,
              rateLimitRemaining: rateLimitCheck.remaining - 1,
              fallbackUsed: false,
            };
          }
        } catch (error) {
          console.warn('Claude naming service failed, attempting fallback:', error instanceof Error ? error.message : String(error));
        }
      }

      // Fallback to local service
      if (this.config.enableLocal && this.localService) {
        const localResponse = await this.localService.generatePatternNames({
          pattern: request.data.pattern,
          language: request.language,
          style: request.data.style,
        });

        if (localResponse.success) {
          await this.recordUsage({
            userId: request.userId,
            service: 'local',
            requestType: 'pattern_naming',
            tokensUsed: 0,
            costUSD: 0,
            timestamp: new Date(),
            success: true,
            cached: false,
          });

          return {
            success: true,
            data: localResponse.names,
            service: 'local',
            cached: false,
            tokensUsed: 0,
            costUSD: 0,
            rateLimitRemaining: rateLimitCheck.remaining - 1,
            fallbackUsed: this.config.enableClaude,
          };
        }
      }

      return {
        success: false,
        error: 'Unable to generate pattern names',
        service: 'local',
        cached: false,
        tokensUsed: 0,
        costUSD: 0,
        rateLimitRemaining: rateLimitCheck.remaining,
        fallbackUsed: false,
      };

    } catch (error) {
      console.error('Pattern naming error:', error);
      return {
        success: false,
        error: 'Internal service error',
        service: 'local',
        cached: false,
        tokensUsed: 0,
        costUSD: 0,
        rateLimitRemaining: 0,
        fallbackUsed: false,
      };
    }
  }

  /**
   * Check if user can use Claude service based on level
   */
  private canUseClaude(userLevel: UserLevel): boolean {
    return userLevel !== 'beginner'; // Only intermediate+ can use AI
  }

  /**
   * Check rate limits for user
   */
  private async checkRateLimit(request: AIRequest): Promise<{
    allowed: boolean;
    remaining: number;
    reason?: string;
  }> {
    // Beginners can't use AI features at all
    if (request.userLevel === 'beginner') {
      return {
        allowed: false,
        remaining: 0,
        reason: 'AI features require Intermediate level or higher',
      };
    }

    const limits = this.config.rateLimits[request.userLevel];
    const userId = request.userId;
    const now = Date.now();
    const hourAgo = now - (60 * 60 * 1000);

    // Get or create rate limit state
    let state = this.rateLimitStates.get(userId);
    if (!state) {
      state = {
        userId,
        requests: [],
        dailyCostUSD: 0,
        lastReset: new Date(),
      };
      this.rateLimitStates.set(userId, state);
    }

    // Reset daily costs at midnight
    const today = new Date().toDateString();
    if (state.lastReset.toDateString() !== today) {
      state.dailyCostUSD = 0;
      state.lastReset = new Date();
    }

    // Remove old requests (older than 1 hour)
    state.requests = state.requests.filter(req => req.timestamp > hourAgo);

    // Check request limit
    if (state.requests.length >= limits.requestsPerHour) {
      return {
        allowed: false,
        remaining: 0,
        reason: 'Hourly request limit exceeded',
      };
    }

    // Check token limit
    const tokensUsedThisHour = state.requests.reduce((sum, req) => sum + req.tokens, 0);
    if (tokensUsedThisHour >= limits.tokensPerHour) {
      return {
        allowed: false,
        remaining: 0,
        reason: 'Hourly token limit exceeded',
      };
    }

    // Check daily cost limit
    if (state.dailyCostUSD >= this.config.costLimits.userDailyLimitUSD) {
      return {
        allowed: false,
        remaining: 0,
        reason: 'Daily cost limit exceeded',
      };
    }

    // Check global daily budget
    if (this.dailyUsage.cost >= this.config.costLimits.dailyBudgetUSD) {
      return {
        allowed: false,
        remaining: 0,
        reason: 'Global daily budget exceeded',
      };
    }

    return {
      allowed: true,
      remaining: limits.requestsPerHour - state.requests.length,
    };
  }

  /**
   * Update rate limit state after request
   */
  private updateRateLimit(userId: string, tokensUsed: number, costUSD: number): void {
    const state = this.rateLimitStates.get(userId);
    if (state) {
      state.requests.push({ timestamp: Date.now(), tokens: tokensUsed });
      state.dailyCostUSD += costUSD;
    }

    // Update global usage
    const today = new Date().toDateString();
    if (this.dailyUsage.lastReset.toDateString() !== today) {
      this.dailyUsage.cost = 0;
      this.dailyUsage.requests = 0;
      this.dailyUsage.lastReset = new Date();
    }
    this.dailyUsage.cost += costUSD;
    this.dailyUsage.requests += 1;
  }

  /**
   * Calculate cost from tokens used
   */
  private calculateCost(tokensUsed: number): number {
    // Simplified cost calculation - assumes 70% input, 30% output tokens
    const inputTokens = Math.floor(tokensUsed * 0.7);
    const outputTokens = tokensUsed - inputTokens;
    
    return (inputTokens * this.TOKEN_COSTS.input) + (outputTokens * this.TOKEN_COSTS.output);
  }

  /**
   * Record usage statistics
   */
  private async recordUsage(record: UsageRecord): Promise<void> {
    try {
      // In a real implementation, you'd store this in the database
      // For now, we'll just log it
      console.log('AI Usage:', record);
      
      // TODO: Store in database table for analytics
      // await db
      //   .insertInto('ai_usage_logs')
      //   .values(record)
      //   .execute();
    } catch (error) {
      console.error('Failed to record usage:', error);
    }
  }

  /**
   * Get usage statistics for user
   */
  async getUserUsageStats(userId: string): Promise<{
    requestsToday: number;
    tokensToday: number;
    costToday: number;
    requestsThisHour: number;
    tokensThisHour: number;
    rateLimits: { requests: number; tokens: number };
  }> {
    const state = this.rateLimitStates.get(userId) || {
      userId,
      requests: [],
      dailyCostUSD: 0,
      lastReset: new Date(),
    };

    const hourAgo = Date.now() - (60 * 60 * 1000);
    const recentRequests = state.requests.filter(req => req.timestamp > hourAgo);

    // This would normally come from database queries
    return {
      requestsToday: state.requests.length, // Simplified
      tokensToday: state.requests.reduce((sum, req) => sum + req.tokens, 0),
      costToday: state.dailyCostUSD,
      requestsThisHour: recentRequests.length,
      tokensThisHour: recentRequests.reduce((sum, req) => sum + req.tokens, 0),
      rateLimits: {
        requests: this.config.rateLimits.intermediate.requestsPerHour, // Default
        tokens: this.config.rateLimits.intermediate.tokensPerHour,
      },
    };
  }

  /**
   * Initialize cleanup of old rate limit states
   */
  private initializeRateLimitCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      const dayAgo = now - (24 * 60 * 60 * 1000);

      for (const [userId, state] of this.rateLimitStates.entries()) {
        // Remove states that haven't been used in 24 hours
        if (state.requests.length === 0 || 
            Math.max(...state.requests.map(r => r.timestamp)) < dayAgo) {
          this.rateLimitStates.delete(userId);
        }
      }
    }, 60 * 60 * 1000); // Clean every hour
  }

  /**
   * Health check for AI services
   */
  async healthCheck(): Promise<{
    claude: { available: boolean; latencyMs?: number };
    local: { available: boolean; latencyMs?: number };
    rateLimits: { activeUsers: number; globalBudgetUsed: number };
  }> {
    const results = {
      claude: { available: false, latencyMs: undefined as number | undefined },
      local: { available: false, latencyMs: undefined as number | undefined },
      rateLimits: { 
        activeUsers: this.rateLimitStates.size,
        globalBudgetUsed: this.dailyUsage.cost,
      },
    };

    // Check Claude service
    if (this.config.enableClaude) {
      try {
        const start = Date.now();
        // Simple health check - this could be improved
        results.claude.available = true;
        results.claude.latencyMs = Date.now() - start;
      } catch (error) {
        results.claude.available = false;
      }
    }

    // Check local service
    if (this.config.enableLocal && this.localService) {
      try {
        const start = Date.now();
        results.local.available = true;
        results.local.latencyMs = Date.now() - start;
      } catch (error) {
        results.local.available = false;
      }
    }

    return results;
  }
}

// Export singleton instance
export const aiServiceManager = new AIServiceManager();