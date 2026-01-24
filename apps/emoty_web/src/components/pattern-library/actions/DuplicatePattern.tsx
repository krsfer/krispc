'use client';

import React, { useState } from 'react';
import type { PatternWithDetails } from '@/db/types';

interface DuplicatePatternProps {
  pattern: PatternWithDetails;
  onClose: () => void;
  onDuplicate: (newName: string, copyTags: boolean) => Promise<void>;
  isVisible: boolean;
}

export function DuplicatePattern({
  pattern,
  onClose,
  onDuplicate,
  isVisible
}: DuplicatePatternProps) {
  const [newName, setNewName] = useState(`${pattern.name} (Copy)`);
  const [copyTags, setCopyTags] = useState(true);
  const [isDuplicating, setIsDuplicating] = useState(false);

  const handleDuplicate = async () => {
    if (!newName.trim()) return;
    
    setIsDuplicating(true);
    try {
      await onDuplicate(newName.trim(), copyTags);
      onClose();
    } catch (error) {
      console.error('Duplication failed:', error);
    } finally {
      setIsDuplicating(false);
    }
  };

  const generateSuggestedName = () => {
    const now = new Date();
    const timestamp = now.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    return `${pattern.name} - ${timestamp}`;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && newName.trim()) {
      handleDuplicate();
    }
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Modal backdrop */}
      <div 
        className="modal-backdrop fade show" 
        onClick={onClose}
        style={{ zIndex: 1040 }}
      ></div>

      {/* Modal */}
      <div 
        className="modal fade show d-block" 
        tabIndex={-1}
        role="dialog"
        aria-labelledby="duplicateDialogTitle"
        aria-modal="true"
        style={{ zIndex: 1050 }}
        onKeyDown={handleKeyDown}
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="duplicateDialogTitle">
                <i className="bi bi-files me-2"></i>
                Duplicate Pattern
              </h5>
              <button
                type="button"
                className="btn-close"
                onClick={onClose}
                aria-label="Close"
              ></button>
            </div>

            <div className="modal-body">
              {/* Original pattern info */}
              <div className="original-pattern mb-3">
                <h6 className="text-muted">Original Pattern:</h6>
                <div className="d-flex align-items-center">
                  <div className="pattern-info">
                    <strong>{pattern.name}</strong>
                    {pattern.is_ai_generated && (
                      <span className="badge bg-info ms-2">
                        <i className="bi bi-stars"></i> AI
                      </span>
                    )}
                    <div className="text-muted small">
                      Created {new Date(pattern.created_at).toLocaleDateString()}
                      {pattern.tags && pattern.tags.length > 0 && (
                        <span className="ms-2">
                          • {pattern.tags.length} tag{pattern.tags.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* New name input */}
              <div className="mb-3">
                <label htmlFor="newPatternName" className="form-label">
                  New Pattern Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className={`form-control ${!newName.trim() ? 'is-invalid' : 'is-valid'}`}
                  id="newPatternName"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Enter name for the duplicated pattern"
                  autoFocus
                  disabled={isDuplicating}
                />
                {!newName.trim() && (
                  <div className="invalid-feedback">
                    Pattern name is required
                  </div>
                )}
              </div>

              {/* Name suggestions */}
              <div className="name-suggestions mb-3">
                <small className="text-muted">Suggestions:</small>
                <div className="mt-1">
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm me-2 mb-1"
                    onClick={() => setNewName(`${pattern.name} (Copy)`)}
                    disabled={isDuplicating}
                  >
                    {pattern.name} (Copy)
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm me-2 mb-1"
                    onClick={() => setNewName(generateSuggestedName())}
                    disabled={isDuplicating}
                  >
                    {generateSuggestedName()}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm mb-1"
                    onClick={() => setNewName(`${pattern.name} v2`)}
                    disabled={isDuplicating}
                  >
                    {pattern.name} v2
                  </button>
                </div>
              </div>

              {/* Copy options */}
              <div className="copy-options">
                <h6>Copy Options:</h6>
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="copyTags"
                    checked={copyTags}
                    onChange={(e) => setCopyTags(e.target.checked)}
                    disabled={isDuplicating}
                  />
                  <label className="form-check-label" htmlFor="copyTags">
                    Copy tags
                    {pattern.tags && pattern.tags.length > 0 && (
                      <div className="mt-1">
                        {pattern.tags.map(tag => (
                          <span key={tag} className="badge bg-secondary me-1">{tag}</span>
                        ))}
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Duplication info */}
              <div className="alert alert-info mt-3">
                <div className="d-flex align-items-start">
                  <i className="bi bi-info-circle me-2 mt-1"></i>
                  <div>
                    <strong>What will be copied:</strong>
                    <ul className="mb-0 mt-1">
                      <li>Pattern sequence and size</li>
                      <li>Palette information</li>
                      {copyTags && <li>Tags and metadata</li>}
                      <li>AI generation details (if applicable)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={isDuplicating}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleDuplicate}
                disabled={!newName.trim() || isDuplicating}
              >
                {isDuplicating ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status">
                      <span className="visually-hidden">Duplicating...</span>
                    </span>
                    Creating Copy...
                  </>
                ) : (
                  <>
                    <i className="bi bi-files me-2"></i>
                    Create Duplicate
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}