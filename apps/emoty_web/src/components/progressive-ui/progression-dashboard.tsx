'use client';

import { useUser, useProgression } from '@/contexts/user-context';
import { LevelIndicator, ProgressToNextLevel } from '@/components/level-indicator';
import FeatureGate from '@/components/feature-gate';
import { ProgressionEngine, PROGRESSION_CONFIG } from '@/lib/progression-engine';

interface ProgressionDashboardProps {
  className?: string;
  showAchievements?: boolean;
  showNextFeatures?: boolean;
}

export function ProgressionDashboard({
  className = '',
  showAchievements = true,
  showNextFeatures = true,
}: ProgressionDashboardProps) {
  const { user, availableFeatures } = useUser();
  const { progression, isMaxLevel, nextLevel } = useProgression();

  if (!user) {
    return (
      <div className={`progression-dashboard ${className}`}>
        <div className="alert alert-info">
          <i className="bi bi-info-circle me-2"></i>
          Sign in to track your progression and unlock features!
        </div>
      </div>
    );
  }

  const nextUnlock = ProgressionEngine.getNextUnlockableFeatures(user.userLevel);

  return (
    <div className={`progression-dashboard ${className}`}>
      {/* Current Level Status */}
      <div className="row g-3 mb-4">
        <div className="col-md-6">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">
                <i className="bi bi-person-badge me-2"></i>
                Your Level
              </h5>
              <LevelIndicator showProgress={false} showReputationScore={true} />
              <div className="mt-3">
                <div className="row text-center">
                  <div className="col-4">
                    <div className="stat-item">
                      <div className="stat-value">{user.totalPatternsCreated}</div>
                      <div className="stat-label">Patterns</div>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="stat-item">
                      <div className="stat-value">{user.reputationScore}/100</div>
                      <div className="stat-label">Reputation</div>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="stat-item">
                      <div className="stat-value">{availableFeatures.length}</div>
                      <div className="stat-label">Features</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">
                <i className="bi bi-arrow-up-circle me-2"></i>
                {isMaxLevel ? 'Maximum Level!' : 'Next Level'}
              </h5>
              {isMaxLevel ? (
                <div className="text-center py-3">
                  <i className="bi bi-trophy-fill text-warning display-4"></i>
                  <p className="text-muted mt-2">You&apos;ve unlocked all features!</p>
                </div>
              ) : (
                <ProgressToNextLevel showDetails={false} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Progress to Next Level */}
      {!isMaxLevel && progression && (
        <div className="card mb-4">
          <div className="card-body">
            <h5 className="card-title">
              <i className="bi bi-graph-up me-2"></i>
              Progress to {nextLevel}
            </h5>
            <ProgressToNextLevel />
            
            {progression.readyForPromotion && (
              <div className="alert alert-success mt-3">
                <div className="d-flex align-items-center">
                  <i className="bi bi-star-fill me-3"></i>
                  <div>
                    <strong>Congratulations!</strong> You&apos;re ready to advance to {nextLevel} level.
                    <div className="mt-2">
                      <button className="btn btn-success btn-sm">
                        <i className="bi bi-arrow-up me-2"></i>
                        Level Up Now
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Current Features */}
      <div className="card mb-4">
        <div className="card-body">
          <h5 className="card-title">
            <i className="bi bi-unlock me-2"></i>
            Available Features
          </h5>
          <div className="features-grid">
            {getFeaturesByLevel(user.userLevel).map((levelFeatures, levelIndex) => (
              <div key={levelIndex} className="level-features mb-3">
                <h6 className="text-capitalize text-muted">
                  {['Beginner', 'Intermediate', 'Advanced', 'Expert'][levelIndex]} Features
                </h6>
                <div className="row g-2">
                  {levelFeatures.map(feature => (
                    <div key={feature.key} className="col-md-6">
                      <div className="feature-item available">
                        <i className={`${feature.icon} text-success me-2`}></i>
                        <span>{feature.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Next Level Features Preview */}
      {showNextFeatures && !isMaxLevel && nextUnlock.nextLevel && (
        <div className="card mb-4">
          <div className="card-body">
            <h5 className="card-title">
              <i className="bi bi-lock me-2"></i>
              Coming in {nextUnlock.nextLevel}
            </h5>
            <p className="text-muted">
              These features will unlock when you reach {nextUnlock.nextLevel} level:
            </p>
            <div className="row g-2">
              {getFeatureDisplayData(nextUnlock.newFeatures).map(feature => (
                <div key={feature.key} className="col-md-6">
                  <div className="feature-item locked">
                    <i className={`${feature.icon} text-muted me-2`}></i>
                    <span className="text-muted">{feature.name}</span>
                    <i className="bi bi-lock-fill ms-auto text-muted"></i>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recent Achievements */}
      {showAchievements && (
        <FeatureGate feature="achievement_tracking" showUpgrade={false}>
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">
                <i className="bi bi-trophy me-2"></i>
                Recent Achievements
              </h5>
              <RecentAchievements userId={user.id} />
            </div>
          </div>
        </FeatureGate>
      )}
    </div>
  );
}

/**
 * Recent achievements component
 */
interface RecentAchievementsProps {
  userId: string;
  limit?: number;
}

function RecentAchievements({ userId, limit = 5 }: RecentAchievementsProps) {
  // This would fetch recent achievements from an API
  // For now, showing placeholder achievements
  const recentAchievements = [
    {
      id: '1',
      icon: '🎯',
      name: 'First Pattern',
      description: 'Created your first emoji pattern',
      unlockedAt: new Date(Date.now() - 86400000), // 1 day ago
    },
    {
      id: '2', 
      icon: '🧭',
      name: 'Explorer',
      description: 'Tried 5 different palettes',
      unlockedAt: new Date(Date.now() - 172800000), // 2 days ago
    },
  ];

  if (recentAchievements.length === 0) {
    return (
      <div className="text-center text-muted py-3">
        <i className="bi bi-trophy display-4"></i>
        <p className="mt-2">No achievements yet. Start creating patterns to earn your first achievement!</p>
      </div>
    );
  }

  return (
    <div className="achievements-list">
      {recentAchievements.slice(0, limit).map(achievement => (
        <div key={achievement.id} className="achievement-item">
          <div className="achievement-icon">{achievement.icon}</div>
          <div className="achievement-info">
            <h6 className="achievement-name mb-1">{achievement.name}</h6>
            <p className="achievement-description text-muted small mb-1">
              {achievement.description}
            </p>
            <small className="text-muted">
              Unlocked {achievement.unlockedAt.toLocaleDateString()}
            </small>
          </div>
        </div>
      ))}
    </div>
  );
}

// Helper function to get features by level for display
function getFeaturesByLevel(userLevel: string) {
  const levels = ['beginner', 'intermediate', 'advanced', 'expert'];
  const userLevelIndex = levels.indexOf(userLevel);
  const result: any[][] = [];

  for (let i = 0; i <= userLevelIndex; i++) {
    const levelFeatures = PROGRESSION_CONFIG[levels[i] as keyof typeof PROGRESSION_CONFIG]?.features || [];
    const displayFeatures = getFeatureDisplayData([...levelFeatures]);
    if (displayFeatures.length > 0) {
      result.push(displayFeatures);
    }
  }

  return result;
}

// Helper function to convert feature keys to display data
function getFeatureDisplayData(featureKeys: string[]) {
  const featureMap: Record<string, { name: string; icon: string }> = {
    basic_pattern_creation: { name: 'Pattern Creation', icon: 'bi-grid-3x3' },
    simple_palettes: { name: 'Emoji Palettes', icon: 'bi-palette' },
    pattern_preview: { name: 'Real-time Preview', icon: 'bi-eye' },
    undo_redo: { name: 'Undo/Redo', icon: 'bi-arrow-counterclockwise' },
    basic_export: { name: 'Export Patterns', icon: 'bi-download' },
    simple_themes: { name: 'Color Themes', icon: 'bi-brush' },
    ai_pattern_generation: { name: 'AI Pattern Generator', icon: 'bi-magic' },
    voice_commands_basic: { name: 'Voice Commands', icon: 'bi-mic' },
    advanced_palettes: { name: 'Advanced Palettes', icon: 'bi-palette2' },
    pattern_sharing: { name: 'Pattern Sharing', icon: 'bi-share' },
    favorites_system: { name: 'Favorites', icon: 'bi-heart' },
    pattern_search: { name: 'Pattern Search', icon: 'bi-search' },
    achievement_tracking: { name: 'Achievements', icon: 'bi-trophy' },
    emoty_bot_chat: { name: 'EmotyBot Assistant', icon: 'bi-robot' },
    voice_commands_full: { name: 'Full Voice Control', icon: 'bi-mic-fill' },
    custom_palettes: { name: 'Custom Palettes', icon: 'bi-plus-circle' },
    advanced_export: { name: 'Advanced Export', icon: 'bi-file-earmark-arrow-down' },
    community_features: { name: 'Community', icon: 'bi-people' },
    developer_tools: { name: 'Developer Tools', icon: 'bi-code-slash' },
    api_access: { name: 'API Access', icon: 'bi-cloud-arrow-up' },
    pattern_marketplace: { name: 'Pattern Marketplace', icon: 'bi-shop' },
  };

  return featureKeys.map(key => ({
    key,
    name: featureMap[key]?.name || key.replace(/_/g, ' '),
    icon: featureMap[key]?.icon || 'bi-star',
  }));
}