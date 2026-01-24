'use client';

import React from 'react';

interface AIGeneratedToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}

export function AIGeneratedToggle({
  checked,
  onChange,
  className = ''
}: AIGeneratedToggleProps) {
  return (
    <div className={`ai-generated-toggle form-check form-switch ${className}`}>
      <input
        className="form-check-input"
        type="checkbox"
        id="aiGeneratedToggle"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        role="switch"
        aria-label="Show AI generated patterns only"
      />
      <label className="form-check-label" htmlFor="aiGeneratedToggle">
        <i className="bi bi-stars text-info me-1"></i>
        AI Generated only
      </label>
    </div>
  );
}