'use client';

import React, { useState } from 'react';
import FeatureGate from '../../feature-gate';

interface BatchActionsProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onBatchDelete: (patternIds: string[]) => Promise<void>;
  selectedPatternIds: string[];
  className?: string;
}

export function BatchActions({
  selectedCount,
  totalCount,
  onSelectAll,
  onClearSelection,
  onBatchDelete,
  selectedPatternIds,
  className = ''
}: BatchActionsProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleBatchDelete = async () => {
    setIsDeleting(true);
    try {
      await onBatchDelete(selectedPatternIds);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Failed to delete patterns:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBatchExport = async (format: 'png' | 'svg' | 'json') => {
    try {
      const response = await fetch('/api/patterns/batch-export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patternIds: selectedPatternIds,
          format
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `patterns-export-${Date.now()}.zip`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to export patterns:', error);
    }
  };

  const handleBatchFavorite = async (favorite: boolean) => {
    try {
      await fetch('/api/patterns/batch-favorite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patternIds: selectedPatternIds,
          favorite
        })
      });
      // Optionally refresh the patterns list
    } catch (error) {
      console.error('Failed to update favorites:', error);
    }
  };

  if (selectedCount === 0) return null;

  return (
    <div className={`batch-actions card mb-3 ${className}`}>
      <div className="card-body py-2">
        <div className="d-flex align-items-center justify-content-between">
          <div className="selection-info d-flex align-items-center">
            <span className="fw-semibold me-3">
              {selectedCount} of {totalCount} selected
            </span>
            <div className="btn-group btn-group-sm me-3" role="group">
              <button
                type="button"
                className="btn btn-outline-primary"
                onClick={selectedCount === totalCount ? onClearSelection : onSelectAll}
              >
                {selectedCount === totalCount ? (
                  <>
                    <i className="bi bi-square me-1"></i>
                    Deselect All
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-square me-1"></i>
                    Select All
                  </>
                )}
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={onClearSelection}
              >
                <i className="bi bi-x-circle me-1"></i>
                Clear
              </button>
            </div>
          </div>

          <div className="batch-actions-toolbar d-flex gap-2">
            {/* Favorites actions */}
            <FeatureGate feature="favorites_system">
              <div className="btn-group btn-group-sm" role="group">
                <button
                  type="button"
                  className="btn btn-outline-danger"
                  onClick={() => handleBatchFavorite(true)}
                  title="Add to favorites"
                >
                  <i className="bi bi-heart"></i>
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => handleBatchFavorite(false)}
                  title="Remove from favorites"
                >
                  <i className="bi bi-heart-fill"></i>
                </button>
              </div>
            </FeatureGate>

            {/* Export actions */}
            <FeatureGate feature="advanced_export">
              <div className="btn-group btn-group-sm" role="group">
                <button
                  type="button"
                  className="btn btn-outline-secondary dropdown-toggle"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                  title="Export selected patterns"
                >
                  <i className="bi bi-download me-1"></i>
                  Export
                </button>
                <ul className="dropdown-menu">
                  <li>
                    <button 
                      className="dropdown-item" 
                      onClick={() => handleBatchExport('png')}
                    >
                      <i className="bi bi-file-image me-2"></i>
                      Export as PNG
                    </button>
                  </li>
                  <li>
                    <button 
                      className="dropdown-item" 
                      onClick={() => handleBatchExport('svg')}
                    >
                      <i className="bi bi-file-code me-2"></i>
                      Export as SVG
                    </button>
                  </li>
                  <li>
                    <button 
                      className="dropdown-item" 
                      onClick={() => handleBatchExport('json')}
                    >
                      <i className="bi bi-file-code me-2"></i>
                      Export as JSON
                    </button>
                  </li>
                </ul>
              </div>
            </FeatureGate>

            {/* Delete action */}
            {showDeleteConfirm ? (
              <div className="d-flex align-items-center">
                <span className="text-danger me-2 small">
                  Delete {selectedCount} patterns?
                </span>
                <div className="btn-group btn-group-sm" role="group">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={handleBatchDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" role="status">
                          <span className="visually-hidden">Deleting...</span>
                        </span>
                        Deleting...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-trash me-1"></i>
                        Delete
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-outline-danger btn-sm"
                onClick={() => setShowDeleteConfirm(true)}
                title="Delete selected patterns"
              >
                <i className="bi bi-trash"></i>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}