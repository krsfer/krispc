// Offline Manager - Coordinates offline functionality
// Handles service worker registration, background sync, and offline state management

import { patternCache } from '@/lib/cache/pattern-cache';

type OfflineStatus = 'online' | 'offline' | 'syncing';

interface OfflineManagerConfig {
  enableServiceWorker: boolean;
  enableBackgroundSync: boolean;
  syncInterval: number; // milliseconds
  maxRetries: number;
}

class OfflineManager {
  private isOnline = navigator.onLine;
  private status: OfflineStatus = navigator.onLine ? 'online' : 'offline';
  private listeners = new Set<(status: OfflineStatus) => void>();
  private syncTimer: NodeJS.Timeout | null = null;
  private registration: ServiceWorkerRegistration | null = null;
  
  private config: OfflineManagerConfig = {
    enableServiceWorker: true,
    enableBackgroundSync: true,
    syncInterval: 30000, // 30 seconds
    maxRetries: 3
  };

  constructor(config?: Partial<OfflineManagerConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    
    this.init();
  }

  /**
   * Initialize offline manager
   */
  private async init(): Promise<void> {
    // Register service worker
    if (this.config.enableServiceWorker && 'serviceWorker' in navigator) {
      try {
        await this.registerServiceWorker();
      } catch (error) {
        console.error('Service worker registration failed:', error);
      }
    }

    // Set up event listeners
    this.setupEventListeners();

    // Start background sync if enabled
    if (this.config.enableBackgroundSync) {
      this.startPeriodicSync();
    }

    // Initialize pattern cache
    try {
      await patternCache.init();
    } catch (error) {
      console.error('Failed to initialize pattern cache:', error);
    }
  }

  /**
   * Register service worker
   */
  private async registerServiceWorker(): Promise<void> {
    try {
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('Service worker registered successfully');

      // Handle service worker updates
      this.registration.addEventListener('updatefound', () => {
        const newWorker = this.registration!.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // New update available
                this.notifyUpdate();
              }
            }
          });
        }
      });

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        this.handleServiceWorkerMessage(event.data);
      });

    } catch (error) {
      console.error('Service worker registration failed:', error);
      throw error;
    }
  }

  /**
   * Set up event listeners for online/offline detection
   */
  private setupEventListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.updateStatus('online');
      this.triggerSync();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.updateStatus('offline');
    });

    // Listen for visibility changes to sync when app becomes visible
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isOnline) {
        this.triggerSync();
      }
    });
  }

  /**
   * Start periodic sync
   */
  private startPeriodicSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    this.syncTimer = setInterval(() => {
      if (this.isOnline) {
        this.triggerSync();
      }
    }, this.config.syncInterval);
  }

  /**
   * Trigger background sync
   */
  private async triggerSync(): Promise<void> {
    if (this.status === 'syncing' || !this.isOnline) {
      return;
    }

    try {
      this.updateStatus('syncing');

      // Sync offline pattern changes
      await this.syncOfflineChanges();

      // Clean up old cache entries
      await this.performCacheCleanup();

      this.updateStatus('online');
    } catch (error) {
      console.error('Sync failed:', error);
      this.updateStatus(this.isOnline ? 'online' : 'offline');
    }
  }

  /**
   * Sync offline changes
   */
  private async syncOfflineChanges(): Promise<void> {
    try {
      const pendingChanges = await patternCache.getPendingOfflineChanges();
      
      for (const change of pendingChanges) {
        try {
          await this.syncChange(change);
          await patternCache.markOfflineChangeSynced(change.id);
        } catch (error) {
          console.error('Failed to sync change:', change.id, error);
          // Will retry on next sync
        }
      }
    } catch (error) {
      console.error('Failed to sync offline changes:', error);
    }
  }

  /**
   * Sync individual change
   */
  private async syncChange(change: any): Promise<void> {
    const { operation, pattern_id, data, changes } = change;

    switch (operation) {
      case 'create':
        await this.syncCreatePattern(pattern_id, data);
        break;
      case 'update':
        await this.syncUpdatePattern(pattern_id, changes);
        break;
      case 'delete':
        await this.syncDeletePattern(pattern_id);
        break;
    }
  }

  /**
   * Sync pattern creation
   */
  private async syncCreatePattern(tempId: string, patternData: any): Promise<void> {
    const response = await fetch('/api/patterns', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(patternData)
    });

    if (!response.ok) {
      throw new Error(`Failed to create pattern: ${response.statusText}`);
    }

    const newPattern = await response.json();
    
    // Update cache with real pattern ID
    await patternCache.cachePattern(newPattern);
  }

  /**
   * Sync pattern update
   */
  private async syncUpdatePattern(patternId: string, changes: any): Promise<void> {
    const response = await fetch(`/api/patterns/${patternId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(changes)
    });

    if (!response.ok) {
      throw new Error(`Failed to update pattern: ${response.statusText}`);
    }

    const updatedPattern = await response.json();
    
    // Update cache
    await patternCache.cachePattern(updatedPattern);
  }

  /**
   * Sync pattern deletion
   */
  private async syncDeletePattern(patternId: string): Promise<void> {
    const response = await fetch(`/api/patterns/${patternId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error(`Failed to delete pattern: ${response.statusText}`);
    }
  }

  /**
   * Perform cache cleanup
   */
  private async performCacheCleanup(): Promise<void> {
    // This would be implemented based on cache strategy
    // For now, we'll just clean up very old entries
    const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;
    const cutoffDate = new Date(Date.now() - ONE_WEEK);
    
    // Implementation would depend on cache structure
    console.log('Cache cleanup completed');
  }

  /**
   * Update status and notify listeners
   */
  private updateStatus(newStatus: OfflineStatus): void {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.listeners.forEach(listener => listener(newStatus));
    }
  }

  /**
   * Handle messages from service worker
   */
  private handleServiceWorkerMessage(data: any): void {
    switch (data.type) {
      case 'PATTERN_SYNCED':
        console.log('Pattern synced by service worker:', data.patternId);
        break;
      case 'SYNC_FAILED':
        console.error('Service worker sync failed:', data.error);
        break;
      case 'CACHE_UPDATED':
        console.log('Cache updated by service worker');
        break;
    }
  }

  /**
   * Notify about service worker update
   */
  private notifyUpdate(): void {
    // This could show a toast or banner to user
    console.log('New version available - refresh to update');
    
    // Dispatch custom event for UI to handle
    window.dispatchEvent(new CustomEvent('sw-update-available'));
  }

  /**
   * Public methods
   */

  /**
   * Get current offline status
   */
  getStatus(): OfflineStatus {
    return this.status;
  }

  /**
   * Check if currently online
   */
  isCurrentlyOnline(): boolean {
    return this.isOnline;
  }

  /**
   * Add status change listener
   */
  onStatusChange(callback: (status: OfflineStatus) => void): () => void {
    this.listeners.add(callback);
    
    // Return cleanup function
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Force sync (when user triggers manual sync)
   */
  async forceSync(): Promise<void> {
    if (!this.isOnline) {
      throw new Error('Cannot sync while offline');
    }

    await this.triggerSync();
  }

  /**
   * Preload patterns for offline use
   */
  async preloadPatterns(userId: string): Promise<void> {
    if (!this.isOnline) {
      throw new Error('Cannot preload while offline');
    }

    try {
      // Fetch user's recent patterns
      const response = await fetch(`/api/patterns?user_id=${userId}&limit=50`);
      if (response.ok) {
        const data = await response.json();
        if (data.data) {
          await patternCache.cachePatterns(data.data);
          
          // Send patterns to service worker for caching
          if (this.registration?.active) {
            this.registration.active.postMessage({
              type: 'CACHE_PATTERNS',
              patterns: data.data
            });
          }
        }
      }
    } catch (error) {
      console.error('Failed to preload patterns:', error);
      throw error;
    }
  }

  /**
   * Get offline storage usage
   */
  async getStorageUsage(): Promise<{
    quota: number;
    usage: number;
    percentage: number;
  }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        quota: estimate.quota || 0,
        usage: estimate.usage || 0,
        percentage: estimate.quota ? (estimate.usage || 0) / estimate.quota * 100 : 0
      };
    }
    
    return { quota: 0, usage: 0, percentage: 0 };
  }

  /**
   * Clear offline data
   */
  async clearOfflineData(): Promise<void> {
    try {
      // Clear pattern cache
      await patternCache.clearAllCache();
      
      // Clear service worker caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }
      
      console.log('Offline data cleared');
    } catch (error) {
      console.error('Failed to clear offline data:', error);
      throw error;
    }
  }

  /**
   * Check if feature is available offline
   */
  isFeatureAvailableOffline(feature: string): boolean {
    const offlineFeatures = [
      'pattern_creation',
      'pattern_editing',
      'pattern_viewing',
      'pattern_export', // basic exports
    ];
    
    return offlineFeatures.includes(feature);
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    
    this.listeners.clear();
  }
}

// Export singleton instance
export const offlineManager = new OfflineManager();

// Export types
export type { OfflineStatus, OfflineManagerConfig };

// Offline status management function (React hook is in separate file)
export function getOfflineStatus() {
  return {
    status: offlineManager.getStatus(),
    isOnline: offlineManager.getStatus() === 'online',
    isOffline: offlineManager.getStatus() === 'offline',
    isSyncing: offlineManager.getStatus() === 'syncing',
    forceSync: () => offlineManager.forceSync(),
    preloadPatterns: (userId: string) => offlineManager.preloadPatterns(userId),
    clearOfflineData: () => offlineManager.clearOfflineData(),
    getStorageUsage: () => offlineManager.getStorageUsage(),
  };
}