// Offline Sync Service
// Handles synchronization of offline changes with the server

import { patternCache } from '@/lib/cache/pattern-cache';
import { patternService } from '@/lib/services/pattern-service';
import { analyticsService } from '@/lib/services/analytics-service';
import type { PatternInsert, PatternUpdate } from '@/db/types';

interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: Array<{
    id: string;
    error: string;
  }>;
}

interface NetworkStatus {
  online: boolean;
  effectiveType?: string;
  downlink?: number;
}

export class OfflineSyncService {
  private syncInProgress = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private retryTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private maxRetries = 3;
  private baseRetryDelay = 1000; // 1 second

  // Initialize sync service
  async init(): Promise<void> {
    // Set up online/offline event listeners
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline.bind(this));
      window.addEventListener('offline', this.handleOffline.bind(this));

      // Start periodic sync if online
      if (navigator.onLine) {
        this.startPeriodicSync();
      }
    }
  }

  // Start periodic synchronization
  private startPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    // Sync every 5 minutes when online
    this.syncInterval = setInterval(() => {
      this.syncOfflineChanges().catch(console.error);
    }, 5 * 60 * 1000);
  }

  // Stop periodic synchronization
  private stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  // Handle coming back online
  private handleOnline(): void {
    console.log('Device is online - starting sync');
    this.startPeriodicSync();

    // Immediate sync when coming back online
    setTimeout(() => {
      this.syncOfflineChanges().catch(console.error);
    }, 1000);
  }

  // Handle going offline
  private handleOffline(): void {
    console.log('Device is offline - stopping periodic sync');
    this.stopPeriodicSync();
  }

  // Check network status
  private getNetworkStatus(): NetworkStatus {
    if (typeof navigator === 'undefined') {
      return { online: true };
    }

    const connection = (navigator as any).connection ||
      (navigator as any).mozConnection ||
      (navigator as any).webkitConnection;

    return {
      online: navigator.onLine,
      effectiveType: connection?.effectiveType,
      downlink: connection?.downlink
    };
  }

  // Check if we should sync based on network conditions
  private shouldSync(): boolean {
    const networkStatus = this.getNetworkStatus();

    if (!networkStatus.online) {
      return false;
    }

    // Don't sync on very slow connections
    if (networkStatus.effectiveType === 'slow-2g') {
      return false;
    }

    return true;
  }

  // Main sync function
  async syncOfflineChanges(): Promise<SyncResult> {
    if (this.syncInProgress) {
      console.log('Sync already in progress, skipping');
      return { success: false, synced: 0, failed: 0, errors: [] };
    }

    if (!this.shouldSync()) {
      console.log('Network conditions not suitable for sync');
      return { success: false, synced: 0, failed: 0, errors: [] };
    }

    this.syncInProgress = true;

    try {
      const pendingChanges = await patternCache.getPendingOfflineChanges();

      if (pendingChanges.length === 0) {
        console.log('No pending changes to sync');
        return { success: true, synced: 0, failed: 0, errors: [] };
      }

      console.log(`Syncing ${pendingChanges.length} offline changes`);

      const results: SyncResult = {
        success: true,
        synced: 0,
        failed: 0,
        errors: []
      };

      // Process changes in batches to avoid overwhelming the server
      const batchSize = 5;
      for (let i = 0; i < pendingChanges.length; i += batchSize) {
        const batch = pendingChanges.slice(i, i + batchSize);

        const batchResults = await Promise.allSettled(
          batch.map(change => this.syncSingleChange(change))
        );

        batchResults.forEach((result, index) => {
          const change = batch[index];
          if (result.status === 'fulfilled' && result.value.success) {
            results.synced++;
          } else {
            results.failed++;
            results.errors.push({
              id: change.id,
              error: result.status === 'rejected'
                ? result.reason?.message || 'Unknown error'
                : result.value.error
            });
          }
        });

        // Small delay between batches
        if (i + batchSize < pendingChanges.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      console.log(`Sync completed: ${results.synced} synced, ${results.failed} failed`);

      // Schedule retry for failed items
      if (results.failed > 0) {
        this.scheduleRetry();
        results.success = false;
      }

      return results;

    } catch (error) {
      console.error('Error during sync:', error);
      return {
        success: false,
        synced: 0,
        failed: 0,
        errors: [{ id: 'sync_error', error: (error as any).message }]
      };
    } finally {
      this.syncInProgress = false;
    }
  }

  // Sync a single offline change
  private async syncSingleChange(change: any): Promise<{ success: boolean; error?: string; newId?: string }> {
    try {
      switch (change.operation) {
        case 'create':
          return await this.syncCreatePattern(change);

        case 'update':
          return await this.syncUpdatePattern(change);

        case 'delete':
          return await this.syncDeletePattern(change);

        default:
          throw new Error(`Unknown operation: ${change.operation}`);
      }
    } catch (error) {
      console.error(`Error syncing change ${change.id}:`, error);
      return { success: false, error: (error as any).message };
    }
  }

  // Sync pattern creation
  private async syncCreatePattern(change: any): Promise<{ success: boolean; error?: string; newId?: string }> {
    try {
      const patternData: PatternInsert = change.data;
      const newPattern = await patternService.createPattern(patternData);

      // Mark as synced and update the temporary ID
      await patternCache.markOfflineChangeSynced(change.id, newPattern.id as unknown as string);

      // Log analytics
      analyticsService.logPatternAction(
        newPattern.id as unknown as string,
        newPattern.user_id,
        'view'
      ).catch(console.error);

      return { success: true, newId: newPattern.id as unknown as string };

    } catch (error) {
      return { success: false, error: (error as any).message };
    }
  }

  // Sync pattern update
  private async syncUpdatePattern(change: any): Promise<{ success: boolean; error?: string }> {
    try {
      const updateData: PatternUpdate = change.changes;

      // Skip if pattern ID is temporary (not yet synced)
      if (change.pattern_id.startsWith('temp_')) {
        return { success: false, error: 'Pattern not yet synced, skipping update' };
      }

      await patternService.updatePattern(
        change.pattern_id,
        updateData,
        change.user_id
      );

      // Mark as synced
      await patternCache.markOfflineChangeSynced(change.id);

      // Log analytics
      analyticsService.logPatternAction(
        change.pattern_id,
        change.user_id,
        'edit'
      ).catch(console.error);

      return { success: true };

    } catch (error) {
      return { success: false, error: (error as any).message };
    }
  }

  // Sync pattern deletion
  private async syncDeletePattern(change: any): Promise<{ success: boolean; error?: string }> {
    try {
      // Skip if pattern ID is temporary (not yet synced)
      if (change.pattern_id.startsWith('temp_')) {
        // Just mark as synced since it was never created on server
        await patternCache.markOfflineChangeSynced(change.id);
        return { success: true };
      }

      await patternService.deletePattern(
        change.pattern_id,
        change.user_id
      );

      // Mark as synced
      await patternCache.markOfflineChangeSynced(change.id);

      return { success: true };

    } catch (error) {
      // If pattern not found, consider it already deleted
      if ((error as any).message.includes('Pattern not found')) {
        await patternCache.markOfflineChangeSynced(change.id);
        return { success: true };
      }

      return { success: false, error: (error as any).message };
    }
  }

  // Schedule retry for failed syncs
  private scheduleRetry(): void {
    const retryDelay = this.baseRetryDelay * Math.pow(2, this.getRetryCount());

    const timeoutId = setTimeout(() => {
      this.syncOfflineChanges().catch(console.error);
    }, retryDelay);

    this.retryTimeouts.set('sync_retry', timeoutId);
  }

  // Get current retry count (simplified)
  private getRetryCount(): number {
    // In a real implementation, you'd track retry counts per item
    return Math.min(this.retryTimeouts.size, this.maxRetries);
  }

  // Force immediate sync
  async forceSyncNow(): Promise<SyncResult> {
    if (!this.getNetworkStatus().online) {
      throw new Error('Cannot sync while offline');
    }

    return await this.syncOfflineChanges();
  }

  // Get sync status
  getSyncStatus(): {
    inProgress: boolean;
    lastSync: Date | null;
    pendingChanges: number;
    networkStatus: NetworkStatus;
  } {
    return {
      inProgress: this.syncInProgress,
      lastSync: null, // Would be tracked in a real implementation
      pendingChanges: 0, // Would be fetched from cache
      networkStatus: this.getNetworkStatus()
    };
  }

  // Download and cache patterns for offline use
  async downloadPatternsForOffline(
    patternIds: string[],
    userId?: string
  ): Promise<{ downloaded: number; failed: number; errors: string[] }> {
    const results = {
      downloaded: 0,
      failed: 0,
      errors: [] as string[]
    };

    if (!this.shouldSync()) {
      throw new Error('Network conditions not suitable for download');
    }

    console.log(`Downloading ${patternIds.length} patterns for offline use`);

    for (const patternId of patternIds) {
      try {
        const pattern = await patternService.getPatternById(patternId, userId);

        if (pattern) {
          await patternCache.cachePattern(pattern);
          results.downloaded++;
        } else {
          results.failed++;
          results.errors.push(`Pattern ${patternId} not found`);
        }
      } catch (error) {
        results.failed++;
        results.errors.push(`Error downloading pattern ${patternId}: ${(error as any).message}`);
      }
    }

    console.log(`Download completed: ${results.downloaded} downloaded, ${results.failed} failed`);
    return results;
  }

  // Preload user's patterns for offline access
  async preloadUserPatterns(userId: string, limit: number = 50): Promise<number> {
    try {
      if (!this.shouldSync()) {
        throw new Error('Network conditions not suitable for preload');
      }

      const patterns = await patternService.searchPatterns(
        { user_id: userId },
        { field: 'updated_at', direction: 'desc' },
        { limit },
        userId
      );

      await patternCache.cachePatterns(patterns.data);

      console.log(`Preloaded ${patterns.data.length} user patterns for offline access`);
      return patterns.data.length;

    } catch (error) {
      console.error('Error preloading user patterns:', error);
      throw error;
    }
  }

  // Clean up
  destroy(): void {
    this.stopPeriodicSync();

    // Clear retry timeouts
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
    this.retryTimeouts.clear();

    // Remove event listeners
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline.bind(this));
      window.removeEventListener('offline', this.handleOffline.bind(this));
    }
  }
}

export const offlineSyncService = new OfflineSyncService();

// Auto-initialize if in browser
if (typeof window !== 'undefined') {
  offlineSyncService.init().catch(console.error);
}