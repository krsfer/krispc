'use client';

import React from 'react';

interface ComplexitySliderProps {
  value: number[];
  onChange: (value: number[]) => void;
  min?: number;
  max?: number;
  className?: string;
}

export function ComplexitySlider({
  value,
  onChange,
  min = 1,
  max = 4,
  className = ''
}: ComplexitySliderProps) {
  const getComplexityLabel = (level: number) => {
    const labels = {
      1: 'Simple',
      2: 'Moderate',
      3: 'Complex',
      4: 'Expert'
    };
    return labels[level as keyof typeof labels] || 'Unknown';
  };

  const getComplexityEmoji = (level: number) => {
    return '🔥'.repeat(level);
  };

  return (
    <div className={`complexity-slider ${className}`}>
      <label className="form-label">
        Complexity Level
        <span className="text-muted ms-2">
          ({getComplexityEmoji(value[0])} - {getComplexityEmoji(value[1])})
        </span>
      </label>
      
      <div className="complexity-range mb-3">
        {/* Min value slider */}
        <div className="mb-2">
          <label className="form-label small text-muted">Minimum</label>
          <input
            type="range"
            className="form-range"
            min={min}
            max={value[1]}
            value={value[0]}
            onChange={(e) => onChange([parseInt(e.target.value), value[1]])}
            aria-label="Minimum complexity level"
          />
          <div className="d-flex justify-content-between small text-muted">
            <span>{getComplexityLabel(value[0])}</span>
            <span>{getComplexityEmoji(value[0])}</span>
          </div>
        </div>

        {/* Max value slider */}
        <div className="mb-2">
          <label className="form-label small text-muted">Maximum</label>
          <input
            type="range"
            className="form-range"
            min={value[0]}
            max={max}
            value={value[1]}
            onChange={(e) => onChange([value[0], parseInt(e.target.value)])}
            aria-label="Maximum complexity level"
          />
          <div className="d-flex justify-content-between small text-muted">
            <span>{getComplexityLabel(value[1])}</span>
            <span>{getComplexityEmoji(value[1])}</span>
          </div>
        </div>
      </div>

      {/* Complexity legend */}
      <div className="complexity-legend">
        <small className="text-muted">Complexity levels:</small>
        <div className="mt-1">
          {[1, 2, 3, 4].map(level => (
            <div key={level} className="d-flex justify-content-between align-items-center mb-1">
              <span className="small">
                {getComplexityEmoji(level)} {getComplexityLabel(level)}
              </span>
              <button
                type="button"
                className={`btn btn-sm ${
                  value[0] <= level && level <= value[1] 
                    ? 'btn-primary' 
                    : 'btn-outline-secondary'
                }`}
                onClick={() => onChange([level, level])}
                title={`Set to ${getComplexityLabel(level)} only`}
              >
                {level}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Reset button */}
      {(value[0] !== min || value[1] !== max) && (
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm w-100 mt-2"
          onClick={() => onChange([min, max])}
        >
          <i className="bi bi-arrow-clockwise me-1"></i>
          Reset
        </button>
      )}
    </div>
  );
}