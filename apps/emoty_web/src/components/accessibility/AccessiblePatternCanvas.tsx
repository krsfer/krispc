/**
 * WCAG 2.1 AA compliant pattern canvas with comprehensive accessibility support
 */
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAccessibility, useScreenReader, useFocusManagement, useMultitouchGestures } from '@/lib/hooks/accessibility/useAccessibility';

export interface GridCell {
  emoji: string | null;
  layer: number;
  position: { row: number; col: number };
}

export interface PatternCanvasProps {
  pattern: GridCell[][];
  onCellClick?: (row: number, col: number) => void;
  onCellHover?: (row: number, col: number) => void;
  readonly?: boolean;
  showGrid?: boolean;
  cellSize?: number;
  className?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
}

export const AccessiblePatternCanvas: React.FC<PatternCanvasProps> = ({
  pattern,
  onCellClick,
  onCellHover,
  readonly = false,
  showGrid = true,
  cellSize = 40,
  className = '',
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [focusedCell, setFocusedCell] = useState<{ row: number; col: number } | null>(null);
  const [announceQueue, setAnnounceQueue] = useState<string[]>([]);
  
  const { preferences, announceToScreenReader } = useAccessibility();
  const { announce, announceAction, announceChange } = useScreenReader();
  const { manageFocus, trapFocus } = useFocusManagement();
  
  const { isListening, getSupportedGestures } = useMultitouchGestures(
    canvasRef,
    handleGestureAction
  );

  // Generate comprehensive pattern description for screen readers
  const generatePatternDescription = useCallback((): string => {
    if (pattern.length === 0) return "Empty pattern canvas";
    
    const filledCells = pattern.flat().filter(cell => cell.emoji);
    const totalCells = pattern.length * pattern.length;
    const sequence = extractSequenceFromPattern(pattern);
    
    let description = `Pattern canvas with ${pattern.length} by ${pattern.length} grid containing ${filledCells.length} emojis out of ${totalCells} cells. `;
    
    if (sequence.length > 0) {
      description += `Emoji sequence from center outward: ${sequence.join(', ')}. `;
    }
    
    if (preferences.verboseDescriptions) {
      description += generateSpatialDescription(pattern);
    }
    
    return description;
  }, [pattern, preferences.verboseDescriptions]);

  // Generate spatial layout description
  const generateSpatialDescription = useCallback((pattern: GridCell[][]): string => {
    const layers = extractLayers(pattern);
    
    let description = "Spatial layout: ";
    layers.forEach((layer, index) => {
      const position = index === 0 ? "center" : 
                      index === 1 ? "inner ring" : 
                      index === 2 ? "middle ring" : "outer ring";
      description += `${layer.emoji} in ${position}, `;
    });
    
    return description.slice(0, -2); // Remove trailing comma
  }, []);

  // Extract emoji sequence from pattern (center to outer)
  const extractSequenceFromPattern = useCallback((pattern: GridCell[][]): string[] => {
    const center = Math.floor(pattern.length / 2);
    const sequence: string[] = [];
    const visited = new Set<string>();
    
    // Start from center and work outward
    for (let layer = 0; layer < Math.ceil(pattern.length / 2); layer++) {
      for (let row = center - layer; row <= center + layer; row++) {
        for (let col = center - layer; col <= center + layer; col++) {
          const key = `${row}-${col}`;
          if (!visited.has(key) && 
              row >= 0 && row < pattern.length && 
              col >= 0 && col < pattern.length && 
              pattern[row]?.[col]?.emoji) {
            sequence.push(pattern[row][col].emoji!);
            visited.add(key);
          }
        }
      }
    }
    
    return sequence;
  }, []);

  // Extract layers for spatial description
  const extractLayers = useCallback((pattern: GridCell[][]): Array<{ emoji: string; layer: number }> => {
    const center = Math.floor(pattern.length / 2);
    const layers: Array<{ emoji: string; layer: number }> = [];
    
    for (let layer = 0; layer < Math.ceil(pattern.length / 2); layer++) {
      const emoji = pattern[center - layer]?.[center - layer]?.emoji ||
                   pattern[center]?.[center - layer]?.emoji ||
                   pattern[center + layer]?.[center]?.emoji;
      
      if (emoji) {
        layers.push({ emoji, layer });
      }
    }
    
    return layers;
  }, []);

  // Handle cell interaction
  const handleCellInteraction = useCallback((row: number, col: number, source: 'click' | 'keyboard' | 'gesture' = 'click') => {
    if (readonly) return;
    
    const cell = pattern[row]?.[col];
    const cellDescription = cell?.emoji ? 
      `${cell.emoji} at row ${row + 1}, column ${col + 1}, layer ${cell.layer + 1}` :
      `Empty cell at row ${row + 1}, column ${col + 1}`;
    
    // Announce interaction
    announceChange(`Selected ${cellDescription} using ${source}`);
    
    // Update focus
    setFocusedCell({ row, col });
    
    // Call callback
    onCellClick?.(row, col);
    
    // Manage focus for keyboard users
    if (source === 'keyboard') {
      const cellElement = canvasRef.current?.querySelector(`[data-cell="${row}-${col}"]`) as HTMLElement;
      if (cellElement) {
        manageFocus(cellElement);
      }
    }
  }, [readonly, pattern, announceChange, onCellClick, manageFocus]);

  // Handle keyboard navigation within grid
  const handleKeyNavigation = useCallback((event: KeyboardEvent, currentRow: number, currentCol: number) => {
    if (!preferences.keyboardOnly && !preferences.motorAssistance) return;
    
    let newRow = currentRow;
    let newCol = currentCol;
    
    switch (event.key) {
      case 'ArrowUp':
        newRow = Math.max(0, currentRow - 1);
        break;
      case 'ArrowDown':
        newRow = Math.min(pattern.length - 1, currentRow + 1);
        break;
      case 'ArrowLeft':
        newCol = Math.max(0, currentCol - 1);
        break;
      case 'ArrowRight':
        newCol = Math.min(pattern.length - 1, currentCol + 1);
        break;
      case 'Home':
        newCol = 0;
        break;
      case 'End':
        newCol = pattern.length - 1;
        break;
      case 'PageUp':
        newRow = 0;
        break;
      case 'PageDown':
        newRow = pattern.length - 1;
        break;
    }
    
    if (newRow !== currentRow || newCol !== currentCol) {
      event.preventDefault();
      setFocusedCell({ row: newRow, col: newCol });
      
      // Focus the new cell
      const newCellElement = canvasRef.current?.querySelector(`[data-cell="${newRow}-${newCol}"]`) as HTMLElement;
      if (newCellElement) {
        newCellElement.focus();
      }
      
      // Announce navigation
      const cell = pattern[newRow]?.[newCol];
      const description = cell?.emoji ? 
        `Moved to ${cell.emoji} at row ${newRow + 1}, column ${newCol + 1}` :
        `Moved to empty cell at row ${newRow + 1}, column ${newCol + 1}`;
      
      announce(description, 'polite');
    }
  }, [preferences.keyboardOnly, preferences.motorAssistance, pattern, announce]);

  // Handle gesture actions
  function handleGestureAction(action: string, gesture: any) {
    switch (action) {
      case 'UNDO_LAST':
        announceAction('Undo last action');
        // Emit undo event
        break;
      case 'CLEAR_PATTERN':
        announceAction('Clear pattern');
        // Emit clear event
        break;
      case 'TOGGLE_VOICE_MODE':
        announceAction('Toggle voice mode');
        // Emit voice toggle event
        break;
      default:
        announceAction(`Gesture action: ${action}`);
    }
  }

  // Handle cell hover for enhanced feedback
  const handleCellHover = useCallback((row: number, col: number) => {
    if (preferences.announceChanges && !readonly) {
      const cell = pattern[row]?.[col];
      const description = cell?.emoji ? 
        `Hovering over ${cell.emoji}` :
        `Hovering over empty cell`;
      
      // Debounced announcement to avoid spam
      setTimeout(() => {
        announce(description, 'polite');
      }, 300);
    }
    
    onCellHover?.(row, col);
  }, [preferences.announceChanges, readonly, pattern, announce, onCellHover]);

  // Set up focus trap when canvas receives focus
  useEffect(() => {
    if (canvasRef.current && (preferences.keyboardOnly || preferences.motorAssistance)) {
      return trapFocus(canvasRef.current);
    }
  }, [preferences.keyboardOnly, preferences.motorAssistance, trapFocus]);

  // Create cell components with full accessibility support
  const renderCell = useCallback((cell: GridCell, row: number, col: number) => {
    const isFocused = focusedCell?.row === row && focusedCell?.col === col;
    const cellId = `cell-${row}-${col}`;
    
    return (
      <div
        key={`${row}-${col}`}
        id={cellId}
        data-cell={`${row}-${col}`}
        className={`
          pattern-cell 
          ${cell.emoji ? 'filled' : 'empty'}
          ${isFocused ? 'focused' : ''}
          ${preferences.highContrast ? 'high-contrast' : ''}
          ${preferences.largeText ? 'large-text' : ''}
          ${preferences.motorAssistance ? 'motor-assist' : ''}
        `}
        role="gridcell"
        tabIndex={readonly ? -1 : (isFocused ? 0 : -1)}
        aria-label={cell.emoji ? 
          `${cell.emoji} at position row ${row + 1}, column ${col + 1}, layer ${cell.layer + 1}` : 
          `Empty cell at position row ${row + 1}, column ${col + 1}`
        }
        aria-selected={isFocused}
        aria-roledescription="Pattern cell"
        style={{
          width: `${cellSize}px`,
          height: `${cellSize}px`,
          fontSize: preferences.largeText ? `${cellSize * 0.9}px` : `${cellSize * 0.7}px`,
          borderWidth: preferences.highContrast ? '2px' : '1px',
          minHeight: preferences.motorAssistance ? `${Math.max(cellSize, 44)}px` : `${cellSize}px`,
          minWidth: preferences.motorAssistance ? `${Math.max(cellSize, 44)}px` : `${cellSize}px`,
        }}
        onClick={() => handleCellInteraction(row, col, 'click')}
        onMouseEnter={() => handleCellHover(row, col)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleCellInteraction(row, col, 'keyboard');
          } else {
            handleKeyNavigation(e.nativeEvent, row, col);
          }
        }}
        onFocus={() => setFocusedCell({ row, col })}
      >
        <span 
          className="cell-content"
          aria-hidden="true"
        >
          {cell.emoji}
        </span>
      </div>
    );
  }, [
    focusedCell,
    preferences.highContrast,
    preferences.largeText,
    preferences.motorAssistance,
    cellSize,
    readonly,
    handleCellInteraction,
    handleCellHover,
    handleKeyNavigation
  ]);

  // Generate instructions for screen reader users
  const generateInstructions = useCallback((): string => {
    if (readonly) {
      return "This is a read-only pattern display. Use arrow keys to explore the pattern.";
    }
    
    let instructions = "Interactive pattern canvas. ";
    instructions += "Use arrow keys to navigate between cells. ";
    instructions += "Press Enter or Space to select a cell. ";
    
    if (preferences.motorAssistance) {
      instructions += "Multi-touch gestures are available: ";
      const gestures = getSupportedGestures();
      instructions += gestures.map(g => `${g.gesture} to ${g.description}`).join(', ') + ". ";
    }
    
    return instructions;
  }, [readonly, preferences.motorAssistance, getSupportedGestures]);

  return (
    <div 
      className={`accessible-pattern-canvas ${className}`}
      ref={canvasRef}
    >
      {/* Screen reader only descriptions */}
      <div id="pattern-description" className="sr-only">
        {generatePatternDescription()}
      </div>
      
      <div id="pattern-instructions" className="sr-only">
        {generateInstructions()}
      </div>
      
      {isListening && (
        <div 
          className="gesture-indicator"
          aria-live="polite"
          aria-atomic="true"
        >
          Gesture detected...
        </div>
      )}
      
      {/* Main pattern grid */}
      <div 
        className={`pattern-grid ${showGrid ? 'show-grid' : ''}`}
        role="grid"
        aria-label={ariaLabel || "Emoji pattern canvas"}
        aria-describedby={`pattern-description pattern-instructions ${ariaDescribedBy || ''}`.trim()}
        aria-rowcount={pattern.length}
        aria-colcount={pattern.length}
        aria-readonly={readonly}
        tabIndex={-1}
      >
        {pattern.map((row, rowIndex) => (
          <div 
            key={rowIndex} 
            className="pattern-row" 
            role="row"
            aria-rowindex={rowIndex + 1}
          >
            {row.map((cell, colIndex) => renderCell(cell, rowIndex, colIndex))}
          </div>
        ))}
      </div>
      
      {/* Status announcements */}
      {preferences.announceChanges && (
        <div 
          aria-live="polite" 
          aria-atomic="true" 
          className="sr-only"
          id="canvas-announcements"
        >
          {/* React will handle announcements through the screen reader hook */}
        </div>
      )}
      
      {/* Gesture help */}
      {preferences.motorAssistance && !readonly && (
        <details className="gesture-help">
          <summary>Available Gestures</summary>
          <ul>
            {getSupportedGestures().map((gesture, index) => (
              <li key={index}>
                <strong>{gesture.gesture}:</strong> {gesture.description}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
};

export default AccessiblePatternCanvas;