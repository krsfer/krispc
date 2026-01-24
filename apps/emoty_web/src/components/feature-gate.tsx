'use client';

import React from 'react';
import { useUser } from '@/contexts/user-context';
import { useTranslations } from '@/lib/i18n/translations';
import type { Language } from '@/types/ai';

interface FeatureGateProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgrade?: boolean;
  className?: string;
}

/**
 * Feature gate component that shows/hides features based on user level
 */
export default function FeatureGate({
  feature,
  children,
  fallback,
  showUpgrade = true,
  className = ''
}: FeatureGateProps) {
  const { user, actions } = useUser();
  const language: Language = user?.languagePreference || 'en';
  const { t } = useTranslations(language);

  // Check if user has access to feature
  const hasAccess = actions.checkFeatureAccess(feature);

  if (hasAccess) {
    return <>{children}</>;
  }

  // Show fallback if provided
  if (fallback) {
    return <>{fallback}</>;
  }

  // Show upgrade prompt if requested
  if (!showUpgrade) {
    return null;
  }

  return (
    <div className={`bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-6 text-center ${className}`}>
      <div className="mb-4">
        <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mb-3">
          <span className="text-white text-2xl">🤖</span>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {t('ai.featureGate.title')}
        </h3>
        <p className="text-gray-600 text-sm mb-4">
          {t('ai.featureGate.description')}
        </p>
      </div>

      <div className="space-y-3 mb-6">
        <FeatureItem
          icon="🎨"
          name={t('ai.featureGate.features.aiPatternGeneration')}
          available={feature !== 'ai_pattern_generation'}
          language={language}
        />
        <FeatureItem
          icon="🎤"
          name={t('ai.featureGate.features.voiceCommands')}
          available={feature !== 'voice_commands'}
          language={language}
        />
        <FeatureItem
          icon="💬"
          name={t('ai.featureGate.features.advancedChat')}
          available={feature !== 'advanced_chat'}
          language={language}
        />
      </div>

      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <div className="flex items-center justify-center mb-3">
          <span className="text-2xl mr-2">{getLevelEmoji(user?.userLevel || 'beginner')}</span>
          <span className="text-sm text-gray-600">
            {t('ai.featureGate.levelRequired', { level: getRequiredLevel(feature) })}
          </span>
        </div>
        
        <ProgressBar
          current={user?.reputationScore || 0}
          target={getRequiredScore(feature)}
          language={language}
        />

        <p className="text-sm text-gray-500 mt-3">
          {t('ai.featureGate.upgrade')}
        </p>
      </div>
    </div>
  );
}

/**
 * Individual feature item
 */
function FeatureItem({
  icon,
  name,
  available,
  language
}: {
  icon: string;
  name: string;
  available: boolean;
  language: Language;
}) {
  return (
    <div className={`flex items-center justify-between p-3 rounded-lg ${
      available ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'
    }`}>
      <div className="flex items-center space-x-3">
        <span className="text-lg">{icon}</span>
        <span className={`text-sm font-medium ${
          available ? 'text-green-800' : 'text-gray-600'
        }`}>
          {name}
        </span>
      </div>
      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
        available ? 'bg-green-500' : 'bg-gray-300'
      }`}>
        <span className="text-white text-xs">
          {available ? '✓' : '🔒'}
        </span>
      </div>
    </div>
  );
}

/**
 * Progress bar component
 */
function ProgressBar({
  current,
  target,
  language
}: {
  current: number;
  target: number;
  language: Language;
}) {
  const progress = Math.min((current / target) * 100, 100);
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-gray-600">
        <span>{current} / {target}</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Get emoji for user level
 */
function getLevelEmoji(level: string): string {
  const emojis = {
    beginner: '🌱',
    intermediate: '⭐',
    advanced: '🚀',
    expert: '👑'
  };
  return emojis[level as keyof typeof emojis] || '🌱';
}

/**
 * Get required level for feature
 */
function getRequiredLevel(feature: string): string {
  const requirements = {
    ai_pattern_generation: 'Intermediate',
    voice_commands: 'Advanced', 
    advanced_chat: 'Advanced',
    ai_batch_generation: 'Expert',
    ai_custom_training: 'Expert'
  };
  return requirements[feature as keyof typeof requirements] || 'Intermediate';
}

/**
 * Get required score for feature
 */
function getRequiredScore(feature: string): number {
  const requirements = {
    ai_pattern_generation: 50,    // Intermediate
    voice_commands: 100,          // Advanced
    advanced_chat: 100,           // Advanced
    ai_batch_generation: 200,     // Expert
    ai_custom_training: 200       // Expert
  };
  return requirements[feature as keyof typeof requirements] || 50;
}

/**
 * Hook for checking feature access
 */
export function useFeatureGate() {
  const { actions } = useUser();
  
  return {
    checkFeatureAccess: actions.checkFeatureAccess,
    hasAIAccess: actions.checkFeatureAccess('ai_pattern_generation'),
    hasVoiceAccess: actions.checkFeatureAccess('voice_commands'),
    hasAdvancedChatAccess: actions.checkFeatureAccess('advanced_chat')
  };
}