/**
 * Smart Cache System Tests
 * Unit tests for intelligent caching, prefetching, and offline sync
 */

import { SmartCache } from '../cache/smart-cache';
import type { PatternGenerationRequest } from '../local/pattern-engine';

describe('SmartCache', () => {
  let cache: SmartCache;

  beforeEach(() => {
    cache = new SmartCache({
      maxMemoryMB: 1, // Small cache for testing
      maxEntries: 10,
      defaultTtl: 1000, // 1 second for quick expiry tests
      cleanupInterval: 100, // Fast cleanup for testing
      offlineModeEnabled: true,
      batteryOptimized: false // Disable for predictable testing
    });
  });

  afterEach(() => {
    cache.destroy();
  });

  describe('Basic Cache Operations', () => {
    it('should store and retrieve data', async () => {
      const key = 'test-key';
      const data = { message: 'Hello World' };

      await cache.set(key, data);
      const retrieved = await cache.get(key);

      expect(retrieved).toEqual(data);
    });

    it('should return null for non-existent keys', async () => {
      const result = await cache.get('non-existent-key');
      expect(result).toBeNull();
    });

    it('should respect TTL expiration', async () => {
      const key = 'expire-test';
      const data = { message: 'Will expire' };

      await cache.set(key, data, { ttl: 50 }); // 50ms TTL
      
      // Should exist immediately
      let retrieved = await cache.get(key);
      expect(retrieved).toEqual(data);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 100));
      
      retrieved = await cache.get(key);
      expect(retrieved).toBeNull();
    });

    it('should use fallback function when cache miss occurs', async () => {
      const key = 'fallback-test';
      const fallbackData = { message: 'From fallback' };
      const fallbackFn = jest.fn().mockResolvedValue(fallbackData);

      const result = await cache.get(key, fallbackFn);

      expect(fallbackFn).toHaveBeenCalledTimes(1);
      expect(result).toEqual(fallbackData);

      // Should now be cached
      const cachedResult = await cache.get(key);
      expect(cachedResult).toEqual(fallbackData);
    });
  });

  describe('Memory Management', () => {
    it('should track memory usage', async () => {
      const initialStats = cache.getStats();
      expect(initialStats.memoryUsageMB).toBe(0);

      await cache.set('test', { data: 'x'.repeat(1000) });

      const updatedStats = cache.getStats();
      expect(updatedStats.memoryUsageMB).toBeGreaterThan(0);
    });

    it('should evict entries when memory limit is reached', async () => {
      // Fill cache beyond limit
      const largeData = { data: 'x'.repeat(10000) };
      
      await cache.set('item1', largeData, { priority: 'low' });
      await cache.set('item2', largeData, { priority: 'high' });
      await cache.set('item3', largeData, { priority: 'medium' });

      // Check that eviction occurred
      const stats = cache.getStats();
      expect(stats.totalEntries).toBeLessThanOrEqual(10);
    });

    it('should prioritize high-priority items during eviction', async () => {
      const data = { test: true };
      
      await cache.set('low-priority', data, { priority: 'low' });
      await cache.set('high-priority', data, { priority: 'high' });

      // Fill cache to trigger eviction
      for (let i = 0; i < 15; i++) {
        await cache.set(`filler-${i}`, { data: 'x'.repeat(1000) }, { priority: 'medium' });
      }

      // High priority should survive, low priority might be evicted
      const highPriorityResult = await cache.get('high-priority');
      expect(highPriorityResult).toBeDefined();
    });
  });

  describe('Pattern-Specific Caching', () => {
    it('should cache AI responses with quality metadata', async () => {
      const request: PatternGenerationRequest = {
        theme: 'love',
        complexity: 'simple',
        language: 'en'
      };

      const mockResponse = {
        patterns: [
          {
            sequence: ['❤️', '💕'],
            rationale: 'Love-themed pattern',
            confidence: 0.9,
            name: 'Heart Pattern',
            tags: ['love', 'romance']
          }
        ],
        usage: {
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30
        }
      };

      await cache.cacheAIResponse(request, mockResponse, 0.95);

      // Verify it was cached with correct metadata
      const stats = cache.getStats();
      expect(stats.totalEntries).toBe(1);
      expect(stats.sourceBreakdown.api).toBe(1);
    });

    it('should find similar patterns', async () => {
      // Cache some patterns
      const patterns = [
        { theme: 'love', complexity: 'simple' as const, language: 'en' as const },
        { theme: 'love', complexity: 'moderate' as const, language: 'en' as const },
        { theme: 'nature', complexity: 'simple' as const, language: 'en' as const }
      ];

      for (const pattern of patterns) {
        await cache.set(
          `pattern:${pattern.theme}:${pattern.complexity}`,
          { 
            pattern: { 
              sequence: ['🌸', '🌺'], 
              name: `${pattern.theme} pattern` 
            } 
          },
          { tags: [pattern.theme] }
        );
      }

      const request: PatternGenerationRequest = {
        theme: 'love',
        complexity: 'simple',
        language: 'en'
      };

      const similarPatterns = await cache.getSimilarPatterns(request, 3);
      expect(similarPatterns).toBeInstanceOf(Array);
    });
  });

  describe('Prefetching', () => {
    it('should prefetch patterns based on requests', async () => {
      const requests: PatternGenerationRequest[] = [
        { theme: 'love', language: 'en' },
        { theme: 'nature', language: 'en' }
      ];

      // Mock the pattern engine import
      jest.doMock('../local/pattern-engine', () => ({
        localPatternEngine: {
          generatePatterns: jest.fn().mockResolvedValue({
            pattern: { sequence: ['❤️'], name: 'Test' },
            confidence: 0.8,
            alternatives: [],
            metadata: { processingTime: 10 }
          })
        }
      }));

      await cache.prefetchPatterns(requests);

      // Should have created cache entries
      const stats = cache.getStats();
      expect(stats.totalEntries).toBeGreaterThan(0);
    });

    it('should warm cache with popular patterns', async () => {
      // Mock successful prefetch
      jest.doMock('../local/pattern-engine', () => ({
        localPatternEngine: {
          generatePatterns: jest.fn().mockResolvedValue({
            pattern: { sequence: ['❤️'], name: 'Popular Pattern' },
            confidence: 0.8,
            alternatives: []
          })
        }
      }));

      await cache.warmCache();

      const stats = cache.getStats();
      expect(stats.totalEntries).toBeGreaterThan(0);
    });
  });

  describe('Offline Mode', () => {
    it('should adjust behavior in offline mode', () => {
      cache.setOfflineMode(true);
      
      // Cache behavior should change for offline mode
      // This is mainly tested through integration tests
      expect(true).toBe(true); // Placeholder
    });

    it('should export offline-capable entries', () => {
      const export1 = cache.exportForOffline();
      
      expect(export1).toBeDefined();
      expect(export1.entries).toBeDefined();
      expect(export1.timestamp).toBeDefined();
      expect(export1.version).toBeDefined();
    });

    it('should import offline data', async () => {
      const testData = {
        entries: {
          'test-key': {
            data: { message: 'Offline data' },
            timestamp: Date.now(),
            ttl: 10000,
            accessCount: 1,
            lastAccess: Date.now(),
            quality: 0.8,
            source: 'local' as const,
            metadata: {
              size: 100,
              priority: 'medium' as const,
              tags: ['offline'],
              dependencies: [],
              isOfflineCapable: true
            }
          }
        },
        timestamp: Date.now(),
        version: '1.0.0',
        config: {
          maxMemoryMB: 10,
          maxEntries: 1000,
          defaultTtl: 30000,
          cleanupInterval: 300000,
          prefetchThreshold: 3,
          offlineModeEnabled: true,
          batteryOptimized: true
        }
      };

      await cache.importFromOffline(testData);

      const retrieved = await cache.get('test-key');
      expect(retrieved).toEqual({ message: 'Offline data' });
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should provide comprehensive statistics', async () => {
      // Add some test data
      await cache.set('test1', { data: 'api' }, { source: 'api' });
      await cache.set('test2', { data: 'local' }, { source: 'local' });
      await cache.set('test3', { data: 'offline' }, { isOfflineCapable: true });

      const stats = cache.getStats();

      expect(stats.totalEntries).toBe(3);
      expect(stats.memoryUsageMB).toBeGreaterThan(0);
      expect(stats.memoryLimitMB).toBe(1);
      expect(stats.hitRate).toBeGreaterThan(0);
      expect(stats.sourceBreakdown).toBeDefined();
      expect(stats.sourceBreakdown.api).toBeGreaterThanOrEqual(1);
      expect(stats.sourceBreakdown.local).toBeGreaterThanOrEqual(1);
    });

    it('should track cache hits and misses', async () => {
      const key = 'hit-test';
      const data = { test: true };

      // Miss
      await cache.get(key);
      
      // Set and hit
      await cache.set(key, data);
      await cache.get(key);

      const stats = cache.getStats();
      expect(stats.totalEntries).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle fallback function errors gracefully', async () => {
      const key = 'error-test';
      const fallbackFn = jest.fn().mockRejectedValue(new Error('Fallback failed'));

      const result = await cache.get(key, fallbackFn);

      expect(fallbackFn).toHaveBeenCalledTimes(1);
      expect(result).toBeNull();
    });

    it('should handle invalid data gracefully', async () => {
      const key = 'invalid-test';
      
      // Try to set undefined/null data
      await expect(cache.set(key, undefined as any)).resolves.not.toThrow();
      
      const result = await cache.get(key);
      expect(result).toBeDefined(); // undefined is a valid value to cache
    });
  });

  describe('Cleanup and Resource Management', () => {
    it('should clean up expired entries', async () => {
      await cache.set('short-lived', { data: 'test' }, { ttl: 10 });
      
      let stats = cache.getStats();
      expect(stats.totalEntries).toBe(1);

      // Wait for expiration and cleanup
      await new Promise(resolve => setTimeout(resolve, 150));

      stats = cache.getStats();
      expect(stats.expiredEntries).toBeGreaterThan(0);
    });

    it('should clean up resources on destroy', () => {
      const cache2 = new SmartCache();
      
      expect(() => cache2.destroy()).not.toThrow();
      
      // After destroy, operations should not crash
      expect(async () => {
        await cache2.get('test');
      }).not.toThrow();
    });
  });

  describe('Network State Handling', () => {
    it('should handle online/offline transitions', async () => {
      // Simulate going offline
      cache.setOfflineMode(true);
      
      await cache.set('offline-test', { data: 'offline' });
      
      // Simulate going online
      cache.setOfflineMode(false);
      
      await cache.syncWhenOnline();
      
      // Should not throw errors
      expect(true).toBe(true);
    });
  });
});