'use client';

import React, { useState, useCallback, memo } from 'react';
import PatternCanvas from '../PatternCanvas';
import FeatureGate from '../feature-gate';
import { GridCell } from '@/types/pattern';
import type { PatternWithDetails } from '@/db/types';
import type { ViewMode } from './PatternLibrary';

interface PatternCardProps {
  pattern: PatternWithDetails;
  viewMode: ViewMode;
  isSelected: boolean;
  onSelect: () => void;
  onLoad: () => void;
  onView: () => void;
  onDelete: () => void;
  showSelection?: boolean;
  className?: string;
}

const PatternCard = memo(function PatternCard({
  pattern,
  viewMode,
  isSelected,
  onSelect,
  onLoad,
  onView,
  onDelete,
  showSelection = false,
  className = ''
}: PatternCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Parse pattern sequence to grid for canvas
  const patternGrid = React.useMemo(() => {
    try {
      const sequence = JSON.parse(pattern.sequence);
      const size = pattern.size || 8;
      const grid: GridCell[][] = [];
      
      // Initialize empty grid
      for (let i = 0; i < size; i++) {
        grid[i] = [];
        for (let j = 0; j < size; j++) {
          grid[i][j] = {
            emoji: '',
            row: i,
            col: j,
            layer: 0,
            isCenter: i === Math.floor(size / 2) && j === Math.floor(size / 2)
          };
        }
      }
      
      // Fill grid with pattern sequence
      let index = 0;
      for (let i = 0; i < size && index < sequence.length; i++) {
        for (let j = 0; j < size && index < sequence.length; j++) {
          grid[i][j].emoji = sequence[index++];
        }
      }
      
      return grid;
    } catch (error) {
      console.error('Failed to parse pattern sequence:', error);
      return [];
    }
  }, [pattern.sequence, pattern.size]);

  // Handle keyboard interactions
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === ' ' && showSelection) {
      e.preventDefault();
      onSelect();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      onView();
    }
  }, [showSelection, onSelect, onView]);

  // Format date
  const formatDate = (date: string | Date) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  // Get complexity display
  const getComplexityDisplay = () => {
    const rating = pattern.difficulty_rating || 2;
    return '🔥'.repeat(rating);
  };

  if (viewMode === 'list') {
    return (
      <div 
        className={`pattern-card-list list-group-item ${isSelected ? 'active' : ''} ${className}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="d-flex align-items-center">
          {/* Selection checkbox */}
          {showSelection && (
            <div className="form-check me-3">
              <input
                className="form-check-input"
                type="checkbox"
                checked={isSelected}
                onChange={onSelect}
                aria-label={`Select ${pattern.name}`}
              />
            </div>
          )}

          {/* Pattern preview */}
          <div className="pattern-preview-small me-3" style={{ width: '60px', height: '60px' }}>
            {!imageError && patternGrid.length > 0 ? (
              <PatternCanvas
                pattern={patternGrid}
                readonly
                cellSize={7}
                animationEnabled={false}
                className="rounded"
              />
            ) : (
              <div className="pattern-placeholder bg-secondary rounded d-flex align-items-center justify-content-center h-100">
                <i className="bi bi-grid-3x3 text-white"></i>
              </div>
            )}
          </div>

          {/* Pattern info */}
          <div className="flex-grow-1">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <h6 className="mb-1">
                  {pattern.name}
                  {pattern.is_ai_generated && (
                    <span className="badge bg-info ms-2" title="AI Generated">
                      <i className="bi bi-stars"></i> AI
                    </span>
                  )}
                  {pattern.is_favorited && (
                    <i className="bi bi-heart-fill text-danger ms-2" title="Favorite"></i>
                  )}
                </h6>
                <div className="text-muted small">
                  <span className="me-3">
                    <i className="bi bi-calendar me-1"></i>
                    {formatDate(pattern.created_at)}
                  </span>
                  <span className="me-3">
                    <i className="bi bi-eye me-1"></i>
                    {pattern.view_count}
                  </span>
                  <span className="me-3">
                    <i className="bi bi-hand-thumbs-up me-1"></i>
                    {pattern.like_count}
                  </span>
                  <span>{getComplexityDisplay()}</span>
                </div>
                {pattern.tags && pattern.tags.length > 0 && (
                  <div className="mt-1">
                    {pattern.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="badge bg-secondary me-1">{tag}</span>
                    ))}
                    {pattern.tags.length > 3 && (
                      <span className="text-muted small">+{pattern.tags.length - 3} more</span>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="pattern-actions">
                <div className="btn-group btn-group-sm" role="group">
                  <button
                    type="button"
                    className="btn btn-outline-primary"
                    onClick={onLoad}
                    title="Load Pattern"
                    aria-label={`Load ${pattern.name}`}
                  >
                    <i className="bi bi-download"></i>
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={onView}
                    title="View Details"
                    aria-label={`View details for ${pattern.name}`}
                  >
                    <i className="bi bi-eye"></i>
                  </button>
                  <FeatureGate feature="pattern_collaboration">
                    <button
                      type="button"
                      className="btn btn-outline-danger"
                      onClick={onDelete}
                      title="Delete Pattern"
                      aria-label={`Delete ${pattern.name}`}
                    >
                      <i className="bi bi-trash"></i>
                    </button>
                  </FeatureGate>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Grid view
  return (
    <div 
      className={`pattern-card card h-100 ${isHovered ? 'shadow' : ''} ${isSelected ? 'border-primary' : ''} ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="article"
      aria-label={`Pattern: ${pattern.name}`}
    >
      {/* Selection checkbox */}
      {showSelection && (
        <div className="position-absolute top-0 start-0 p-2" style={{ zIndex: 10 }}>
          <div className="form-check">
            <input
              className="form-check-input"
              type="checkbox"
              checked={isSelected}
              onChange={onSelect}
              onClick={(e) => e.stopPropagation()}
              aria-label={`Select ${pattern.name}`}
            />
          </div>
        </div>
      )}

      {/* AI Generated badge */}
      {pattern.is_ai_generated && (
        <div className="position-absolute top-0 end-0 p-2" style={{ zIndex: 10 }}>
          <span className="badge bg-info" title="AI Generated">
            <i className="bi bi-stars"></i> AI
          </span>
        </div>
      )}

      {/* Pattern preview */}
      <div 
        className="pattern-preview position-relative"
        style={{ height: '200px', cursor: 'pointer' }}
        onClick={onView}
      >
        {!imageError && patternGrid.length > 0 ? (
          <PatternCanvas
            pattern={patternGrid}
            readonly
            cellSize={20}
            animationEnabled={isHovered}
            className="w-100 h-100"
          />
        ) : (
          <div className="pattern-placeholder bg-light d-flex align-items-center justify-content-center h-100">
            <i className="bi bi-grid-3x3 text-muted display-3"></i>
          </div>
        )}
        
        {/* Hover overlay */}
        {isHovered && (
          <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-dark bg-opacity-50 rounded-top">
            <button 
              className="btn btn-light btn-sm"
              onClick={(e) => {
                e.stopPropagation();
                onView();
              }}
            >
              <i className="bi bi-eye me-2"></i>
              View Details
            </button>
          </div>
        )}
      </div>

      {/* Pattern info */}
      <div className="card-body">
        <h5 className="card-title d-flex justify-content-between align-items-start">
          <span className="text-truncate">{pattern.name}</span>
          {pattern.is_favorited && (
            <i className="bi bi-heart-fill text-danger" title="Favorite"></i>
          )}
        </h5>
        
        <div className="pattern-meta text-muted small mb-2">
          <div className="d-flex justify-content-between">
            <span>
              <i className="bi bi-calendar me-1"></i>
              {formatDate(pattern.created_at)}
            </span>
            <span>{getComplexityDisplay()}</span>
          </div>
          <div className="d-flex justify-content-between mt-1">
            <span>
              <i className="bi bi-eye me-1"></i>
              {pattern.view_count} views
            </span>
            <span>
              <i className="bi bi-hand-thumbs-up me-1"></i>
              {pattern.like_count} likes
            </span>
          </div>
        </div>

        {/* Tags */}
        {pattern.tags && pattern.tags.length > 0 && (
          <div className="pattern-tags mb-2">
            {pattern.tags.slice(0, 2).map(tag => (
              <span key={tag} className="badge bg-secondary me-1">{tag}</span>
            ))}
            {pattern.tags.length > 2 && (
              <span className="text-muted small">+{pattern.tags.length - 2}</span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="pattern-actions d-flex gap-2">
          <button
            className="btn btn-primary btn-sm flex-grow-1"
            onClick={(e) => {
              e.stopPropagation();
              onLoad();
            }}
            aria-label={`Load ${pattern.name}`}
          >
            <i className="bi bi-download me-1"></i>
            Load
          </button>
          <FeatureGate feature="pattern_sharing">
            <button
              className="btn btn-outline-secondary btn-sm"
              onClick={(e) => {
                e.stopPropagation();
                // Share functionality will be implemented
              }}
              aria-label={`Share ${pattern.name}`}
            >
              <i className="bi bi-share"></i>
            </button>
          </FeatureGate>
          <FeatureGate feature="pattern_collaboration">
            <button
              className="btn btn-outline-danger btn-sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              aria-label={`Delete ${pattern.name}`}
            >
              <i className="bi bi-trash"></i>
            </button>
          </FeatureGate>
        </div>
      </div>
    </div>
  );
});

export default PatternCard;