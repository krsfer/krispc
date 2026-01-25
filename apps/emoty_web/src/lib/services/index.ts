// Pattern System Services - Main Export File
// Provides unified access to all pattern-related services

import { patternService, PatternService } from './pattern-service';
import { patternCollectionService, PatternCollectionService } from './pattern-collection-service';
import { patternSharingService, PatternSharingService } from './pattern-sharing-service';
import { analyticsService, AnalyticsService } from './analytics-service';
import { offlineSyncService, OfflineSyncService } from './offline-sync-service';
import { patternCache } from '../cache/pattern-cache';

export {
  patternService, PatternService,
  patternCollectionService, PatternCollectionService,
  patternSharingService, PatternSharingService,
  analyticsService, AnalyticsService,
  offlineSyncService, OfflineSyncService,
  patternCache
};

// Re-export commonly used types
export type {
  PatternTable,
  PatternInsert,
  PatternUpdate,
  PatternWithDetails,
  PatternSearchFilters,
  PatternSortOptions,
  PaginationOptions,
  PatternCollectionTable,
  PatternCollectionWithDetails,
  PatternShareTable,
  PatternSequence,
  EmojiCell,
  CachedPattern
} from '@/db/types';

// Service initialization helper
export async function initializePatternServices(): Promise<void> {
  try {
    // Initialize cache
    await patternCache.init();

    // Initialize offline sync
    await offlineSyncService.init();

    console.log('Pattern services initialized successfully');
  } catch (error) {
    console.error('Error initializing pattern services:', error);
    throw error;
  }
}

// Service health check
export async function checkServicesHealth(): Promise<{
  database: boolean;
  cache: boolean;
  sync: boolean;
}> {
  const health = {
    database: false,
    cache: false,
    sync: false
  };

  try {
    // Check database connection
    await patternService.getPatternById('health-check');
    health.database = true;
  } catch (error) {
    // Expected to fail, we're just checking connection
    health.database = !(error as any).message?.includes('connection');
  }

  try {
    // Check cache
    const stats = await patternCache.getCacheStats();
    health.cache = true;
  } catch (error) {
    console.error('Cache health check failed:', error);
  }

  try {
    // Check sync service
    const syncStatus = offlineSyncService.getSyncStatus();
    health.sync = true;
  } catch (error) {
    console.error('Sync health check failed:', error);
  }

  return health;
}