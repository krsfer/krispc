// Analytics and Usage Tracking Service
// Provides comprehensive analytics for patterns, users, and system performance

import { sql } from 'kysely';
import { db } from '@/db/connection';
import type {
  PatternAnalytics,
  PatternActionType,
  UserLevel,
  PatternUsageStatsInsert
} from '@/db/types';

export class AnalyticsService {
  // Log pattern action with metadata
  async logPatternAction(
    patternId: string,
    userId: string | null,
    actionType: PatternActionType,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const actionData: PatternUsageStatsInsert = {
        pattern_id: patternId,
        user_id: userId,
        action_type: actionType
      };

      await db
        .insertInto('pattern_usage_stats')
        .values(actionData)
        .execute();

      // Update counters based on action type
      switch (actionType) {
        case 'view':
          await db
            .updateTable('patterns')
            .set({ view_count: sql`view_count + 1` })
            .where('id', '=', patternId)
            .execute();
          break;

        case 'like':
          await db
            .updateTable('patterns')
            .set({ like_count: sql`like_count + 1` })
            .where('id', '=', patternId)
            .execute();
          break;
      }

    } catch (error) {
      console.error('Error logging pattern action:', error);
      // Don't throw - logging should not break main functionality
    }
  }

  // Get comprehensive pattern analytics
  async getPatternAnalytics(patternId: string): Promise<any | null> {
    try {
      // Get basic pattern analytics from materialized view
      const basicAnalytics = await db
        .selectFrom('pattern_analytics')
        .selectAll()
        .where('id', '=', patternId)
        .executeTakeFirst();

      if (!basicAnalytics) {
        return null;
      }

      // Get detailed usage breakdown
      const usageBreakdown = await db
        .selectFrom('pattern_usage_stats')
        .select([
          'action_type',
          sql`COUNT(*)`.as('count'),
          sql`COUNT(DISTINCT user_id)`.as('unique_users')
        ])
        .where('pattern_id', '=', patternId)
        .groupBy('action_type')
        .execute();

      // Get time-based analytics
      const weeklyStats = await db
        .selectFrom('pattern_usage_stats')
        .select([
          sql<Date>`DATE_TRUNC('day', created_at)`.as('date'),
          sql<number>`COUNT(*)`.as('actions'),
          sql<number>`COUNT(DISTINCT user_id)`.as('unique_users')
        ])
        .where('pattern_id', '=', patternId)
        .where(sql<boolean>`created_at >= NOW() - INTERVAL '30 days'`)
        .groupBy(sql`DATE_TRUNC('day', created_at)`)
        .orderBy('date')
        .execute();

      // Get geographic breakdown (if user location available)
      const userLevelBreakdown = await db
        .selectFrom('pattern_usage_stats as pus')
        .leftJoin('users as u', 'pus.user_id', 'u.id')
        .select([
          'u.user_level',
          sql`COUNT(*)`.as('actions')
        ])
        .where('pus.pattern_id', '=', patternId)
        .where('u.user_level', 'is not', null)
        .groupBy('u.user_level')
        .execute();

      return {
        ...basicAnalytics,
        usage_breakdown: usageBreakdown.reduce((acc, item) => ({
          ...acc,
          [item.action_type]: {
            count: parseInt(item.count as string, 10),
            unique_users: parseInt(item.unique_users as string, 10)
          }
        }), {}),
        daily_stats: weeklyStats.map(stat => ({
          date: stat.date as Date,
          actions: Number(stat.actions),
          unique_users: Number(stat.unique_users)
        })),
        user_level_breakdown: userLevelBreakdown.reduce((acc, item) => ({
          ...acc,
          [item.user_level as UserLevel]: parseInt(item.actions as string, 10)
        }), {} as Record<UserLevel, number>)
      };

    } catch (error) {
      console.error('Error getting pattern analytics:', error);
      throw new Error('Failed to get pattern analytics');
    }
  }

  // Get user analytics
  async getUserAnalytics(userId: string): Promise<{
    total_patterns: number;
    public_patterns: number;
    private_patterns: number;
    total_views: number;
    total_likes: number;
    total_favorites_received: number;
    patterns_favorited: number;
    collections_created: number;
    sharing_stats: {
      patterns_shared: number;
      shares_received: number;
    };
    activity_by_month: Array<{
      month: string;
      patterns_created: number;
      actions_performed: number;
    }>;
    most_used_tags: Array<{
      tag: string;
      count: number;
    }>;
    difficulty_distribution: Record<number, number>;
  }> {
    try {
      // Basic pattern statistics
      const patternStats = await db
        .selectFrom('patterns')
        .select([
          sql`COUNT(*)`.as('total_patterns'),
          sql`COUNT(*) FILTER (WHERE is_public = true)`.as('public_patterns'),
          sql`COUNT(*) FILTER (WHERE is_public = false)`.as('private_patterns'),
          sql`SUM(view_count)`.as('total_views'),
          sql`SUM(like_count)`.as('total_likes')
        ])
        .where('user_id', '=', userId)
        .where('deleted_at', 'is', null)
        .executeTakeFirst();

      // Favorites received
      const favoritesReceived = await db
        .selectFrom('pattern_favorites as pf')
        .innerJoin('patterns as p', 'pf.pattern_id', 'p.id')
        .select(sql`COUNT(*)`.as('count'))
        .where('p.user_id', '=', userId)
        .where('p.deleted_at', 'is', null)
        .executeTakeFirst();

      // Patterns favorited by user
      const patternsFavorited = await db
        .selectFrom('pattern_favorites')
        .select(sql`COUNT(*)`.as('count'))
        .where('user_id', '=', userId)
        .executeTakeFirst();

      // Collections created
      const collectionsCreated = await db
        .selectFrom('pattern_collections')
        .select(sql`COUNT(*)`.as('count'))
        .where('user_id', '=', userId)
        .executeTakeFirst();

      // Sharing statistics
      const sharingStats = await db
        .selectFrom('pattern_shares as ps')
        .select([
          sql`COUNT(*) FILTER (WHERE ps.shared_by_user_id = ${userId})`.as('patterns_shared'),
          sql`COUNT(*) FILTER (WHERE ps.shared_with_user_id = ${userId})`.as('shares_received')
        ])
        .execute();

      // Activity by month
      const monthlyActivity = await db
        .selectFrom('patterns as p')
        .select([
          sql`TO_CHAR(p.created_at, 'YYYY-MM')`.as('month'),
          sql`COUNT(*)`.as('patterns_created')
        ])
        .where('p.user_id', '=', userId)
        .where('p.deleted_at', 'is', null)
        .where(sql<boolean>`p.created_at >= NOW() - INTERVAL '12 months'`)
        .groupBy(sql`TO_CHAR(p.created_at, 'YYYY-MM')`)
        .orderBy('month')
        .execute();

      // Get user actions for activity breakdown
      const userActions = await db
        .selectFrom('pattern_usage_stats as pus')
        .select([
          sql`TO_CHAR(pus.created_at, 'YYYY-MM')`.as('month'),
          sql`COUNT(*)`.as('actions_performed')
        ])
        .where('pus.user_id', '=', userId)
        .where(sql<boolean>`pus.created_at >= NOW() - INTERVAL '12 months'`)
        .groupBy(sql`TO_CHAR(pus.created_at, 'YYYY-MM')`)
        .execute();

      // Most used tags
      const mostUsedTags = await db
        .selectFrom('patterns')
        .select([
          sql`unnest(tags)`.as('tag'),
          sql`COUNT(*)`.as('count')
        ])
        .where('user_id', '=', userId)
        .where('tags', 'is not', null)
        .where('deleted_at', 'is', null)
        .groupBy(sql`unnest(tags)`)
        .orderBy('count', 'desc')
        .limit(10)
        .execute();

      // Difficulty distribution
      const difficultyDistribution = await db
        .selectFrom('patterns')
        .select([
          'difficulty_rating',
          sql`COUNT(*)`.as('count')
        ])
        .where('user_id', '=', userId)
        .where('difficulty_rating', 'is not', null)
        .where('deleted_at', 'is', null)
        .groupBy('difficulty_rating')
        .execute();

      // Combine monthly activity data
      const activityMap = new Map();
      monthlyActivity.forEach(item => {
        activityMap.set(item.month, {
          month: item.month,
          patterns_created: parseInt(item.patterns_created as string, 10),
          actions_performed: 0
        });
      });

      userActions.forEach(item => {
        const existing = activityMap.get(item.month) || {
          month: item.month,
          patterns_created: 0,
          actions_performed: 0
        };
        existing.actions_performed = parseInt(item.actions_performed as string, 10);
        activityMap.set(item.month, existing);
      });

      return {
        total_patterns: parseInt(patternStats?.total_patterns as string || '0', 10),
        public_patterns: parseInt(patternStats?.public_patterns as string || '0', 10),
        private_patterns: parseInt(patternStats?.private_patterns as string || '0', 10),
        total_views: parseInt(patternStats?.total_views as string || '0', 10),
        total_likes: parseInt(patternStats?.total_likes as string || '0', 10),
        total_favorites_received: parseInt(favoritesReceived?.count as string || '0', 10),
        patterns_favorited: parseInt(patternsFavorited?.count as string || '0', 10),
        collections_created: parseInt(collectionsCreated?.count as string || '0', 10),
        sharing_stats: {
          patterns_shared: parseInt(sharingStats[0]?.patterns_shared as string || '0', 10),
          shares_received: parseInt(sharingStats[0]?.shares_received as string || '0', 10)
        },
        activity_by_month: Array.from(activityMap.values()).sort((a, b) => a.month.localeCompare(b.month)),
        most_used_tags: mostUsedTags.map(tag => ({
          tag: tag.tag as string,
          count: parseInt(tag.count as string, 10)
        })),
        difficulty_distribution: difficultyDistribution.reduce((acc, item) => ({
          ...acc,
          [item.difficulty_rating!]: parseInt(item.count as string, 10)
        }), {} as Record<number, number>)
      };

    } catch (error) {
      console.error('Error getting user analytics:', error);
      throw new Error('Failed to get user analytics');
    }
  }

  // Get platform-wide analytics
  async getPlatformAnalytics(): Promise<{
    total_users: number;
    active_users_30d: number;
    total_patterns: number;
    public_patterns: number;
    ai_generated_patterns: number;
    total_collections: number;
    total_views: number;
    total_likes: number;
    most_popular_tags: Array<{ tag: string; count: number }>;
    user_level_distribution: Record<UserLevel, number>;
    creation_trends: Array<{ date: string; patterns: number; users: number }>;
    top_creators: Array<{
      user_id: string;
      username: string;
      pattern_count: number;
      total_views: number;
      total_likes: number;
    }>;
  }> {
    try {
      // Basic platform statistics
      const basicStats = await db
        .selectFrom('patterns as p')
        .leftJoin('users as u', 'p.user_id', 'u.id')
        .select([
          sql`COUNT(DISTINCT p.user_id)`.as('total_pattern_creators'),
          sql`COUNT(p.id)`.as('total_patterns'),
          sql`COUNT(p.id) FILTER (WHERE p.is_public = true)`.as('public_patterns'),
          sql`COUNT(p.id) FILTER (WHERE p.is_ai_generated = true)`.as('ai_generated_patterns'),
          sql`SUM(p.view_count)`.as('total_views'),
          sql`SUM(p.like_count)`.as('total_likes')
        ])
        .where('p.deleted_at', 'is', null)
        .executeTakeFirst();

      // Total users
      const totalUsers = await db
        .selectFrom('users')
        .select(sql`COUNT(*)`.as('count'))
        .where('is_active', '=', true)
        .executeTakeFirst();

      // Active users in last 30 days
      const activeUsers30d = await db
        .selectFrom('pattern_usage_stats')
        .select(sql`COUNT(DISTINCT user_id)`.as('count'))
        .where(sql<boolean>`created_at >= NOW() - INTERVAL '30 days'`)
        .where('user_id', 'is not', null)
        .executeTakeFirst();

      // Total collections
      const totalCollections = await db
        .selectFrom('pattern_collections')
        .select(sql`COUNT(*)`.as('count'))
        .executeTakeFirst();

      // Most popular tags
      const popularTags = await db
        .selectFrom('patterns')
        .select([
          sql`unnest(tags)`.as('tag'),
          sql`COUNT(*)`.as('count')
        ])
        .where('tags', 'is not', null)
        .where('deleted_at', 'is', null)
        .where('is_public', '=', true)
        .groupBy(sql`unnest(tags)`)
        .orderBy('count', 'desc')
        .limit(20)
        .execute();

      // User level distribution
      const userLevelDistribution = await db
        .selectFrom('users')
        .select([
          'user_level',
          sql`COUNT(*)`.as('count')
        ])
        .where('is_active', '=', true)
        .groupBy('user_level')
        .execute();

      // Creation trends (last 30 days)
      const creationTrends = await db
        .selectFrom('patterns as p')
        .select([
          sql`DATE_TRUNC('day', p.created_at)`.as('date'),
          sql`COUNT(p.id)`.as('patterns'),
          sql`COUNT(DISTINCT p.user_id)`.as('users')
        ])
        .where(sql<boolean>`p.created_at >= NOW() - INTERVAL '30 days'`)
        .where('p.deleted_at', 'is', null)
        .groupBy(sql`DATE_TRUNC('day', p.created_at)`)
        .orderBy('date')
        .execute();

      // Top creators
      const topCreators = await db
        .selectFrom('patterns as p')
        .innerJoin('users as u', 'p.user_id', 'u.id')
        .select([
          'p.user_id',
          'u.username',
          sql`COUNT(p.id)`.as('pattern_count'),
          sql`SUM(p.view_count)`.as('total_views'),
          sql`SUM(p.like_count)`.as('total_likes')
        ])
        .where('p.deleted_at', 'is', null)
        .where('p.is_public', '=', true)
        .where('u.is_active', '=', true)
        .groupBy(['p.user_id', 'u.username'])
        .orderBy('pattern_count', 'desc')
        .limit(10)
        .execute();

      return {
        total_users: parseInt(totalUsers?.count as string || '0', 10),
        active_users_30d: parseInt(activeUsers30d?.count as string || '0', 10),
        total_patterns: parseInt(basicStats?.total_patterns as string || '0', 10),
        public_patterns: parseInt(basicStats?.public_patterns as string || '0', 10),
        ai_generated_patterns: parseInt(basicStats?.ai_generated_patterns as string || '0', 10),
        total_collections: parseInt(totalCollections?.count as string || '0', 10),
        total_views: parseInt(basicStats?.total_views as string || '0', 10),
        total_likes: parseInt(basicStats?.total_likes as string || '0', 10),
        most_popular_tags: popularTags.map(tag => ({
          tag: tag.tag as string,
          count: parseInt(tag.count as string, 10)
        })),
        user_level_distribution: userLevelDistribution.reduce((acc, item) => ({
          ...acc,
          [item.user_level]: parseInt(item.count as string, 10)
        }), {} as Record<UserLevel, number>),
        creation_trends: creationTrends.map(trend => ({
          date: (trend.date as Date).toISOString().split('T')[0],
          patterns: parseInt(trend.patterns as string, 10),
          users: parseInt(trend.users as string, 10)
        })),
        top_creators: topCreators.map(creator => ({
          user_id: creator.user_id,
          username: creator.username || 'Unknown',
          pattern_count: parseInt(creator.pattern_count as string, 10),
          total_views: parseInt(creator.total_views as string, 10),
          total_likes: parseInt(creator.total_likes as string, 10)
        }))
      };

    } catch (error) {
      console.error('Error getting platform analytics:', error);
      throw new Error('Failed to get platform analytics');
    }
  }

  // Refresh materialized view
  async refreshAnalytics(): Promise<void> {
    try {
      await db.executeQuery(
        sql`REFRESH MATERIALIZED VIEW CONCURRENTLY pattern_analytics`.compile(db)
      );
    } catch (error) {
      console.error('Error refreshing analytics:', error);
      throw new Error('Failed to refresh analytics');
    }
  }

  // Get performance metrics
  async getPerformanceMetrics(): Promise<{
    avg_response_time: number;
    cache_hit_rate: number;
    database_connections: number;
    slow_queries: number;
  }> {
    try {
      // This would typically integrate with monitoring systems
      // For now, returning mock data structure
      return {
        avg_response_time: 0, // Would be populated from monitoring
        cache_hit_rate: 0, // Would be populated from cache stats
        database_connections: 0, // Would be populated from pg_stat_activity
        slow_queries: 0 // Would be populated from query logs
      };
    } catch (error) {
      console.error('Error getting performance metrics:', error);
      throw new Error('Failed to get performance metrics');
    }
  }

  // Schedule analytics refresh (for background jobs)
  async scheduleAnalyticsRefresh(): Promise<void> {
    try {
      // This would typically use a job queue like Redis + Bull
      // For now, just refresh immediately
      await this.refreshAnalytics();
    } catch (error) {
      console.error('Error scheduling analytics refresh:', error);
    }
  }

  // Get real-time activity feed
  async getActivityFeed(limit: number = 50): Promise<Array<{
    id: string;
    user_id: string;
    username: string;
    action_type: PatternActionType;
    pattern_id: string;
    pattern_name: string;
    timestamp: Date;
  }>> {
    try {
      const activities = await db
        .selectFrom('pattern_usage_stats as pus')
        .innerJoin('users as u', 'pus.user_id', 'u.id')
        .innerJoin('patterns as p', 'pus.pattern_id', 'p.id')
        .select([
          'pus.id',
          sql<string>`pus.user_id`.as('user_id'),
          sql<string>`u.username`.as('username'),
          'pus.action_type',
          'pus.pattern_id',
          'p.name as pattern_name',
          'pus.created_at as timestamp'
        ])
        .where('p.is_public', '=', true)
        .where('p.deleted_at', 'is', null)
        .where('u.is_active', '=', true)
        .orderBy('pus.created_at', 'desc')
        .limit(limit)
        .execute();

      return activities;

    } catch (error) {
      console.error('Error getting activity feed:', error);
      throw new Error('Failed to get activity feed');
    }
  }
}

export const analyticsService = new AnalyticsService();