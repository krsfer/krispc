'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { EmojiPalette } from '@/types/pattern';

interface EmojiPaletteCarouselProps {
  palettes: EmojiPalette[];
  activePalette: string;
  onPaletteChange: (paletteId: string) => void;
  onEmojiSelect: (emoji: string) => void;
  selectedEmoji?: string;
  language?: 'en' | 'fr';
  className?: string;
}

interface EmojiButtonProps {
  emoji: string;
  isSelected: boolean;
  onClick: () => void;
  emojiName: string;
}

const EmojiButton: React.FC<EmojiButtonProps> = ({ 
  emoji, 
  isSelected, 
  onClick, 
  emojiName 
}) => {
  return (
    <button
      className={`emoji-button ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
      aria-label={`Select ${emojiName} emoji`}
      aria-pressed={isSelected}
      data-grid-cell="true"
      type="button"
    >
      <span role="img" aria-hidden="true">{emoji}</span>
    </button>
  );
};

const EmojiPaletteCarousel: React.FC<EmojiPaletteCarouselProps> = ({
  palettes,
  activePalette,
  onPaletteChange,
  onEmojiSelect,
  selectedEmoji,
  language = 'en',
  className = ''
}) => {
  const [currentPaletteIndex, setCurrentPaletteIndex] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);

  // Find current palette
  const currentPalette = palettes.find(p => p.id === activePalette) || palettes[0];

  // Update carousel index when active palette changes
  useEffect(() => {
    const index = palettes.findIndex(p => p.id === activePalette);
    if (index !== -1) {
      setCurrentPaletteIndex(index);
    }
  }, [activePalette, palettes]);

  /**
   * Navigates to previous palette
   */
  const goToPrevious = useCallback(() => {
    const newIndex = currentPaletteIndex > 0 ? currentPaletteIndex - 1 : palettes.length - 1;
    setCurrentPaletteIndex(newIndex);
    onPaletteChange(palettes[newIndex].id);
  }, [currentPaletteIndex, palettes, onPaletteChange]);

  /**
   * Navigates to next palette
   */
  const goToNext = useCallback(() => {
    const newIndex = currentPaletteIndex < palettes.length - 1 ? currentPaletteIndex + 1 : 0;
    setCurrentPaletteIndex(newIndex);
    onPaletteChange(palettes[newIndex].id);
  }, [currentPaletteIndex, palettes, onPaletteChange]);

  /**
   * Handles keyboard navigation in emoji grid
   */
  const handleGridKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    const { key } = event;
    const activeElement = document.activeElement as HTMLElement;
    
    if (!activeElement || !gridRef.current?.contains(activeElement)) return;

    const cells = Array.from(gridRef.current.querySelectorAll('[data-grid-cell="true"]')) as HTMLElement[];
    const currentIndex = cells.indexOf(activeElement);
    
    if (currentIndex === -1) return;

    const columns = 7; // Grid has 7 columns
    let newIndex = currentIndex;

    switch (key) {
      case 'ArrowUp':
        event.preventDefault();
        newIndex = Math.max(0, currentIndex - columns);
        break;
      case 'ArrowDown':
        event.preventDefault();
        newIndex = Math.min(cells.length - 1, currentIndex + columns);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        if (currentIndex % columns === 0) {
          // At start of row, go to previous palette
          goToPrevious();
        } else {
          newIndex = Math.max(0, currentIndex - 1);
        }
        break;
      case 'ArrowRight':
        event.preventDefault();
        if ((currentIndex + 1) % columns === 0) {
          // At end of row, go to next palette
          goToNext();
        } else {
          newIndex = Math.min(cells.length - 1, currentIndex + 1);
        }
        break;
      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        newIndex = cells.length - 1;
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        (activeElement as HTMLButtonElement).click();
        return;
      default:
        return;
    }

    if (newIndex !== currentIndex) {
      cells[newIndex]?.focus();
    }
  }, [goToPrevious, goToNext]);

  /**
   * Gets emoji name for accessibility
   */
  const getEmojiName = useCallback((emoji: string): string => {
    // Simple emoji name mapping - would use a proper emoji library in production
    const emojiNames: Record<string, string> = {
      '❤️': 'red heart',
      '💕': 'two hearts',
      '💖': 'sparkling heart',
      '🌸': 'cherry blossom',
      '🌺': 'hibiscus',
      '🌻': 'sunflower',
      '🌊': 'water wave',
      '💙': 'blue heart',
      '🌲': 'evergreen tree',
      '💚': 'green heart',
      '🧡': 'orange heart',
      '🔥': 'fire',
      '💜': 'purple heart',
      '🔮': 'crystal ball',
      '💛': 'yellow heart',
      '☀️': 'sun',
      '🌟': 'glowing star'
    };

    return emojiNames[emoji] || `emoji ${emoji}`;
  }, []);

  if (!currentPalette) {
    return (
      <div className={`emoji-palette-wrapper ${className}`}>
        <div className="alert alert-warning" role="alert">
          No emoji palettes available
        </div>
      </div>
    );
  }

  // Get only the first 21 emojis (3 rows of 7) to match the mobile design
  const displayEmojis = currentPalette.emojis.slice(0, 21);

  return (
    <div className={`emoji-palette-wrapper ${className}`}>
      {/* Palette Header */}
      <div className="palette-header">
        <div className="palette-title">
          <span>{currentPalette.name[language]}</span>
          <span className="palette-indicator">
            ({currentPaletteIndex + 1}/{palettes.length})
          </span>
        </div>
        <div className="palette-nav-buttons">
          <button
            className="palette-nav-btn"
            onClick={goToPrevious}
            aria-label="Previous palette"
            type="button"
          >
            ‹
          </button>
          <button
            className="palette-nav-btn"
            onClick={goToNext}
            aria-label="Next palette"
            type="button"
          >
            ›
          </button>
        </div>
      </div>

      {/* Emoji Grid */}
      <div
        ref={gridRef}
        className="emoji-grid"
        data-grid-navigation="true"
        data-grid-columns="7"
        role="grid"
        aria-label={`${currentPalette.name[language]} emoji selection grid`}
        onKeyDown={handleGridKeyDown}
      >
        {displayEmojis.map((emoji, index) => (
          <div key={`${emoji}-${index}`} role="gridcell">
            <EmojiButton
              emoji={emoji}
              isSelected={selectedEmoji === emoji}
              onClick={() => onEmojiSelect(emoji)}
              emojiName={getEmojiName(emoji)}
            />
          </div>
        ))}
      </div>

      <style jsx>{`
        .emoji-palette-wrapper {
          width: 100%;
        }

        .palette-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--spacing-md);
          padding: 0 var(--spacing-xs);
        }

        .palette-title {
          font-size: var(--font-size-sm);
          font-weight: 600;
          color: var(--text-primary);
          display: flex;
          align-items: center;
          gap: var(--spacing-xs);
        }

        .palette-indicator {
          font-size: var(--font-size-xs);
          color: var(--text-secondary);
          font-weight: normal;
        }

        .palette-nav-buttons {
          display: flex;
          gap: var(--spacing-xs);
        }

        .palette-nav-btn {
          width: 24px;
          height: 24px;
          border: none;
          background: var(--background);
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .palette-nav-btn:hover {
          background: var(--primary-purple);
          color: white;
        }

        .palette-nav-btn:focus-visible {
          outline: none;
          box-shadow: var(--focus-shadow);
        }

        .emoji-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: var(--spacing-sm);
          padding: var(--spacing-sm);
          background: var(--background);
          border-radius: var(--radius-lg);
        }

        .emoji-button {
          aspect-ratio: 1;
          border: none;
          background: var(--surface);
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
          min-height: 48px;
        }

        .emoji-button:hover {
          background: rgba(123, 97, 255, 0.1);
          transform: scale(1.1);
          box-shadow: var(--shadow-md);
        }

        .emoji-button:active {
          transform: scale(0.95);
        }

        .emoji-button.selected {
          background: var(--primary-purple);
          box-shadow: 0 0 0 2px var(--primary-purple);
        }

        .emoji-button:focus-visible {
          outline: none;
          box-shadow: var(--focus-shadow);
        }

        @media (max-width: 360px) {
          .emoji-grid {
            grid-template-columns: repeat(6, 1fr);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .emoji-button {
            transition: none;
          }
          
          .emoji-button:hover {
            transform: none;
          }
        }

        @media (prefers-contrast: high) {
          .emoji-button {
            border: 2px solid var(--text-primary);
          }
          
          .emoji-button:hover {
            border-color: var(--primary-purple);
            background-color: var(--primary-purple);
          }
          
          .emoji-button.selected {
            background-color: var(--primary-purple);
            border-color: var(--primary-purple);
            color: white;
          }
        }
      `}</style>
    </div>
  );
};

export default EmojiPaletteCarousel;