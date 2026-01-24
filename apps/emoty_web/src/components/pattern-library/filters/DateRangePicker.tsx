'use client';

import React, { useState } from 'react';

interface DateRangePickerProps {
  startDate: Date | null;
  endDate: Date | null;
  onChange: (range: { start: Date | null; end: Date | null }) => void;
  className?: string;
}

export function DateRangePicker({
  startDate,
  endDate,
  onChange,
  className = ''
}: DateRangePickerProps) {
  const [localStart, setLocalStart] = useState(
    startDate ? startDate.toISOString().split('T')[0] : ''
  );
  const [localEnd, setLocalEnd] = useState(
    endDate ? endDate.toISOString().split('T')[0] : ''
  );

  const handleStartChange = (value: string) => {
    setLocalStart(value);
    onChange({
      start: value ? new Date(value) : null,
      end: endDate
    });
  };

  const handleEndChange = (value: string) => {
    setLocalEnd(value);
    onChange({
      start: startDate,
      end: value ? new Date(value) : null
    });
  };

  const handleQuickSelect = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    
    setLocalStart(start.toISOString().split('T')[0]);
    setLocalEnd(end.toISOString().split('T')[0]);
    onChange({ start, end });
  };

  const handleClear = () => {
    setLocalStart('');
    setLocalEnd('');
    onChange({ start: null, end: null });
  };

  return (
    <div className={`date-range-picker ${className}`}>
      <label className="form-label">Date Range</label>
      
      {/* Quick select buttons */}
      <div className="btn-group btn-group-sm w-100 mb-2" role="group">
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={() => handleQuickSelect(7)}
        >
          7 days
        </button>
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={() => handleQuickSelect(30)}
        >
          30 days
        </button>
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={() => handleQuickSelect(90)}
        >
          90 days
        </button>
      </div>

      {/* Date inputs */}
      <div className="mb-2">
        <label className="form-label small text-muted mb-1">From</label>
        <input
          type="date"
          className="form-control form-control-sm"
          value={localStart}
          onChange={(e) => handleStartChange(e.target.value)}
          max={localEnd || undefined}
          aria-label="Start date"
        />
      </div>

      <div className="mb-2">
        <label className="form-label small text-muted mb-1">To</label>
        <input
          type="date"
          className="form-control form-control-sm"
          value={localEnd}
          onChange={(e) => handleEndChange(e.target.value)}
          min={localStart || undefined}
          max={new Date().toISOString().split('T')[0]}
          aria-label="End date"
        />
      </div>

      {/* Clear button */}
      {(localStart || localEnd) && (
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm w-100"
          onClick={handleClear}
        >
          <i className="bi bi-x-circle me-1"></i>
          Clear dates
        </button>
      )}
    </div>
  );
}