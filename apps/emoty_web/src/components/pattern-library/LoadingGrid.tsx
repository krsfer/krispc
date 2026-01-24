'use client';

import React from 'react';
import type { ViewMode } from './PatternLibrary';

interface LoadingGridProps {
  count: number;
  viewMode: ViewMode;
  className?: string;
}

export function LoadingGrid({
  count,
  viewMode,
  className = ''
}: LoadingGridProps) {
  const skeletonItems = Array.from({ length: count }, (_, i) => i);

  if (viewMode === 'list') {
    return (
      <div className={`loading-grid-list ${className}`}>
        {skeletonItems.map(index => (
          <div key={index} className="list-group-item">
            <div className="d-flex align-items-center">
              {/* Preview skeleton */}
              <div 
                className="placeholder-glow me-3"
                style={{ width: '60px', height: '60px' }}
              >
                <div className="placeholder bg-secondary rounded w-100 h-100"></div>
              </div>

              {/* Content skeleton */}
              <div className="flex-grow-1">
                <div className="placeholder-glow">
                  <span className="placeholder col-6 mb-2"></span>
                  <div className="d-flex gap-3 mb-1">
                    <span className="placeholder col-2"></span>
                    <span className="placeholder col-2"></span>
                    <span className="placeholder col-2"></span>
                  </div>
                  <div className="d-flex gap-1">
                    <span className="placeholder col-1 rounded-pill"></span>
                    <span className="placeholder col-1 rounded-pill"></span>
                  </div>
                </div>
              </div>

              {/* Actions skeleton */}
              <div className="placeholder-glow">
                <div className="btn-group btn-group-sm">
                  <span className="placeholder btn btn-outline-secondary"></span>
                  <span className="placeholder btn btn-outline-secondary"></span>
                  <span className="placeholder btn btn-outline-secondary"></span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Grid view
  return (
    <div className={`loading-grid row g-3 ${className}`}>
      {skeletonItems.map(index => (
        <div key={index} className="col-12 col-sm-6 col-md-4">
          <div className="card h-100">
            {/* Preview skeleton */}
            <div 
              className="placeholder-glow"
              style={{ height: '200px' }}
            >
              <div className="placeholder bg-secondary w-100 h-100 rounded-top"></div>
            </div>

            {/* Content skeleton */}
            <div className="card-body">
              <div className="placeholder-glow">
                {/* Title */}
                <h5 className="card-title">
                  <span className="placeholder col-8"></span>
                </h5>
                
                {/* Meta info */}
                <div className="d-flex justify-content-between mb-2">
                  <span className="placeholder col-4"></span>
                  <span className="placeholder col-3"></span>
                </div>
                <div className="d-flex justify-content-between mb-3">
                  <span className="placeholder col-3"></span>
                  <span className="placeholder col-3"></span>
                </div>

                {/* Tags */}
                <div className="d-flex gap-1 mb-3">
                  <span className="placeholder col-2 rounded-pill"></span>
                  <span className="placeholder col-2 rounded-pill"></span>
                </div>

                {/* Actions */}
                <div className="d-flex gap-2">
                  <span className="placeholder btn btn-primary flex-grow-1"></span>
                  <span className="placeholder btn btn-outline-secondary"></span>
                  <span className="placeholder btn btn-outline-secondary"></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}