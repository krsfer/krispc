'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { PatternState } from '@/types/pattern';

interface SequenceEditorProps {
  sequence: string[];
  insertionIndex: number;
  onSequenceChange: (sequence: string[]) => void;
  onInsertionIndexChange: (index: number) => void;
  onEmojiRemove?: (index: number) => void;
  className?: string;
  language?: 'en' | 'fr';
}

const SequenceEditor: React.FC<SequenceEditorProps> = ({
  sequence,
  insertionIndex,
  onSequenceChange,
  onInsertionIndexChange,
  onEmojiRemove,
  className = '',
  language = 'en'
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const sequenceRef = useRef<HTMLDivElement>(null);

  /**
   * Handles emoji removal
   */
  const handleRemoveEmoji = useCallback((index: number) => {
    if (onEmojiRemove) {
      onEmojiRemove(index);
    } else {
      // Default removal behavior
      const newSequence = [...sequence];
      newSequence.splice(index, 1);
      onSequenceChange(newSequence);
      
      // Adjust insertion index if needed
      if (insertionIndex > index) {
        onInsertionIndexChange(insertionIndex - 1);
      } else if (insertionIndex >= newSequence.length) {
        onInsertionIndexChange(newSequence.length);
      }
    }

    // Announce for screen readers
    const announcer = document.getElementById('aria-live-announcer');
    if (announcer) {
      announcer.textContent = language === 'en' 
        ? `Removed emoji at position ${index + 1}. ${sequence.length - 1} emojis remaining.`
        : `Emoji supprimé à la position ${index + 1}. ${sequence.length - 1} emojis restants.`;
    }
  }, [sequence, insertionIndex, onSequenceChange, onInsertionIndexChange, onEmojiRemove, language]);

  /**
   * Handles insertion point click
   */
  const handleInsertionPointClick = useCallback((index: number) => {
    onInsertionIndexChange(index);
    
    const announcer = document.getElementById('aria-live-announcer');
    if (announcer) {
      announcer.textContent = language === 'en'
        ? `Insertion point moved to position ${index + 1}`
        : `Point d'insertion déplacé à la position ${index + 1}`;
    }
  }, [onInsertionIndexChange, language]);

  /**
   * Handles drag start
   */
  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  }, []);

  /**
   * Handles drag end
   */
  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setIsDragging(false);
  }, []);

  /**
   * Handles drop
   */
  const handleDrop = useCallback((e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const newSequence = [...sequence];
    const draggedEmoji = newSequence[draggedIndex];
    
    // Remove from old position
    newSequence.splice(draggedIndex, 1);
    
    // Insert at new position
    const actualTargetIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
    newSequence.splice(actualTargetIndex, 0, draggedEmoji);
    
    onSequenceChange(newSequence);
    
    // Update insertion index
    onInsertionIndexChange(newSequence.length);
    
    const announcer = document.getElementById('aria-live-announcer');
    if (announcer) {
      announcer.textContent = language === 'en'
        ? `Moved ${draggedEmoji} from position ${draggedIndex + 1} to position ${actualTargetIndex + 1}`
        : `${draggedEmoji} déplacé de la position ${draggedIndex + 1} à la position ${actualTargetIndex + 1}`;
    }
  }, [sequence, draggedIndex, onSequenceChange, onInsertionIndexChange, language]);

  /**
   * Handles keyboard navigation
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent, index: number, type: 'emoji' | 'insertion') => {
    switch (e.key) {
      case 'Delete':
      case 'Backspace':
        if (type === 'emoji') {
          e.preventDefault();
          handleRemoveEmoji(index);
        }
        break;
      
      case 'ArrowLeft':
        e.preventDefault();
        if (type === 'insertion' && index > 0) {
          handleInsertionPointClick(index - 1);
        }
        break;
      
      case 'ArrowRight':
        e.preventDefault();
        if (type === 'insertion' && index < sequence.length) {
          handleInsertionPointClick(index + 1);
        }
        break;
        
      case 'Home':
        e.preventDefault();
        handleInsertionPointClick(0);
        break;
        
      case 'End':
        e.preventDefault();
        handleInsertionPointClick(sequence.length);
        break;
    }
  }, [sequence.length, handleRemoveEmoji, handleInsertionPointClick]);

  if (sequence.length === 0) {
    return (
      <div className={`sequence-editor empty ${className}`}>
        <div className="empty-state">
          <div className="empty-message">
            {language === 'en' 
              ? 'Select emojis from the palette to build your pattern'
              : 'Sélectionnez des emojis dans la palette pour créer votre motif'
            }
          </div>
          <div 
            className="insertion-point active"
            onClick={() => handleInsertionPointClick(0)}
            role="button"
            tabIndex={0}
            aria-label={language === 'en' ? 'Start building pattern here' : 'Commencer à construire le motif ici'}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleInsertionPointClick(0);
              }
            }}
          >
            |
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={sequenceRef}
      className={`sequence-editor ${className}`}
      role="toolbar"
      aria-label={language === 'en' ? 'Emoji sequence editor' : 'Éditeur de séquence d\'emojis'}
    >
      <div className="sequence-container">
        {/* Leading insertion point */}
        <div
          className={`insertion-point ${insertionIndex === 0 ? 'active' : ''}`}
          onClick={() => handleInsertionPointClick(0)}
          role="button"
          tabIndex={0}
          aria-label={language === 'en' ? 'Insert at beginning' : 'Insérer au début'}
          onKeyDown={(e) => handleKeyDown(e, 0, 'insertion')}
        >
          |
        </div>

        {sequence.map((emoji, index) => (
          <React.Fragment key={`emoji-${index}-${emoji}`}>
            {/* Emoji item */}
            <div
              className={`emoji-item ${draggedIndex === index ? 'dragging' : ''}`}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, index)}
              role="button"
              tabIndex={0}
              aria-label={language === 'en' 
                ? `Emoji ${emoji} at position ${index + 1}. Press Delete to remove, drag to reorder.`
                : `Emoji ${emoji} à la position ${index + 1}. Appuyez sur Supprimer pour retirer, glissez pour réorganiser.`
              }
              onKeyDown={(e) => handleKeyDown(e, index, 'emoji')}
            >
              <span className="emoji-display" role="img" aria-hidden="true">
                {emoji}
              </span>
              
              <button
                className="remove-button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveEmoji(index);
                }}
                aria-label={language === 'en' ? `Remove ${emoji}` : `Supprimer ${emoji}`}
                type="button"
              >
                <i className="fas fa-times" aria-hidden="true"></i>
              </button>
            </div>

            {/* Trailing insertion point */}
            <div
              className={`insertion-point ${insertionIndex === index + 1 ? 'active' : ''}`}
              onClick={() => handleInsertionPointClick(index + 1)}
              role="button"
              tabIndex={0}
              aria-label={language === 'en' 
                ? `Insert after position ${index + 1}`
                : `Insérer après la position ${index + 1}`
              }
              onKeyDown={(e) => handleKeyDown(e, index + 1, 'insertion')}
            >
              |
            </div>
          </React.Fragment>
        ))}
      </div>

      {/* Help text */}
      <div className="sequence-help">
        <small className="text-muted">
          {language === 'en' 
            ? 'Click | to set insertion point • Drag emojis to reorder • Click × to remove'
            : 'Cliquez | pour définir le point d\'insertion • Glissez les emojis pour réorganiser • Cliquez × pour supprimer'
          }
        </small>
      </div>

      <style jsx>{`
        .sequence-editor {
          background: rgba(123, 97, 255, 0.08);
          border: 1px solid rgba(123, 97, 255, 0.2);
          border-radius: 12px;
          padding: 16px;
          margin: 0;
          min-height: 80px;
        }

        .sequence-editor.empty {
          min-height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          color: rgba(123, 97, 255, 0.7);
          text-align: center;
        }

        .empty-message {
          font-size: 14px;
          font-weight: 500;
        }

        .sequence-container {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-bottom: 12px;
          min-height: 48px;
          flex-wrap: wrap;
          justify-content: flex-start;
          padding: 8px;
        }

        .emoji-item {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(123, 97, 255, 0.15);
          border: 2px solid rgba(123, 97, 255, 0.3);
          border-radius: 12px;
          padding: 12px;
          cursor: grab;
          transition: all 0.2s ease-in-out;
          min-width: 48px;
          min-height: 48px;
        }

        .emoji-item:hover {
          border-color: var(--primary-purple, #7b61ff);
          box-shadow: 0 4px 12px rgba(123, 97, 255, 0.25);
          transform: translateY(-2px) scale(1.05);
          background: rgba(123, 97, 255, 0.2);
        }

        .emoji-item:focus-visible {
          outline: 3px solid #7b61ff;
          outline-offset: 2px;
        }

        .emoji-item.dragging {
          opacity: 0.5;
          cursor: grabbing;
          transform: scale(1.05);
        }

        .emoji-display {
          font-size: 22px;
          margin: 0;
        }

        .remove-button {
          position: absolute;
          top: -6px;
          right: -6px;
          width: 20px;
          height: 20px;
          background: #dc3545;
          color: white;
          border: none;
          border-radius: 50%;
          font-size: 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.2s ease-in-out;
        }

        .emoji-item:hover .remove-button {
          opacity: 1;
        }

        .remove-button:hover {
          background: #c82333;
          transform: scale(1.1);
        }

        .insertion-point {
          width: 3px;
          height: 40px;
          background: rgba(123, 97, 255, 0.4);
          cursor: pointer;
          transition: all 0.2s ease-in-out;
          border-radius: 2px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(123, 97, 255, 0.6);
          font-weight: bold;
          position: relative;
          margin: 0 4px;
        }

        .insertion-point:hover {
          background: var(--primary-purple, #7b61ff);
          color: var(--primary-purple, #7b61ff);
          transform: scaleX(1.5) scaleY(1.1);
          box-shadow: 0 0 8px rgba(123, 97, 255, 0.4);
        }

        .insertion-point.active {
          background: var(--primary-purple, #7b61ff);
          color: var(--primary-purple, #7b61ff);
          transform: scaleX(1.5) scaleY(1.1);
          animation: pulse 1.5s ease-in-out infinite;
          box-shadow: 0 0 12px rgba(123, 97, 255, 0.6);
        }

        .insertion-point:focus-visible {
          outline: 2px solid #7b61ff;
          outline-offset: 2px;
        }

        .sequence-help {
          text-align: center;
          margin-top: 12px;
        }

        .sequence-help .text-muted {
          color: rgba(123, 97, 255, 0.6);
          font-size: 12px;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @media (prefers-reduced-motion: reduce) {
          .emoji-item {
            transition: none;
          }
          
          .emoji-item:hover {
            transform: none;
          }
          
          .insertion-point.active {
            animation: none;
          }
        }

        @media (max-width: 576px) {
          .sequence-container {
            justify-content: center;
          }
          
          .emoji-item {
            min-width: 48px;
            min-height: 48px;
          }
          
          .sequence-help {
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
};

export default SequenceEditor;