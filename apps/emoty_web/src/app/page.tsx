'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import PatternCanvas from '@/components/PatternCanvas';
import EmojiPaletteCarousel from '@/components/EmojiPaletteCarousel';
import SequenceEditor from '@/components/SequenceEditor';
import SaveIndicator from '@/components/SaveIndicator';
import AuthModal from '@/components/AuthModal';
import PatternSidebar from '@/components/PatternSidebar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { PatternGenerator } from '@/lib/utils/pattern-generator';
import { EMOJI_PALETTES, getDefaultPalette } from '@/lib/constants/emoji-palettes';
import { PatternState, GridCell, PatternMode } from '@/types/pattern';
import { usePatternStore } from '@/store';

export default function HomePage() {
  const { data: session, status } = useSession();
  const { autoSave, currentPattern: storedPattern } = usePatternStore();
  
  // UI state
  const [selectedEmoji, setSelectedEmoji] = useState<string>('');
  const [activePalette, setActivePalette] = useState(getDefaultPalette().id);
  const [language, setLanguage] = useState<'en' | 'fr'>('en');
  const [undoStack, setUndoStack] = useState<PatternState[]>([]);
  const [redoStack, setRedoStack] = useState<PatternState[]>([]);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Pattern state
  const [patternState, setPatternState] = useState<PatternState>(() => 
    PatternGenerator.createPatternState([], PatternMode.CONCENTRIC)
  );

  // Sync with store on mount
  useEffect(() => {
    if (storedPattern) {
      setPatternState(prev => ({
        ...prev,
        id: storedPattern.id,
        name: storedPattern.name,
        sequence: storedPattern.sequence
      }));
    }
  }, [storedPattern]);

  // Helper to trigger auto-save
  const triggerAutoSave = useCallback((sequence: string[], name?: string) => {
    if (status === 'authenticated') {
      autoSave({
        id: patternState.id,
        name: name || patternState.name || 'Untitled Pattern',
        sequence
      });
    }
  }, [patternState.id, patternState.name, status, autoSave]);

  // Generate current pattern grid
  const currentPatternGrid: GridCell[][] = PatternGenerator.generateConcentricPattern(patternState.sequence);

  /**
   * Handles emoji selection from palette
   */
  const handleEmojiSelect = useCallback((emoji: string) => {
    setSelectedEmoji(emoji);
    
    // Save current state to undo stack
    setUndoStack(prev => [...prev, patternState]);
    setRedoStack([]); // Clear redo stack on new action
    
    const newSequence = [...patternState.sequence, emoji];
    
    setPatternState(prev => {
      return PatternGenerator.createPatternState(newSequence, prev.patternMode);
    });

    // Trigger auto-save
    triggerAutoSave(newSequence);

    // Announce change for screen readers
    const announcer = document.getElementById('aria-live-announcer');
    if (announcer) {
      announcer.textContent = `Added ${emoji} to pattern. Pattern now has ${newSequence.length} emojis.`;
    }
  }, [patternState, triggerAutoSave]);

  /**
   * Handles canvas click interactions
   */
  const handleCanvasClick = useCallback((row: number, col: number) => {
    if (!selectedEmoji) {
      const announcer = document.getElementById('aria-live-announcer-assertive');
      if (announcer) {
        announcer.textContent = 'Please select an emoji from the palette first.';
      }
      return;
    }
    handleEmojiSelect(selectedEmoji);
  }, [selectedEmoji, handleEmojiSelect]);

  /**
   * Clears the current pattern
   */
  const handleClearPattern = useCallback(() => {
    setUndoStack(prev => [...prev, patternState]);
    setRedoStack([]);
    setPatternState(PatternGenerator.createPatternState([], PatternMode.CONCENTRIC));
    setSelectedEmoji('');
    
    triggerAutoSave([]);

    const announcer = document.getElementById('aria-live-announcer');
    if (announcer) {
      announcer.textContent = 'Pattern cleared. Canvas is now empty.';
    }
  }, [patternState, triggerAutoSave]);

  /**
   * Undo last action
   */
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;

    const previousState = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, patternState]);
    setPatternState(previousState);

    triggerAutoSave(previousState.sequence);

    const announcer = document.getElementById('aria-live-announcer');
    if (announcer) {
      announcer.textContent = `Undo successful. Pattern now has ${previousState.sequence.length} emojis.`;
    }
  }, [undoStack, patternState, triggerAutoSave]);

  /**
   * Redo last action
   */
  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;

    const nextState = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));
    setUndoStack(prev => [...prev, patternState]);
    setPatternState(nextState);

    triggerAutoSave(nextState.sequence);

    const announcer = document.getElementById('aria-live-announcer');
    if (announcer) {
      announcer.textContent = `Redo successful. Pattern now has ${nextState.sequence.length} emojis.`;
    }
  }, [redoStack, patternState, triggerAutoSave]);

  /**
   * Handles sequence changes from the sequence editor
   */
  const handleSequenceChange = useCallback((newSequence: string[]) => {
    setUndoStack(prev => [...prev, patternState]);
    setRedoStack([]);
    setPatternState(PatternGenerator.createPatternState(newSequence, patternState.patternMode));
    triggerAutoSave(newSequence);
  }, [patternState, triggerAutoSave]);

  /**
   * Handles insertion index changes from the sequence editor
   */
  const handleInsertionIndexChange = useCallback((newIndex: number) => {
    setPatternState(prev => ({ ...prev, insertionIndex: newIndex }));
  }, []);

  /**
   * Handles emoji removal from sequence editor
   */
  const handleEmojiRemove = useCallback((index: number) => {
    setUndoStack(prev => [...prev, patternState]);
    setRedoStack([]);
    const newSequence = [...patternState.sequence];
    newSequence.splice(index, 1);
    setPatternState(prev => {
      return PatternGenerator.createPatternState(newSequence, prev.patternMode);
    });
    triggerAutoSave(newSequence);
  }, [patternState, triggerAutoSave]);

  /**
   * Manual save handler
   */
  const handleSave = useCallback(() => {
    if (status === 'unauthenticated') {
      setIsAuthModalOpen(true);
    } else {
      triggerAutoSave(patternState.sequence);
    }
  }, [status, patternState.sequence, triggerAutoSave]);

  /**
   * Share pattern (placeholder)
   */
  const handleShare = useCallback(() => {
    const announcer = document.getElementById('aria-live-announcer');
    if (announcer) {
      announcer.textContent = 'Share feature coming soon!';
    }
  }, []);

  /**
   * Toggle language
   */
  const handleLanguageToggle = useCallback(() => {
    setLanguage(prev => prev === 'en' ? 'fr' : 'en');
  }, []);

  return (
    <div className="mobile-app-container">
      {/* Top Navigation Bar */}
      <nav className="top-nav" role="navigation" aria-label="Main navigation">
        <div className="nav-left">
          <button 
            className="nav-button"
            onClick={handleLanguageToggle}
            aria-label={`Switch to ${language === 'en' ? 'French' : 'English'}`}
            type="button"
          >
            {language === 'en' ? '🇬🇧' : '🇫🇷'}
          </button>
          <button 
            className="nav-button"
            aria-label="Translate"
            type="button"
          >
            🌐
          </button>
          <button 
            className="nav-button"
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Open pattern library"
            type="button"
          >
            ☰
          </button>
        </div>
        
        <div className="nav-center">
          <div className="brand-logo">
            emoty
          </div>
          <SaveIndicator />
        </div>
        
        <div className="nav-right">
          <ThemeToggle />
          {status === 'authenticated' ? (
            <div className="dropdown">
              <button 
                className="nav-button dropdown-toggle" 
                type="button" 
                id="userMenu" 
                data-bs-toggle="dropdown" 
                aria-expanded="false"
                title={`Signed in as ${session.user?.email}`}
              >
                👤
              </button>
              <ul className="dropdown-menu dropdown-menu-end shadow border-0" aria-labelledby="userMenu">
                <li className="px-3 py-2 small text-muted border-bottom">
                  {session.user?.email}
                </li>
                <li>
                  <button className="dropdown-item py-2" onClick={() => signOut()}>
                    <i className="fas fa-sign-out-alt me-2 text-danger"></i> Sign Out
                  </button>
                </li>
              </ul>
            </div>
          ) : (
            <Link 
              href="/auth/signin" 
              className="nav-button" 
              aria-label="Sign in"
              title="Sign in or register"
            >
              🔑
            </Link>
          )}
          <button 
            className="nav-button"
            aria-label="Favorites"
            type="button"
          >
            ⭐
          </button>
          <button 
            className="nav-button"
            onClick={handleClearPattern}
            aria-label="Clear pattern"
            disabled={patternState.sequence.length === 0}
            type="button"
          >
            🗑️
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="main-content">
        <div className="canvas-section">
          <div className="canvas-wrapper">
            <PatternCanvas
              pattern={currentPatternGrid}
              onCellClick={handleCanvasClick}
              readonly={false}
              cellSize={30}
              animationEnabled={true}
            />
            {patternState.sequence.length === 0 && (
              <div className="empty-canvas-overlay">
                <div className="empty-canvas-icon">🎨</div>
                <div className="empty-canvas-text">
                  Select emojis from below to create your pattern
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Panel */}
      <div className="bottom-panel">
        {/* Emoji Palette */}
        <div className="emoji-palette-section">
          <EmojiPaletteCarousel
            palettes={EMOJI_PALETTES}
            activePalette={activePalette}
            onPaletteChange={setActivePalette}
            onEmojiSelect={handleEmojiSelect}
            selectedEmoji={selectedEmoji}
            language={language}
          />
        </div>

        {/* Sequence Editor */}
        <div className="sequence-editor-section">
          <SequenceEditor
            sequence={patternState.sequence}
            insertionIndex={patternState.insertionIndex}
            onSequenceChange={handleSequenceChange}
            onInsertionIndexChange={handleInsertionIndexChange}
            onEmojiRemove={handleEmojiRemove}
            language={language}
          />
        </div>

        {/* Bottom Toolbar */}
        <div className="bottom-toolbar">
          <div className="toolbar-group">
            <button
              className="toolbar-button"
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              aria-label="Undo last action"
              type="button"
            >
              ↶
            </button>
            <button
              className="toolbar-button"
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              aria-label="Redo last action"
              type="button"
            >
              ↷
            </button>
          </div>

          <div className="toolbar-group">
            <button
              className="toolbar-button"
              onClick={handleSave}
              aria-label="Save pattern"
              title="Save to your account"
              type="button"
            >
              💾
            </button>
            <button
              className="toolbar-button"
              onClick={handleShare}
              aria-label="Share pattern"
              type="button"
            >
              📤
            </button>
            <div className="counter-badge">
              {patternState.sequence.length}
            </div>
            <button
              className="toolbar-button primary"
              onClick={() => handleEmojiSelect(selectedEmoji)}
              disabled={!selectedEmoji}
              aria-label="Add selected emoji"
              type="button"
            >
              +
            </button>
          </div>
        </div>
      </div>

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        title="Save Your Patterns"
        message="Sign in or create an account to save your beautiful emoji patterns and access them from anywhere."
      />

      <PatternSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
    </div>
  );
}
