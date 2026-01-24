'use client';

import React, { useEffect, useState } from 'react';
import { usePatternStore } from '@/store';
import { format } from 'date-fns';

export default function SaveIndicator() {
  const { isAutoSaving, lastSaved, saveError, clearSaveError } = usePatternStore();
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    if (lastSaved && !isAutoSaving && !saveError) {
      setShowSaved(true);
      const timer = setTimeout(() => setShowSaved(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [lastSaved, isAutoSaving, saveError]);

  if (saveError) {
    return (
      <div className="save-indicator error d-flex align-items-center text-danger small fw-medium" role="alert">
        <i className="fas fa-exclamation-circle me-1"></i>
        <span>Save failed</span>
        <button 
          className="btn btn-link btn-sm text-danger p-0 ms-2" 
          onClick={clearSaveError}
          aria-label="Clear error"
        >
          <i className="fas fa-times"></i>
        </button>
      </div>
    );
  }

  if (isAutoSaving) {
    return (
      <div className="save-indicator saving d-flex align-items-center text-muted small fw-medium">
        <div className="spinner-border spinner-border-sm me-2" role="status" style={{ width: '0.75rem', height: '0.75rem' }}>
          <span className="visually-hidden">Saving...</span>
        </div>
        <span>Saving...</span>
      </div>
    );
  }

  if (showSaved && lastSaved) {
    return (
      <div className="save-indicator saved d-flex align-items-center text-success small fw-medium">
        <i className="fas fa-check-circle me-1"></i>
        <span>Saved at {format(lastSaved, 'HH:mm:ss')}</span>
      </div>
    );
  }

  return <div style={{ height: '1.25rem' }}></div>; // Empty placeholder to prevent layout shift
}
