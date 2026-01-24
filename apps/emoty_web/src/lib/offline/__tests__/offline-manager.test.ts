/**
 * @jest-environment jsdom
 */

import { offlineManager } from '../offline-manager';
import { patternCache } from '@/lib/cache/pattern-cache';

// Mock dependencies
jest.mock('@/lib/cache/pattern-cache');
jest.mock('../../../db/connection');

const mockPatternCache = patternCache as jest.Mocked<typeof patternCache>;

// Mock service worker registration
const mockServiceWorker = {
  register: jest.fn(),
  addEventListener: jest.fn(),
  postMessage: jest.fn(),
  active: {
    postMessage: jest.fn()
  }
};

Object.defineProperty(navigator, 'serviceWorker', {
  value: mockServiceWorker,
  writable: true
});

// Mock online/offline detection
Object.defineProperty(navigator, 'onLine', {
  value: true,
  writable: true
});

// Mock storage estimation
Object.defineProperty(navigator, 'storage', {
  value: {
    estimate: jest.fn().mockResolvedValue({
      quota: 1000000,
      usage: 500000
    })
  },
  writable: true
});

// Mock fetch
global.fetch = jest.fn();

describe('OfflineManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true
    });

    // Mock pattern cache methods
    mockPatternCache.init.mockResolvedValue(undefined);
    mockPatternCache.getPendingOfflineChanges.mockResolvedValue([]);
    mockPatternCache.markOfflineChangeSynced.mockResolvedValue(undefined);
    mockPatternCache.cachePatterns.mockResolvedValue(undefined);
    mockPatternCache.clearAllCache.mockResolvedValue(undefined);

    // Mock service worker registration
    mockServiceWorker.register.mockResolvedValue({
      installing: null,
      waiting: null,
      active: mockServiceWorker.active,
      addEventListener: mockServiceWorker.addEventListener
    });
  });

  describe('initialization', () => {
    it('should initialize successfully when service worker is supported', async () => {
      expect(offlineManager.isCurrentlyOnline()).toBe(true);
      expect(offlineManager.getStatus()).toBe('online');
    });

    it('should handle service worker registration failure gracefully', async () => {
      mockServiceWorker.register.mockRejectedValue(new Error('SW registration failed'));
      
      // Should not throw even if SW fails
      expect(() => offlineManager.getStatus()).not.toThrow();
    });

    it('should initialize pattern cache', async () => {
      // Give time for async initialization
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(mockPatternCache.init).toHaveBeenCalled();
    });
  });

  describe('online/offline detection', () => {
    it('should detect when going offline', async () => {
      const statusChanges: string[] = [];
      const unsubscribe = offlineManager.onStatusChange((status) => {
        statusChanges.push(status);
      });

      // Simulate going offline
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
      window.dispatchEvent(new Event('offline'));

      // Give time for event processing
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(offlineManager.getStatus()).toBe('offline');
      expect(statusChanges).toContain('offline');

      unsubscribe();
    });

    it('should detect when coming back online', async () => {
      // Start offline
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
      window.dispatchEvent(new Event('offline'));

      const statusChanges: string[] = [];
      const unsubscribe = offlineManager.onStatusChange((status) => {
        statusChanges.push(status);
      });

      // Come back online
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
      window.dispatchEvent(new Event('online'));

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(offlineManager.getStatus()).toBe('online');
      expect(statusChanges).toContain('online');

      unsubscribe();
    });
  });

  describe('pattern preloading', () => {
    it('should preload user patterns when online', async () => {
      const mockPatterns = [
        { id: 'pattern1', name: 'Pattern 1' },
        { id: 'pattern2', name: 'Pattern 2' }
      ];

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          data: mockPatterns
        })
      });

      await offlineManager.preloadPatterns('user123');

      expect(global.fetch).toHaveBeenCalledWith('/api/patterns?user_id=user123&limit=50');
      expect(mockPatternCache.cachePatterns).toHaveBeenCalledWith(mockPatterns);
      expect(mockServiceWorker.active.postMessage).toHaveBeenCalledWith({
        type: 'CACHE_PATTERNS',
        patterns: mockPatterns
      });
    });

    it('should throw when trying to preload while offline', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
      window.dispatchEvent(new Event('offline'));

      await new Promise(resolve => setTimeout(resolve, 0));

      await expect(offlineManager.preloadPatterns('user123'))
        .rejects.toThrow('Cannot preload while offline');
    });

    it('should handle preload API errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(offlineManager.preloadPatterns('user123'))
        .rejects.toThrow('Failed to preload patterns');
    });
  });

  describe('sync functionality', () => {
    it('should sync offline changes when online', async () => {
      const pendingChanges = [
        {
          id: 1,
          operation: 'create',
          pattern_id: 'temp123',
          data: { name: 'New Pattern' }
        },
        {
          id: 2,
          operation: 'update',
          pattern_id: 'pattern456',
          changes: { name: 'Updated Pattern' }
        }
      ];

      mockPatternCache.getPendingOfflineChanges.mockResolvedValue(pendingChanges);

      // Mock successful API responses
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 'real123', name: 'New Pattern' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 'pattern456', name: 'Updated Pattern' })
        });

      await offlineManager.forceSync();

      expect(mockPatternCache.getPendingOfflineChanges).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(mockPatternCache.markOfflineChangeSynced).toHaveBeenCalledTimes(2);
    });

    it('should handle sync failures gracefully', async () => {
      const pendingChanges = [
        {
          id: 1,
          operation: 'create',
          pattern_id: 'temp123',
          data: { name: 'New Pattern' }
        }
      ];

      mockPatternCache.getPendingOfflineChanges.mockResolvedValue(pendingChanges);
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Sync failed'));

      // Should not throw
      await expect(offlineManager.forceSync()).resolves.toBeUndefined();
      
      // Should not mark as synced if it failed
      expect(mockPatternCache.markOfflineChangeSynced).not.toHaveBeenCalled();
    });

    it('should reject force sync when offline', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
      window.dispatchEvent(new Event('offline'));

      await new Promise(resolve => setTimeout(resolve, 0));

      await expect(offlineManager.forceSync())
        .rejects.toThrow('Cannot sync while offline');
    });
  });

  describe('storage usage', () => {
    it('should return storage usage information', async () => {
      const usage = await offlineManager.getStorageUsage();

      expect(usage).toEqual({
        quota: 1000000,
        usage: 500000,
        percentage: 50
      });
    });

    it('should handle storage API unavailability', async () => {
      Object.defineProperty(navigator, 'storage', { value: undefined });

      const usage = await offlineManager.getStorageUsage();

      expect(usage).toEqual({
        quota: 0,
        usage: 0,
        percentage: 0
      });
    });
  });

  describe('offline data management', () => {
    it('should clear all offline data', async () => {
      // Mock caches API
      const mockCaches = {
        keys: jest.fn().mockResolvedValue(['cache1', 'cache2']),
        delete: jest.fn().mockResolvedValue(true)
      };
      
      Object.defineProperty(window, 'caches', {
        value: mockCaches,
        writable: true
      });

      await offlineManager.clearOfflineData();

      expect(mockPatternCache.clearAllCache).toHaveBeenCalled();
      expect(mockCaches.keys).toHaveBeenCalled();
      expect(mockCaches.delete).toHaveBeenCalledTimes(2);
    });

    it('should handle clear data errors gracefully', async () => {
      mockPatternCache.clearAllCache.mockRejectedValue(new Error('Clear failed'));

      await expect(offlineManager.clearOfflineData())
        .rejects.toThrow('Clear failed');
    });
  });

  describe('feature availability', () => {
    it('should check if features are available offline', () => {
      expect(offlineManager.isFeatureAvailableOffline('pattern_creation')).toBe(true);
      expect(offlineManager.isFeatureAvailableOffline('pattern_editing')).toBe(true);
      expect(offlineManager.isFeatureAvailableOffline('pattern_viewing')).toBe(true);
      expect(offlineManager.isFeatureAvailableOffline('pattern_export')).toBe(true);
      expect(offlineManager.isFeatureAvailableOffline('ai_generation')).toBe(false);
      expect(offlineManager.isFeatureAvailableOffline('social_sharing')).toBe(false);
    });
  });

  describe('status change listeners', () => {
    it('should notify listeners of status changes', async () => {
      const statusChanges: string[] = [];
      const unsubscribe = offlineManager.onStatusChange((status) => {
        statusChanges.push(status);
      });

      // Trigger status change
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
      window.dispatchEvent(new Event('offline'));

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(statusChanges).toContain('offline');

      unsubscribe();
    });

    it('should allow unsubscribing from status changes', () => {
      const listener = jest.fn();
      const unsubscribe = offlineManager.onStatusChange(listener);

      unsubscribe();

      // Trigger status change
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
      window.dispatchEvent(new Event('offline'));

      expect(listener).not.toHaveBeenCalled();
    });

    it('should support multiple listeners', async () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      const unsubscribe1 = offlineManager.onStatusChange(listener1);
      const unsubscribe2 = offlineManager.onStatusChange(listener2);

      // Trigger status change
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
      window.dispatchEvent(new Event('offline'));

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(listener1).toHaveBeenCalledWith('offline');
      expect(listener2).toHaveBeenCalledWith('offline');

      unsubscribe1();
      unsubscribe2();
    });
  });

  describe('visibility change handling', () => {
    it('should trigger sync when app becomes visible and online', async () => {
      mockPatternCache.getPendingOfflineChanges.mockResolvedValue([]);

      // Mock document visibility
      Object.defineProperty(document, 'hidden', {
        value: true,
        writable: true
      });

      // Simulate app becoming visible
      Object.defineProperty(document, 'hidden', { value: false, writable: true });
      document.dispatchEvent(new Event('visibilitychange'));

      // Give time for async operations
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockPatternCache.getPendingOfflineChanges).toHaveBeenCalled();
    });
  });

  describe('resource cleanup', () => {
    it('should dispose resources properly', () => {
      const listener = jest.fn();
      offlineManager.onStatusChange(listener);

      offlineManager.dispose();

      // Trigger status change - should not call listener after dispose
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
      window.dispatchEvent(new Event('offline'));

      expect(listener).not.toHaveBeenCalled();
    });
  });
});