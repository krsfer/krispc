/**
 * React context provider for accessibility features
 * Wraps the app with accessibility management
 */
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { accessibilityManager, AccessibilityState } from '@/lib/accessibility/accessibility-context';

interface AccessibilityContextType {
  state: AccessibilityState;
  isLoading: boolean;
  error: string | null;
}

const AccessibilityContext = createContext<AccessibilityContextType | null>(null);

export const useAccessibilityContext = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibilityContext must be used within an AccessibilityProvider');
  }
  return context;
};

interface AccessibilityProviderProps {
  children: React.ReactNode;
}

export const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({ children }) => {
  const [state, setState] = useState<AccessibilityState>(accessibilityManager.getState());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const initializeAccessibility = async () => {
      try {
        await accessibilityManager.initialize();
        
        if (mounted) {
          setState(accessibilityManager.getState());
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Failed to initialize accessibility system:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to initialize accessibility');
          setIsLoading(false);
        }
      }
    };

    initializeAccessibility();

    // Subscribe to state changes
    const unsubscribe = accessibilityManager.addListener((newState) => {
      if (mounted) {
        setState(newState);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  // Apply accessibility preferences to document
  useEffect(() => {
    if (state.isInitialized) {
      const { preferences } = state;
      const root = document.documentElement;

      // Apply CSS classes based on preferences
      root.classList.toggle('high-contrast', preferences.highContrast);
      root.classList.toggle('large-text', preferences.largeText);
      root.classList.toggle('reduced-motion', preferences.reducedMotion);
      root.classList.toggle('motor-assistance', preferences.motorAssistance);
      root.classList.toggle('simplified-interface', preferences.simplifiedInterface);
      root.classList.toggle('keyboard-only', preferences.keyboardOnly);

      // Set color blindness filter
      root.setAttribute('data-colorblind-filter', preferences.colorBlindnessSupport);

      // Set gesture size
      root.setAttribute('data-gesture-size', preferences.gestureSize);

      // Apply CSS custom properties
      root.style.setProperty('--touch-hold-delay', `${preferences.touchHoldDelay}ms`);
      root.style.setProperty('--double-click-delay', `${preferences.doubleClickDelay}ms`);
      root.style.setProperty('--sound-volume', preferences.soundVolume.toString());
    }
  }, [state]);

  if (error) {
    console.warn('Accessibility system error:', error);
    // Still render children even if accessibility fails
    return <>{children}</>;
  }

  return (
    <AccessibilityContext.Provider value={{ state, isLoading, error }}>
      {children}
    </AccessibilityContext.Provider>
  );
};

export default AccessibilityProvider;