'use client';

import React from 'react';

interface FavoriteToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}

export function FavoriteToggle({
  checked,
  onChange,
  className = ''
}: FavoriteToggleProps) {
  return (
    <div className={`favorite-toggle form-check form-switch ${className}`}>
      <input
        className="form-check-input"
        type="checkbox"
        id="favoriteToggle"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        role="switch"
        aria-label="Show favorites only"
      />
      <label className="form-check-label" htmlFor="favoriteToggle">
        <i className="bi bi-heart-fill text-danger me-1"></i>
        Favorites only
      </label>
    </div>
  );
}