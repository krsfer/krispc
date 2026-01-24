'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { GridCell, PatternAccessibilityInfo } from '@/types/pattern';
import { PatternGenerator } from '@/lib/utils/pattern-generator';

interface PatternCanvasProps {
  pattern: GridCell[][];
  onCellClick?: (row: number, col: number) => void;
  readonly?: boolean;
  className?: string;
  cellSize?: number;
  animationEnabled?: boolean;
}

const PatternCanvas: React.FC<PatternCanvasProps> = ({
  pattern,
  onCellClick,
  readonly = false,
  className = '',
  cellSize = 30,
  animationEnabled = true
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [accessibilityInfo, setAccessibilityInfo] = useState<PatternAccessibilityInfo>();
  const [isLoading, setIsLoading] = useState(false);
  const [containerSize, setContainerSize] = useState(300);

  // Update container size when component mounts or resizes
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const size = Math.min(rect.width, rect.height) || 300;
        setContainerSize(size);
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Calculate canvas dimensions based on container
  const padding = 10;
  const availableSize = containerSize - (padding * 2);
  const gridCells = pattern.length > 0 ? pattern.length : 8;
  const dynamicCellSize = availableSize / gridCells;
  const canvasSize = availableSize;
  const totalSize = containerSize;

  // Check for reduced motion preference
  const prefersReducedMotion = typeof window !== 'undefined' && 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /**
   * Renders the pattern on canvas
   */
  const renderPattern = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsLoading(true);

    // Set canvas size
    canvas.width = totalSize;
    canvas.height = totalSize;

    // Clear canvas
    ctx.clearRect(0, 0, totalSize, totalSize);

    // Set high DPI scaling
    const dpr = window.devicePixelRatio || 1;
    // Set display size to fill container
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.width = totalSize * dpr;
    canvas.height = totalSize * dpr;
    ctx.scale(dpr, dpr);

    // Draw background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, totalSize, totalSize);

    // Draw grid lines (subtle)
    if (pattern.length > 0) {
      ctx.strokeStyle = '#f0f0f0';
      ctx.lineWidth = 1;
      
      for (let i = 0; i <= pattern.length; i++) {
        const pos = padding + (i * dynamicCellSize);
        // Vertical lines
        ctx.beginPath();
        ctx.moveTo(pos, padding);
        ctx.lineTo(pos, padding + canvasSize);
        ctx.stroke();
        
        // Horizontal lines
        ctx.beginPath();
        ctx.moveTo(padding, pos);
        ctx.lineTo(padding + canvasSize, pos);
        ctx.stroke();
      }
    } else {
      // Draw a subtle grid for empty canvas
      ctx.strokeStyle = '#f8f8f8';
      ctx.lineWidth = 1;
      const gridSize = 8; // 8x8 grid for empty canvas
      const gridCellSize = canvasSize / gridSize;
      
      for (let i = 0; i <= gridSize; i++) {
        const pos = padding + (i * gridCellSize);
        // Vertical lines
        ctx.beginPath();
        ctx.moveTo(pos, padding);
        ctx.lineTo(pos, padding + canvasSize);
        ctx.stroke();
        
        // Horizontal lines
        ctx.beginPath();
        ctx.moveTo(padding, pos);
        ctx.lineTo(padding + canvasSize, pos);
        ctx.stroke();
      }
    }

    // Draw pattern emojis
    if (pattern.length > 0) {
      ctx.font = `${dynamicCellSize * 0.6}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (let row = 0; row < pattern.length; row++) {
        for (let col = 0; col < pattern[row].length; col++) {
          const cell = pattern[row][col];
          if (cell.emoji) {
            const x = padding + (col * dynamicCellSize) + (dynamicCellSize / 2);
            const y = padding + (row * dynamicCellSize) + (dynamicCellSize / 2);

            // Highlight center cell with subtle purple background
            if (cell.isCenter) {
              ctx.fillStyle = 'rgba(123, 97, 255, 0.1)';
              ctx.fillRect(
                padding + (col * dynamicCellSize) + 2,
                padding + (row * dynamicCellSize) + 2,
                dynamicCellSize - 4,
                dynamicCellSize - 4
              );
            }

            // Draw emoji
            ctx.fillStyle = '#000000';
            ctx.fillText(cell.emoji, x, y);
          }
        }
      }
    }

    // Generate accessibility info
    const accessInfo = PatternGenerator.generatePatternAltText(pattern);
    setAccessibilityInfo(accessInfo);
    setIsLoading(false);
  }, [pattern, dynamicCellSize, totalSize, canvasSize, padding]);

  /**
   * Handles canvas click events
   */
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (readonly || !onCellClick || pattern.length === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left - padding;
    const y = event.clientY - rect.top - padding;

    // Calculate grid cell
    const col = Math.floor(x / dynamicCellSize);
    const row = Math.floor(y / dynamicCellSize);

    // Validate bounds
    if (row >= 0 && row < pattern.length && col >= 0 && col < pattern[0].length) {
      onCellClick(row, col);
    }
  }, [readonly, onCellClick, pattern, dynamicCellSize, padding]);

  /**
   * Handles keyboard navigation
   */
  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (readonly || !onCellClick || pattern.length === 0) return;

    // Simple implementation - click center cell on Enter/Space
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const centerRow = Math.floor(pattern.length / 2);
      const centerCol = Math.floor(pattern[0].length / 2);
      onCellClick(centerRow, centerCol);
    }
  }, [readonly, onCellClick, pattern]);

  // Re-render when pattern changes or container size changes
  useEffect(() => {
    renderPattern();
  }, [renderPattern, containerSize]);

  // Generate CSS animation class
  const animationClass = animationEnabled && !prefersReducedMotion ? 'pattern-canvas-animated' : '';

  return (
    <div ref={containerRef} className={`pattern-canvas-container ${className}`}>
      {isLoading && (
        <div className="pattern-loading" aria-live="polite">
          Loading pattern...
        </div>
      )}
      
      <canvas
        ref={canvasRef}
        className={`pattern-canvas ${animationClass}`}
        onClick={handleCanvasClick}
        onKeyDown={handleKeyDown}
        role="img"
        aria-label={accessibilityInfo?.altText || 'Emoji pattern canvas'}
        aria-describedby="pattern-description"
        tabIndex={readonly ? -1 : 0}
        style={{
          borderRadius: '16px',
          cursor: readonly ? 'default' : 'pointer'
        }}
      />

      {/* Screen reader description */}
      <div id="pattern-description" className="sr-only">
        {accessibilityInfo?.description}
        {!readonly && ' Click or press Enter to modify the pattern.'}
      </div>

      {/* Detailed accessibility info for screen readers */}
      {accessibilityInfo && (
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          <h4>Pattern Details</h4>
          <p>{accessibilityInfo.sequenceDescription}</p>
          <p>{accessibilityInfo.spatialDescription}</p>
        </div>
      )}

      <style jsx>{`
        .pattern-canvas-container {
          position: relative;
          display: inline-block;
          width: 100%;
          max-width: 100%;
        }

        .pattern-canvas {
          display: block;
          transition: ${prefersReducedMotion ? 'none' : 'all 0.3s ease-in-out'};
          margin: 0 auto;
        }

        .pattern-canvas:focus-visible {
          outline: 3px solid var(--primary-purple);
          outline-offset: 2px;
          box-shadow: 0 0 0 5px rgba(123, 97, 255, 0.3);
        }

        .pattern-canvas-animated:hover {
          transform: ${prefersReducedMotion ? 'none' : 'scale(1.02)'};
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
        }

        .pattern-loading {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(255, 255, 255, 0.9);
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 14px;
          color: var(--text-secondary);
        }

        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }

        @media (prefers-reduced-motion: reduce) {
          .pattern-canvas {
            transition: none;
          }
          
          .pattern-canvas-animated:hover {
            transform: none;
          }
        }

        @media (prefers-contrast: high) {
          .pattern-canvas {
            border: 2px solid #000000;
            filter: contrast(1.5);
          }
        }
      `}</style>
    </div>
  );
};

export default PatternCanvas;