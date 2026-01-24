# Emoty Web App - Performance Optimization Guide

## Overview

This guide provides comprehensive strategies for optimizing the performance of the Emoty web application, ensuring smooth 60fps emoji pattern rendering, fast AI responses, and excellent user experience across all devices.

## Performance Metrics and Targets

### Core Web Vitals

```typescript
// Performance monitoring targets
const PERFORMANCE_TARGETS = {
  // Core Web Vitals
  LCP: 2.5, // Largest Contentful Paint (seconds)
  FID: 100, // First Input Delay (milliseconds)
  CLS: 0.1, // Cumulative Layout Shift
  
  // Additional metrics
  FCP: 1.8, // First Contentful Paint (seconds)
  TTI: 3.5, // Time to Interactive (seconds)
  TBT: 200, // Total Blocking Time (milliseconds)
  
  // App-specific metrics
  PATTERN_RENDER_TIME: 100, // Pattern rendering (milliseconds)
  AI_RESPONSE_TIME: 3000, // AI generation (milliseconds)
  VOICE_LATENCY: 200, // Voice command processing (milliseconds)
  CANVAS_FPS: 60, // Canvas animation frame rate
};

// Performance monitoring service
class PerformanceMonitor {
  private observer: PerformanceObserver;
  private metrics: Map<string, number[]> = new Map();

  constructor() {
    this.setupObserver();
    this.monitorCustomMetrics();
  }

  private setupObserver() {
    this.observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.recordMetric(entry.name, entry.duration || entry.value);
      }
    });

    this.observer.observe({ 
      entryTypes: ['measure', 'navigation', 'paint', 'largest-contentful-paint'] 
    });
  }

  recordMetric(name: string, value: number) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(value);
    
    // Alert if threshold exceeded
    if (this.exceedsThreshold(name, value)) {
      console.warn(`Performance threshold exceeded: ${name} = ${value}ms`);
    }
  }

  private exceedsThreshold(name: string, value: number): boolean {
    const thresholds = {
      'pattern-render': PERFORMANCE_TARGETS.PATTERN_RENDER_TIME,
      'ai-response': PERFORMANCE_TARGETS.AI_RESPONSE_TIME,
      'voice-processing': PERFORMANCE_TARGETS.VOICE_LATENCY,
    };
    
    return value > (thresholds[name] || Infinity);
  }

  getMetrics() {
    return Object.fromEntries(this.metrics);
  }
}
```

## Canvas Rendering Optimization

### 1. High-Performance Pattern Renderer

```typescript
// Optimized pattern rendering with worker threads and caching
class OptimizedPatternRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private offscreenCanvas: OffscreenCanvas;
  private worker: Worker;
  private emojiCache: Map<string, ImageBitmap> = new Map();
  private renderQueue: RenderTask[] = [];
  private isRendering = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', {
      alpha: false, // Opaque canvas for better performance
      desynchronized: true // Allow faster rendering
    })!;
    
    this.setupOffscreenCanvas();
    this.initializeWorker();
    this.preloadCommonEmojis();
  }

  private setupOffscreenCanvas() {
    // Use OffscreenCanvas for background processing
    this.offscreenCanvas = new OffscreenCanvas(
      this.canvas.width,
      this.canvas.height
    );
  }

  private initializeWorker() {
    // Web Worker for heavy pattern calculations
    this.worker = new Worker('/workers/pattern-worker.js');
    this.worker.onmessage = (event) => {
      const { taskId, result } = event.data;
      this.handleWorkerResult(taskId, result);
    };
  }

  private async preloadCommonEmojis() {
    // Preload most commonly used emojis
    const commonEmojis = ['❤️', '😍', '🌸', '⭐', '🎉', '🌈', '💖', '🦋'];
    
    await Promise.all(
      commonEmojis.map(emoji => this.cacheEmoji(emoji))
    );
  }

  private async cacheEmoji(emoji: string): Promise<ImageBitmap> {
    if (this.emojiCache.has(emoji)) {
      return this.emojiCache.get(emoji)!;
    }

    // Create high-quality emoji bitmap
    const tempCanvas = new OffscreenCanvas(64, 64);
    const tempCtx = tempCanvas.getContext('2d')!;
    
    tempCtx.font = '48px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji"';
    tempCtx.textAlign = 'center';
    tempCtx.textBaseline = 'middle';
    tempCtx.fillText(emoji, 32, 32);
    
    const bitmap = await createImageBitmap(tempCanvas);
    this.emojiCache.set(emoji, bitmap);
    
    return bitmap;
  }

  async renderPattern(pattern: GridCell[][], options: RenderOptions = {}) {
    const taskId = `render-${Date.now()}`;
    
    // Add to render queue for batching
    this.renderQueue.push({
      id: taskId,
      pattern,
      options,
      timestamp: performance.now()
    });

    if (!this.isRendering) {
      this.processRenderQueue();
    }
  }

  private async processRenderQueue() {
    this.isRendering = true;
    
    while (this.renderQueue.length > 0) {
      const task = this.renderQueue.shift()!;
      
      performance.mark(`render-start-${task.id}`);
      
      // Use requestAnimationFrame for smooth rendering
      await new Promise(resolve => {
        requestAnimationFrame(async () => {
          await this.renderSinglePattern(task);
          resolve(void 0);
        });
      });
      
      performance.mark(`render-end-${task.id}`);
      performance.measure(
        'pattern-render',
        `render-start-${task.id}`,
        `render-end-${task.id}`
      );
    }
    
    this.isRendering = false;
  }

  private async renderSinglePattern(task: RenderTask) {
    const { pattern, options } = task;
    
    // Clear canvas efficiently
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Calculate optimal cell size
    const cellSize = this.calculateOptimalCellSize(pattern.length);
    const startX = (this.canvas.width - (pattern[0].length * cellSize)) / 2;
    const startY = (this.canvas.height - (pattern.length * cellSize)) / 2;
    
    // Batch render operations
    const renderPromises: Promise<void>[] = [];
    
    for (let row = 0; row < pattern.length; row++) {
      for (let col = 0; col < pattern[row].length; col++) {
        const cell = pattern[row][col];
        if (cell.emoji) {
          const x = startX + (col * cellSize);
          const y = startY + (row * cellSize);
          
          renderPromises.push(
            this.renderEmojiCell(cell.emoji, x, y, cellSize, options)
          );
        }
      }
    }
    
    // Wait for all cells to render
    await Promise.all(renderPromises);
  }

  private async renderEmojiCell(
    emoji: string, 
    x: number, 
    y: number, 
    size: number, 
    options: RenderOptions
  ) {
    // Get cached bitmap
    let bitmap = this.emojiCache.get(emoji);
    if (!bitmap) {
      bitmap = await this.cacheEmoji(emoji);
    }
    
    // Apply animation transforms if needed
    if (options.animationProgress !== undefined) {
      this.ctx.save();
      
      const centerX = x + size / 2;
      const centerY = y + size / 2;
      const scale = options.animationProgress;
      
      this.ctx.translate(centerX, centerY);
      this.ctx.scale(scale, scale);
      this.ctx.translate(-centerX, -centerY);
    }
    
    // Render with antialiasing for crisp emojis
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
    
    this.ctx.drawImage(bitmap, x, y, size, size);
    
    if (options.animationProgress !== undefined) {
      this.ctx.restore();
    }
  }

  private calculateOptimalCellSize(patternSize: number): number {
    const maxSize = Math.min(this.canvas.width, this.canvas.height) * 0.9;
    return Math.floor(maxSize / patternSize);
  }

  dispose() {
    this.worker.terminate();
    this.emojiCache.clear();
    this.renderQueue.length = 0;
  }
}
```

### 2. Web Worker for Pattern Calculations

```javascript
// public/workers/pattern-worker.js
class PatternWorker {
  constructor() {
    self.onmessage = (event) => {
      const { taskId, type, data } = event.data;
      
      switch (type) {
        case 'GENERATE_PATTERN':
          this.generatePattern(taskId, data);
          break;
        case 'VALIDATE_PATTERN':
          this.validatePattern(taskId, data);
          break;
        case 'CALCULATE_METRICS':
          this.calculateMetrics(taskId, data);
          break;
      }
    };
  }

  generatePattern(taskId, { sequence, mode }) {
    const startTime = performance.now();
    
    let pattern;
    switch (mode) {
      case 'concentric':
        pattern = this.generateConcentricPattern(sequence);
        break;
      case 'sequential':
        pattern = this.generateSequentialPattern(sequence);
        break;
      default:
        pattern = this.generateConcentricPattern(sequence);
    }
    
    const duration = performance.now() - startTime;
    
    self.postMessage({
      taskId,
      result: { pattern, duration },
      type: 'PATTERN_GENERATED'
    });
  }

  generateConcentricPattern(sequence) {
    if (sequence.length === 0) return [];
    
    const size = (sequence.length * 2) - 1;
    const pattern = Array(size).fill(null).map(() => 
      Array(size).fill(null).map(() => ({ emoji: '', row: 0, col: 0, layer: 0, isCenter: false }))
    );
    
    const center = Math.floor(size / 2);
    
    // Fill from outside to inside
    for (let layer = 0; layer < sequence.length; layer++) {
      const emoji = sequence[layer];
      const distance = sequence.length - 1 - layer;
      
      // Fill the square layer
      for (let i = center - distance; i <= center + distance; i++) {
        for (let j = center - distance; j <= center + distance; j++) {
          // Only fill the perimeter of this layer
          if (i === center - distance || i === center + distance || 
              j === center - distance || j === center + distance) {
            pattern[i][j] = {
              emoji,
              row: i,
              col: j,
              layer,
              isCenter: i === center && j === center
            };
          }
        }
      }
    }
    
    return pattern;
  }

  validatePattern(taskId, { pattern }) {
    const startTime = performance.now();
    
    const validation = {
      isValid: true,
      errors: [],
      warnings: [],
      metrics: {
        size: pattern.length,
        cellCount: pattern.length * pattern[0]?.length || 0,
        uniqueEmojis: new Set(
          pattern.flat().map(cell => cell.emoji).filter(Boolean)
        ).size
      }
    };
    
    // Validate structure
    if (pattern.length === 0) {
      validation.isValid = false;
      validation.errors.push('Pattern cannot be empty');
    }
    
    // Check for maximum size
    if (pattern.length > 19) { // Max 10 emojis = 19x19 grid
      validation.isValid = false;
      validation.errors.push('Pattern too large (maximum 19x19)');
    }
    
    const duration = performance.now() - startTime;
    
    self.postMessage({
      taskId,
      result: { validation, duration },
      type: 'PATTERN_VALIDATED'
    });
  }

  calculateMetrics(taskId, { patterns }) {
    const startTime = performance.now();
    
    const metrics = {
      totalPatterns: patterns.length,
      avgSize: patterns.reduce((sum, p) => sum + p.length, 0) / patterns.length,
      complexityDistribution: {},
      performanceScore: 0
    };
    
    // Calculate complexity distribution
    patterns.forEach(pattern => {
      const complexity = this.getPatternComplexity(pattern);
      metrics.complexityDistribution[complexity] = 
        (metrics.complexityDistribution[complexity] || 0) + 1;
    });
    
    const duration = performance.now() - startTime;
    
    self.postMessage({
      taskId,
      result: { metrics, duration },
      type: 'METRICS_CALCULATED'
    });
  }

  getPatternComplexity(pattern) {
    const size = pattern.length;
    if (size <= 3) return 'simple';
    if (size <= 7) return 'medium';
    return 'complex';
  }
}

new PatternWorker();
```

## Bundle Optimization

### 1. Next.js Configuration for Performance

```javascript
// next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Turbopack for faster builds
  experimental: {
    turbopack: true,
    optimizeCss: true,
    optimizeServerReact: true,
  },

  // Compression
  compress: true,
  poweredByHeader: false,

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },

  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    // Production optimizations
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            // Vendor libraries
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
            },
            // AI-related code
            ai: {
              test: /[\\/](ai|anthropic|openai)[\\/]/,
              name: 'ai',
              chunks: 'all',
            },
            // Canvas and rendering
            canvas: {
              test: /[\\/](canvas|render|pattern)[\\/]/,
              name: 'canvas',
              chunks: 'all',
            },
          },
        },
      };

      // Tree shaking
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;

      // Minification
      config.optimization.minimize = true;
    }

    // Bundle analysis
    if (process.env.ANALYZE === 'true') {
      config.plugins.push(
        new (require('webpack-bundle-analyzer').BundleAnalyzerPlugin)({
          analyzerMode: 'static',
          openAnalyzer: false,
        })
      );
    }

    return config;
  },

  // Headers for caching
  async headers() {
    return [
      {
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
        ],
      },
    ];
  },

  // Redirects for performance
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ];
  },
};

module.exports = withBundleAnalyzer(nextConfig);
```

### 2. Code Splitting Strategies

```typescript
// Dynamic imports for large components
import { lazy, Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

// Lazy load heavy components
const AIPatternGenerator = lazy(() => 
  import('../components/AIPatternGenerator').then(module => ({
    default: module.AIPatternGenerator
  }))
);

const VoiceController = lazy(() => 
  import('../components/VoiceController')
);

const PatternExporter = lazy(() => 
  import('../components/PatternExporter')
);

// Loading components
const LoadingSpinner = () => (
  <div className="d-flex justify-content-center p-4">
    <div className="spinner-border" role="status">
      <span className="sr-only">Loading...</span>
    </div>
  </div>
);

// Error fallback
const ErrorFallback = ({ error, resetErrorBoundary }) => (
  <div className="alert alert-danger" role="alert">
    <h4>Something went wrong:</h4>
    <p>{error.message}</p>
    <button className="btn btn-primary" onClick={resetErrorBoundary}>
      Try again
    </button>
  </div>
);

// Smart component wrapper with error boundary and loading
const LazyComponent: React.FC<{
  component: React.LazyExoticComponent<any>;
  fallback?: React.ComponentType;
  [key: string]: any;
}> = ({ component: Component, fallback: FallbackComponent = LoadingSpinner, ...props }) => (
  <ErrorBoundary FallbackComponent={ErrorFallback}>
    <Suspense fallback={<FallbackComponent />}>
      <Component {...props} />
    </Suspense>
  </ErrorBoundary>
);

// Usage in main component
const MainPatternCreator: React.FC = () => {
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [showVoiceControl, setShowVoiceControl] = useState(false);

  return (
    <div className="pattern-creator">
      {/* Core components loaded immediately */}
      <PatternCanvas />
      <EmojiPalettes />
      
      {/* Heavy components loaded on demand */}
      {showAIGenerator && (
        <LazyComponent
          component={AIPatternGenerator}
          onClose={() => setShowAIGenerator(false)}
        />
      )}
      
      {showVoiceControl && (
        <LazyComponent
          component={VoiceController}
          onDisable={() => setShowVoiceControl(false)}
        />
      )}
    </div>
  );
};
```

### 3. Asset Optimization

```typescript
// Preload critical resources
class ResourcePreloader {
  private static instance: ResourcePreloader;
  private preloadedAssets = new Set<string>();

  static getInstance(): ResourcePreloader {
    if (!this.instance) {
      this.instance = new ResourcePreloader();
    }
    return this.instance;
  }

  async preloadCriticalAssets() {
    const criticalAssets = [
      // Critical CSS
      '/_next/static/css/app.css',
      
      // Common emoji font
      '/fonts/noto-emoji.woff2',
      
      // Essential JavaScript chunks
      '/_next/static/chunks/framework.js',
      '/_next/static/chunks/main.js',
      
      // First-view images
      '/images/onboarding-hero.webp',
    ];

    await Promise.all(
      criticalAssets.map(asset => this.preloadAsset(asset))
    );
  }

  async preloadAsset(url: string): Promise<void> {
    if (this.preloadedAssets.has(url)) return;

    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      
      // Determine asset type
      if (url.endsWith('.css')) {
        link.as = 'style';
      } else if (url.endsWith('.js')) {
        link.as = 'script';
      } else if (url.match(/\.(woff2?|ttf|otf)$/)) {
        link.as = 'font';
        link.crossOrigin = 'anonymous';
      } else if (url.match(/\.(jpg|jpeg|png|webp|avif)$/)) {
        link.as = 'image';
      }
      
      link.href = url;
      link.onload = () => {
        this.preloadedAssets.add(url);
        resolve();
      };
      link.onerror = reject;
      
      document.head.appendChild(link);
    });
  }

  prefetchRoute(route: string) {
    // Prefetch route for faster navigation
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = route;
    document.head.appendChild(link);
  }
}

// Service Worker for caching
// public/sw.js
const CACHE_NAME = 'emoty-v1';
const STATIC_CACHE = 'emoty-static-v1';
const DYNAMIC_CACHE = 'emoty-dynamic-v1';

const STATIC_ASSETS = [
  '/',
  '/static/css/bootstrap.min.css',
  '/static/js/app.js',
  '/fonts/noto-emoji.woff2',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        
        return fetch(event.request)
          .then(fetchResponse => {
            // Cache dynamic resources
            if (event.request.url.startsWith('http')) {
              const responseClone = fetchResponse.clone();
              caches.open(DYNAMIC_CACHE)
                .then(cache => cache.put(event.request, responseClone));
            }
            
            return fetchResponse;
          });
      })
  );
});
```

## AI Response Optimization

### 1. Request Batching and Caching

```typescript
// Intelligent AI request management
class AIRequestOptimizer {
  private cache = new Map<string, CachedResponse>();
  private requestQueue: AIRequest[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 5;
  private readonly BATCH_DELAY = 100; // ms
  private readonly CACHE_TTL = 3600000; // 1 hour

  async generatePattern(prompt: string, language: string): Promise<AIResponse> {
    const cacheKey = this.getCacheKey(prompt, language);
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && !this.isCacheExpired(cached)) {
      return cached.response;
    }

    // Add to batch queue
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        id: `req-${Date.now()}-${Math.random()}`,
        prompt,
        language,
        resolve,
        reject,
        timestamp: Date.now()
      });

      this.scheduleBatch();
    });
  }

  private scheduleBatch() {
    if (this.batchTimer) return;

    this.batchTimer = setTimeout(() => {
      this.processBatch();
    }, this.BATCH_DELAY);

    // Process immediately if batch is full
    if (this.requestQueue.length >= this.BATCH_SIZE) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
      this.processBatch();
    }
  }

  private async processBatch() {
    if (this.requestQueue.length === 0) return;

    const batch = this.requestQueue.splice(0, this.BATCH_SIZE);
    this.batchTimer = null;

    // Group similar requests
    const groups = this.groupSimilarRequests(batch);

    for (const group of groups) {
      try {
        const response = await this.executeAIRequest(group[0]);
        
        // Cache and resolve all requests in group
        group.forEach(request => {
          const cacheKey = this.getCacheKey(request.prompt, request.language);
          this.cache.set(cacheKey, {
            response,
            timestamp: Date.now()
          });
          request.resolve(response);
        });

      } catch (error) {
        // Reject all requests in group
        group.forEach(request => request.reject(error));
      }
    }

    // Continue processing if queue has more items
    if (this.requestQueue.length > 0) {
      this.scheduleBatch();
    }
  }

  private groupSimilarRequests(requests: AIRequest[]): AIRequest[][] {
    const groups: Map<string, AIRequest[]> = new Map();

    requests.forEach(request => {
      const key = this.getNormalizedPrompt(request.prompt, request.language);
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(request);
    });

    return Array.from(groups.values());
  }

  private getNormalizedPrompt(prompt: string, language: string): string {
    return `${language}:${prompt.toLowerCase().trim()}`;
  }

  private async executeAIRequest(request: AIRequest): Promise<AIResponse> {
    const startTime = performance.now();
    
    try {
      const response = await fetch('/api/ai/generate-pattern', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: request.prompt,
          language: request.language
        })
      });

      if (!response.ok) {
        throw new Error(`AI request failed: ${response.status}`);
      }

      const result = await response.json();
      const duration = performance.now() - startTime;

      // Record performance metric
      performance.mark('ai-response-end');
      performance.measure('ai-response', 'ai-response-start', 'ai-response-end');

      return {
        ...result,
        meta: {
          duration,
          cached: false,
          timestamp: Date.now()
        }
      };

    } catch (error) {
      console.error('AI request failed:', error);
      throw error;
    }
  }

  private getCacheKey(prompt: string, language: string): string {
    // Create hash of prompt for cache key
    return `ai:${language}:${this.hashString(prompt)}`;
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
  }

  private isCacheExpired(cached: CachedResponse): boolean {
    return Date.now() - cached.timestamp > this.CACHE_TTL;
  }

  // Preload common patterns
  async preloadCommonPatterns() {
    const commonPrompts = [
      'happy birthday',
      'love heart',
      'nature garden',
      'celebration party',
      'peaceful calm',
      'ocean waves',
      'sunset beautiful',
      'friendship joy'
    ];

    const preloadPromises = commonPrompts.map(prompt => 
      this.generatePattern(prompt, 'en').catch(() => {}) // Ignore errors
    );

    await Promise.allSettled(preloadPromises);
  }
}
```

### 2. Streaming AI Responses

```typescript
// Stream AI responses for better perceived performance
class StreamingAIService {
  async generatePatternStream(
    prompt: string, 
    language: string,
    onChunk: (chunk: any) => void
  ): Promise<AIResponse> {
    const response = await fetch('/api/ai/generate-pattern-stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, language })
    });

    if (!response.body) {
      throw new Error('Streaming not supported');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let result: any = {};

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const chunk = JSON.parse(line.slice(6));
              onChunk(chunk);
              
              if (chunk.type === 'final') {
                result = chunk.data;
              }
            } catch (error) {
              console.warn('Failed to parse chunk:', line);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return result;
  }
}

// Usage in React component
const useStreamingAI = () => {
  const [streamData, setStreamData] = useState<any>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const streamingService = useMemo(() => new StreamingAIService(), []);

  const generateWithStreaming = async (prompt: string, language: string) => {
    setIsStreaming(true);
    setStreamData(null);

    try {
      await streamingService.generatePatternStream(
        prompt,
        language,
        (chunk) => {
          setStreamData(prev => ({ ...prev, ...chunk }));
        }
      );
    } finally {
      setIsStreaming(false);
    }
  };

  return { streamData, isStreaming, generateWithStreaming };
};
```

## Memory Management

### 1. Efficient Memory Usage

```typescript
// Memory-efficient component management
class MemoryManager {
  private static instance: MemoryManager;
  private componentRegistry = new WeakMap<object, ComponentInfo>();
  private cleanupTasks: (() => void)[] = [];

  static getInstance(): MemoryManager {
    if (!this.instance) {
      this.instance = new MemoryManager();
    }
    return this.instance;
  }

  registerComponent(component: object, info: ComponentInfo) {
    this.componentRegistry.set(component, info);
  }

  scheduleCleanup(task: () => void) {
    this.cleanupTasks.push(task);
  }

  performCleanup() {
    // Execute all cleanup tasks
    this.cleanupTasks.forEach(task => {
      try {
        task();
      } catch (error) {
        console.warn('Cleanup task failed:', error);
      }
    });
    
    this.cleanupTasks.length = 0;

    // Force garbage collection if available
    if (typeof global !== 'undefined' && global.gc) {
      global.gc();
    }
  }

  monitorMemoryUsage() {
    if (performance.memory) {
      const { usedJSHeapSize, totalJSHeapSize, jsHeapSizeLimit } = performance.memory;
      
      const usagePercentage = (usedJSHeapSize / jsHeapSizeLimit) * 100;
      
      if (usagePercentage > 80) {
        console.warn('High memory usage detected:', usagePercentage.toFixed(2) + '%');
        this.performCleanup();
      }
      
      return {
        used: usedJSHeapSize,
        total: totalJSHeapSize,
        limit: jsHeapSizeLimit,
        percentage: usagePercentage
      };
    }
    
    return null;
  }
}

// Memory-efficient React hooks
const useMemoryOptimization = () => {
  const memoryManager = useMemo(() => MemoryManager.getInstance(), []);
  
  useEffect(() => {
    const interval = setInterval(() => {
      memoryManager.monitorMemoryUsage();
    }, 30000); // Check every 30 seconds

    return () => {
      clearInterval(interval);
      memoryManager.performCleanup();
    };
  }, [memoryManager]);

  const scheduleCleanup = useCallback((task: () => void) => {
    memoryManager.scheduleCleanup(task);
  }, [memoryManager]);

  return { scheduleCleanup };
};

// Efficient pattern storage
class PatternStorage {
  private patterns = new Map<string, WeakRef<PatternState>>();
  private registry = new FinalizationRegistry((id: string) => {
    this.patterns.delete(id);
  });

  store(id: string, pattern: PatternState) {
    const ref = new WeakRef(pattern);
    this.patterns.set(id, ref);
    this.registry.register(pattern, id);
  }

  get(id: string): PatternState | null {
    const ref = this.patterns.get(id);
    if (!ref) return null;
    
    const pattern = ref.deref();
    if (!pattern) {
      this.patterns.delete(id);
      return null;
    }
    
    return pattern;
  }

  clear() {
    this.patterns.clear();
  }

  size(): number {
    return this.patterns.size;
  }
}
```

### 2. Resource Cleanup

```typescript
// Comprehensive resource cleanup
const useResourceCleanup = () => {
  const resources = useRef<Set<() => void>>(new Set());

  const addCleanupTask = useCallback((task: () => void) => {
    resources.current.add(task);
  }, []);

  const removeCleanupTask = useCallback((task: () => void) => {
    resources.current.delete(task);
  }, []);

  useEffect(() => {
    return () => {
      // Execute all cleanup tasks on unmount
      resources.current.forEach(task => {
        try {
          task();
        } catch (error) {
          console.warn('Resource cleanup failed:', error);
        }
      });
      
      resources.current.clear();
    };
  }, []);

  return { addCleanupTask, removeCleanupTask };
};

// Canvas cleanup
const useCanvasCleanup = (canvasRef: RefObject<HTMLCanvasElement>) => {
  const { addCleanupTask } = useResourceCleanup();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const cleanup = () => {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      canvas.width = 0;
      canvas.height = 0;
    };

    addCleanupTask(cleanup);

    return cleanup;
  }, [canvasRef, addCleanupTask]);
};

// Event listener cleanup
const useEventListenerCleanup = () => {
  const listeners = useRef<Array<{
    element: EventTarget;
    event: string;
    handler: EventListener;
  }>>([]);

  const addEventListener = useCallback((
    element: EventTarget,
    event: string,
    handler: EventListener,
    options?: AddEventListenerOptions
  ) => {
    element.addEventListener(event, handler, options);
    listeners.current.push({ element, event, handler });
  }, []);

  useEffect(() => {
    return () => {
      listeners.current.forEach(({ element, event, handler }) => {
        element.removeEventListener(event, handler);
      });
      listeners.current.length = 0;
    };
  }, []);

  return { addEventListener };
};
```

## Monitoring and Analytics

### 1. Performance Monitoring Dashboard

```typescript
// Real-time performance monitoring
class PerformanceDashboard {
  private metrics = new Map<string, PerformanceMetric[]>();
  private observers: PerformanceObserver[] = [];

  constructor() {
    this.setupObservers();
  }

  private setupObservers() {
    // Core Web Vitals observer
    const vitalsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.recordMetric(entry.name, {
          value: entry.value || entry.duration,
          timestamp: entry.startTime,
          type: 'core-vital'
        });
      }
    });

    vitalsObserver.observe({
      entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift']
    });

    this.observers.push(vitalsObserver);

    // Custom metrics observer
    const customObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name.startsWith('emoty-')) {
          this.recordMetric(entry.name, {
            value: entry.duration,
            timestamp: entry.startTime,
            type: 'custom'
          });
        }
      }
    });

    customObserver.observe({ entryTypes: ['measure'] });
    this.observers.push(customObserver);
  }

  recordMetric(name: string, metric: PerformanceMetric) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metrics = this.metrics.get(name)!;
    metrics.push(metric);

    // Keep only last 100 measurements
    if (metrics.length > 100) {
      metrics.shift();
    }

    // Check thresholds
    this.checkThresholds(name, metric);
  }

  private checkThresholds(name: string, metric: PerformanceMetric) {
    const thresholds = {
      'pattern-render': 100,
      'ai-response': 3000,
      'voice-processing': 200,
      'largest-contentful-paint': 2500,
      'first-input': 100,
      'cumulative-layout-shift': 0.1
    };

    const threshold = thresholds[name];
    if (threshold && metric.value > threshold) {
      this.reportPerformanceIssue(name, metric, threshold);
    }
  }

  private reportPerformanceIssue(name: string, metric: PerformanceMetric, threshold: number) {
    console.warn(`Performance threshold exceeded: ${name}`, {
      value: metric.value,
      threshold,
      timestamp: metric.timestamp
    });

    // Send to analytics service
    this.sendToAnalytics('performance-issue', {
      metric: name,
      value: metric.value,
      threshold,
      timestamp: metric.timestamp
    });
  }

  private sendToAnalytics(event: string, data: any) {
    // Send to your analytics service
    if (typeof gtag !== 'undefined') {
      gtag('event', event, data);
    }
  }

  getMetrics(): Record<string, PerformanceMetric[]> {
    return Object.fromEntries(this.metrics);
  }

  getAverageMetric(name: string): number {
    const metrics = this.metrics.get(name);
    if (!metrics || metrics.length === 0) return 0;

    const sum = metrics.reduce((total, metric) => total + metric.value, 0);
    return sum / metrics.length;
  }

  cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.metrics.clear();
  }
}

// React component for performance dashboard
const PerformanceMonitor: React.FC = () => {
  const [dashboard] = useState(() => new PerformanceDashboard());
  const [metrics, setMetrics] = useState<Record<string, number>>({});

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics({
        patternRender: dashboard.getAverageMetric('pattern-render'),
        aiResponse: dashboard.getAverageMetric('ai-response'),
        voiceProcessing: dashboard.getAverageMetric('voice-processing'),
        lcp: dashboard.getAverageMetric('largest-contentful-paint'),
        fid: dashboard.getAverageMetric('first-input'),
      });
    }, 5000);

    return () => {
      clearInterval(interval);
      dashboard.cleanup();
    };
  }, [dashboard]);

  if (process.env.NODE_ENV !== 'development') {
    return null; // Only show in development
  }

  return (
    <div className="performance-monitor position-fixed bottom-0 end-0 m-3 p-3 bg-dark text-white rounded">
      <h6>Performance Metrics</h6>
      <small>
        <div>Pattern Render: {metrics.patternRender?.toFixed(1)}ms</div>
        <div>AI Response: {metrics.aiResponse?.toFixed(0)}ms</div>
        <div>Voice Processing: {metrics.voiceProcessing?.toFixed(1)}ms</div>
        <div>LCP: {metrics.lcp?.toFixed(0)}ms</div>
        <div>FID: {metrics.fid?.toFixed(1)}ms</div>
      </small>
    </div>
  );
};
```

---

*This performance optimization guide provides comprehensive strategies for achieving excellent performance in the Emoty web application, ensuring smooth user experiences across all devices and use cases.*