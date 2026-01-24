'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import { PatternGenerator } from '@/lib/utils/pattern-generator';

interface PatternThumbnailProps {
  sequence: string[];
  size?: number;
  className?: string;
  onClick?: () => void;
  ariaLabel?: string;
}

/**
 * PatternThumbnail - Renders a small preview of an emoji pattern
 *
 * Uses canvas to efficiently render concentric emoji patterns
 * at thumbnail size (default 64x64).
 */
const PatternThumbnail: React.FC<PatternThumbnailProps> = ({
  sequence,
  size = 64,
  className = '',
  onClick,
  ariaLabel,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /**
   * Renders the pattern on the canvas
   */
  const renderThumbnail = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    // Draw background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, size, size);

    // Handle empty sequence
    if (sequence.length === 0) {
      // Draw placeholder
      ctx.fillStyle = '#E5E5EA';
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = '#8E8E93';
      ctx.font = `${size * 0.5}px -apple-system, BlinkMacSystemFont, Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', size / 2, size / 2);
      return;
    }

    // Generate the pattern grid
    const grid = PatternGenerator.generateConcentricPattern(sequence);
    const gridSize = grid.length;

    // Calculate cell dimensions
    const padding = size * 0.05;
    const availableSize = size - (padding * 2);
    const cellSize = availableSize / gridSize;
    const fontSize = Math.max(cellSize * 0.65, 8); // Minimum 8px for readability

    // Draw emojis
    ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI Emoji', Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const cell = grid[row][col];
        if (cell.emoji) {
          const x = padding + (col * cellSize) + (cellSize / 2);
          const y = padding + (row * cellSize) + (cellSize / 2);

          // Highlight center cell subtly
          if (cell.isCenter) {
            ctx.fillStyle = 'rgba(123, 97, 255, 0.15)';
            ctx.beginPath();
            ctx.arc(x, y, cellSize / 2 - 1, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.fillStyle = '#000000';
          ctx.fillText(cell.emoji, x, y);
        }
      }
    }

    // Add subtle border
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, size - 1, size - 1);
  }, [sequence, size]);

  // Re-render when sequence or size changes
  useEffect(() => {
    renderThumbnail();
  }, [renderThumbnail]);

  const defaultAriaLabel = sequence.length > 0
    ? `Pattern preview: ${sequence.join(' ')}`
    : 'Empty pattern';

  return (
    <canvas
      ref={canvasRef}
      className={`pattern-thumbnail ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : 'img'}
      aria-label={ariaLabel || defaultAriaLabel}
      tabIndex={onClick ? 0 : -1}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      style={{
        borderRadius: '8px',
        cursor: onClick ? 'pointer' : 'default',
        display: 'block',
        flexShrink: 0,
      }}
    />
  );
};

export default PatternThumbnail;
