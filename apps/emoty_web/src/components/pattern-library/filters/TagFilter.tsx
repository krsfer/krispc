'use client';

import React, { useState, useRef, useEffect } from 'react';

interface TagFilterProps {
  selectedTags: string[];
  availableTags: string[];
  onChange: (tags: string[]) => void;
  maxTags?: number;
  className?: string;
}

export function TagFilter({
  selectedTags,
  availableTags,
  onChange,
  maxTags = 10,
  className = ''
}: TagFilterProps) {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter suggestions based on input
  const suggestions = availableTags.filter(
    tag => 
      !selectedTags.includes(tag) &&
      tag.toLowerCase().includes(inputValue.toLowerCase())
  ).slice(0, 10);

  // Handle tag selection
  const addTag = (tag: string) => {
    if (!selectedTags.includes(tag) && selectedTags.length < maxTags) {
      onChange([...selectedTags, tag]);
    }
    setInputValue('');
    setShowSuggestions(false);
    setFocusedIndex(-1);
  };

  // Handle tag removal
  const removeTag = (tag: string) => {
    onChange(selectedTags.filter(t => t !== tag));
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (focusedIndex >= 0 && focusedIndex < suggestions.length) {
        addTag(suggestions[focusedIndex]);
      } else if (inputValue && !availableTags.includes(inputValue)) {
        // Allow custom tags
        addTag(inputValue);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(prev => 
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setFocusedIndex(-1);
    } else if (e.key === 'Backspace' && !inputValue && selectedTags.length > 0) {
      // Remove last tag when backspace on empty input
      removeTag(selectedTags[selectedTags.length - 1]);
    }
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={`tag-filter ${className}`}>
      <label className="form-label">Tags</label>
      
      {/* Selected tags */}
      {selectedTags.length > 0 && (
        <div className="selected-tags mb-2">
          {selectedTags.map(tag => (
            <span key={tag} className="badge bg-primary me-1 mb-1">
              {tag}
              <button
                type="button"
                className="btn-close btn-close-white ms-1"
                aria-label={`Remove ${tag} tag`}
                onClick={() => removeTag(tag)}
                style={{ fontSize: '0.65rem' }}
              ></button>
            </span>
          ))}
        </div>
      )}

      {/* Tag input */}
      <div className="position-relative">
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          className="form-control form-control-sm"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowSuggestions(true);
            setFocusedIndex(-1);
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder={selectedTags.length >= maxTags ? `Max ${maxTags} tags` : "Add tags..."}
          disabled={selectedTags.length >= maxTags}
          aria-label="Add tags"
          aria-autocomplete="list"
          aria-expanded={showSuggestions}
          aria-controls="tag-suggestions-list"
          aria-haspopup="listbox"
        />

        {/* Suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div 
            id="tag-suggestions-list" 
            role="listbox" 
            className="dropdown-menu show w-100 mt-1" 
            style={{ maxHeight: '200px', overflowY: 'auto' }}
          >
            {suggestions.map((tag, index) => (
              <button
                key={tag}
                role="option"
                aria-selected={index === focusedIndex}
                className={`dropdown-item ${index === focusedIndex ? 'active' : ''}`}
                onClick={() => addTag(tag)}
                onMouseEnter={() => setFocusedIndex(index)}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tag suggestions */}
      {availableTags.length > 0 && selectedTags.length === 0 && !inputValue && (
        <div className="tag-suggestions mt-2">
          <small className="text-muted">Popular tags:</small>
          <div className="mt-1">
            {availableTags.slice(0, 5).map(tag => (
              <button
                key={tag}
                className="btn btn-outline-secondary btn-sm me-1 mb-1"
                onClick={() => addTag(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}