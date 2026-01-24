/**
 * Sync Controls Component
 * Provides manual sync controls and sync status for offline/online transitions
 * Handles pattern synchronization and conflict resolution
 */

'use client';

import React, { useState, useCallback, useEffect } from 'react';

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime?: number;
  pendingItems: number;
  conflicts: number;
  totalItems: number;
  syncProgress?: number; // 0-1
  errors: SyncError[];
}

export interface SyncError {
  id: string;
  message: string;
  type: 'network' | 'conflict' | 'validation' | 'storage';
  itemId?: string;
  timestamp: number;
  canRetry: boolean;
}

export interface SyncControlsProps {
  syncStatus: SyncStatus;
  onManualSync: () => Promise<void>;
  onResolveConflict?: (conflictId: string, resolution: 'local' | 'remote' | 'merge') => Promise<void>;
  onRetryError?: (errorId: string) => Promise<void>;
  onClearErrors?: () => void;
  className?: string;
  showDetailedStatus?: boolean;
  autoSyncEnabled?: boolean;
  onAutoSyncToggle?: (enabled: boolean) => void;
}

/**
 * Main sync controls component
 */
export default function SyncControls({
  syncStatus,
  onManualSync,
  onResolveConflict,
  onRetryError,
  onClearErrors,
  className = '',
  showDetailedStatus = false,
  autoSyncEnabled = true,
  onAutoSyncToggle
}: SyncControlsProps) {
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [showConflicts, setShowConflicts] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const handleManualSync = useCallback(async () => {
    if (isManualSyncing || syncStatus.isSyncing || !syncStatus.isOnline) return;

    setIsManualSyncing(true);
    try {
      await onManualSync();
    } catch (error) {
      console.error('Manual sync failed:', error);
    } finally {
      setIsManualSyncing(false);
    }
  }, [isManualSyncing, syncStatus.isSyncing, syncStatus.isOnline, onManualSync]);

  const formatLastSyncTime = (timestamp?: number) => {
    if (!timestamp) return 'Never';
    
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} minutes ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const getSyncStatusColor = () => {
    if (!syncStatus.isOnline) return 'text-warning';
    if (syncStatus.isSyncing) return 'text-info';
    if (syncStatus.conflicts > 0) return 'text-warning';
    if (syncStatus.errors.length > 0) return 'text-danger';
    if (syncStatus.pendingItems > 0) return 'text-warning';
    return 'text-success';
  };

  const getSyncStatusIcon = () => {
    if (!syncStatus.isOnline) return '📴';
    if (syncStatus.isSyncing || isManualSyncing) return '🔄';
    if (syncStatus.conflicts > 0) return '⚠️';
    if (syncStatus.errors.length > 0) return '❌';
    if (syncStatus.pendingItems > 0) return '⏳';
    return '✅';
  };

  const getSyncStatusText = () => {
    if (!syncStatus.isOnline) return 'Offline';
    if (syncStatus.isSyncing || isManualSyncing) return 'Syncing...';
    if (syncStatus.conflicts > 0) return `${syncStatus.conflicts} conflicts`;
    if (syncStatus.errors.length > 0) return `${syncStatus.errors.length} errors`;
    if (syncStatus.pendingItems > 0) return `${syncStatus.pendingItems} pending`;
    return 'Up to date';
  };

  return (
    <div className={`border rounded p-3 ${className}`} role="region" aria-label="Synchronization Controls">
      {/* Main sync status */}
      <div className="d-flex align-items-center justify-content-between mb-2">
        <div className="d-flex align-items-center">
          <span 
            className={`me-2 fs-5 ${getSyncStatusColor()}`}
            aria-hidden="true"
            role="img"
            aria-label="Sync status"
          >
            {getSyncStatusIcon()}
          </span>
          <div>
            <div className={`fw-semibold ${getSyncStatusColor()}`}>
              {getSyncStatusText()}
            </div>
            <small className="text-muted">
              Last sync: {formatLastSyncTime(syncStatus.lastSyncTime)}
            </small>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2">
          {/* Auto-sync toggle */}
          {onAutoSyncToggle && (
            <div className="form-check form-switch">
              <input
                className="form-check-input"
                type="checkbox"
                id="autoSyncToggle"
                checked={autoSyncEnabled}
                onChange={(e) => onAutoSyncToggle(e.target.checked)}
                aria-label="Toggle automatic synchronization"
              />
              <label className="form-check-label small" htmlFor="autoSyncToggle">
                Auto
              </label>
            </div>
          )}

          {/* Manual sync button */}
          <button
            type="button"
            className="btn btn-outline-primary btn-sm"
            onClick={handleManualSync}
            disabled={!syncStatus.isOnline || syncStatus.isSyncing || isManualSyncing}
            aria-label={`Manual sync ${syncStatus.isOnline ? 'available' : 'unavailable - offline'}`}
          >
            <i 
              className={`bi ${(syncStatus.isSyncing || isManualSyncing) ? 'bi-arrow-repeat rotating' : 'bi-arrow-repeat'} me-1`} 
              aria-hidden="true"
            ></i>
            Sync
          </button>
        </div>
      </div>

      {/* Sync progress bar */}
      {(syncStatus.isSyncing || isManualSyncing) && syncStatus.syncProgress !== undefined && (
        <div className="mb-2">
          <div className="progress" style={{ height: '6px' }}>
            <div 
              className="progress-bar progress-bar-striped progress-bar-animated"
              style={{ width: `${syncStatus.syncProgress * 100}%` }}
              role="progressbar"
              aria-valuenow={syncStatus.syncProgress * 100}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Sync progress: ${Math.round(syncStatus.syncProgress * 100)}%`}
            ></div>
          </div>
          <small className="text-muted">
            {Math.round(syncStatus.syncProgress * 100)}% complete
          </small>
        </div>
      )}

      {/* Detailed status */}
      {showDetailedStatus && (
        <div className="mt-2">
          <hr className="my-2" />
          <SyncStatusDetails 
            syncStatus={syncStatus}
            onResolveConflict={onResolveConflict}
            onRetryError={onRetryError}
            onClearErrors={onClearErrors}
          />
        </div>
      )}

      {/* Conflicts and errors summary */}
      {(syncStatus.conflicts > 0 || syncStatus.errors.length > 0) && !showDetailedStatus && (
        <div className="mt-2 d-flex gap-2">
          {syncStatus.conflicts > 0 && (
            <button
              type="button"
              className="btn btn-warning btn-sm"
              onClick={() => setShowConflicts(!showConflicts)}
              aria-expanded={showConflicts}
              aria-controls="conflictsList"
            >
              <i className="bi bi-exclamation-triangle me-1" aria-hidden="true"></i>
              {syncStatus.conflicts} Conflicts
            </button>
          )}

          {syncStatus.errors.length > 0 && (
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={() => setShowErrors(!showErrors)}
              aria-expanded={showErrors}
              aria-controls="errorsList"
            >
              <i className="bi bi-x-circle me-1" aria-hidden="true"></i>
              {syncStatus.errors.length} Errors
            </button>
          )}
        </div>
      )}

      {/* Conflicts list */}
      {showConflicts && syncStatus.conflicts > 0 && (
        <div id="conflictsList" className="mt-2">
          <div className="alert alert-warning py-2">
            <small>
              <strong>Sync Conflicts:</strong> Some patterns were modified both locally and remotely. 
              Choose how to resolve each conflict.
            </small>
          </div>
          {/* Conflict resolution UI would go here */}
        </div>
      )}

      {/* Errors list */}
      {showErrors && syncStatus.errors.length > 0 && (
        <div id="errorsList" className="mt-2">
          <ErrorsList 
            errors={syncStatus.errors}
            onRetryError={onRetryError}
            onClearErrors={onClearErrors}
          />
        </div>
      )}

      {/* Offline notice */}
      {!syncStatus.isOnline && (
        <div className="mt-2">
          <div className="alert alert-info py-2 mb-0" role="alert">
            <small>
              <i className="bi bi-wifi-off me-1" aria-hidden="true"></i>
              You're currently offline. Changes will sync automatically when connection is restored.
            </small>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Detailed sync status component
 */
function SyncStatusDetails({ 
  syncStatus, 
  onResolveConflict, 
  onRetryError, 
  onClearErrors 
}: {
  syncStatus: SyncStatus;
  onResolveConflict?: (conflictId: string, resolution: 'local' | 'remote' | 'merge') => Promise<void>;
  onRetryError?: (errorId: string) => Promise<void>;
  onClearErrors?: () => void;
}) {
  return (
    <div className="small">
      <div className="row g-2">
        <div className="col-6">
          <div className="text-muted">Status:</div>
          <div className={syncStatus.isOnline ? 'text-success' : 'text-warning'}>
            {syncStatus.isOnline ? 'Online' : 'Offline'}
          </div>
        </div>
        <div className="col-6">
          <div className="text-muted">Total Items:</div>
          <div>{syncStatus.totalItems}</div>
        </div>
      </div>
      
      <div className="row g-2 mt-1">
        <div className="col-6">
          <div className="text-muted">Pending:</div>
          <div className={syncStatus.pendingItems > 0 ? 'text-warning' : 'text-success'}>
            {syncStatus.pendingItems}
          </div>
        </div>
        <div className="col-6">
          <div className="text-muted">Conflicts:</div>
          <div className={syncStatus.conflicts > 0 ? 'text-warning' : 'text-success'}>
            {syncStatus.conflicts}
          </div>
        </div>
      </div>

      {syncStatus.errors.length > 0 && (
        <div className="mt-2">
          <ErrorsList 
            errors={syncStatus.errors}
            onRetryError={onRetryError}
            onClearErrors={onClearErrors}
            compact
          />
        </div>
      )}
    </div>
  );
}

/**
 * Errors list component
 */
function ErrorsList({ 
  errors, 
  onRetryError, 
  onClearErrors, 
  compact = false 
}: {
  errors: SyncError[];
  onRetryError?: (errorId: string) => Promise<void>;
  onClearErrors?: () => void;
  compact?: boolean;
}) {
  const getErrorIcon = (type: SyncError['type']) => {
    switch (type) {
      case 'network': return '📡';
      case 'conflict': return '⚡';
      case 'validation': return '📝';
      case 'storage': return '💾';
      default: return '❌';
    }
  };

  const getErrorColor = (type: SyncError['type']) => {
    switch (type) {
      case 'network': return 'text-warning';
      case 'conflict': return 'text-info';
      case 'validation': return 'text-danger';
      case 'storage': return 'text-secondary';
      default: return 'text-danger';
    }
  };

  return (
    <div className={`border rounded p-2 ${compact ? 'bg-light' : ''}`}>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <small className="text-muted fw-semibold">Sync Errors ({errors.length})</small>
        {onClearErrors && errors.length > 0 && (
          <button
            type="button"
            className="btn btn-link btn-sm p-0 text-decoration-none"
            onClick={onClearErrors}
            aria-label="Clear all errors"
          >
            <small>Clear All</small>
          </button>
        )}
      </div>

      {errors.length === 0 ? (
        <div className="text-center py-2">
          <small className="text-muted">No sync errors</small>
        </div>
      ) : (
        <div className="list-group list-group-flush">
          {errors.map((error) => (
            <div key={error.id} className="list-group-item px-0 py-1 border-0">
              <div className="d-flex align-items-start justify-content-between">
                <div className="d-flex align-items-start flex-grow-1">
                  <span 
                    className={`me-2 ${getErrorColor(error.type)}`}
                    aria-hidden="true"
                  >
                    {getErrorIcon(error.type)}
                  </span>
                  <div className="flex-grow-1">
                    <div className="small fw-medium">{error.message}</div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                      {new Date(error.timestamp).toLocaleTimeString()} • {error.type}
                      {error.itemId && ` • Item: ${error.itemId.substring(0, 8)}...`}
                    </div>
                  </div>
                </div>
                
                {error.canRetry && onRetryError && (
                  <button
                    type="button"
                    className="btn btn-link btn-sm p-0 text-decoration-none"
                    onClick={() => onRetryError(error.id)}
                    aria-label={`Retry sync for error: ${error.message}`}
                  >
                    <small>Retry</small>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Quick sync status component for use in headers or sidebars
 */
export function QuickSyncStatus({ 
  syncStatus, 
  onManualSync, 
  compact = true 
}: {
  syncStatus: SyncStatus;
  onManualSync: () => Promise<void>;
  compact?: boolean;
}) {
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  const handleSync = useCallback(async () => {
    if (isManualSyncing || syncStatus.isSyncing || !syncStatus.isOnline) return;

    setIsManualSyncing(true);
    try {
      await onManualSync();
    } catch (error) {
      console.error('Quick sync failed:', error);
    } finally {
      setIsManualSyncing(false);
    }
  }, [isManualSyncing, syncStatus, onManualSync]);

  const getStatusBadge = () => {
    if (!syncStatus.isOnline) return { variant: 'secondary', text: 'Offline' };
    if (syncStatus.isSyncing || isManualSyncing) return { variant: 'info', text: 'Syncing' };
    if (syncStatus.conflicts > 0) return { variant: 'warning', text: `${syncStatus.conflicts} conflicts` };
    if (syncStatus.errors.length > 0) return { variant: 'danger', text: `${syncStatus.errors.length} errors` };
    if (syncStatus.pendingItems > 0) return { variant: 'warning', text: `${syncStatus.pendingItems} pending` };
    return { variant: 'success', text: 'Synced' };
  };

  const badge = getStatusBadge();

  return (
    <div className="d-flex align-items-center gap-2">
      <span className={`badge bg-${badge.variant}`}>
        {badge.text}
      </span>
      
      {compact && (
        <button
          type="button"
          className="btn btn-link btn-sm p-0"
          onClick={handleSync}
          disabled={!syncStatus.isOnline || syncStatus.isSyncing || isManualSyncing}
          aria-label="Quick sync"
          title="Sync now"
        >
          <i 
            className={`bi ${(syncStatus.isSyncing || isManualSyncing) ? 'bi-arrow-repeat rotating' : 'bi-arrow-repeat'}`}
            aria-hidden="true"
          ></i>
        </button>
      )}
    </div>
  );
}

/* Add this CSS to your global styles for the rotating animation */
/*
.rotating {
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
*/