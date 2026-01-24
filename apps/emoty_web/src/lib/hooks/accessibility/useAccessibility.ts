/**
 * React hook for accessibility features and preferences
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  accessibilityManager, 
  AccessibilityState, 
  AccessibilityPreferences,
  AccessibilityActions 
} from '@/lib/accessibility/accessibility-context';
import { MultitouchGestureService } from '@/lib/accessibility/multitouch-gestures';

export interface UseAccessibilityReturn extends AccessibilityActions {
  state: AccessibilityState;
  preferences: AccessibilityPreferences;
  capabilities: any;
  isInitialized: boolean;
  gestureService: MultitouchGestureService | null;
}

export const useAccessibility = (): UseAccessibilityReturn => {
  const [state, setState] = useState<AccessibilityState>(accessibilityManager.getState());
  const gestureServiceRef = useRef<MultitouchGestureService | null>(null);
  const isInitializedRef = useRef(false);

  // Initialize accessibility system
  useEffect(() => {
    let mounted = true;

    const initializeAccessibility = async () => {
      if (!isInitializedRef.current) {
        try {
          await accessibilityManager.initialize();
          
          // Initialize gesture service
          gestureServiceRef.current = new MultitouchGestureService({
            enabled: true,
            hapticFeedback: true,
            audioFeedback: false
          });
          
          isInitializedRef.current = true;
          
          if (mounted) {
            setState(accessibilityManager.getState());
          }
        } catch (error) {
          console.error('Failed to initialize accessibility system:', error);
        }
      }
    };

    initializeAccessibility();

    return () => {
      mounted = false;
    };
  }, []);

  // Subscribe to accessibility state changes
  useEffect(() => {
    const unsubscribe = accessibilityManager.addListener((newState) => {
      setState(newState);
    });

    return unsubscribe;
  }, []);

  // Update gesture service when motor assistance preferences change
  useEffect(() => {
    if (gestureServiceRef.current) {
      gestureServiceRef.current.updateConfig({
        enabled: state.preferences.motorAssistance,
        hapticFeedback: state.preferences.audioFeedback,
        audioFeedback: state.preferences.audioFeedback
      });
    }
  }, [state.preferences.motorAssistance, state.preferences.audioFeedback]);

  const updatePreference = useCallback(<K extends keyof AccessibilityPreferences>(
    key: K, 
    value: AccessibilityPreferences[K]
  ) => {
    accessibilityManager.updatePreference(key, value);
  }, []);

  const togglePreference = useCallback((key: keyof AccessibilityPreferences) => {
    accessibilityManager.togglePreference(key);
  }, []);

  const resetToDefaults = useCallback(() => {
    accessibilityManager.resetToDefaults();
  }, []);

  const loadUserPreferences = useCallback(async () => {
    await accessibilityManager.loadUserPreferences();
  }, []);

  const saveUserPreferences = useCallback(async () => {
    await accessibilityManager.saveUserPreferences();
  }, []);

  const announceToScreenReader = useCallback((
    message: string, 
    priority: 'polite' | 'assertive' = 'polite'
  ) => {
    accessibilityManager.announceToScreenReader(message, priority);
  }, []);

  const setFocusManagement = useCallback((enabled: boolean) => {
    updatePreference('keyboardOnly', enabled);
  }, [updatePreference]);

  return {
    state,
    preferences: state.preferences,
    capabilities: state.capabilities,
    isInitialized: state.isInitialized,
    gestureService: gestureServiceRef.current,
    updatePreference,
    togglePreference,
    resetToDefaults,
    loadUserPreferences,
    saveUserPreferences,
    announceToScreenReader,
    setFocusManagement
  };
};

/**
 * Hook for multitouch gesture support
 */
export const useMultitouchGestures = (
  elementRef: React.RefObject<HTMLElement>,
  onGestureAction?: (action: string, gesture: any) => void
) => {
  const { gestureService, preferences } = useAccessibility();
  const [isListening, setIsListening] = useState(false);
  const [lastGesture, setLastGesture] = useState<any>(null);

  useEffect(() => {
    if (!gestureService || !elementRef.current || !preferences.motorAssistance) {
      return;
    }

    const element = elementRef.current;
    
    gestureService.initialize(element, {
      onGestureStart: (gesture) => {
        setIsListening(true);
        setLastGesture(gesture);
      },
      onGestureEnd: (gesture, action) => {
        setIsListening(false);
        if (action && onGestureAction) {
          onGestureAction(action, gesture);
        }
      },
      onGestureAction: (action, gesture) => {
        if (onGestureAction) {
          onGestureAction(action, gesture);
        }
      }
    });

    return () => {
      if (gestureService) {
        gestureService.dispose();
      }
    };
  }, [gestureService, elementRef, preferences.motorAssistance, onGestureAction]);

  const getSupportedGestures = useCallback(() => {
    return gestureService?.getSupportedGestures() || [];
  }, [gestureService]);

  return {
    isListening,
    lastGesture,
    getSupportedGestures,
    isEnabled: preferences.motorAssistance
  };
};

/**
 * Hook for screen reader announcements
 */
export const useScreenReader = () => {
  const { announceToScreenReader, preferences } = useAccessibility();

  const announce = useCallback((
    message: string, 
    priority: 'polite' | 'assertive' = 'polite'
  ) => {
    if (preferences.screenReader || preferences.announceChanges) {
      announceToScreenReader(message, priority);
    }
  }, [announceToScreenReader, preferences.screenReader, preferences.announceChanges]);

  const announceNavigation = useCallback((location: string) => {
    announce(`Navigated to ${location}`, 'polite');
  }, [announce]);

  const announceAction = useCallback((action: string) => {
    announce(`Action: ${action}`, 'assertive');
  }, [announce]);

  const announceError = useCallback((error: string) => {
    announce(`Error: ${error}`, 'assertive');
  }, [announce]);

  const announceSuccess = useCallback((message: string) => {
    announce(`Success: ${message}`, 'polite');
  }, [announce]);

  const announceChange = useCallback((change: string) => {
    announce(change, 'polite');
  }, [announce]);

  return {
    announce,
    announceNavigation,
    announceAction,
    announceError,
    announceSuccess,
    announceChange,
    isEnabled: preferences.screenReader || preferences.announceChanges
  };
};

/**
 * Hook for focus management
 */
export const useFocusManagement = () => {
  const { preferences, updatePreference } = useAccessibility();
  const focusHistoryRef = useRef<HTMLElement[]>([]);

  const manageFocus = useCallback((element: HTMLElement | null) => {
    if (!element || !preferences.focusIndicators) return;

    try {
      element.focus();
      focusHistoryRef.current.push(element);
      
      // Keep focus history limited
      if (focusHistoryRef.current.length > 20) {
        focusHistoryRef.current.shift();
      }
    } catch (error) {
      console.warn('Could not manage focus:', error);
    }
  }, [preferences.focusIndicators]);

  const restorePreviousFocus = useCallback(() => {
    const previousElement = focusHistoryRef.current.pop();
    if (previousElement && document.contains(previousElement)) {
      manageFocus(previousElement);
    }
  }, [manageFocus]);

  const trapFocus = useCallback((container: HTMLElement) => {
    if (!preferences.keyboardOnly && !preferences.motorAssistance) return;

    const focusableElements = container.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    
    // Focus first element
    if (firstElement) {
      firstElement.focus();
    }

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [preferences.keyboardOnly, preferences.motorAssistance]);

  return {
    manageFocus,
    restorePreviousFocus,
    trapFocus,
    focusHistory: focusHistoryRef.current,
    isEnabled: preferences.focusIndicators
  };
};

/**
 * Hook for keyboard navigation
 */
export const useKeyboardNavigation = (
  onNavigate?: (direction: 'up' | 'down' | 'left' | 'right') => void,
  onActivate?: () => void,
  onEscape?: () => void
) => {
  const { preferences } = useAccessibility();

  useEffect(() => {
    if (!preferences.keyboardOnly && !preferences.motorAssistance) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault();
          onNavigate?.('up');
          break;
        case 'ArrowDown':
          event.preventDefault();
          onNavigate?.('down');
          break;
        case 'ArrowLeft':
          event.preventDefault();
          onNavigate?.('left');
          break;
        case 'ArrowRight':
          event.preventDefault();
          onNavigate?.('right');
          break;
        case 'Enter':
        case ' ':
          event.preventDefault();
          onActivate?.();
          break;
        case 'Escape':
          onEscape?.();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [preferences.keyboardOnly, preferences.motorAssistance, onNavigate, onActivate, onEscape]);

  return {
    isEnabled: preferences.keyboardOnly || preferences.motorAssistance
  };
};