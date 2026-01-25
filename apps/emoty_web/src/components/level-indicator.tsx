'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { ProgressionEngine } from '@/lib/progression-engine';
import type { UserLevel } from '@/db/types';

interface LevelIndicatorProps {
  showProgress?: boolean;
  showReputationScore?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

interface ProgressionData {
  currentLevel: UserLevel;
  nextLevel: UserLevel | null;
  progressPercentage: number;
  requirements: any;
  readyForPromotion: boolean;
}

/**
 * Level indicator component showing user progression
 */
export function LevelIndicator({ 
  showProgress = true, 
  showReputationScore = true,
  className = '',
  size = 'md'
}: LevelIndicatorProps) {
  const { data: session, status } = useSession();
  const [progressionData, setProgressionData] = useState<ProgressionData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch progression data
  useEffect(() => {
    async function fetchProgression() {
      if (!session?.user?.id) return;

      setIsLoading(true);
      try {
        const response = await fetch(`/api/users/${session.user.id}/progression`);
        if (response.ok) {
          const data = await response.json();
          setProgressionData(data);
        }
      } catch (error) {
        console.error('Failed to fetch progression data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProgression();
  }, [session?.user?.id]);

  if (status === 'loading' || isLoading) {
    return (
      <div className={`level-indicator level-indicator-${size} ${className}`}>
        <div className="d-flex align-items-center">
          <div className="spinner-border spinner-border-sm me-2" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <span className="text-muted">Loading level...</span>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  const userLevel = session.user.userLevel;
  const reputationScore = session.user.reputationScore;

  // Level badge styling
  const levelBadgeClass = {
    beginner: 'bg-success',
    intermediate: 'bg-info', 
    advanced: 'bg-warning',
    expert: 'bg-danger'
  }[userLevel];

  const sizeClasses = {
    sm: 'level-indicator-sm',
    md: 'level-indicator-md', 
    lg: 'level-indicator-lg'
  };

  return (
    <div className={`level-indicator ${sizeClasses[size]} ${className}`}>
      <div className="d-flex align-items-center gap-2">
        {/* Level Badge */}
        <span className={`badge ${levelBadgeClass} text-capitalize`}>
          {userLevel}
        </span>

        {/* Reputation Score */}
        {showReputationScore && (
          <span className="text-muted small">
            <i className="bi bi-star-fill text-warning me-1"></i>
            {reputationScore}/100
          </span>
        )}

        {/* Progress to Next Level */}
        {showProgress && progressionData && progressionData.nextLevel && (
          <div className="level-progress">
            <div className="progress-wrapper">
              <div className="progress" style={{ height: '4px', minWidth: '60px' }}>
                <div
                  className="progress-bar bg-primary"
                  role="progressbar"
                  style={{ width: `${progressionData.progressPercentage}%` }}
                  aria-valuenow={progressionData.progressPercentage}
                  aria-valuemin={0}
                  aria-valuemax={100}
                ></div>
              </div>
              <small className="text-muted">
                {progressionData.progressPercentage}% to {progressionData.nextLevel}
              </small>
            </div>
          </div>
        )}

        {/* Max Level Indicator */}
        {userLevel === 'expert' && (
          <span className="badge bg-gold text-dark">
            <i className="bi bi-crown-fill me-1"></i>
            Max Level
          </span>
        )}
      </div>

      {/* Promotion Ready Indicator */}
      {progressionData?.readyForPromotion && (
        <div className="mt-2">
          <div className="alert alert-success alert-sm mb-0 p-2">
            <i className="bi bi-arrow-up-circle-fill me-2"></i>
            <strong>Ready for promotion!</strong> You can now advance to{' '}
            <span className="text-capitalize">{progressionData.nextLevel}</span> level.
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Compact level badge component
 */
interface LevelBadgeProps {
  level?: UserLevel;
  reputation?: number;
  className?: string;
  showTooltip?: boolean;
}

export function LevelBadge({ 
  level, 
  reputation, 
  className = '', 
  showTooltip = true 
}: LevelBadgeProps) {
  const { data: session } = useSession();
  
  const userLevel = level || session?.user?.userLevel || 'beginner';
  const userReputation = reputation ?? session?.user?.reputationScore ?? 0;

  const levelBadgeClass = {
    beginner: 'bg-success',
    intermediate: 'bg-info',
    advanced: 'bg-warning', 
    expert: 'bg-danger'
  }[userLevel];

  const levelIcon = {
    beginner: 'bi-seedling',
    intermediate: 'bi-tree',
    advanced: 'bi-star',
    expert: 'bi-crown'
  }[userLevel];

  return (
    <span
      className={`badge ${levelBadgeClass} text-capitalize ${className}`}
      {...(showTooltip && {
        'data-bs-toggle': 'tooltip',
        'data-bs-placement': 'top',
        title: `${userLevel} level • ${userReputation}/100 reputation`
      })}
    >
      <i className={`${levelIcon} me-1`}></i>
      {userLevel}
    </span>
  );
}

/**
 * Progress bar component for next level
 */
interface ProgressToNextLevelProps {
  className?: string;
  showDetails?: boolean;
}

export function ProgressToNextLevel({ 
  className = '', 
  showDetails = true 
}: ProgressToNextLevelProps) {
  const { data: session } = useSession();
  const [progressionData, setProgressionData] = useState<ProgressionData | null>(null);

  useEffect(() => {
    async function fetchProgression() {
      if (!session?.user?.id) return;

      try {
        const response = await fetch(`/api/users/${session.user.id}/progression`);
        if (response.ok) {
          const data = await response.json();
          setProgressionData(data);
        }
      } catch (error) {
        console.error('Failed to fetch progression data:', error);
      }
    }

    fetchProgression();
  }, [session?.user?.id]);

  if (!progressionData || !progressionData.nextLevel) {
    return (
      <div className={`progress-to-next-level ${className}`}>
        <div className="text-center text-muted">
          <i className="bi bi-trophy-fill text-warning me-2"></i>
          Maximum level achieved!
        </div>
      </div>
    );
  }

  const { progressPercentage, requirements, nextLevel } = progressionData;

  return (
    <div className={`progress-to-next-level ${className}`}>
      <div className="mb-2 d-flex justify-content-between align-items-center">
        <h6 className="mb-0">Progress to {nextLevel}</h6>
        <span className="text-muted small">{progressPercentage}%</span>
      </div>

      <div className="progress mb-3" style={{ height: '8px' }}>
        <div
          className="progress-bar bg-primary"
          role="progressbar"
          style={{ width: `${progressPercentage}%` }}
          aria-valuenow={progressPercentage}
          aria-valuemin={0}
          aria-valuemax={100}
        ></div>
      </div>

      {showDetails && (
        <div className="requirements-list">
          <small className="text-muted d-block mb-2">Requirements:</small>
          <div className="row g-2">
            {Object.entries(requirements).map(([key, req]: [string, any]) => (
              <div key={key} className="col-6">
                <div className={`requirement-item ${req.met ? 'met' : 'unmet'}`}>
                  <i className={`bi ${req.met ? 'bi-check-circle-fill text-success' : 'bi-circle text-muted'} me-1`}></i>
                  <small>
                    {key}: {req.current}/{req.required}
                  </small>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}