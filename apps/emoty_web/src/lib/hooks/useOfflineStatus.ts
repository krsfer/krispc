'use client';

import { useState, useEffect } from 'react';
import { offlineManager, type OfflineStatus } from '@/lib/offline/offline-manager';

/**
 * React hook for managing offline status and functionality
 */
export function useOfflineStatus() {
  const [status, setStatus] = useState<OfflineStatus>(offlineManager.getStatus());

  useEffect(() => {
    const unsubscribe = offlineManager.onStatusChange(setStatus);
    return unsubscribe;
  }, []);

  return {
    status,
    isOnline: status === 'online',
    isOffline: status === 'offline', 
    isSyncing: status === 'syncing',
    
    // Actions
    forceSync: () => offlineManager.forceSync(),
    preloadPatterns: (userId: string) => offlineManager.preloadPatterns(userId),
    clearOfflineData: () => offlineManager.clearOfflineData(),
    getStorageUsage: () => offlineManager.getStorageUsage(),
    
    // Utilities
    isFeatureAvailable: (feature: string) => 
      status === 'online' || offlineManager.isFeatureAvailableOffline(feature),
  };
}