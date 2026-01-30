'use client';

import React, { useState, useCallback, useEffect } from 'react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  className?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  debounceMs = 300,
  className = ''
}: SearchInputProps) {
  const [localValue, setLocalValue] = useState(value);
  const [isSearching, setIsSearching] = useState(false);

  // Debounce search
  useEffect(() => {
    if (localValue === value) return;
    
    setIsSearching(true);
    const timer = setTimeout(() => {
      onChange(localValue);
      setIsSearching(false);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [localValue, debounceMs, onChange, value]);

  // Update local value when external value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleClear = useCallback(() => {
    setLocalValue('');
    onChange('');
  }, [onChange]);

  return (
    <div className={`search-input position-relative ${className}`}>
      <div className="input-group">
        <span className="input-group-text">
          <i className="bi bi-search"></i>
        </span>
        <input
          type="text"
          className="form-control"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          placeholder={placeholder}
          aria-label="Search patterns"
        />
        {(localValue || isSearching) && (
          <button
            className="btn btn-outline-secondary"
            type="button"
            onClick={handleClear}
            aria-label="Clear search"
          >
            {isSearching ? (
              <span className="spinner-border spinner-border-sm" role="status">
                <span className="visually-hidden">Searching...</span>
              </span>
            ) : (
              <i className="bi bi-x-lg"></i>
            )}
          </button>
        )}
      </div>
    </div>
  );
}