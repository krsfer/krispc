'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { useUser, useAccessibility } from '@/contexts/user-context';
import { FeatureGate } from '@/components/feature-gate';
import { LevelIndicator } from '@/components/level-indicator';

interface AdaptiveLayoutProps {
  children: ReactNode;
  showLevelIndicator?: boolean;
  className?: string;
}

/**
 * Adaptive layout that changes based on user level and accessibility preferences
 */
export function AdaptiveLayout({ 
  children, 
  showLevelIndicator = true, 
  className = '' 
}: AdaptiveLayoutProps) {
  const { user, isAuthenticated } = useUser();
  const { preferences } = useAccessibility();

  // Build dynamic classes based on preferences
  const adaptiveClasses = [
    className,
    preferences.high_contrast ? 'high-contrast' : '',
    preferences.large_text ? 'large-text' : '',
    preferences.reduced_motion ? 'reduced-motion' : '',
    preferences.screen_reader_mode ? 'screen-reader-optimized' : '',
    user?.userLevel ? `user-level-${user.userLevel}` : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={`adaptive-layout ${adaptiveClasses}`}>
      {/* Level indicator for authenticated users */}
      {isAuthenticated && showLevelIndicator && (
        <div className="level-indicator-container mb-3">
          <LevelIndicator />
        </div>
      )}

      {/* Main content */}
      <div className="adaptive-content">
        {children}
      </div>

      {/* Accessibility announcements */}
      <div 
        id="accessibility-announcements"
        className="visually-hidden"
        aria-live="polite"
        aria-atomic="true"
      ></div>
    </div>
  );
}

/**
 * Progressive navigation component that shows different options based on user level
 */
interface ProgressiveNavProps {
  className?: string;
}

export function ProgressiveNav({ className = '' }: ProgressiveNavProps) {
  const { user, isAuthenticated } = useUser();

  if (!isAuthenticated) {
    return (
      <nav className={`progressive-nav nav-guest ${className}`}>
        <div className="nav-items">
          <Link href="/" className="nav-item">
            <i className="bi bi-house-fill me-2"></i>
            Home
          </Link>
          <Link href="/patterns" className="nav-item">
            <i className="bi bi-grid-3x3 me-2"></i>
            Browse Patterns
          </Link>
          <Link href="/auth/signin" className="nav-item nav-cta">
            <i className="bi bi-person-plus me-2"></i>
            Sign In
          </Link>
        </div>
      </nav>
    );
  }

  return (
    <nav className={`progressive-nav nav-${user?.userLevel} ${className}`}>
      <div className="nav-items">
        {/* Always available */}
        <Link href="/" className="nav-item">
          <i className="bi bi-house-fill me-2"></i>
          Home
        </Link>

        <Link href="/patterns" className="nav-item">
          <i className="bi bi-grid-3x3 me-2"></i>
          My Patterns
        </Link>

        {/* Intermediate+ features */}
        <FeatureGate feature="ai_pattern_generation" showUpgrade={false}>
          <Link href="/ai-generator" className="nav-item">
            <i className="bi bi-magic me-2"></i>
            AI Generator
          </Link>
        </FeatureGate>

        <FeatureGate feature="favorites_system" showUpgrade={false}>
          <Link href="/favorites" className="nav-item">
            <i className="bi bi-heart-fill me-2"></i>
            Favorites
          </Link>
        </FeatureGate>

        {/* Advanced+ features */}
        <FeatureGate feature="emoty_bot_chat" showUpgrade={false}>
          <Link href="/emoty-bot" className="nav-item">
            <i className="bi bi-robot me-2"></i>
            EmotyBot
          </Link>
        </FeatureGate>

        <FeatureGate feature="community_features" showUpgrade={false}>
          <Link href="/community" className="nav-item">
            <i className="bi bi-people-fill me-2"></i>
            Community
          </Link>
        </FeatureGate>

        {/* Expert features */}
        <FeatureGate feature="developer_tools" showUpgrade={false}>
          <Link href="/dev-tools" className="nav-item">
            <i className="bi bi-code-slash me-2"></i>
            Dev Tools
          </Link>
        </FeatureGate>
      </div>
    </nav>
  );
}

/**
 * Progressive feature showcase - reveals features as user progresses
 */
interface ProgressiveShowcaseProps {
  className?: string;
}

export function ProgressiveShowcase({ className = '' }: ProgressiveShowcaseProps) {
  const { user, progression } = useUser();

  if (!user) return null;

  const nextFeatures = progression?.nextLevel ? 
    progression.requirements : null;

  return (
    <div className={`progressive-showcase ${className}`}>
      <h5>
        <i className="bi bi-unlock me-2"></i>
        {user.userLevel === 'expert' ? 'All Features Unlocked!' : 'Unlock More Features'}
      </h5>

      {user.userLevel !== 'expert' && progression?.nextLevel && (
        <div className="upcoming-features">
          <p className="text-muted mb-3">
            Advance to <strong className="text-capitalize">{progression.nextLevel}</strong> to unlock:
          </p>

          <div className="feature-previews">
            {progression.nextLevel === 'intermediate' && (
              <>
                <FeaturePreview 
                  icon="bi-magic"
                  title="AI Pattern Generation"
                  description="Let AI create unique patterns for you"
                  locked
                />
                <FeaturePreview 
                  icon="bi-mic"
                  title="Voice Commands"
                  description="Control the app with your voice"
                  locked
                />
              </>
            )}

            {progression.nextLevel === 'advanced' && (
              <>
                <FeaturePreview 
                  icon="bi-robot"
                  title="EmotyBot Assistant"
                  description="Chat with your personal emoji assistant"
                  locked
                />
                <FeaturePreview 
                  icon="bi-palette"
                  title="Custom Palettes"
                  description="Create your own emoji collections"
                  locked
                />
              </>
            )}

            {progression.nextLevel === 'expert' && (
              <>
                <FeaturePreview 
                  icon="bi-code-slash"
                  title="Developer Tools"
                  description="Advanced tools and API access"
                  locked
                />
                <FeaturePreview 
                  icon="bi-shop"
                  title="Pattern Marketplace"
                  description="Share and monetize your patterns"
                  locked
                />
              </>
            )}
          </div>

          <div className="mt-3">
            <Link href="/progression" className="btn btn-primary btn-sm">
              <i className="bi bi-arrow-up-circle me-2"></i>
              View Progress Requirements
            </Link>
          </div>
        </div>
      )}

      {user.userLevel === 'expert' && (
        <div className="expert-status">
          <div className="alert alert-success">
            <i className="bi bi-crown-fill me-2"></i>
            <strong>Expert Level Achieved!</strong> You have access to all features.
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Feature preview component
 */
interface FeaturePreviewProps {
  icon: string;
  title: string;
  description: string;
  locked?: boolean;
  className?: string;
}

function FeaturePreview({ 
  icon, 
  title, 
  description, 
  locked = false, 
  className = '' 
}: FeaturePreviewProps) {
  return (
    <div className={`feature-preview ${locked ? 'locked' : 'unlocked'} ${className}`}>
      <div className="feature-icon">
        <i className={`${icon} ${locked ? 'text-muted' : 'text-primary'}`}></i>
        {locked && <i className="bi bi-lock-fill lock-overlay"></i>}
      </div>
      <div className="feature-info">
        <h6 className={locked ? 'text-muted' : ''}>{title}</h6>
        <small className="text-muted">{description}</small>
      </div>
    </div>
  );
}

/**
 * Contextual help that adapts based on user level
 */
interface AdaptiveHelpProps {
  context: string;
  className?: string;
}

export function AdaptiveHelp({ context, className = '' }: AdaptiveHelpProps) {
  const { user } = useUser();
  const { preferences } = useAccessibility();

  if (!user) return null;

  const helpContent = getHelpContent(context, user.userLevel);

  if (!helpContent) return null;

  return (
    <div className={`adaptive-help ${className}`}>
      <div className="help-content">
        {preferences.screen_reader_mode ? (
          // Screen reader optimized version
          <div className="sr-only">
            <h6>Help: {helpContent.title}</h6>
            <p>{helpContent.description}</p>
            {helpContent.steps && (
              <ol>
                {helpContent.steps.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ol>
            )}
          </div>
        ) : (
          // Visual version
          <details className="help-details">
            <summary className="help-trigger">
              <i className="bi bi-question-circle me-2"></i>
              Need help?
            </summary>
            <div className="help-body mt-2">
              <h6>{helpContent.title}</h6>
              <p className="text-muted small">{helpContent.description}</p>
              {helpContent.steps && (
                <ol className="small">
                  {helpContent.steps.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>
              )}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

// Helper function to get contextual help content
function getHelpContent(context: string, userLevel: string) {
  const helpData: Record<string, any> = {
    pattern_creation: {
      beginner: {
        title: 'Creating Your First Pattern',
        description: 'Learn the basics of emoji pattern creation',
        steps: [
          'Select emojis from the palette',
          'Arrange them to create your pattern',
          'Use the preview to see the result',
          'Save your pattern when ready',
        ],
      },
      intermediate: {
        title: 'Advanced Pattern Techniques',
        description: 'Take your patterns to the next level',
        steps: [
          'Try the AI generator for inspiration',
          'Experiment with larger pattern sizes',
          'Use voice commands for hands-free creation',
          'Share your best patterns with the community',
        ],
      },
    },
  };

  return helpData[context]?.[userLevel] || helpData[context]?.beginner;
}