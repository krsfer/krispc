'use client';

import React, { useState } from 'react';
import { useUser, useFeatureAccess } from '@/contexts/user-context';
import type { ShareCodeData } from '@/types/export';

interface SharePatternProps {
  patternId: string;
  patternName: string;
  onClose: () => void;
}

export function SharePattern({
  patternId,
  patternName,
  onClose
}: SharePatternProps) {
  const { user, actions } = useUser();
  const { hasAccess: canShare } = useFeatureAccess('pattern_sharing');
  
  const [shareData, setShareData] = useState<ShareCodeData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expirationDays, setExpirationDays] = useState(30);
  const [includeMetadata, setIncludeMetadata] = useState(true);

  const handleGenerateShareCode = async () => {
    if (!canShare) {
      setError('Pattern sharing requires intermediate level or higher');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/share/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patternId,
          options: {
            expirationDays: expirationDays || null,
            includeMetadata,
            compress: true,
          },
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setShareData({
          code: result.shareCode,
          url: result.shareUrl,
          expiresAt: result.expiresAt ? new Date(result.expiresAt) : undefined,
          pattern: {
            id: result.pattern.id,
            name: result.pattern.name,
            sequence: [],
            metadata: undefined,
          },
        });

        // Track sharing action
        await actions.trackAction('share_pattern', {
          patternId,
          shareCode: result.shareCode,
        });
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to generate share code');
      }
    } catch (err) {
      console.error('Share code generation error:', err);
      setError('Failed to generate share code');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyToClipboard = async (text: string, type: 'code' | 'url') => {
    try {
      await navigator.clipboard.writeText(text);
      
      // Show temporary success feedback
      const button = document.getElementById(`copy-${type}-btn`);
      if (button) {
        const originalText = button.textContent;
        button.textContent = 'Copied!';
        button.classList.add('btn-success');
        button.classList.remove('btn-outline-secondary');
        
        setTimeout(() => {
          button.textContent = originalText;
          button.classList.remove('btn-success');
          button.classList.add('btn-outline-secondary');
        }, 2000);
      }
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  if (!canShare) {
    return (
      <>
        {/* Modal backdrop */}
        <div 
          className="modal-backdrop fade show" 
          onClick={onClose}
          style={{ zIndex: 1040 }}
        />

        {/* Modal */}
        <div 
          className="modal fade show d-block" 
          tabIndex={-1}
          role="dialog"
          aria-labelledby="sharePatternTitle"
          aria-modal="true"
          style={{ zIndex: 1050 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title" id="sharePatternTitle">
                  <i className="bi bi-share me-2"></i>
                  Share Pattern
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={onClose}
                  aria-label="Close"
                />
              </div>

              <div className="modal-body text-center">
                <div className="alert alert-warning">
                  <i className="bi bi-lock me-2"></i>
                  <strong>Feature Locked</strong>
                  <p className="mb-0 mt-2">
                    Pattern sharing requires intermediate level or higher. 
                    Keep creating patterns to unlock this feature!
                  </p>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onClose}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Modal backdrop */}
      <div 
        className="modal-backdrop fade show" 
        onClick={onClose}
        style={{ zIndex: 1040 }}
      />

      {/* Modal */}
      <div 
        className="modal fade show d-block" 
        tabIndex={-1}
        role="dialog"
        aria-labelledby="sharePatternTitle"
        aria-modal="true"
        style={{ zIndex: 1050 }}
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="sharePatternTitle">
                <i className="bi bi-share me-2"></i>
                Share Pattern
              </h5>
              <button
                type="button"
                className="btn-close"
                onClick={onClose}
                aria-label="Close"
              />
            </div>

            <div className="modal-body">
              <div className="mb-3">
                <h6 className="fw-bold">{patternName}</h6>
                <p className="text-muted small mb-0">
                  Generate a share code to let others access this pattern
                </p>
              </div>

              {!shareData && (
                <>
                  {/* Share options */}
                  <div className="mb-3">
                    <label className="form-label">Expiration</label>
                    <select
                      className="form-select"
                      value={expirationDays}
                      onChange={(e) => setExpirationDays(parseInt(e.target.value))}
                    >
                      <option value={7}>7 days</option>
                      <option value={30}>30 days</option>
                      <option value={90}>90 days</option>
                      <option value={0}>Never expires</option>
                    </select>
                  </div>

                  <div className="form-check mb-3">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="includeMetadata"
                      checked={includeMetadata}
                      onChange={(e) => setIncludeMetadata(e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="includeMetadata">
                      Include pattern metadata
                      <div className="small text-muted">
                        Share creation date, complexity, and other details
                      </div>
                    </label>
                  </div>
                </>
              )}

              {/* Error display */}
              {error && (
                <div className="alert alert-danger">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  {error}
                </div>
              )}

              {/* Share code display */}
              {shareData && (
                <div className="border rounded p-3 bg-light">
                  <div className="mb-3">
                    <label className="form-label fw-bold">Share Code</label>
                    <div className="input-group">
                      <input
                        type="text"
                        className="form-control font-monospace"
                        value={shareData.code}
                        readOnly
                      />
                      <button
                        id="copy-code-btn"
                        className="btn btn-outline-secondary"
                        type="button"
                        onClick={() => handleCopyToClipboard(shareData.code, 'code')}
                      >
                        <i className="bi bi-clipboard me-1"></i>
                        Copy
                      </button>
                    </div>
                    <div className="form-text">
                      Others can enter this code to access your pattern
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-bold">Share URL</label>
                    <div className="input-group">
                      <input
                        type="text"
                        className="form-control small"
                        value={shareData.url}
                        readOnly
                      />
                      <button
                        id="copy-url-btn"
                        className="btn btn-outline-secondary"
                        type="button"
                        onClick={() => handleCopyToClipboard(shareData.url, 'url')}
                      >
                        <i className="bi bi-clipboard me-1"></i>
                        Copy
                      </button>
                    </div>
                    <div className="form-text">
                      Direct link to view the shared pattern
                    </div>
                  </div>

                  {shareData.expiresAt && (
                    <div className="alert alert-info small">
                      <i className="bi bi-clock me-2"></i>
                      Expires on {shareData.expiresAt.toLocaleDateString()}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
              >
                {shareData ? 'Done' : 'Cancel'}
              </button>
              
              {!shareData && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleGenerateShareCode}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status">
                        <span className="visually-hidden">Generating...</span>
                      </span>
                      Generating...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-share me-2"></i>
                      Generate Share Code
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}