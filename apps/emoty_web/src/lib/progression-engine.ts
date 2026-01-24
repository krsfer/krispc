import { db } from '@/db/connection';
import type { UserLevel, AchievementCategory } from '@/db/types';

// Define feature access levels and requirements
export const PROGRESSION_CONFIG = {
  beginner: {
    requiredReputation: 0,
    maxReputation: 25,
    features: [
      'basic_pattern_creation',
      'simple_palettes',
      'pattern_preview',
      'undo_redo',
      'basic_export',
      'simple_themes',
      'pattern_size_small',
      'help_tooltips',
    ],
    nextLevelRequirements: {
      reputation: 25,
      patterns: 5,
      achievements: 2,
    },
  },
  intermediate: {
    requiredReputation: 25,
    maxReputation: 50,
    features: [
      // All beginner features plus:
      'ai_pattern_generation',
      'voice_commands_basic',
      'advanced_palettes',
      'pattern_sharing',
      'favorites_system',
      'pattern_search',
      'medium_pattern_sizes',
      'achievement_tracking',
      'basic_analytics',
      'pattern_templates',
      'export_multiple_formats',
      'social_features_basic',
    ],
    nextLevelRequirements: {
      reputation: 50,
      patterns: 15,
      achievements: 5,
      aiGenerations: 3,
      sharedPatterns: 2,
    },
  },
  advanced: {
    requiredReputation: 50,
    maxReputation: 80,
    features: [
      // All previous features plus:
      'emoty_bot_chat',
      'voice_commands_full',
      'custom_palettes',
      'advanced_export',
      'pattern_collaboration',
      'advanced_search',
      'large_pattern_sizes',
      'performance_analytics',
      'accessibility_full',
      'multilingual_interface',
      'batch_operations',
      'pattern_versioning',
      'community_features',
      'advanced_ai_features',
      'gesture_controls',
    ],
    nextLevelRequirements: {
      reputation: 80,
      patterns: 35,
      achievements: 10,
      aiGenerations: 10,
      sharedPatterns: 5,
      communityHelp: 3,
    },
  },
  expert: {
    requiredReputation: 80,
    maxReputation: 100,
    features: [
      // All previous features plus:
      'developer_tools',
      'api_access',
      'custom_ai_prompts',
      'pattern_marketplace',
      'mentorship_tools',
      'advanced_collaboration',
      'white_label_options',
      'enterprise_features',
      'unlimited_patterns',
      'priority_support',
      'beta_features',
      'community_moderation',
      'advanced_analytics',
      'export_apis',
      'webhook_integrations',
    ],
    nextLevelRequirements: null, // Max level
  },
} as const;

export class ProgressionEngine {
  /**
   * Check if user can access a specific feature
   */
  static canAccessFeature(userLevel: UserLevel, featureName: string): boolean {
    const levels: UserLevel[] = ['beginner', 'intermediate', 'advanced', 'expert'];
    const userLevelIndex = levels.indexOf(userLevel);
    
    // Check all levels up to and including user's current level
    for (let i = 0; i <= userLevelIndex; i++) {
      const levelConfig = PROGRESSION_CONFIG[levels[i]];
      if (levelConfig.features.includes(featureName)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Get all features available to a user level
   */
  static getAvailableFeatures(userLevel: UserLevel): string[] {
    const levels: UserLevel[] = ['beginner', 'intermediate', 'advanced', 'expert'];
    const userLevelIndex = levels.indexOf(userLevel);
    const allFeatures: string[] = [];
    
    // Collect all features from beginner up to user's level
    for (let i = 0; i <= userLevelIndex; i++) {
      allFeatures.push(...PROGRESSION_CONFIG[levels[i]].features);
    }
    
    return allFeatures;
  }

  /**
   * Calculate user's progression to next level
   */
  static async calculateProgression(userId: string): Promise<{
    currentLevel: UserLevel;
    nextLevel: UserLevel | null;
    progressPercentage: number;
    requirements: {
      reputation: { current: number; required: number; met: boolean };
      patterns: { current: number; required: number; met: boolean };
      achievements: { current: number; required: number; met: boolean };
      aiGenerations?: { current: number; required: number; met: boolean };
      sharedPatterns?: { current: number; required: number; met: boolean };
      communityHelp?: { current: number; required: number; met: boolean };
    };
    readyForPromotion: boolean;
  }> {
    // Get user stats
    const user = await db
      .selectFrom('users')
      .select([
        'user_level',
        'reputation_score',
        'total_patterns_created',
      ])
      .where('id', '=', userId)
      .executeTakeFirstOrThrow();

    // Get achievement count
    const achievementCount = await db
      .selectFrom('user_achievements')
      .select((eb) => eb.fn.count('id').as('count'))
      .where('user_id', '=', userId)
      .executeTakeFirst();

    // Get AI-generated pattern count
    const aiPatternsCount = await db
      .selectFrom('patterns')
      .select((eb) => eb.fn.count('id').as('count'))
      .where('user_id', '=', userId)
      .where('is_ai_generated', '=', true)
      .executeTakeFirst();

    // Get public pattern count (shared patterns)
    const sharedPatternsCount = await db
      .selectFrom('patterns')
      .select((eb) => eb.fn.count('id').as('count'))
      .where('user_id', '=', userId)
      .where('is_public', '=', true)
      .executeTakeFirst();

    const currentLevel = user.user_level;
    const currentConfig = PROGRESSION_CONFIG[currentLevel];
    const nextLevelRequirements = currentConfig.nextLevelRequirements;

    if (!nextLevelRequirements) {
      // Already at max level
      return {
        currentLevel,
        nextLevel: null,
        progressPercentage: 100,
        requirements: {
          reputation: { current: user.reputation_score, required: 100, met: true },
          patterns: { current: user.total_patterns_created, required: 0, met: true },
          achievements: { current: parseInt(achievementCount?.count || '0'), required: 0, met: true },
        },
        readyForPromotion: false,
      };
    }

    const levels: UserLevel[] = ['beginner', 'intermediate', 'advanced', 'expert'];
    const nextLevel = levels[levels.indexOf(currentLevel) + 1];

    // Calculate requirements
    const requirements = {
      reputation: {
        current: user.reputation_score,
        required: nextLevelRequirements.reputation,
        met: user.reputation_score >= nextLevelRequirements.reputation,
      },
      patterns: {
        current: user.total_patterns_created,
        required: nextLevelRequirements.patterns,
        met: user.total_patterns_created >= nextLevelRequirements.patterns,
      },
      achievements: {
        current: parseInt(achievementCount?.count || '0'),
        required: nextLevelRequirements.achievements,
        met: parseInt(achievementCount?.count || '0') >= nextLevelRequirements.achievements,
      },
      ...(nextLevelRequirements.aiGenerations && {
        aiGenerations: {
          current: parseInt(aiPatternsCount?.count || '0'),
          required: nextLevelRequirements.aiGenerations,
          met: parseInt(aiPatternsCount?.count || '0') >= nextLevelRequirements.aiGenerations,
        },
      }),
      ...(nextLevelRequirements.sharedPatterns && {
        sharedPatterns: {
          current: parseInt(sharedPatternsCount?.count || '0'),
          required: nextLevelRequirements.sharedPatterns,
          met: parseInt(sharedPatternsCount?.count || '0') >= nextLevelRequirements.sharedPatterns,
        },
      }),
      ...(nextLevelRequirements.communityHelp && {
        communityHelp: {
          current: 0, // TODO: Implement community help tracking
          required: nextLevelRequirements.communityHelp,
          met: false,
        },
      }),
    };

    // Check if all requirements are met
    const readyForPromotion = Object.values(requirements).every((req) => req.met);

    // Calculate progress percentage based on overall completion
    const completedRequirements = Object.values(requirements).filter((req) => req.met).length;
    const totalRequirements = Object.values(requirements).length;
    const progressPercentage = Math.round((completedRequirements / totalRequirements) * 100);

    return {
      currentLevel,
      nextLevel,
      progressPercentage,
      requirements,
      readyForPromotion,
    };
  }

  /**
   * Award reputation points for various actions
   */
  static async awardReputation(userId: string, action: string, amount: number): Promise<number> {
    const user = await db
      .selectFrom('users')
      .select(['reputation_score', 'user_level'])
      .where('id', '=', userId)
      .executeTakeFirstOrThrow();

    const newScore = Math.min(100, Math.max(0, user.reputation_score + amount));

    await db
      .updateTable('users')
      .set({ reputation_score: newScore })
      .where('id', '=', userId)
      .execute();

    // Check if user is ready for level promotion
    const progression = await this.calculateProgression(userId);
    if (progression.readyForPromotion) {
      await this.promoteUser(userId);
    }

    return newScore;
  }

  /**
   * Promote user to next level
   */
  static async promoteUser(userId: string): Promise<UserLevel | null> {
    const progression = await this.calculateProgression(userId);
    
    if (!progression.readyForPromotion || !progression.nextLevel) {
      return null;
    }

    await db
      .updateTable('users')
      .set({ user_level: progression.nextLevel })
      .where('id', '=', userId)
      .execute();

    // Award level-up achievement if it exists
    const levelUpAchievement = await db
      .selectFrom('achievements')
      .select('id')
      .where('achievement_key', '=', `level_${progression.nextLevel}`)
      .executeTakeFirst();

    if (levelUpAchievement) {
      await db
        .insertInto('user_achievements')
        .values({
          user_id: userId,
          achievement_id: levelUpAchievement.id,
        })
        .onConflict((oc) => oc.doNothing()) // Don't duplicate achievements
        .execute();
    }

    return progression.nextLevel;
  }

  /**
   * Get reputation rewards for different actions
   */
  static getReputationRewards(): Record<string, number> {
    return {
      create_pattern: 2,
      create_ai_pattern: 3,
      share_pattern: 5,
      receive_like: 1,
      complete_achievement: 10,
      use_voice_command: 1,
      help_user: 15,
      report_bug: 10,
      provide_feedback: 5,
      complete_tutorial: 5,
      daily_login: 1,
      weekly_streak: 10,
    };
  }

  /**
   * Track user action and award reputation
   */
  static async trackAction(userId: string, action: string, metadata?: any): Promise<void> {
    const rewards = this.getReputationRewards();
    const reputationReward = rewards[action] || 0;

    if (reputationReward > 0) {
      await this.awardReputation(userId, action, reputationReward);
    }

    // Additional tracking can be added here (analytics, logs, etc.)
    console.log(`User ${userId} performed action: ${action}`, metadata);
  }

  /**
   * Get next unlockable features for user
   */
  static getNextUnlockableFeatures(userLevel: UserLevel): {
    nextLevel: UserLevel | null;
    newFeatures: string[];
  } {
    const levels: UserLevel[] = ['beginner', 'intermediate', 'advanced', 'expert'];
    const currentIndex = levels.indexOf(userLevel);
    
    if (currentIndex === levels.length - 1) {
      return { nextLevel: null, newFeatures: [] };
    }

    const nextLevel = levels[currentIndex + 1];
    const newFeatures = PROGRESSION_CONFIG[nextLevel].features;

    return { nextLevel, newFeatures };
  }
}