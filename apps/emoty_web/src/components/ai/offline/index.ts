/**
 * Offline Components Index
 * Exports all offline-related UI components for AI fallback system
 */

export { default as OfflineStatusIndicator } from './offline-status-indicator';
export type { OfflineStatusProps, ConnectionStatus } from './offline-status-indicator';

export { 
  default as FeatureAvailabilityNotice, 
  FeatureNotices, 
  SmartFeatureBanner 
} from './feature-availability-notice';
export type { FeatureAvailabilityProps } from './feature-availability-notice';

export { 
  default as SyncControls, 
  QuickSyncStatus 
} from './sync-controls';
export type { 
  SyncStatus, 
  SyncError, 
  SyncControlsProps 
} from './sync-controls';

// Re-export commonly used types for convenience
export type {
  SystemHealthReport,
  FallbackMetrics
} from '@/lib/ai/fallback-orchestrator';

// export type {
//   CacheStats
// } from '@/lib/ai/cache/smart-cache';