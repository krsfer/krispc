'use client';

import React, { useState, useEffect } from 'react';

interface DeleteConfirmationProps {
  patternName: string;
  patternCount?: number;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  isVisible: boolean;
}

export function DeleteConfirmation({
  patternName,
  patternCount = 1,
  onConfirm,
  onCancel,
  isVisible
}: DeleteConfirmationProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [countdown, setCountdown] = useState(5);

  const isMultiple = patternCount > 1;
  const requiredText = isMultiple ? 'DELETE PATTERNS' : 'DELETE';

  // Countdown timer for safety
  useEffect(() => {
    if (!isVisible) return;
    
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isVisible]);

  // Reset state when dialog opens
  useEffect(() => {
    if (isVisible) {
      setConfirmText('');
      setCountdown(5);
      setIsDeleting(false);
    }
  }, [isVisible]);

  const handleConfirm = async () => {
    if (confirmText !== requiredText || countdown > 0) return;
    
    setIsDeleting(true);
    try {
      await onConfirm();
    } catch (error) {
      console.error('Delete failed:', error);
      setIsDeleting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    } else if (e.key === 'Enter' && confirmText === requiredText && countdown === 0) {
      handleConfirm();
    }
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Modal backdrop */}
      <div 
        className="modal-backdrop fade show" 
        onClick={onCancel}
        style={{ zIndex: 1040 }}
      ></div>

      {/* Modal */}
      <div 
        className="modal fade show d-block" 
        tabIndex={-1}
        role="dialog"
        aria-labelledby="deleteConfirmTitle"
        aria-modal="true"
        style={{ zIndex: 1050 }}
        onKeyDown={handleKeyDown}
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-danger">
            <div className="modal-header bg-danger text-white">
              <h5 className="modal-title" id="deleteConfirmTitle">
                <i className="bi bi-exclamation-triangle me-2"></i>
                Confirm Deletion
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={onCancel}
                aria-label="Close"
              ></button>
            </div>

            <div className="modal-body">
              <div className="alert alert-danger" role="alert">
                <h6 className="alert-heading">
                  <i className="bi bi-shield-exclamation me-2"></i>
                  This action cannot be undone!
                </h6>
                <p className="mb-0">
                  {isMultiple ? (
                    <>You are about to permanently delete <strong>{patternCount} patterns</strong>.</>
                  ) : (
                    <>You are about to permanently delete the pattern <strong>&ldquo;{patternName}&rdquo;</strong>.</>
                  )}
                </p>
              </div>

              <div className="consequences mb-3">
                <h6>This will:</h6>
                <ul className="list-unstyled">
                  <li>
                    <i className="bi bi-x-circle text-danger me-2"></i>
                    Remove {isMultiple ? 'all selected patterns' : 'the pattern'} permanently
                  </li>
                  <li>
                    <i className="bi bi-x-circle text-danger me-2"></i>
                    Delete associated metadata and tags
                  </li>
                  <li>
                    <i className="bi bi-x-circle text-danger me-2"></i>
                    Remove from all favorites lists
                  </li>
                  {isMultiple && (
                    <li>
                      <i className="bi bi-x-circle text-danger me-2"></i>
                      Cannot be recovered once deleted
                    </li>
                  )}
                </ul>
              </div>

              {/* Safety confirmation */}
              <div className="safety-check">
                <label className="form-label">
                  To confirm, type <code className="text-danger">{requiredText}</code> below:
                </label>
                <input
                  type="text"
                  className={`form-control ${confirmText === requiredText ? 'is-valid' : confirmText ? 'is-invalid' : ''}`}
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                  placeholder={requiredText}
                  autoFocus
                  disabled={isDeleting}
                />
                {confirmText && confirmText !== requiredText && (
                  <div className="invalid-feedback">
                    Text must match exactly: {requiredText}
                  </div>
                )}
              </div>

              {/* Countdown */}
              {countdown > 0 && (
                <div className="countdown-notice mt-3">
                  <div className="alert alert-warning">
                    <i className="bi bi-clock me-2"></i>
                    Please wait {countdown} second{countdown !== 1 ? 's' : ''} before confirming...
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onCancel}
                disabled={isDeleting}
              >
                <i className="bi bi-x-circle me-2"></i>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleConfirm}
                disabled={confirmText !== requiredText || countdown > 0 || isDeleting}
              >
                {isDeleting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status">
                      <span className="visually-hidden">Deleting...</span>
                    </span>
                    Deleting...
                  </>
                ) : (
                  <>
                    <i className="bi bi-trash me-2"></i>
                    Delete {isMultiple ? `${patternCount} Patterns` : 'Pattern'}
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