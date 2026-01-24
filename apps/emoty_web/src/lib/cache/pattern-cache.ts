import type { PatternWithDetails, PatternInsert } from '@/db/types';

/**
 * Pattern Cache Service
 * Handles caching of patterns using multiple layers (Memory, IndexedDB)
 * to support offline capability and fast retrieval.
 */
class PatternCache {
  private memoryCache: Map<string, PatternWithDetails>;
  private readonly MAX_CACHE_SIZE = 100;

  constructor() {
    this.memoryCache = new Map();
  }

  /**
   * Cache a single pattern
   */
  async cachePattern(pattern: PatternWithDetails): Promise<void> {
    try {
      // Update memory cache
      this.memoryCache.set(pattern.id, pattern);
      this.enforceCacheLimit();

      // If client-side, update IndexedDB (Placeholder)
      if (typeof window !== 'undefined') {
        // TODO: Implement IndexedDB caching
      }
    } catch (error) {
      console.error('Error caching pattern:', error);
    }
  }

  /**
   * Cache multiple patterns
   */
  async cachePatterns(patterns: PatternWithDetails[]): Promise<void> {
    try {
      for (const pattern of patterns) {
        this.memoryCache.set(pattern.id, pattern);
      }
      this.enforceCacheLimit();

      // If client-side, update IndexedDB (Placeholder)
      if (typeof window !== 'undefined') {
        // TODO: Implement IndexedDB caching
      }
    } catch (error) {
      console.error('Error caching patterns:', error);
    }
  }

  /**
   * Create a pattern offline (temporary ID)
   */
  async createPatternOffline(data: PatternInsert): Promise<string> {
    if (typeof window === 'undefined') {
      throw new Error('Offline creation only supported on client');
    }
    
    // Placeholder for offline creation logic
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log('Created offline pattern stub:', tempId, data);
    return tempId;
  }

  /**
   * Retrieve a pattern from cache
   */
  async getCachedPattern(id: string): Promise<PatternWithDetails | null> {
    return this.memoryCache.get(id) || null;
  }

  /**
   * Enforce memory cache limits (LRU-like)
   */
  private enforceCacheLimit() {
    if (this.memoryCache.size > this.MAX_CACHE_SIZE) {
      // Simple eviction: remove the first added items (insertion order)
      // For a real LRU, we'd need to update insertion order on access
      const keysToDelete = Array.from(this.memoryCache.keys())
        .slice(0, this.memoryCache.size - this.MAX_CACHE_SIZE);
      
      for (const key of keysToDelete) {
        this.memoryCache.delete(key);
      }
    }
  }
}

export const patternCache = new PatternCache();
