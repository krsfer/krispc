'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { usePatternStore, type PatternState as StoreState } from '@/store';
import type { SavedPattern } from '@/types/pattern';
import PatternThumbnail from './PatternThumbnail';
import {
  exportAsText,
  exportAsJSON,
  exportAsPNG,
  downloadFile,
  copyToClipboard,
  generateFilename,
} from '@/lib/export/patternExport';
import styles from './PatternSidebar.module.css';
import { useToast } from '@/contexts/ToastContext';

interface PatternSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

type ExportFormat = 'text' | 'json' | 'png' | 'copy';

/**
 * PatternSidebar - Slide-in panel for pattern library management
 *
 * Features:
 * - Bootstrap Offcanvas slide-in animation
 * - Pattern list with thumbnails
 * - Search/filter patterns
 * - Load, delete, and export patterns
 * - Responsive design
 */
const PatternSidebar: React.FC<PatternSidebarProps> = ({ isOpen, onClose }) => {
  // Toast notifications
  const { showToast } = useToast();

  // Store state
  const savedPatterns = usePatternStore((state: StoreState) => state.savedPatterns);
  const isLoading = usePatternStore((state: StoreState) => state.isLoading);
  const saveError = usePatternStore((state: StoreState) => state.saveError);
  const setCurrentPattern = usePatternStore((state: StoreState) => state.setCurrentPattern);
  const deletePattern = usePatternStore((state: StoreState) => state.deletePattern);
  const loadPatterns = usePatternStore((state: StoreState) => state.loadPatterns);
  const clearSaveError = usePatternStore((state: StoreState) => state.clearSaveError);

  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [patternToDelete, setPatternToDelete] = useState<SavedPattern | null>(null);
  const [exportingPattern, setExportingPattern] = useState<SavedPattern | null>(null);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  // Load patterns when sidebar opens
  useEffect(() => {
    if (isOpen) {
      loadPatterns();
    }
  }, [isOpen, loadPatterns]);

  // Clear success message after delay
  useEffect(() => {
    if (exportSuccess) {
      const timer = setTimeout(() => setExportSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [exportSuccess]);

  // Filter patterns by search query
  const filteredPatterns = useMemo(() => {
    if (!searchQuery.trim()) {
      return savedPatterns;
    }

    const query = searchQuery.toLowerCase();
    return savedPatterns.filter((pattern: SavedPattern) => {
      // Search by name
      if (pattern.name.toLowerCase().includes(query)) {
        return true;
      }
      // Search by emoji
      if (pattern.sequence.some((emoji: string) => emoji.includes(query))) {
        return true;
      }
      return false;
    });
  }, [savedPatterns, searchQuery]);

  /**
   * Handle loading a pattern into the editor
   */
  const handleLoadPattern = useCallback(
    (pattern: SavedPattern) => {
      setCurrentPattern({
        id: pattern.id,
        name: pattern.name,
        sequence: pattern.sequence,
      });
      onClose();
    },
    [setCurrentPattern, onClose]
  );

  /**
   * Handle pattern deletion confirmation
   */
  const handleConfirmDelete = useCallback(async () => {
    if (patternToDelete) {
      await deletePattern(patternToDelete.id);
      setPatternToDelete(null);
    }
  }, [patternToDelete, deletePattern]);

  /**
   * Handle export action
   */
  const handleExport = useCallback(
    async (pattern: SavedPattern, format: ExportFormat) => {
      try {
        switch (format) {
          case 'text': {
            const text = exportAsText(pattern);
            const filename = generateFilename(pattern.name, 'txt');
            downloadFile(text, filename, 'text/plain');
            setExportSuccess('Downloaded as text');
            break;
          }
          case 'json': {
            const json = exportAsJSON(pattern);
            const filename = generateFilename(pattern.name, 'json');
            downloadFile(json, filename, 'application/json');
            setExportSuccess('Downloaded as JSON');
            break;
          }
          case 'png': {
            const blob = await exportAsPNG(pattern);
            const filename = generateFilename(pattern.name, 'png');
            downloadFile(blob, filename, 'image/png');
            setExportSuccess('Downloaded as PNG');
            break;
          }
          case 'copy': {
            const text = exportAsText(pattern);
            await copyToClipboard(text);

            // Show success toast
            showToast('✓ Pattern copied to clipboard');

            // Keep inline alert for redundancy in sidebar
            setExportSuccess('Copied to clipboard');
            break;
          }
        }
      } catch (error) {
        console.error('Export failed:', error);
        setExportSuccess(null);
      }
      setExportingPattern(null);
    },
    [showToast]
  );

  /**
   * Format date for display
   */
  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className={styles.offcanvasBackdrop}
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Offcanvas Sidebar */}
      <div
        className={styles.offcanvas}
        tabIndex={-1}
        role="dialog"
        aria-labelledby="patternSidebarLabel"
        aria-modal="true"
        style={{
          visibility: isOpen ? 'visible' : 'hidden',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s ease-in-out, visibility 0.3s',
        }}
      >
        {/* Header */}
        <div className={styles.offcanvasHeader}>
          <h5 className={styles.offcanvasTitle} id="patternSidebarLabel">
            Pattern Library
          </h5>
          <button
            type="button"
            className="btn-close"
            aria-label="Close pattern library"
            onClick={onClose}
          />
        </div>

        {/* Search */}
        <div className={styles.sidebarSearch}>
          <div className="input-group">
            <span className="input-group-text" aria-hidden="true">
              <i className="fas fa-search"></i>
            </span>
            <input
              type="search"
              className="form-control shadow-none"
              placeholder="Search patterns..."
              aria-label="Search patterns"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                <i className="fas fa-times"></i>
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className={styles.offcanvasBody}>
          {/* Error Alert */}
          {saveError && (
            <div
              className="alert alert-danger alert-dismissible fade show small"
              role="alert"
            >
              {saveError}
              <button
                type="button"
                className="btn-close"
                aria-label="Dismiss error"
                onClick={clearSaveError}
              />
            </div>
          )}

          {/* Success Message */}
          {exportSuccess && (
            <div
              className="alert alert-success small py-2"
              role="status"
              aria-live="polite"
            >
              <i className="fas fa-check-circle me-1"></i> {exportSuccess}
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className={styles.loadingState} role="status" aria-live="polite">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading patterns...</span>
              </div>
              <p className="mt-2 small">Loading your patterns...</p>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && filteredPatterns.length === 0 && (
            <div className={styles.emptyState} role="status">
              {searchQuery ? (
                <>
                  <div className={styles.emptyStateIcon}>🔍</div>
                  <h6>No patterns found</h6>
                  <p className="small">Try a different search term</p>
                </>
              ) : (
                <>
                  <div className={styles.emptyStateIcon}>🎨</div>
                  <h6>No patterns yet</h6>
                  <p className="small">Create your first pattern to get started!</p>
                </>
              )}
            </div>
          )}

          {/* Pattern List */}
          {!isLoading && filteredPatterns.length > 0 && (
            <ul className={styles.patternList} role="list">
              {filteredPatterns.map((pattern: SavedPattern) => (
                <li
                  key={pattern.id}
                  className={styles.patternItem}
                  role="listitem"
                >
                  <div
                    className={styles.patternItemContent}
                    onClick={() => handleLoadPattern(pattern)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleLoadPattern(pattern);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`Load pattern: ${pattern.name}`}
                  >
                    <PatternThumbnail
                      sequence={pattern.sequence}
                      size={48}
                      className={styles.patternThumbnailItem}
                    />
                    <div className={styles.patternInfo}>
                      <h6 className={styles.patternName}>{pattern.name}</h6>
                      <span className={styles.patternDate}>
                        {formatDate(new Date(pattern.updatedAt))}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className={styles.patternActions}>
                    <button
                      type="button"
                      className="btn btn-sm btn-light"
                      aria-label={`Export ${pattern.name}`}
                      title="Export"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExportingPattern(pattern);
                      }}
                    >
                      <i className="fas fa-download"></i>
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-light text-danger"
                      aria-label={`Delete ${pattern.name}`}
                      title="Delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPatternToDelete(pattern);
                      }}
                    >
                      <i className="fas fa-trash-alt"></i>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer with pattern count */}
        <div className={styles.offcanvasFooter}>
          <span className={styles.patternCount}>
            {filteredPatterns.length} pattern
            {filteredPatterns.length !== 1 ? 's' : ''}
            {searchQuery && ` matching "${searchQuery}"`}
          </span>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {patternToDelete && (
        <div
          className="modal fade show d-block"
          style={{ zIndex: 1080 }}
          tabIndex={-1}
          role="dialog"
          aria-labelledby="deleteModalLabel"
          aria-modal="true"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '1rem' }}>
              <div className="modal-header border-bottom-0">
                <h5 className="modal-title fw-bold" id="deleteModalLabel">
                  Delete Pattern
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Cancel delete"
                  onClick={() => setPatternToDelete(null)}
                />
              </div>
              <div className="modal-body py-0">
                <p>
                  Are you sure you want to delete{' '}
                  <strong>{patternToDelete.name}</strong>?
                </p>
                <p className="text-muted small">This action cannot be undone.</p>
              </div>
              <div className="modal-footer border-top-0 pt-0">
                <button
                  type="button"
                  className="btn btn-light fw-bold"
                  onClick={() => setPatternToDelete(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger fw-bold"
                  onClick={handleConfirmDelete}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
          <div
            className="modal-backdrop fade show"
            style={{ zIndex: 1070 }}
            onClick={() => setPatternToDelete(null)}
          />
        </div>
      )}

      {/* Export Options Modal */}
      {exportingPattern && (
        <div
          className="modal fade show d-block"
          style={{ zIndex: 1080 }}
          tabIndex={-1}
          role="dialog"
          aria-labelledby="exportModalLabel"
          aria-modal="true"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '1rem' }}>
              <div className="modal-header border-bottom-0">
                <h5 className="modal-title fw-bold" id="exportModalLabel">
                  Export Pattern
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Cancel export"
                  onClick={() => setExportingPattern(null)}
                />
              </div>
              <div className="modal-body">
                <p className="mb-3 small text-muted">
                  Choose export format for <strong>{exportingPattern.name}</strong>:
                </p>
                <div className="d-grid gap-2">
                  <button
                    type="button"
                    className="btn btn-outline-primary text-start d-flex align-items-center p-3"
                    onClick={() => handleExport(exportingPattern, 'copy')}
                  >
                    <i className="fas fa-copy me-3 fs-4"></i>
                    <div>
                      <div className="fw-bold">Copy to Clipboard</div>
                      <div className="small opacity-75">Quick copy emoji sequence</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-primary text-start d-flex align-items-center p-3"
                    onClick={() => handleExport(exportingPattern, 'png')}
                  >
                    <i className="fas fa-image me-3 fs-4"></i>
                    <div>
                      <div className="fw-bold">Download as PNG</div>
                      <div className="small opacity-75">High-quality image file</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-primary text-start d-flex align-items-center p-3"
                    onClick={() => handleExport(exportingPattern, 'text')}
                  >
                    <i className="fas fa-file-alt me-3 fs-4"></i>
                    <div>
                      <div className="fw-bold">Download as Text</div>
                      <div className="small opacity-75">Plain emoji sequence</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-primary text-start d-flex align-items-center p-3"
                    onClick={() => handleExport(exportingPattern, 'json')}
                  >
                    <i className="fas fa-code me-3 fs-4"></i>
                    <div>
                      <div className="fw-bold">Download as JSON</div>
                      <div className="small opacity-75">Full pattern data with metadata</div>
                    </div>
                  </button>
                </div>
              </div>
              <div className="modal-footer border-top-0 pt-0">
                <button
                  type="button"
                  className="btn btn-light fw-bold"
                  onClick={() => setExportingPattern(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
          <div
            className="modal-backdrop fade show"
            style={{ zIndex: 1070 }}
            onClick={() => setExportingPattern(null)}
          />
        </div>
      )}
    </>
  );
};

export default PatternSidebar;
