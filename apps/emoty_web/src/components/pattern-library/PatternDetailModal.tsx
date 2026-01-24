'use client';

import React, { useState, useCallback, useEffect } from 'react';
import PatternCanvas from '../PatternCanvas';
import FeatureGate from '../feature-gate';
import { useUser } from '@/contexts/user-context';
import { GridCell } from '@/types/pattern';
import type { PatternWithDetails } from '@/db/types';

interface PatternDetailModalProps {
  pattern: PatternWithDetails;
  onClose: () => void;
  onLoad: () => void;
  onDelete: () => void;
  onUpdate: (pattern: PatternWithDetails) => void;
}

export default function PatternDetailModal({
  pattern,
  onClose,
  onLoad,
  onDelete,
  onUpdate
}: PatternDetailModalProps) {
  const { actions } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(pattern.name);
  const [editedTags, setEditedTags] = useState(pattern.tags?.join(', ') || '');
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  // Parse pattern sequence to grid
  const patternGrid = React.useMemo(() => {
    try {
      const sequence = JSON.parse(pattern.sequence);
      const size = pattern.size || 8;
      const grid: GridCell[][] = [];
      
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

  // Generate share URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setShareUrl(`${window.location.origin}/patterns/${pattern.id}`);
    }
  }, [pattern.id]);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!editedName.trim()) return;
    
    setIsSaving(true);
    try {
      const response = await fetch(`/api/patterns/${pattern.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editedName.trim(),
          tags: editedTags.split(',').map(t => t.trim()).filter(Boolean)
        })
      });

      if (response.ok) {
        const updatedPattern = await response.json();
        onUpdate(updatedPattern);
        setIsEditing(false);
        
        // Track update action
        actions.trackAction('update_pattern', { patternId: pattern.id });
      }
    } catch (error) {
      console.error('Failed to update pattern:', error);
    } finally {
      setIsSaving(false);
    }
  }, [editedName, editedTags, pattern.id, onUpdate, actions]);

  // Handle delete
  const handleDelete = useCallback(async () => {
    try {
      const response = await fetch(`/api/patterns/${pattern.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onDelete();
        actions.trackAction('delete_pattern', { patternId: pattern.id });
      }
    } catch (error) {
      console.error('Failed to delete pattern:', error);
    }
  }, [pattern.id, onDelete, actions]);

  // Handle share
  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: pattern.name,
          text: `Check out this pattern: ${pattern.name}`,
          url: shareUrl
        });
        actions.trackAction('share_pattern', { patternId: pattern.id, method: 'native' });
      } catch (error) {
        // User cancelled share
      }
    } else {
      // Fallback to copy URL
      handleCopyLink();
    }
  }, [pattern, shareUrl, actions]);

  // Handle copy link
  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
      actions.trackAction('share_pattern', { patternId: pattern.id, method: 'copy' });
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  }, [shareUrl, pattern.id, actions]);

  // Handle duplicate
  const handleDuplicate = useCallback(async () => {
    try {
      const response = await fetch(`/api/patterns/${pattern.id}/duplicate`, {
        method: 'POST',
      });

      if (response.ok) {
        const newPattern = await response.json();
        actions.trackAction('duplicate_pattern', { 
          originalId: pattern.id, 
          newId: newPattern.id 
        });
        // Optionally load the duplicated pattern
        onLoad();
        onClose();
      }
    } catch (error) {
      console.error('Failed to duplicate pattern:', error);
    }
  }, [pattern.id, actions, onLoad, onClose]);

  // Handle export
  const handleExport = useCallback(async (format: 'png' | 'svg' | 'json') => {
    try {
      const response = await fetch(`/api/patterns/${pattern.id}/export?format=${format}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${pattern.name}.${format}`;
        a.click();
        URL.revokeObjectURL(url);
        
        actions.trackAction('export_pattern', { 
          patternId: pattern.id, 
          format 
        });
      }
    } catch (error) {
      console.error('Failed to export pattern:', error);
    }
  }, [pattern, actions]);

  // Format date
  const formatDate = (date: string | Date) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get complexity display
  const getComplexityDisplay = () => {
    const rating = pattern.difficulty_rating || 2;
    return '🔥'.repeat(rating);
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showDeleteConfirm) {
          setShowDeleteConfirm(false);
        } else if (isEditing) {
          setIsEditing(false);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isEditing, showDeleteConfirm]);

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
        aria-labelledby="patternDetailTitle"
        aria-modal="true"
        style={{ zIndex: 1050 }}
      >
        <div className="modal-dialog modal-lg modal-dialog-centered">
          <div className="modal-content">
            {/* Header */}
            <div className="modal-header">
              {isEditing ? (
                <input
                  type="text"
                  className="form-control form-control-lg"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  placeholder="Pattern name"
                  autoFocus
                />
              ) : (
                <h5 className="modal-title" id="patternDetailTitle">
                  {pattern.name}
                  {pattern.is_ai_generated && (
                    <span className="badge bg-info ms-2">
                      <i className="bi bi-stars"></i> AI Generated
                    </span>
                  )}
                  {pattern.is_favorited && (
                    <i className="bi bi-heart-fill text-danger ms-2"></i>
                  )}
                </h5>
              )}
              <button
                type="button"
                className="btn-close"
                onClick={onClose}
                aria-label="Close"
              ></button>
            </div>

            {/* Body */}
            <div className="modal-body">
              <div className="row">
                {/* Pattern preview */}
                <div className="col-12 col-md-6 mb-3">
                  <div className="pattern-preview-large" style={{ height: '300px' }}>
                    <PatternCanvas
                      pattern={patternGrid}
                      readonly
                      cellSize={30}
                      animationEnabled
                      className="w-100 h-100 border rounded"
                    />
                  </div>
                  
                  {/* Pattern stats */}
                  <div className="pattern-stats mt-3">
                    <div className="row text-center">
                      <div className="col-4">
                        <div className="stat-value h5 mb-1">{pattern.view_count}</div>
                        <div className="stat-label text-muted small">Views</div>
                      </div>
                      <div className="col-4">
                        <div className="stat-value h5 mb-1">{pattern.like_count}</div>
                        <div className="stat-label text-muted small">Likes</div>
                      </div>
                      <div className="col-4">
                        <div className="stat-value h5 mb-1">{getComplexityDisplay()}</div>
                        <div className="stat-label text-muted small">Complexity</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pattern details */}
                <div className="col-12 col-md-6">
                  {/* Metadata */}
                  <div className="pattern-metadata mb-3">
                    <div className="mb-2">
                      <strong>Created:</strong> {formatDate(pattern.created_at)}
                    </div>
                    <div className="mb-2">
                      <strong>Size:</strong> {pattern.size}x{pattern.size} grid
                    </div>
                    <div className="mb-2">
                      <strong>Emojis:</strong> {JSON.parse(pattern.sequence).length} total
                    </div>
                    {pattern.user_username && (
                      <div className="mb-2">
                        <strong>Creator:</strong> {pattern.user_username}
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  <div className="pattern-tags mb-3">
                    <strong>Tags:</strong>
                    {isEditing ? (
                      <input
                        type="text"
                        className="form-control mt-1"
                        value={editedTags}
                        onChange={(e) => setEditedTags(e.target.value)}
                        placeholder="Enter tags separated by commas"
                      />
                    ) : (
                      <div className="mt-1">
                        {pattern.tags && pattern.tags.length > 0 ? (
                          pattern.tags.map(tag => (
                            <span key={tag} className="badge bg-secondary me-1">{tag}</span>
                          ))
                        ) : (
                          <span className="text-muted">No tags</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* AI Generation info */}
                  {pattern.is_ai_generated && pattern.generation_prompt && (
                    <div className="ai-generation-info alert alert-info">
                      <h6 className="alert-heading">
                        <i className="bi bi-stars me-2"></i>
                        AI Generation Prompt
                      </h6>
                      <p className="mb-0 small">{pattern.generation_prompt}</p>
                    </div>
                  )}

                  {/* Share section */}
                  <FeatureGate feature="pattern_sharing">
                    <div className="share-section mb-3">
                      <strong>Share:</strong>
                      <div className="input-group mt-1">
                        <input
                          type="text"
                          className="form-control"
                          value={shareUrl}
                          readOnly
                        />
                        <button
                          className="btn btn-outline-secondary"
                          onClick={handleCopyLink}
                        >
                          {copySuccess ? (
                            <>
                              <i className="bi bi-check-lg me-1"></i>
                              Copied!
                            </>
                          ) : (
                            <>
                              <i className="bi bi-clipboard me-1"></i>
                              Copy
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </FeatureGate>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="modal-footer">
              {showDeleteConfirm ? (
                <>
                  <span className="text-danger me-auto">Are you sure you want to delete this pattern?</span>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={handleDelete}
                  >
                    <i className="bi bi-trash me-2"></i>
                    Delete Forever
                  </button>
                </>
              ) : isEditing ? (
                <>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setIsEditing(false);
                      setEditedName(pattern.name);
                      setEditedTags(pattern.tags?.join(', ') || '');
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleSave}
                    disabled={isSaving || !editedName.trim()}
                  >
                    {isSaving ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status">
                          <span className="visually-hidden">Saving...</span>
                        </span>
                        Saving...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-lg me-2"></i>
                        Save Changes
                      </>
                    )}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={onLoad}
                  >
                    <i className="bi bi-download me-2"></i>
                    Load Pattern
                  </button>
                  
                  <FeatureGate feature="pattern_collaboration">
                    <button
                      type="button"
                      className="btn btn-outline-primary"
                      onClick={handleDuplicate}
                    >
                      <i className="bi bi-files me-2"></i>
                      Duplicate
                    </button>
                  </FeatureGate>

                  <FeatureGate feature="advanced_export">
                    <div className="btn-group" role="group">
                      <button
                        type="button"
                        className="btn btn-outline-secondary dropdown-toggle"
                        data-bs-toggle="dropdown"
                        aria-expanded="false"
                      >
                        <i className="bi bi-download me-2"></i>
                        Export
                      </button>
                      <ul className="dropdown-menu">
                        <li>
                          <button className="dropdown-item" onClick={() => handleExport('png')}>
                            <i className="bi bi-file-image me-2"></i>
                            Export as PNG
                          </button>
                        </li>
                        <li>
                          <button className="dropdown-item" onClick={() => handleExport('svg')}>
                            <i className="bi bi-file-code me-2"></i>
                            Export as SVG
                          </button>
                        </li>
                        <li>
                          <button className="dropdown-item" onClick={() => handleExport('json')}>
                            <i className="bi bi-file-code me-2"></i>
                            Export as JSON
                          </button>
                        </li>
                      </ul>
                    </div>
                  </FeatureGate>

                  <FeatureGate feature="pattern_sharing">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={handleShare}
                    >
                      <i className="bi bi-share me-2"></i>
                      Share
                    </button>
                  </FeatureGate>

                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setIsEditing(true)}
                  >
                    <i className="bi bi-pencil me-2"></i>
                    Edit
                  </button>

                  <FeatureGate feature="pattern_collaboration">
                    <button
                      type="button"
                      className="btn btn-outline-danger"
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      <i className="bi bi-trash me-2"></i>
                      Delete
                    </button>
                  </FeatureGate>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}