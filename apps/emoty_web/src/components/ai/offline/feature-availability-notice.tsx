/**
 * Feature Availability Notice
 * Informs users about feature availability in offline mode
 * Provides clear expectations and alternative options
 */

'use client';

import React, { useState } from 'react';

export interface FeatureAvailabilityProps {
  isOnline: boolean;
  feature: string;
  onlineDescription: string;
  offlineDescription: string;
  offlineAlternative?: string;
  qualityComparison?: {
    online: number; // 0-1
    offline: number; // 0-1
  };
  showDismissed?: boolean;
  onDismiss?: () => void;
  className?: string;
  variant?: 'banner' | 'inline' | 'modal';
}

interface FeatureConfig {
  patternGeneration: {
    online: string;
    offline: string;
    alternative: string;
  };
  voiceCommands: {
    online: string;
    offline: string;
    alternative: string;
  };
  aiChat: {
    online: string;
    offline: string;
    alternative: string;
  };
  patternSharing: {
    online: string;
    offline: string;
    alternative: string;
  };
}

/**
 * Feature availability notice component
 */
export default function FeatureAvailabilityNotice({
  isOnline,
  feature,
  onlineDescription,
  offlineDescription,
  offlineAlternative,
  qualityComparison,
  showDismissed = true,
  onDismiss,
  className = '',
  variant = 'banner'
}: FeatureAvailabilityProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  if (isDismissed && !showDismissed) {
    return null;
  }

  const getAlertClass = () => {
    if (isOnline) {
      return 'alert-success';
    }
    
    // If offline alternative exists, show info; otherwise warning
    return offlineAlternative ? 'alert-info' : 'alert-warning';
  };

  const getIcon = () => {
    if (isOnline) {
      return '✅';
    }
    
    return offlineAlternative ? '💽' : '⚠️';
  };

  const renderQualityComparison = () => {
    if (!qualityComparison) return null;

    const onlineQuality = Math.round(qualityComparison.online * 100);
    const offlineQuality = Math.round(qualityComparison.offline * 100);

    return (
      <div className="mt-2 small">
        <div className="text-muted mb-1">Quality Comparison:</div>
        <div className="d-flex justify-content-between">
          <div>
            Online: 
            <span className="ms-1 text-success fw-bold">{onlineQuality}%</span>
          </div>
          <div>
            Offline: 
            <span className={`ms-1 fw-bold ${offlineQuality > 70 ? 'text-success' : offlineQuality > 50 ? 'text-warning' : 'text-danger'}`}>
              {offlineQuality}%
            </span>
          </div>
        </div>
        <div className="progress mt-1" style={{ height: '4px' }}>
          <div 
            className="progress-bar bg-success" 
            style={{ width: `${onlineQuality}%` }}
            aria-label={`Online quality: ${onlineQuality}%`}
          ></div>
          <div 
            className={`progress-bar ${offlineQuality > 70 ? 'bg-success' : offlineQuality > 50 ? 'bg-warning' : 'bg-danger'}`}
            style={{ width: `${offlineQuality}%`, opacity: 0.7 }}
            aria-label={`Offline quality: ${offlineQuality}%`}
          ></div>
        </div>
      </div>
    );
  };

  const renderBannerVariant = () => (
    <div 
      className={`alert ${getAlertClass()} alert-dismissible d-flex align-items-start ${className}`}
      role="alert"
      aria-live="polite"
    >
      <span 
        className="me-2 fs-5" 
        style={{ lineHeight: 1 }}
        aria-hidden="true"
        role="img"
        aria-label="Feature status"
      >
        {getIcon()}
      </span>
      
      <div className="flex-grow-1">
        <div className="fw-semibold mb-1">
          {feature} - {isOnline ? 'Full Functionality' : 'Offline Mode'}
        </div>
        
        <div className="small">
          {isOnline ? onlineDescription : offlineDescription}
        </div>
        
        {!isOnline && offlineAlternative && (
          <div className="mt-2 small">
            <strong>Alternative:</strong> {offlineAlternative}
          </div>
        )}
        
        {renderQualityComparison()}
      </div>
      
      {onDismiss && (
        <button
          type="button"
          className="btn-close"
          onClick={handleDismiss}
          aria-label="Dismiss notification"
        ></button>
      )}
    </div>
  );

  const renderInlineVariant = () => (
    <div className={`d-flex align-items-center text-muted small ${className}`}>
      <span className="me-1" aria-hidden="true">{getIcon()}</span>
      <span>
        {isOnline ? onlineDescription : offlineDescription}
      </span>
      {qualityComparison && (
        <span className="ms-2 badge bg-secondary">
          {Math.round((isOnline ? qualityComparison.online : qualityComparison.offline) * 100)}% quality
        </span>
      )}
    </div>
  );

  const renderModalVariant = () => (
    <div className={`modal fade ${className}`} tabIndex={-1} role="dialog">
      <div className="modal-dialog modal-dialog-centered" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title d-flex align-items-center">
              <span className="me-2" aria-hidden="true">{getIcon()}</span>
              {feature} Availability
            </h5>
            <button
              type="button"
              className="btn-close"
              onClick={handleDismiss}
              aria-label="Close"
            ></button>
          </div>
          <div className="modal-body">
            <div className="mb-3">
              <h6>Current Status:</h6>
              <p>{isOnline ? onlineDescription : offlineDescription}</p>
            </div>
            
            {!isOnline && offlineAlternative && (
              <div className="mb-3">
                <h6>Available Alternative:</h6>
                <p>{offlineAlternative}</p>
              </div>
            )}
            
            {renderQualityComparison()}
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleDismiss}
            >
              Understood
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  switch (variant) {
    case 'inline':
      return renderInlineVariant();
    case 'modal':
      return renderModalVariant();
    default:
      return renderBannerVariant();
  }
}

/**
 * Pre-configured feature notices for common use cases
 */
export const FeatureNotices = {
  PatternGeneration: ({ isOnline, ...props }: Omit<FeatureAvailabilityProps, 'feature' | 'onlineDescription' | 'offlineDescription' | 'offlineAlternative'>) => (
    <FeatureAvailabilityNotice
      isOnline={isOnline}
      feature="AI Pattern Generation"
      onlineDescription="Generate patterns using advanced AI with highest quality and creativity."
      offlineDescription="Generate patterns using local AI algorithms with excellent quality."
      offlineAlternative="Local pattern engine provides 80%+ user satisfaction with instant response times."
      qualityComparison={{ online: 0.95, offline: 0.82 }}
      {...props}
    />
  ),

  VoiceCommands: ({ isOnline, ...props }: Omit<FeatureAvailabilityProps, 'feature' | 'onlineDescription' | 'offlineDescription' | 'offlineAlternative'>) => (
    <FeatureAvailabilityNotice
      isOnline={isOnline}
      feature="Voice Commands"
      onlineDescription="Full voice recognition with cloud processing for multiple languages."
      offlineDescription="Basic voice commands available using browser's built-in speech recognition."
      offlineAlternative="Use keyboard shortcuts or touch interface for full functionality."
      qualityComparison={{ online: 0.90, offline: 0.65 }}
      {...props}
    />
  ),

  AIChat: ({ isOnline, ...props }: Omit<FeatureAvailabilityProps, 'feature' | 'onlineDescription' | 'offlineDescription' | 'offlineAlternative'>) => (
    <FeatureAvailabilityNotice
      isOnline={isOnline}
      feature="AI Assistant Chat"
      onlineDescription="Conversational AI assistant with contextual understanding and personalized help."
      offlineDescription="Local chat assistant with pre-built responses and educational content."
      offlineAlternative="Comprehensive offline help system with tutorials and troubleshooting guides."
      qualityComparison={{ online: 0.93, offline: 0.75 }}
      {...props}
    />
  ),

  PatternSharing: ({ isOnline, ...props }: Omit<FeatureAvailabilityProps, 'feature' | 'onlineDescription' | 'offlineDescription' | 'offlineAlternative'>) => (
    <FeatureAvailabilityNotice
      isOnline={isOnline}
      feature="Pattern Sharing"
      onlineDescription="Share patterns instantly with friends and the community."
      offlineDescription="Patterns saved locally and will sync when back online."
      offlineAlternative="Export patterns as images or files to share manually."
      qualityComparison={{ online: 1.0, offline: 0.7 }}
      {...props}
    />
  )
};

/**
 * Smart feature availability banner that shows different content based on connection
 */
export function SmartFeatureBanner({ 
  isOnline, 
  currentFeature, 
  className = '',
  onDismiss 
}: {
  isOnline: boolean;
  currentFeature?: 'pattern' | 'voice' | 'chat' | 'sharing';
  className?: string;
  onDismiss?: () => void;
}) {
  const [dismissed, setDismissed] = useState(false);

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  if (dismissed) return null;

  // Don't show banner if online - features work normally
  if (isOnline) return null;

  const getFeatureContent = () => {
    switch (currentFeature) {
      case 'pattern':
        return {
          title: 'Pattern Generation Available Offline',
          description: 'Creating patterns with local AI - high quality results without internet.',
          icon: '🎨'
        };
      case 'voice':
        return {
          title: 'Limited Voice Commands',
          description: 'Basic voice recognition available. Full features return when online.',
          icon: '🎤'
        };
      case 'chat':
        return {
          title: 'Offline Assistant Ready',
          description: 'Chat assistant available with local help content and tutorials.',
          icon: '💬'
        };
      case 'sharing':
        return {
          title: 'Patterns Saved Locally',
          description: 'Your patterns are safe and will sync when you\'re back online.',
          icon: '📱'
        };
      default:
        return {
          title: 'Working Offline',
          description: 'Full functionality available with local AI. Your work is automatically saved.',
          icon: '💽'
        };
    }
  };

  const content = getFeatureContent();

  return (
    <div 
      className={`alert alert-info alert-dismissible ${className}`}
      role="alert"
      aria-live="polite"
    >
      <div className="d-flex align-items-start">
        <span 
          className="me-2 fs-5"
          style={{ lineHeight: 1 }}
          aria-hidden="true"
        >
          {content.icon}
        </span>
        <div className="flex-grow-1">
          <div className="fw-semibold">{content.title}</div>
          <div className="small mt-1">{content.description}</div>
        </div>
        <button
          type="button"
          className="btn-close"
          onClick={handleDismiss}
          aria-label="Dismiss offline notice"
        ></button>
      </div>
    </div>
  );
}