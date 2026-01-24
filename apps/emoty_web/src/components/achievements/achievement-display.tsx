'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/contexts/user-context';
import type { Achievement, UserAchievement, AchievementProgress } from '@/lib/achievement-system';

interface AchievementBadgeProps {
  achievement: Achievement;
  isUnlocked?: boolean;
  progress?: number;
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
  language?: 'en' | 'fr';
  className?: string;
}

export function AchievementBadge({
  achievement,
  isUnlocked = false,
  progress = 0,
  size = 'md',
  showProgress = true,
  language = 'en',
  className = '',
}: AchievementBadgeProps) {
  const name = language === 'fr' ? achievement.name_fr : achievement.name_en;
  const description = language === 'fr' ? achievement.description_fr : achievement.description_en;

  const sizeClasses = {
    sm: 'achievement-badge-sm',
    md: 'achievement-badge-md',
    lg: 'achievement-badge-lg',
  };

  return (
    <div 
      className={`achievement-badge ${sizeClasses[size]} ${isUnlocked ? 'unlocked' : 'locked'} ${className}`}
      title={`${name}: ${description}`}
    >
      <div className="achievement-icon">
        <span className="achievement-emoji">{achievement.icon}</span>
        {!isUnlocked && (
          <div className="lock-overlay">
            <i className="bi bi-lock-fill"></i>
          </div>
        )}
      </div>
      
      <div className="achievement-info">
        <h6 className="achievement-name">{name}</h6>
        <p className="achievement-description">{description}</p>
        
        {showProgress && !isUnlocked && progress > 0 && (
          <div className="achievement-progress">
            <div className="progress" style={{ height: '4px' }}>
              <div
                className="progress-bar bg-primary"
                role="progressbar"
                style={{ width: `${Math.min(100, progress)}%` }}
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
            <small className="text-muted">{Math.round(progress)}% complete</small>
          </div>
        )}

        <div className="achievement-meta">
          <span className="achievement-points">
            <i className="bi bi-star-fill text-warning me-1"></i>
            {achievement.points_value} pts
          </span>
          <span className="achievement-level text-capitalize">
            {achievement.required_level}
          </span>
        </div>
      </div>

      {isUnlocked && (
        <div className="achievement-unlocked-indicator">
          <i className="bi bi-check-circle-fill text-success"></i>
        </div>
      )}
    </div>
  );
}

interface AchievementGridProps {
  achievements: AchievementProgress[];
  language?: 'en' | 'fr';
  filterCategory?: string;
  showLocked?: boolean;
  className?: string;
}

export function AchievementGrid({
  achievements,
  language = 'en',
  filterCategory = 'all',
  showLocked = true,
  className = '',
}: AchievementGridProps) {
  const filteredAchievements = achievements.filter(ap => {
    if (filterCategory !== 'all' && ap.achievement.category !== filterCategory) {
      return false;
    }
    if (!showLocked && !ap.is_unlocked) {
      return false;
    }
    return true;
  });

  return (
    <div className={`achievement-grid ${className}`}>
      <div className="row g-3">
        {filteredAchievements.map(achievementProgress => (
          <div key={achievementProgress.achievement.id} className="col-md-6 col-lg-4">
            <AchievementBadge
              achievement={achievementProgress.achievement}
              isUnlocked={achievementProgress.is_unlocked}
              progress={achievementProgress.progress_percentage}
              language={language}
            />
          </div>
        ))}
      </div>

      {filteredAchievements.length === 0 && (
        <div className="text-center text-muted py-4">
          <i className="bi bi-trophy display-4"></i>
          <p className="mt-2">
            {filterCategory !== 'all' 
              ? `No achievements found in this category.`
              : `No achievements available yet.`
            }
          </p>
        </div>
      )}
    </div>
  );
}

interface AchievementNotificationProps {
  achievement: Achievement;
  language?: 'en' | 'fr';
  onClose?: () => void;
  autoClose?: boolean;
  duration?: number;
}

export function AchievementNotification({
  achievement,
  language = 'en',
  onClose,
  autoClose = true,
  duration = 5000,
}: AchievementNotificationProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onClose?.();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [autoClose, duration, onClose]);

  if (!isVisible) return null;

  const name = language === 'fr' ? achievement.name_fr : achievement.name_en;
  const description = language === 'fr' ? achievement.description_fr : achievement.description_en;

  return (
    <div className="achievement-notification">
      <div className="notification-content">
        <div className="notification-header">
          <h5 className="notification-title">
            <i className="bi bi-trophy-fill text-warning me-2"></i>
            Achievement Unlocked!
          </h5>
          {onClose && (
            <button
              type="button"
              className="btn-close"
              aria-label="Close"
              onClick={() => {
                setIsVisible(false);
                onClose();
              }}
            />
          )}
        </div>

        <div className="notification-body d-flex align-items-center">
          <div className="achievement-icon-large me-3">
            <span className="achievement-emoji-large">{achievement.icon}</span>
          </div>
          <div className="achievement-details">
            <h6 className="achievement-name-large">{name}</h6>
            <p className="achievement-description-small text-muted">{description}</p>
            <div className="achievement-points-earned">
              <i className="bi bi-star-fill text-warning me-1"></i>
              +{achievement.points_value} reputation points
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface AchievementStatsProps {
  userId: string;
  className?: string;
}

export function AchievementStats({ userId, className = '' }: AchievementStatsProps) {
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch(`/api/achievements/stats/${userId}`);
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch achievement stats:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchStats();
  }, [userId]);

  if (isLoading) {
    return (
      <div className={`achievement-stats ${className}`}>
        <div className="d-flex justify-content-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className={`achievement-stats ${className}`}>
        <div className="alert alert-warning">
          <i className="bi bi-exclamation-triangle me-2"></i>
          Unable to load achievement statistics.
        </div>
      </div>
    );
  }

  return (
    <div className={`achievement-stats ${className}`}>
      <div className="stats-overview mb-4">
        <div className="row text-center">
          <div className="col-6 col-md-3">
            <div className="stat-card">
              <div className="stat-value">{stats.total_unlocked}</div>
              <div className="stat-label">Unlocked</div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="stat-card">
              <div className="stat-value">{stats.total_available}</div>
              <div className="stat-label">Available</div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="stat-card">
              <div className="stat-value">{stats.completion_percentage}%</div>
              <div className="stat-label">Complete</div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="stat-card">
              <div className="stat-value">{stats.points_earned}</div>
              <div className="stat-label">Points</div>
            </div>
          </div>
        </div>
      </div>

      <div className="progress mb-3">
        <div
          className="progress-bar bg-warning"
          role="progressbar"
          style={{ width: `${stats.completion_percentage}%` }}
          aria-valuenow={stats.completion_percentage}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>

      {stats.recent_achievements.length > 0 && (
        <div className="recent-achievements">
          <h6 className="text-muted mb-3">Recent Achievements</h6>
          <div className="row g-2">
            {stats.recent_achievements.slice(0, 3).map((ua: UserAchievement) => (
              <div key={ua.id} className="col-4">
                <div className="recent-achievement-item text-center">
                  <div className="achievement-icon-sm mb-1">{ua.achievement.icon}</div>
                  <small className="achievement-name-sm">{ua.achievement.name_en}</small>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface AchievementManagerProps {
  className?: string;
}

export function AchievementManager({ className = '' }: AchievementManagerProps) {
  const { user } = useUser();
  const [achievements, setAchievements] = useState<AchievementProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showLocked, setShowLocked] = useState(true);
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([]);

  useEffect(() => {
    async function fetchAchievements() {
      if (!user?.id) return;

      try {
        const response = await fetch(`/api/achievements/progress/${user.id}`);
        if (response.ok) {
          const data = await response.json();
          setAchievements(data);
        }
      } catch (error) {
        console.error('Failed to fetch achievements:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAchievements();
  }, [user?.id]);

  // Check for new achievements periodically
  useEffect(() => {
    async function checkForNewAchievements() {
      if (!user?.id) return;

      try {
        const response = await fetch(`/api/achievements/check/${user.id}`, {
          method: 'POST',
        });
        if (response.ok) {
          const data = await response.json();
          if (data.newAchievements.length > 0) {
            setNewAchievements(data.newAchievements);
            // Refresh achievements list
            const progressResponse = await fetch(`/api/achievements/progress/${user.id}`);
            if (progressResponse.ok) {
              const progressData = await progressResponse.json();
              setAchievements(progressData);
            }
          }
        }
      } catch (error) {
        console.error('Failed to check for new achievements:', error);
      }
    }

    const interval = setInterval(checkForNewAchievements, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [user?.id]);

  if (!user) {
    return (
      <div className={`achievement-manager ${className}`}>
        <div className="alert alert-info">
          <i className="bi bi-info-circle me-2"></i>
          Sign in to view your achievements!
        </div>
      </div>
    );
  }

  const categories = [
    { key: 'all', label: 'All Categories' },
    { key: 'pattern_creation', label: 'Pattern Creation' },
    { key: 'social_engagement', label: 'Social' },
    { key: 'exploration', label: 'Exploration' },
    { key: 'ai_interaction', label: 'AI Interaction' },
    { key: 'accessibility', label: 'Accessibility' },
    { key: 'special', label: 'Special' },
  ];

  return (
    <div className={`achievement-manager ${className}`}>
      {/* New Achievement Notifications */}
      {newAchievements.map(achievement => (
        <AchievementNotification
          key={achievement.id}
          achievement={achievement}
          language={user.languagePreference}
          onClose={() => {
            setNewAchievements(prev => prev.filter(a => a.id !== achievement.id));
          }}
        />
      ))}

      {/* Achievement Stats */}
      <div className="mb-4">
        <AchievementStats userId={user.id} />
      </div>

      {/* Filters */}
      <div className="achievement-filters mb-4">
        <div className="row g-2">
          <div className="col-md-6">
            <select
              className="form-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {categories.map(category => (
                <option key={category.key} value={category.key}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-6">
            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                id="showLocked"
                checked={showLocked}
                onChange={(e) => setShowLocked(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="showLocked">
                Show locked achievements
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Achievement Grid */}
      {isLoading ? (
        <div className="text-center py-4">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading achievements...</span>
          </div>
        </div>
      ) : (
        <AchievementGrid
          achievements={achievements}
          language={user.languagePreference}
          filterCategory={selectedCategory}
          showLocked={showLocked}
        />
      )}
    </div>
  );
}