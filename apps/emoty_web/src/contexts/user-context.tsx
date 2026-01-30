'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { ProgressionEngine } from '@/lib/progression-engine';
import type { UserLevel, AccessibilityPreferences } from '@/db/types';

// User context data interface
interface UserContextData {
  // User information
  user: {
    id: string;
    email: string;
    username?: string;
    userLevel: UserLevel;
    reputationScore: number;
    totalPatternsCreated: number;
    languagePreference: 'en' | 'fr';
    accessibilityPreferences: AccessibilityPreferences | null;
  } | null;
  
  // Progression data
  progression: {
    currentLevel: UserLevel;
    nextLevel: UserLevel | null;
    progressPercentage: number;
    requirements: any;
    readyForPromotion: boolean;
  } | null;
  
  // Available features
  availableFeatures: string[];
  
  // Loading states
  isLoading: boolean;
  isAuthenticated: boolean;
  
  // Actions
  actions: {
    checkFeatureAccess: (feature: string) => boolean;
    refreshProgression: () => Promise<void>;
    trackAction: (action: string, metadata?: any) => Promise<void>;
    updateAccessibilityPreferences: (preferences: Partial<AccessibilityPreferences>) => Promise<void>;
    updateLanguagePreference: (language: 'en' | 'fr') => Promise<void>;
  };
}

// Create context
const UserContext = createContext<UserContextData | undefined>(undefined);

// Provider props
interface UserProviderProps {
  children: ReactNode;
}

// User provider component
export function UserProvider({ children }: UserProviderProps) {
  const { data: session, status, update: updateSession } = useSession();
  const [progression, setProgression] = useState<UserContextData['progression']>(null);
  const [availableFeatures, setAvailableFeatures] = useState<string[]>([]);
  const [isLoadingProgression, setIsLoadingProgression] = useState(false);

  const isLoading = status === 'loading' || isLoadingProgression;
  const isAuthenticated = !!session?.user;

  // Refresh progression data
  const refreshProgression = useCallback(async () => {
    if (!session?.user?.id) return;

    setIsLoadingProgression(true);
    try {
      const response = await fetch(`/api/users/${session.user.id}/progression`);
      if (response.ok) {
        const progressionData = await response.json();
        setProgression(progressionData);
        
        // Update available features
        const features = ProgressionEngine.getAvailableFeatures(progressionData.currentLevel);
        setAvailableFeatures(features);
      }
    } catch (error) {
      console.error('Failed to fetch progression data:', error);
    } finally {
      setIsLoadingProgression(false);
    }
  }, [session?.user?.id]);

  // Track user action
  const trackAction = async (action: string, metadata?: any) => {
    if (!session?.user?.id) return;

    try {
      const response = await fetch('/api/users/track-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          metadata,
        }),
      });

      if (response.ok) {
        // Refresh progression after action tracking
        await refreshProgression();
        // Update session if reputation changed
        await updateSession();
      }
    } catch (error) {
      console.error('Failed to track action:', error);
    }
  };

  // Update accessibility preferences
  const updateAccessibilityPreferences = async (preferences: Partial<AccessibilityPreferences>) => {
    if (!session?.user?.id) return;

    try {
      const response = await fetch('/api/users/accessibility-preferences', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      });

      if (response.ok) {
        await updateSession();
      }
    } catch (error) {
      console.error('Failed to update accessibility preferences:', error);
    }
  };

  // Update language preference
  const updateLanguagePreference = async (language: 'en' | 'fr') => {
    if (!session?.user?.id) return;

    try {
      const response = await fetch('/api/users/language-preference', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ language }),
      });

      if (response.ok) {
        await updateSession();
      }
    } catch (error) {
      console.error('Failed to update language preference:', error);
    }
  };

  // Check feature access
  const checkFeatureAccess = (feature: string): boolean => {
    if (!session?.user?.userLevel) return false;
    return ProgressionEngine.canAccessFeature(session.user.userLevel, feature);
  };

  // Load initial data when session changes
  useEffect(() => {
    if (session?.user?.id) {
      refreshProgression();
    } else {
      setProgression(null);
      setAvailableFeatures([]);
    }
  }, [session?.user?.id, refreshProgression]);

  // Update available features when user level changes
  useEffect(() => {
    if (session?.user?.userLevel) {
      const features = ProgressionEngine.getAvailableFeatures(session.user.userLevel);
      setAvailableFeatures(features);
    }
  }, [session?.user?.userLevel]);

  // Context value
  const contextValue: UserContextData = {
    user: session?.user ? {
      id: session.user.id,
      email: session.user.email,
      username: session.user.name || undefined,
      userLevel: session.user.userLevel,
      reputationScore: session.user.reputationScore,
      totalPatternsCreated: session.user.totalPatternsCreated,
      languagePreference: session.user.languagePreference,
      accessibilityPreferences: session.user.accessibilityPreferences,
    } : null,
    progression,
    availableFeatures,
    isLoading,
    isAuthenticated,
    actions: {
      checkFeatureAccess,
      refreshProgression,
      trackAction,
      updateAccessibilityPreferences,
      updateLanguagePreference,
    },
  };

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
}

// Hook to use user context
export function useUser(): UserContextData {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

// Hook for feature access (convenience)
export function useFeatureAccess(feature: string) {
  const { actions, isAuthenticated, user } = useUser();
  
  return {
    hasAccess: actions.checkFeatureAccess(feature),
    userLevel: user?.userLevel,
    isAuthenticated,
  };
}

// Hook for tracking actions (convenience)
export function useActionTracker() {
  const { actions } = useUser();
  
  return {
    trackAction: actions.trackAction,
  };
}

// Hook for progression data (convenience)
export function useProgression() {
  const { progression, actions, user } = useUser();
  
  return {
    progression,
    refreshProgression: actions.refreshProgression,
    isMaxLevel: user?.userLevel === 'expert',
    nextLevel: progression?.nextLevel,
    progressPercentage: progression?.progressPercentage || 0,
    readyForPromotion: progression?.readyForPromotion || false,
  };
}

// Hook for accessibility features (convenience)
export function useAccessibility() {
  const { user, actions } = useUser();
  
  const preferences = user?.accessibilityPreferences;
  
  return {
    preferences: preferences || {
      high_contrast: false,
      large_text: false,
      reduced_motion: false,
      screen_reader_mode: false,
      voice_commands_enabled: false,
      preferred_input_method: 'touch' as const,
      color_blind_assistance: false,
    },
    updatePreferences: actions.updateAccessibilityPreferences,
    hasHighContrast: preferences?.high_contrast || false,
    hasLargeText: preferences?.large_text || false,
    hasReducedMotion: preferences?.reduced_motion || false,
    isScreenReaderMode: preferences?.screen_reader_mode || false,
    areVoiceCommandsEnabled: preferences?.voice_commands_enabled || false,
    preferredInputMethod: preferences?.preferred_input_method || 'touch',
    hasColorBlindAssistance: preferences?.color_blind_assistance || false,
  };
}