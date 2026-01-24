'use client';

import React from 'react';
import { FeatureGate } from '../feature-gate';

interface EmptyStateProps {
  hasFilters: boolean;
  onClearFilters: () => void;
  className?: string;
}

export function EmptyState({
  hasFilters,
  onClearFilters,
  className = ''
}: EmptyStateProps) {
  if (hasFilters) {
    return (
      <div className={`empty-state text-center py-5 ${className}`}>
        <div className="empty-state-icon mb-3">
          <i className="bi bi-funnel display-1 text-muted"></i>
        </div>
        <h3 className="h5 text-muted mb-3">No patterns match your filters</h3>
        <p className="text-muted mb-4">
          Try adjusting your search criteria or filters to find more patterns.
        </p>
        <button
          type="button"
          className="btn btn-outline-primary"
          onClick={onClearFilters}
        >
          <i className="bi bi-arrow-clockwise me-2"></i>
          Clear Filters
        </button>
      </div>
    );
  }

  return (
    <div className={`empty-state text-center py-5 ${className}`}>
      <div className="empty-state-icon mb-3">
        <i className="bi bi-grid-3x3-gap display-1 text-muted"></i>
      </div>
      <h3 className="h5 text-muted mb-3">No patterns yet</h3>
      <p className="text-muted mb-4">
        Start creating your first pattern to see it appear in your library.
      </p>
      <div className="d-flex gap-2 justify-content-center flex-wrap">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            // Navigate to pattern creation
            window.location.href = '/create';
          }}
        >
          <i className="bi bi-plus-circle me-2"></i>
          Create Pattern
        </button>
        <FeatureGate feature="ai_pattern_generation">
          <button
            type="button"
            className="btn btn-outline-primary"
            onClick={() => {
              // Navigate to AI pattern generation
              window.location.href = '/create?ai=true';
            }}
          >
            <i className="bi bi-stars me-2"></i>
            AI Generate
          </button>
        </FeatureGate>
        <FeatureGate feature="pattern_templates">
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => {
              // Navigate to templates
              window.location.href = '/templates';
            }}
          >
            <i className="bi bi-grid me-2"></i>
            Browse Templates
          </button>
        </FeatureGate>
      </div>
    </div>
  );
}