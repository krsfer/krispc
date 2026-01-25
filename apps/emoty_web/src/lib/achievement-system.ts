import { db } from '@/db/connection';
import type { AchievementCategory, UserLevel } from '@/db/types';

export interface Achievement {
  id: string;
  achievement_key: string;
  name_en: string;
  name_fr: string;
  description_en: string;
  description_fr: string;
  icon: string;
  required_level: UserLevel;
  category: AchievementCategory;
  points_value: number;
  is_active: boolean;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  achievement: Achievement;
  unlocked_at: Date;
  progress_value?: number;
}

export interface AchievementProgress {
  achievement: Achievement;
  current_value: number;
  target_value: number;
  is_unlocked: boolean;
  progress_percentage: number;
}

export class AchievementSystem {
  /**
   * Get all available achievements for a user level
   */
  static async getAvailableAchievements(userLevel: UserLevel): Promise<Achievement[]> {
    const levelOrder: UserLevel[] = ['beginner', 'intermediate', 'advanced', 'expert'];
    const maxLevelIndex = levelOrder.indexOf(userLevel);
    
    const achievements = await db
      .selectFrom('achievements')
      .selectAll()
      .where('is_active', '=', true)
      .where('required_level', 'in', levelOrder.slice(0, maxLevelIndex + 1))
      .orderBy('required_level')
      .orderBy('category')
      .orderBy('points_value')
      .execute();

    return achievements;
  }

  /**
   * Get user's unlocked achievements
   */
  static async getUserAchievements(userId: string): Promise<UserAchievement[]> {
    const userAchievements = await db
      .selectFrom('user_achievements')
      .innerJoin('achievements', 'user_achievements.achievement_id', 'achievements.id')
      .select([
        'user_achievements.id',
        'user_achievements.user_id',
        'user_achievements.achievement_id',
        'user_achievements.unlocked_at',
        'user_achievements.progress_value',
        'achievements.achievement_key',
        'achievements.name_en',
        'achievements.name_fr',
        'achievements.description_en',
        'achievements.description_fr',
        'achievements.icon',
        'achievements.required_level',
        'achievements.category',
        'achievements.points_value',
        'achievements.is_active',
      ])
      .where('user_achievements.user_id', '=', userId)
      .orderBy('user_achievements.unlocked_at', 'desc')
      .execute();

    return userAchievements.map(ua => ({
      id: ua.id,
      user_id: ua.user_id,
      achievement_id: ua.achievement_id,
      unlocked_at: ua.unlocked_at,
      progress_value: ua.progress_value ?? undefined,
      achievement: {
        id: ua.achievement_id,
        achievement_key: ua.achievement_key,
        name_en: ua.name_en,
        name_fr: ua.name_fr,
        description_en: ua.description_en,
        description_fr: ua.description_fr,
        icon: ua.icon,
        required_level: ua.required_level,
        category: ua.category,
        points_value: ua.points_value,
        is_active: ua.is_active,
      },
    }));
  }

  /**
   * Get achievement progress for a user
   */
  static async getAchievementProgress(userId: string, userLevel: UserLevel): Promise<AchievementProgress[]> {
    const availableAchievements = await this.getAvailableAchievements(userLevel);
    const unlockedAchievements = await this.getUserAchievements(userId);
    const unlockedIds = new Set(unlockedAchievements.map(ua => ua.achievement.id));

    // Get user stats for progress calculation
    const userStats = await this.getUserStats(userId);

    return availableAchievements.map(achievement => {
      const isUnlocked = unlockedIds.has(achievement.id);
      const progress = this.calculateAchievementProgress(achievement, userStats);

      return {
        achievement,
        current_value: progress.current,
        target_value: progress.target,
        is_unlocked: isUnlocked,
        progress_percentage: isUnlocked ? 100 : Math.min(100, (progress.current / progress.target) * 100),
      };
    });
  }

  /**
   * Check and unlock achievements for a user
   */
  static async checkAndUnlockAchievements(userId: string): Promise<Achievement[]> {
    const user = await db
      .selectFrom('users')
      .select(['user_level', 'reputation_score', 'total_patterns_created'])
      .where('id', '=', userId)
      .executeTakeFirst();

    if (!user) return [];

    const userStats = await this.getUserStats(userId);
    const availableAchievements = await this.getAvailableAchievements(user.user_level);
    const unlockedAchievements = await this.getUserAchievements(userId);
    const unlockedKeys = new Set(unlockedAchievements.map(ua => ua.achievement.achievement_key));

    const newlyUnlocked: Achievement[] = [];

    for (const achievement of availableAchievements) {
      if (unlockedKeys.has(achievement.achievement_key)) continue;

      if (this.isAchievementEarned(achievement, userStats)) {
        // Unlock the achievement
        await db
          .insertInto('user_achievements')
          .values({
            user_id: userId,
            achievement_id: achievement.id,
          })
          .onConflict((oc) => oc.doNothing())
          .execute();

        newlyUnlocked.push(achievement);
      }
    }

    return newlyUnlocked;
  }

  /**
   * Get user statistics for achievement calculation
   */
  private static async getUserStats(userId: string) {
    const user = await db
      .selectFrom('users')
      .select([
        'reputation_score',
        'total_patterns_created',
        'user_level',
        'created_at',
      ])
      .where('id', '=', userId)
      .executeTakeFirst();

    const patternStats = await db
      .selectFrom('patterns')
      .select((eb) => [
        eb.fn.count('id').as('total_patterns'),
        eb.fn.count('id').filterWhere('is_public', '=', true).as('public_patterns'),
        eb.fn.count('id').filterWhere('is_ai_generated', '=', true).as('ai_patterns'),
        eb.fn.sum('like_count').as('total_likes'),
      ])
      .where('user_id', '=', userId)
      .executeTakeFirst();

    const achievementCount = await db
      .selectFrom('user_achievements')
      .select((eb) => eb.fn.count('id').as('count'))
      .where('user_id', '=', userId)
      .executeTakeFirst();

    const favoriteCount = await db
      .selectFrom('pattern_favorites')
      .select((eb) => eb.fn.count('id').as('count'))
      .where('user_id', '=', userId)
      .executeTakeFirst();

    return {
      reputation_score: user?.reputation_score || 0,
      total_patterns_created: user?.total_patterns_created || 0,
      user_level: user?.user_level || 'beginner',
      days_since_signup: user ? Math.floor((Date.now() - user.created_at.getTime()) / (1000 * 60 * 60 * 24)) : 0,
      total_patterns: parseInt(String(patternStats?.total_patterns || '0')),
      public_patterns: parseInt(String(patternStats?.public_patterns || '0')),
      ai_patterns: parseInt(String(patternStats?.ai_patterns || '0')),
      total_likes: parseInt(String(patternStats?.total_likes || '0')),
      achievement_count: parseInt(String(achievementCount?.count || '0')),
      favorite_count: parseInt(String(favoriteCount?.count || '0')),
    };
  }

  /**
   * Calculate progress for a specific achievement
   */
  private static calculateAchievementProgress(achievement: Achievement, userStats: any): { current: number; target: number } {
    switch (achievement.achievement_key) {
      case 'first_pattern':
        return { current: userStats.total_patterns, target: 1 };
      case 'pattern_master':
        return { current: userStats.total_patterns, target: 10 };
      case 'pattern_architect':
        return { current: userStats.total_patterns, target: 50 };
      case 'pattern_legend':
        return { current: userStats.total_patterns, target: 100 };
      case 'explorer':
        return { current: Math.min(userStats.total_patterns, 5), target: 5 }; // Simplified - would need palette tracking
      case 'ai_assistant':
        return { current: userStats.ai_patterns, target: 1 };
      case 'ai_whisperer':
        return { current: userStats.ai_patterns, target: 25 };
      case 'social_butterfly':
        return { current: userStats.public_patterns, target: 3 };
      case 'community_leader':
        return { current: 0, target: 5 }; // Would need community help tracking
      case 'voice_commander':
        return { current: 0, target: 5 }; // Would need voice command tracking
      case 'accessibility_champion':
        return { current: 0, target: 1 }; // Would need accessibility feature usage tracking
      case 'multilingual':
        return { current: 0, target: 1 }; // Would need language switching tracking
      default:
        return { current: 0, target: 1 };
    }
  }

  /**
   * Check if an achievement has been earned
   */
  private static isAchievementEarned(achievement: Achievement, userStats: any): boolean {
    const progress = this.calculateAchievementProgress(achievement, userStats);
    return progress.current >= progress.target;
  }

  /**
   * Get achievement statistics for a user
   */
  static async getAchievementStats(userId: string): Promise<{
    total_available: number;
    total_unlocked: number;
    completion_percentage: number;
    points_earned: number;
    recent_achievements: UserAchievement[];
  }> {
    const user = await db
      .selectFrom('users')
      .select('user_level')
      .where('id', '=', userId)
      .executeTakeFirst();

    if (!user) {
      return {
        total_available: 0,
        total_unlocked: 0,
        completion_percentage: 0,
        points_earned: 0,
        recent_achievements: [],
      };
    }

    const availableAchievements = await this.getAvailableAchievements(user.user_level);
    const unlockedAchievements = await this.getUserAchievements(userId);

    const pointsEarned = unlockedAchievements.reduce(
      (total, ua) => total + ua.achievement.points_value,
      0
    );

    const recentAchievements = unlockedAchievements
      .sort((a, b) => new Date(b.unlocked_at).getTime() - new Date(a.unlocked_at).getTime())
      .slice(0, 5);

    return {
      total_available: availableAchievements.length,
      total_unlocked: unlockedAchievements.length,
      completion_percentage: availableAchievements.length > 0 
        ? Math.round((unlockedAchievements.length / availableAchievements.length) * 100)
        : 0,
      points_earned: pointsEarned,
      recent_achievements: recentAchievements,
    };
  }

  /**
   * Get achievements by category
   */
  static async getAchievementsByCategory(userLevel: UserLevel): Promise<Record<AchievementCategory, Achievement[]>> {
    const achievements = await this.getAvailableAchievements(userLevel);
    
    const categorized: Record<AchievementCategory, Achievement[]> = {
      pattern_creation: [],
      social_engagement: [],
      exploration: [],
      ai_interaction: [],
      accessibility: [],
      special: [],
    };

    achievements.forEach(achievement => {
      categorized[achievement.category].push(achievement);
    });

    return categorized;
  }

  /**
   * Create a custom achievement (for special events or admin purposes)
   */
  static async createCustomAchievement(achievement: Omit<Achievement, 'id' | 'is_active'>): Promise<Achievement> {
    const newAchievement = await db
      .insertInto('achievements')
      .values({
        ...achievement,
        is_active: true,
      })
      .returning([
        'id',
        'achievement_key',
        'name_en',
        'name_fr',
        'description_en',
        'description_fr',
        'icon',
        'required_level',
        'category',
        'points_value',
        'is_active',
      ])
      .executeTakeFirstOrThrow();

    return newAchievement;
  }

  /**
   * Award achievement directly to a user (bypass normal unlocking logic)
   */
  static async awardAchievement(userId: string, achievementKey: string): Promise<boolean> {
    const achievement = await db
      .selectFrom('achievements')
      .select('id')
      .where('achievement_key', '=', achievementKey)
      .where('is_active', '=', true)
      .executeTakeFirst();

    if (!achievement) return false;

    try {
      await db
        .insertInto('user_achievements')
        .values({
          user_id: userId,
          achievement_id: achievement.id,
        })
        .onConflict((oc) => oc.doNothing())
        .execute();

      return true;
    } catch (error) {
      console.error('Failed to award achievement:', error);
      return false;
    }
  }
}