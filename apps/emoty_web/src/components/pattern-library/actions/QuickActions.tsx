'use client';

import React, { useState } from 'react';
import FeatureGate from '../../feature-gate';
import type { PatternWithDetails } from '@/db/types';

interface QuickActionsProps {
  pattern: PatternWithDetails;
  onLoad: () => void;
  onDelete: () => void;
  onFavorite: (isFavorite: boolean) => void;
  onShare: () => void;
  className?: string;
}

export function QuickActions({
  pattern,
  onLoad,
  onDelete,
  onFavorite,
  onShare,
  className = ''
}: QuickActionsProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleAction = async (action: string, callback: () => void | Promise<void>) => {
    setIsLoading(action);
    try {
      await callback();
    } catch (error) {
      console.error(`Failed to ${action}:`, error);
    } finally {
      setIsLoading(null);
    }
  };

  const handleFavoriteToggle = async () => {
    try {
      const response = await fetch(`/api/patterns/${pattern.id}/favorite`, {
        method: pattern.is_favorited ? 'DELETE' : 'POST',
      });
      
      if (response.ok) {
        onFavorite(!pattern.is_favorited);
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const handleDuplicate = async () => {
    try {
      const response = await fetch(`/api/patterns/${pattern.id}/duplicate`, {
        method: 'POST',
      });
      
      if (response.ok) {
        // Optionally show success message or reload list
      }
    } catch (error) {
      console.error('Failed to duplicate pattern:', error);
    }
  };

  return (
    <div className={`quick-actions ${className}`}>
      <div className="btn-group" role="group" aria-label="Pattern actions">
        {/* Load pattern */}
        <button
          type="button"
          className="btn btn-outline-primary btn-sm"
          onClick={() => handleAction('load', onLoad)}
          disabled={!!isLoading}
          title="Load pattern into editor"
        >
          {isLoading === 'load' ? (
            <span className="spinner-border spinner-border-sm" role="status">
              <span className="visually-hidden">Loading...</span>
            </span>
          ) : (
            <i className="bi bi-download"></i>
          )}
        </button>

        {/* Favorite toggle */}
        <FeatureGate feature="favorites_system">
          <button
            type="button"
            className={`btn btn-sm ${
              pattern.is_favorited 
                ? 'btn-danger' 
                : 'btn-outline-secondary'
            }`}
            onClick={() => handleAction('favorite', handleFavoriteToggle)}
            disabled={!!isLoading}
            title={pattern.is_favorited ? 'Remove from favorites' : 'Add to favorites'}
          >
            {isLoading === 'favorite' ? (
              <span className="spinner-border spinner-border-sm" role="status">
                <span className="visually-hidden">Loading...</span>
              </span>
            ) : (
              <i className={`bi bi-heart${pattern.is_favorited ? '-fill' : ''}`}></i>
            )}
          </button>
        </FeatureGate>

        {/* Share pattern */}
        <FeatureGate feature="pattern_sharing">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={() => handleAction('share', onShare)}
            disabled={!!isLoading}
            title="Share pattern"
          >
            {isLoading === 'share' ? (
              <span className="spinner-border spinner-border-sm" role="status">
                <span className="visually-hidden">Loading...</span>
              </span>
            ) : (
              <i className="bi bi-share"></i>
            )}
          </button>
        </FeatureGate>

        {/* Duplicate pattern */}
        <FeatureGate feature="pattern_collaboration">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={() => handleAction('duplicate', handleDuplicate)}
            disabled={!!isLoading}
            title="Duplicate pattern"
          >
            {isLoading === 'duplicate' ? (
              <span className="spinner-border spinner-border-sm" role="status">
                <span className="visually-hidden">Loading...</span>
              </span>
            ) : (
              <i className="bi bi-files"></i>
            )}
          </button>
        </FeatureGate>

        {/* More actions dropdown */}
        <div className="btn-group" role="group">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm dropdown-toggle"
            data-bs-toggle="dropdown"
            aria-expanded="false"
            title="More actions"
          >
            <i className="bi bi-three-dots"></i>
          </button>
          <ul className="dropdown-menu">
            <li>
              <button 
                className="dropdown-item" 
                onClick={() => {
                  // View pattern details
                }}
              >
                <i className="bi bi-eye me-2"></i>
                View Details
              </button>
            </li>
            <FeatureGate feature="advanced_export">
              <li>
                <hr className="dropdown-divider" />
              </li>
              <li>
                <h6 className="dropdown-header">Export</h6>
              </li>
              <li>
                <button 
                  className="dropdown-item" 
                  onClick={() => {
                    // Export as PNG
                  }}
                >
                  <i className="bi bi-file-image me-2"></i>
                  Export as PNG
                </button>
              </li>
              <li>
                <button 
                  className="dropdown-item" 
                  onClick={() => {
                    // Export as SVG
                  }}
                >
                  <i className="bi bi-file-code me-2"></i>
                  Export as SVG
                </button>
              </li>
            </FeatureGate>
            <FeatureGate feature="pattern_collaboration">
              <li>
                <hr className="dropdown-divider" />
              </li>
              <li>
                <button 
                  className="dropdown-item text-danger" 
                  onClick={() => handleAction('delete', onDelete)}
                >
                  <i className="bi bi-trash me-2"></i>
                  Delete Pattern
                </button>
              </li>
            </FeatureGate>
          </ul>
        </div>
      </div>
    </div>
  );
}