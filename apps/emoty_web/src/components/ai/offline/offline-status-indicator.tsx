/**
 * Offline Status Indicator
 * Visual indicator for AI system status and offline capability
 * Provides clear user feedback about system state and available features
 */

'use client';

import React, { useState, useEffect } from 'react';
import type { SystemHealthReport } from '@/lib/ai/fallback-orchestrator';
import type { CacheStats } from '@/lib/ai/cache/smart-cache';

export interface OfflineStatusProps {
  healthReport?: SystemHealthReport;
  onManualSync?: () => void;
  onShowDetails?: () => void;
  className?: string;
  showDetailedStatus?: boolean;
  compact?: boolean;
}

export interface ConnectionStatus {
  isOnline: boolean;
  aiServicesAvailable: boolean;
  localFunctionalityAvailable: boolean;
  lastSyncTime?: number;
  qualityLevel: 'high' | 'medium' | 'low';
}

/**
 * Main offline status indicator component
 */
export default function OfflineStatusIndicator({
  healthReport,
  onManualSync,
  onShowDetails,
  className = '',
  showDetailedStatus = false,
  compact = false
}: OfflineStatusProps) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    aiServicesAvailable: false,
    localFunctionalityAvailable: true,
    qualityLevel: 'medium'
  });

  const [showTooltip, setShowTooltip] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(Date.now());

  useEffect(() => {
    // Update connection status based on health report
    if (healthReport) {
      setConnectionStatus(prev => ({
        ...prev,
        isOnline: healthReport.isOnline,
        aiServicesAvailable: healthReport.services.some(s => s.health.isHealthy),
        qualityLevel: healthReport.overallHealth > 0.8 ? 'high' : 
                     healthReport.overallHealth > 0.6 ? 'medium' : 'low',
        lastSyncTime: Date.now()
      }));
      setLastUpdateTime(Date.now());
    }
  }, [healthReport]);

  useEffect(() => {
    // Listen for online/offline events
    const handleOnline = () => setConnectionStatus(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setConnectionStatus(prev => ({ ...prev, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getStatusIcon = () => {
    if (!connectionStatus.isOnline) {
      return { icon: '📴', color: 'text-warning', bg: 'bg-warning' };
    }
    
    if (connectionStatus.aiServicesAvailable) {
      return { icon: '🤖', color: 'text-success', bg: 'bg-success' };
    }
    
    if (connectionStatus.localFunctionalityAvailable) {
      return { icon: '💽', color: 'text-info', bg: 'bg-info' };
    }
    
    return { icon: '⚠️', color: 'text-danger', bg: 'bg-danger' };
  };

  const getStatusText = () => {
    if (!connectionStatus.isOnline) {
      return {
        en: 'Offline Mode - Local AI Available',
        fr: 'Mode Hors Ligne - IA Locale Disponible'
      };
    }
    
    if (connectionStatus.aiServicesAvailable) {
      return {
        en: 'Online - Full AI Services',
        fr: 'En Ligne - Services IA Complets'
      };
    }
    
    if (connectionStatus.localFunctionalityAvailable) {
      return {
        en: 'Local Mode - High Quality Patterns',
        fr: 'Mode Local - Motifs Haute Qualité'
      };
    }
    
    return {
      en: 'Limited Functionality',
      fr: 'Fonctionnalité Limitée'
    };
  };

  const getQualityIndicator = () => {
    const quality = connectionStatus.qualityLevel;
    const indicators = {
      high: { dots: '●●●', color: 'text-success', label: { en: 'High Quality', fr: 'Haute Qualité' } },
      medium: { dots: '●●○', color: 'text-warning', label: { en: 'Good Quality', fr: 'Bonne Qualité' } },
      low: { dots: '●○○', color: 'text-danger', label: { en: 'Basic Quality', fr: 'Qualité de Base' } }
    };
    return indicators[quality];
  };

  const status = getStatusIcon();
  const statusText = getStatusText();
  const quality = getQualityIndicator();

  if (compact) {
    return (
      <div 
        className={`d-flex align-items-center ${className}`}
        role="status"
        aria-label={statusText.en}
      >
        <span className={`me-1 ${status.color}`} aria-hidden="true">
          {status.icon}
        </span>
        <small className={`${status.color} fw-medium`}>
          {statusText.en}
        </small>
      </div>
    );
  }

  return (
    <div className={`border rounded p-3 ${className}`} role="region" aria-label="AI System Status">
      <div className="d-flex align-items-center justify-content-between mb-2">
        <div className="d-flex align-items-center">
          <span 
            className={`me-2 fs-5 ${status.color}`} 
            aria-hidden="true"
            role="img"
            aria-label="Status icon"
          >
            {status.icon}
          </span>
          <div>
            <div className={`fw-semibold ${status.color}`}>
              {statusText.en}
            </div>
            {showDetailedStatus && (
              <small className="text-muted">
                Quality: <span className={quality.color}>{quality.dots}</span> {quality.label.en}
              </small>
            )}
          </div>
        </div>
        
        {onShowDetails && (
          <button
            type="button"
            className="btn btn-link btn-sm p-0"
            onClick={onShowDetails}
            aria-label="Show detailed status"
          >
            <i className="bi bi-info-circle" aria-hidden="true"></i>
          </button>
        )}
      </div>

      {showDetailedStatus && healthReport && (
        <div className="mt-2">
          <hr className="my-2" />
          <DetailedStatusView healthReport={healthReport} />
        </div>
      )}

      {!connectionStatus.isOnline && (
        <div className="mt-2">
          <div className="alert alert-info py-2 mb-2" role="alert">
            <small>
              <i className="bi bi-info-circle me-1" aria-hidden="true"></i>
              Working offline with local AI. Patterns will sync when back online.
            </small>
          </div>
          {onManualSync && (
            <button
              type="button"
              className="btn btn-outline-primary btn-sm"
              onClick={onManualSync}
              disabled={!connectionStatus.isOnline}
            >
              <i className="bi bi-arrow-repeat me-1" aria-hidden="true"></i>
              Sync Now
            </button>
          )}
        </div>
      )}

      {connectionStatus.lastSyncTime && (
        <div className="mt-2">
          <small className="text-muted">
            Last updated: {new Date(connectionStatus.lastSyncTime).toLocaleTimeString()}
          </small>
        </div>
      )}
    </div>
  );
}

/**
 * Detailed status view component
 */
function DetailedStatusView({ healthReport }: { healthReport: SystemHealthReport }) {
  return (
    <div className="small">
      <div className="row g-2">
        <div className="col-6">
          <div className="text-muted">Connection:</div>
          <div className={healthReport.isOnline ? 'text-success' : 'text-warning'}>
            {healthReport.isOnline ? 'Online' : 'Offline'}
          </div>
        </div>
        <div className="col-6">
          <div className="text-muted">Cache:</div>
          <div className="text-info">
            {healthReport.cacheStats.offlineCapableEntries} patterns ready
          </div>
        </div>
      </div>
      
      <div className="row g-2 mt-1">
        <div className="col-6">
          <div className="text-muted">API Success:</div>
          <div className="text-success">
            {Math.round((healthReport.metrics.apiSuccesses / Math.max(1, healthReport.metrics.totalRequests)) * 100)}%
          </div>
        </div>
        <div className="col-6">
          <div className="text-muted">Local Fallback:</div>
          <div className="text-info">
            {Math.round((healthReport.metrics.localFallbacks / Math.max(1, healthReport.metrics.totalRequests)) * 100)}%
          </div>
        </div>
      </div>

      {healthReport.services.length > 0 && (
        <div className="mt-2">
          <div className="text-muted mb-1">AI Services:</div>
          {healthReport.services.map((service, index) => (
            <div key={index} className="d-flex justify-content-between align-items-center">
              <span>{service.name}</span>
              <span className={service.health.isHealthy ? 'text-success' : 'text-danger'}>
                {service.health.isHealthy ? '✓' : '✗'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}