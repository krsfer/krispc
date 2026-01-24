/**
 * Pattern Store - Zustand state management for auto-saving patterns
 *
 * Features:
 * - Auto-save with 5-second debouncing
 * - Optimistic UI updates
 * - Error handling with exponential backoff retry
 * - Pattern CRUD operations
 */

import { create } from 'zustand';
import type { SavedPattern } from '../types/pattern';

// Constants
export const DEBOUNCE_DELAY_MS = 5000; // 5 seconds
export const MAX_RETRY_ATTEMPTS = 3;
const INITIAL_RETRY_DELAY_MS = 1000;
const LOCAL_STORAGE_TOKEN_KEY = 'guest_token';

/**
 * Pattern for editing (may not have an ID yet)
 */
export interface EditablePattern {
  id?: string;
  name: string;
  sequence: string[];
}

/**
 * Pattern store state interface
 */
export interface PatternState {
  // Current pattern being edited
  currentPattern: EditablePattern | null;

  // All saved patterns for current user
  savedPatterns: SavedPattern[];

  // Auto-save state
  isAutoSaving: boolean;
  lastSaved: Date | null;
  saveError: string | null;

  // Loading state
  isLoading: boolean;

  // Session state
  isSessionExpired: boolean;

  // Actions
  setCurrentPattern: (pattern: EditablePattern | null) => void;
  autoSave: (pattern: EditablePattern) => void;
  loadPatterns: () => Promise<void>;
  deletePattern: (id: string) => Promise<void>;
  clearSaveError: () => void;
  cleanup: () => void;
}

/**
 * Get auth token from localStorage
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(LOCAL_STORAGE_TOKEN_KEY);
}

/**
 * Create authorization headers
 */
function createAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Check if error is retryable
 */
function isRetryableError(status: number): boolean {
  return status >= 500 || status === 429;
}

/**
 * Sleep utility for retry backoff
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate a temporary ID for optimistic patterns
 */
function generateTempId(): string {
  return `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Convert API response to SavedPattern
 */
function toSavedPattern(data: {
  id: string;
  userId: string;
  name: string | null;
  sequence: string[];
  createdAt: string;
  updatedAt: string;
}): SavedPattern {
  return {
    id: data.id,
    userId: data.userId,
    name: data.name || 'Untitled Pattern',
    sequence: data.sequence,
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
  };
}

// Internal state for factory-like behavior if needed, but here we use a single store
let debounceTimeout: ReturnType<typeof setTimeout> | null = null;
let pendingPattern: EditablePattern | null = null;
let abortController: AbortController | null = null;

/**
 * React hook to access the pattern store
 */
export const usePatternStore = create<PatternState>((set, get) => ({
  // Initial state
  currentPattern: null,
  savedPatterns: [],
  isAutoSaving: false,
  lastSaved: null,
  saveError: null,
  isLoading: false,
  isSessionExpired: false,

  /**
   * Set the current pattern being edited
   */
  setCurrentPattern: (pattern: EditablePattern | null) => {
    set({ currentPattern: pattern });
  },

  /**
   * Auto-save pattern with debouncing
   */
  autoSave: (pattern: EditablePattern) => {
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }

    pendingPattern = pattern;

    const state = get();
    const tempId = pattern.id || generateTempId();
    const optimisticPattern: SavedPattern = {
      id: tempId,
      userId: '',
      name: pattern.name || 'Untitled Pattern',
      sequence: pattern.sequence,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (pattern.id && !pattern.id.startsWith('temp-')) {
      set({
        savedPatterns: state.savedPatterns.map(p =>
          p.id === pattern.id
            ? { ...p, name: pattern.name, sequence: pattern.sequence, updatedAt: new Date() }
            : p
        ),
      });
    } else {
      const existingTempIndex = state.savedPatterns.findIndex(p => p.id.startsWith('temp-'));
      if (existingTempIndex >= 0) {
        set({
          savedPatterns: state.savedPatterns.map((p, i) =>
            i === existingTempIndex ? optimisticPattern : p
          ),
        });
      } else {
        set({
          savedPatterns: [optimisticPattern, ...state.savedPatterns],
        });
      }
    }

    debounceTimeout = setTimeout(async () => {
      if (!pendingPattern) return;
      const patternToSave = pendingPattern;
      pendingPattern = null;
      await performSave(patternToSave, set, get);
    }, DEBOUNCE_DELAY_MS);
  },

  /**
   * Load all patterns for the current user
   */
  loadPatterns: async () => {
    set({ isLoading: true, saveError: null });

    try {
      const response = await fetch('/api/patterns', {
        method: 'GET',
        headers: createAuthHeaders(),
      });

      if (!response.ok) {
        if (response.status === 401) {
          set({ isLoading: false, isSessionExpired: true, saveError: 'Session expired. Please refresh.' });
          return;
        }
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        set({ isLoading: false, saveError: error.error || 'Failed to load patterns' });
        return;
      }

      const data = await response.json();
      const patterns = (data.patterns || []).map(toSavedPattern);

      set({ savedPatterns: patterns, isLoading: false, saveError: null });
    } catch (error) {
      set({
        isLoading: false,
        saveError: `Failed to load patterns: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  },

  /**
   * Delete a pattern
   */
  deletePattern: async (id: string) => {
    const state = get();
    const patternIndex = state.savedPatterns.findIndex(p => p.id === id);
    if (patternIndex === -1) return;

    const patternsBeforeDelete = [...state.savedPatterns];
    set({ savedPatterns: state.savedPatterns.filter(p => p.id !== id), saveError: null });

    try {
      const response = await fetch(`/api/patterns/${id}`, {
        method: 'DELETE',
        headers: createAuthHeaders(),
      });

      if (!response.ok && response.status !== 404) {
        if (response.status === 401) {
          set({ savedPatterns: patternsBeforeDelete, isSessionExpired: true, saveError: 'Session expired.' });
          return;
        }
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        set({ savedPatterns: patternsBeforeDelete, saveError: `Failed to delete: ${error.error || 'Unknown error'}` });
      }
    } catch (error) {
      set({ savedPatterns: patternsBeforeDelete, saveError: `Failed to delete: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  },

  /**
   * Clear save error
   */
  clearSaveError: () => set({ saveError: null }),

  /**
   * Cleanup
   */
  cleanup: () => {
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
      debounceTimeout = null;
    }
    pendingPattern = null;
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
  },
}));

/**
 * Perform the actual save with retry logic
 */
async function performSave(
  pattern: EditablePattern,
  set: (state: Partial<PatternState>) => void,
  get: () => PatternState
): Promise<void> {
  set({ isAutoSaving: true, saveError: null });

  let retryCount = 0;
  let lastError: string | null = null;

  while (retryCount <= MAX_RETRY_ATTEMPTS) {
    try {
      abortController = new AbortController();
      const isUpdate = pattern.id && !pattern.id.startsWith('temp-');
      const url = isUpdate ? `/api/patterns/${pattern.id}` : '/api/patterns';
      const method = isUpdate ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...createAuthHeaders() },
        body: JSON.stringify({ name: pattern.name, sequence: pattern.sequence }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        if (response.status === 401) {
          set({ isAutoSaving: false, isSessionExpired: true, saveError: 'Session expired.' });
          return;
        }
        if (!isRetryableError(response.status)) {
          set({ isAutoSaving: false, saveError: error.error || 'Failed to save pattern' });
          return;
        }
        lastError = error.error || 'Server error';
        throw new Error(lastError ?? 'Server error');
      }

      const savedData = await response.json();
      const savedPattern = toSavedPattern(savedData);
      const state = get();

      if (isUpdate) {
        set({
          savedPatterns: state.savedPatterns.map(p => p.id === pattern.id ? savedPattern : p),
          isAutoSaving: false,
          lastSaved: new Date(),
          saveError: null,
        });
      } else {
        set({
          savedPatterns: state.savedPatterns.map(p => p.id.startsWith('temp-') ? savedPattern : p),
          currentPattern: state.currentPattern ? { ...state.currentPattern, id: savedPattern.id } : null,
          isAutoSaving: false,
          lastSaved: new Date(),
          saveError: null,
        });
      }
      return;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      lastError = error instanceof Error ? error.message : 'Network error';
      retryCount++;
      if (retryCount <= MAX_RETRY_ATTEMPTS) {
        await sleep(INITIAL_RETRY_DELAY_MS * Math.pow(2, retryCount - 1));
      }
    }
  }

  set({ isAutoSaving: false, saveError: lastError || 'Failed to save after multiple attempts' });
}

export const patternStore = usePatternStore;
export const getPatternState = () => usePatternStore.getState();
export const setPatternState = usePatternStore.setState;