// Enhanced Pattern Service Layer - Phase 2
// High-performance pattern persistence with advanced search and caching

import { sql, Selectable } from 'kysely';
import { db } from '@/db/connection';
import type {
  PatternTable,
  PatternInsert,
  PatternUpdate,
  PatternWithDetails,
  PatternSearchFilters,
  PatternSortOptions,
  PaginationOptions,
  PatternSearchResponse,
  PatternSequence,
  PatternUsageStatsInsert,
  PatternActionType,
  UserLevel
} from '@/db/types';

export class PatternService {
  // Create a new pattern with optimized indexing
  async createPattern(data: PatternInsert): Promise<Selectable<PatternTable>> {
    try {
      const pattern = await db.transaction().execute(async (trx) => {
        // Insert the pattern
        const [newPattern] = await trx
          .insertInto('patterns')
          .values(data)
          .returning([
            'id', 'user_id', 'name', 'sequence', 'palette_id', 'size',
            'is_public', 'is_ai_generated', 'generation_prompt', 'tags',
            'difficulty_rating', 'view_count', 'like_count', 'complexity_score',
            'difficulty_rating', 'view_count', 'like_count', 'complexity_score',
            'estimated_time_minutes', 'version', 'parent_pattern_id', 'search_vector',
            'deleted_at', 'deleted_by', 'created_at', 'updated_at'
          ])
          .execute();

        // Update user's pattern count
        await trx
          .updateTable('users')
          .set({ total_patterns_created: sql`total_patterns_created + 1` })
          .where('id', '=', data.user_id)
          .execute();

        // Log the creation action
        await this.logPatternAction(trx, newPattern.id, data.user_id, 'view');

        return newPattern;
      });

      return pattern;
    } catch (error) {
      console.error('Error creating pattern:', error);
      throw new Error('Failed to create pattern');
    }
  }

  // Get pattern by ID with user context
  async getPatternById(
    patternId: string,
    currentUserId?: string
  ): Promise<PatternWithDetails | null> {
    try {
      const query = db
        .selectFrom('patterns as p')
        .leftJoin('users as u', 'p.user_id', 'u.id')
        .leftJoin('pattern_favorites as pf', (join) =>
          join
            .onRef('pf.pattern_id', '=', 'p.id')
            .on('pf.user_id', '=', currentUserId || '')
        )
        .leftJoin('pattern_analytics as pa', 'p.id', 'pa.id')
        .select([
          'p.id', 'p.user_id', 'p.name', 'p.sequence', 'p.palette_id', 'p.size',
          'p.is_public', 'p.is_ai_generated', 'p.generation_prompt', 'p.tags',
          'p.difficulty_rating', 'p.view_count', 'p.like_count', 'p.complexity_score',
          'p.estimated_time_minutes', 'p.version', 'p.parent_pattern_id', 'p.search_vector',
          'p.deleted_at', 'p.deleted_by',
          'p.created_at', 'p.updated_at',
          'u.username as user_username',
          'u.full_name as user_full_name',
          'u.avatar_url as user_avatar_url',
          sql<boolean>`CASE WHEN pf.id IS NOT NULL THEN true ELSE false END`.as('is_favorited'),
          sql<string[]>`COALESCE(
            ARRAY(
              SELECT pc.name 
              FROM pattern_collection_items pci 
              JOIN pattern_collections pc ON pci.collection_id = pc.id 
              WHERE pci.pattern_id = p.id
            ), 
            ARRAY[]::text[]
          )`.as('collection_names'),
          'pa.unique_favorites', 'pa.detailed_view_count', 'pa.share_count',
          'pa.copy_count', 'pa.collection_count', 'pa.recent_activity_score'
        ])
        .where('p.id', '=', patternId)
        .where('p.deleted_at', 'is', null);

      const result = await query.executeTakeFirst();

      if (!result) return null;

      // Structure the analytics data
      const analytics = result.unique_favorites !== undefined ? {
        id: result.id,
        name: result.name,
        user_id: result.user_id,
        is_public: result.is_public,
        created_at: result.created_at,
        view_count: result.view_count,
        like_count: result.like_count,
        difficulty_rating: result.difficulty_rating,
        complexity_score: result.complexity_score,
        unique_favorites: result.unique_favorites!,
        detailed_view_count: result.detailed_view_count!,
        share_count: result.share_count!,
        copy_count: result.copy_count!,
        collection_count: result.collection_count!,
        recent_activity_score: result.recent_activity_score!
      } : null;

      return {
        ...result,
        analytics
      } as PatternWithDetails;

    } catch (error) {
      console.error('Error fetching pattern:', error);
      throw new Error('Failed to fetch pattern');
    }
  }

  // Advanced pattern search with full-text search and filtering
  async searchPatterns(
    filters: PatternSearchFilters = {},
    sort: PatternSortOptions = { field: 'created_at', direction: 'desc' },
    pagination: PaginationOptions = { limit: 20 },
    currentUserId?: string
  ): Promise<PatternSearchResponse> {
    try {
      let query = db
        .selectFrom('patterns as p')
        .leftJoin('users as u', 'p.user_id', 'u.id')
        .leftJoin('pattern_favorites as pf', (join) =>
          join
            .onRef('pf.pattern_id', '=', 'p.id')
            .on('pf.user_id', '=', currentUserId || '')
        )
        .leftJoin('pattern_analytics as pa', 'p.id', 'pa.id')
        .where('p.deleted_at', 'is', null);

      // Apply filters
      if (filters.query) {
        query = query.where(
          sql<boolean>`p.search_vector @@ plainto_tsquery('english', ${filters.query})`
        );
      }

      if (filters.tags && filters.tags.length > 0) {
        query = query.where(sql<boolean>`p.tags && ${sql.literal(JSON.stringify(filters.tags))}`);
      }

      if (filters.user_id) {
        query = query.where('p.user_id', '=', filters.user_id);
      }

      if (filters.palette_id) {
        query = query.where('p.palette_id', '=', filters.palette_id);
      }

      if (filters.is_public !== undefined) {
        query = query.where('p.is_public', '=', filters.is_public);
      }

      if (filters.is_ai_generated !== undefined) {
        query = query.where('p.is_ai_generated', '=', filters.is_ai_generated);
      }

      if (filters.difficulty_min !== undefined) {
        query = query.where('p.difficulty_rating', '>=', filters.difficulty_min);
      }

      if (filters.difficulty_max !== undefined) {
        query = query.where('p.difficulty_rating', '<=', filters.difficulty_max);
      }

      if (filters.complexity_min !== undefined) {
        query = query.where('p.complexity_score', '>=', filters.complexity_min);
      }

      if (filters.complexity_max !== undefined) {
        query = query.where('p.complexity_score', '<=', filters.complexity_max);
      }

      if (filters.created_after) {
        query = query.where('p.created_at', '>=', filters.created_after);
      }

      if (filters.created_before) {
        query = query.where('p.created_at', '<=', filters.created_before);
      }

      // Privacy filter - show only public patterns unless user owns them
      if (currentUserId) {
        query = query.where((eb) =>
          eb.or([
            eb('p.is_public', '=', true),
            eb('p.user_id', '=', currentUserId)
          ])
        );
      } else {
        query = query.where('p.is_public', '=', true);
      }

      // Get total count
      const countQuery = query.select(sql`COUNT(*)`.as('total'));
      const { total } = await countQuery.executeTakeFirst() as { total: string };

      // Apply sorting
      const sortField = sort.field === 'name' ? 'p.name' : `p.${sort.field}`;
      query = query.orderBy(sortField as any, sort.direction);

      // Apply pagination
      if (pagination.offset !== undefined) {
        query = query.offset(pagination.offset);
      }
      query = query.limit(pagination.limit);

      // Execute main query
      const results = await query
        .select([
          'p.id', 'p.user_id', 'p.name', 'p.sequence', 'p.palette_id', 'p.size',
          'p.is_public', 'p.is_ai_generated', 'p.generation_prompt', 'p.tags',
          'p.difficulty_rating', 'p.view_count', 'p.like_count', 'p.complexity_score',
          'p.estimated_time_minutes', 'p.version', 'p.parent_pattern_id',
          'p.search_vector', 'p.deleted_at', 'p.deleted_by',
          'p.created_at', 'p.updated_at',
          'u.username as user_username',
          'u.full_name as user_full_name',
          'u.avatar_url as user_avatar_url',
          sql<boolean>`CASE WHEN pf.id IS NOT NULL THEN true ELSE false END`.as('is_favorited'),
          sql<string[]>`COALESCE(
            ARRAY(
              SELECT pc.name 
              FROM pattern_collection_items pci 
              JOIN pattern_collections pc ON pci.collection_id = pc.id 
              WHERE pci.pattern_id = p.id
            ), 
            ARRAY[]::text[]
          )`.as('collection_names')
        ])
        .execute();

      // Get facets for filtering UI
      const facets = await this.getSearchFacets(filters, currentUserId);

      const totalNum = parseInt(total, 10);
      const page = pagination.offset ? Math.floor(pagination.offset / pagination.limit) + 1 : 1;

      return {
        data: results.map(result => ({ ...result, analytics: null }) as PatternWithDetails),
        pagination: {
          total: totalNum,
          page,
          limit: pagination.limit,
          has_next: (pagination.offset || 0) + pagination.limit < totalNum,
          has_prev: (pagination.offset || 0) > 0
        },
        facets
      };

    } catch (error) {
      console.error('Error searching patterns:', error);
      throw new Error('Failed to search patterns');
    }
  }

  // Get search facets for filtering UI
  private async getSearchFacets(
    filters: PatternSearchFilters,
    currentUserId?: string
  ): Promise<PatternSearchResponse['facets']> {
    try {
      let baseQuery = db
        .selectFrom('patterns as p')
        .where('p.deleted_at', 'is', null);

      // Apply same privacy filter as main query
      if (currentUserId) {
        baseQuery = baseQuery.where((eb) =>
          eb.or([
            eb('p.is_public', '=', true),
            eb('p.user_id', '=', currentUserId)
          ])
        );
      } else {
        baseQuery = baseQuery.where('p.is_public', '=', true);
      }

      // Get tag facets
      const tags = await baseQuery
        .select([
          sql<string>`unnest(tags)`.as('tag'),
          sql<string>`COUNT(*)`.as('count')
        ])
        .where('tags', 'is not', null)
        .groupBy(sql`unnest(tags)`)
        .orderBy('count', 'desc')
        .limit(20)
        .execute() as { tag: string; count: string }[];

      // Get difficulty facets
      const difficulty_ratings = await baseQuery
        .select([
          'difficulty_rating as rating',
          sql<string>`COUNT(*)`.as('count')
        ])
        .where('difficulty_rating', 'is not', null)
        .groupBy('difficulty_rating')
        .orderBy('difficulty_rating')
        .execute() as { rating: number; count: string }[];

      // Get palette facets
      const palettes = await baseQuery
        .select([
          'palette_id',
          sql<string>`COUNT(*)`.as('count')
        ])
        .groupBy('palette_id')
        .orderBy('count', 'desc')
        .limit(10)
        .execute() as { palette_id: string; count: string }[];

      // Get user level distribution (based on pattern creators)
      const user_levels = await baseQuery
        .leftJoin('users as u', 'p.user_id', 'u.id')
        .select([
          'u.user_level as level',
          sql<string>`COUNT(*)`.as('count')
        ])
        .where('u.user_level', 'is not', null)
        .groupBy('u.user_level')
        .orderBy('count', 'desc')
        .execute() as { level: UserLevel; count: string }[];

      return {
        tags: tags.map(t => ({ tag: t.tag, count: parseInt(t.count, 10) })),
        difficulty_ratings: difficulty_ratings.map(d => ({
          rating: d.rating,
          count: parseInt(d.count, 10)
        })),
        palettes: palettes.map(p => ({
          palette_id: p.palette_id,
          count: parseInt(p.count, 10)
        })),
        user_levels: user_levels.map(ul => ({
          level: ul.level,
          count: parseInt(ul.count, 10)
        }))
      };
    } catch (error) {
      console.error('Error getting search facets:', error);
      return { tags: [], difficulty_ratings: [], palettes: [], user_levels: [] };
    }
  }

  // Update pattern with optimistic locking
  async updatePattern(
    patternId: string,
    updates: PatternUpdate,
    currentUserId: string
  ): Promise<Selectable<PatternTable>> {
    try {
      return await db.transaction().execute(async (trx) => {
        // Check ownership and current version
        const currentPattern = await trx
          .selectFrom('patterns')
          .select(['user_id', 'version'])
          .where('id', '=', patternId)
          .where('deleted_at', 'is', null)
          .executeTakeFirst();

        if (!currentPattern) {
          throw new Error('Pattern not found');
        }

        if (currentPattern.user_id !== currentUserId) {
          throw new Error('Permission denied');
        }

        // Update with version increment
        const [updatedPattern] = await trx
          .updateTable('patterns')
          .set({
            ...updates,
            version: sql`version + 1`
          })
          .where('id', '=', patternId)
          .where('version', '=', currentPattern.version) // Optimistic locking
          .returning([
            'id', 'user_id', 'name', 'sequence', 'palette_id', 'size',
            'is_public', 'is_ai_generated', 'generation_prompt', 'tags',
            'difficulty_rating', 'view_count', 'like_count', 'complexity_score',
            'estimated_time_minutes', 'version', 'parent_pattern_id',
            'search_vector', 'deleted_at', 'deleted_by',
            'created_at', 'updated_at'
          ])
          .execute();

        if (!updatedPattern) {
          throw new Error('Pattern was modified by another user. Please refresh and try again.');
        }

        // Log the edit action
        await this.logPatternAction(trx, patternId, currentUserId, 'edit');

        return updatedPattern;
      });
    } catch (error) {
      console.error('Error updating pattern:', error);
      throw error;
    }
  }

  // Soft delete pattern
  async deletePattern(patternId: string, currentUserId: string): Promise<void> {
    try {
      await db.transaction().execute(async (trx) => {
        // Check ownership
        const pattern = await trx
          .selectFrom('patterns')
          .select(['user_id'])
          .where('id', '=', patternId)
          .where('deleted_at', 'is', null)
          .executeTakeFirst();

        if (!pattern) {
          throw new Error('Pattern not found');
        }

        if (pattern.user_id !== currentUserId) {
          throw new Error('Permission denied');
        }

        // Soft delete
        await trx
          .updateTable('patterns')
          .set({
            deleted_at: new Date(),
            deleted_by: currentUserId
          })
          .where('id', '=', patternId)
          .execute();

        // Update user's pattern count
        await trx
          .updateTable('users')
          .set({ total_patterns_created: sql`total_patterns_created - 1` })
          .where('id', '=', currentUserId)
          .execute();
      });
    } catch (error) {
      console.error('Error deleting pattern:', error);
      throw error;
    }
  }

  // Restore soft-deleted pattern
  async restorePattern(patternId: string, currentUserId: string): Promise<Selectable<PatternTable>> {
    try {
      return await db.transaction().execute(async (trx) => {
        // Check ownership and that it's actually deleted
        const pattern = await trx
          .selectFrom('patterns')
          .select(['user_id', 'deleted_by'])
          .where('id', '=', patternId)
          .where('deleted_at', 'is not', null)
          .executeTakeFirst();

        if (!pattern) {
          throw new Error('Deleted pattern not found');
        }

        if (pattern.user_id !== currentUserId && pattern.deleted_by !== currentUserId) {
          throw new Error('Permission denied');
        }

        // Restore
        const [restoredPattern] = await trx
          .updateTable('patterns')
          .set({
            deleted_at: null,
            deleted_by: null
          })
          .where('id', '=', patternId)
          .returning([
            'id', 'user_id', 'name', 'sequence', 'palette_id', 'size',
            'is_public', 'is_ai_generated', 'generation_prompt', 'tags',
            'difficulty_rating', 'view_count', 'like_count', 'complexity_score',
            'estimated_time_minutes', 'version', 'parent_pattern_id',
            'search_vector', 'deleted_at', 'deleted_by',
            'created_at', 'updated_at'
          ])
          .execute();

        // Update user's pattern count
        await trx
          .updateTable('users')
          .set({ total_patterns_created: sql`total_patterns_created + 1` })
          .where('id', '=', currentUserId)
          .execute();

        return restoredPattern!;
      });
    } catch (error) {
      console.error('Error restoring pattern:', error);
      throw error;
    }
  }

  // Batch operations for multiple patterns
  async batchUpdatePatterns(
    patternIds: string[],
    updates: Partial<PatternUpdate>,
    currentUserId: string
  ): Promise<Selectable<PatternTable>[]> {
    try {
      return await db.transaction().execute(async (trx) => {
        // Verify ownership of all patterns
        const patterns = await trx
          .selectFrom('patterns')
          .select(['id', 'user_id'])
          .where('id', 'in', patternIds)
          .where('user_id', '=', currentUserId)
          .where('deleted_at', 'is', null)
          .execute();

        if (patterns.length !== patternIds.length) {
          throw new Error('Some patterns not found or permission denied');
        }

        // Update all patterns
        const updatedPatterns = await trx
          .updateTable('patterns')
          .set(updates)
          .where('id', 'in', patternIds)
          .returning([
            'id', 'user_id', 'name', 'sequence', 'palette_id', 'size',
            'is_public', 'is_ai_generated', 'generation_prompt', 'tags',
            'difficulty_rating', 'view_count', 'like_count', 'complexity_score',
            'estimated_time_minutes', 'version', 'parent_pattern_id',
            'search_vector', 'deleted_at', 'deleted_by',
            'created_at', 'updated_at'
          ])
          .execute();

        // Log batch edit actions
        for (const patternId of patternIds) {
          await this.logPatternAction(trx, patternId, currentUserId, 'edit');
        }

        return updatedPatterns;
      });
    } catch (error) {
      console.error('Error batch updating patterns:', error);
      throw error;
    }
  }

  // Toggle pattern favorite status
  async toggleFavorite(patternId: string, userId: string): Promise<boolean> {
    try {
      return await db.transaction().execute(async (trx) => {
        // Check if already favorited
        const existing = await trx
          .selectFrom('pattern_favorites')
          .select('id')
          .where('pattern_id', '=', patternId)
          .where('user_id', '=', userId)
          .executeTakeFirst();

        if (existing) {
          // Remove favorite
          await trx
            .deleteFrom('pattern_favorites')
            .where('id', '=', existing.id)
            .execute();
          return false;
        } else {
          // Add favorite
          await trx
            .insertInto('pattern_favorites')
            .values({
              pattern_id: patternId,
              user_id: userId
            })
            .execute();
          return true;
        }
      });
    } catch (error) {
      console.error('Error toggling favorite:', error);
      throw new Error('Failed to toggle favorite');
    }
  }

  // Get user's favorite patterns
  async getUserFavorites(
    userId: string,
    pagination: PaginationOptions = { limit: 20 }
  ): Promise<PatternWithDetails[]> {
    try {
      let query = db
        .selectFrom('pattern_favorites as pf')
        .innerJoin('patterns as p', 'pf.pattern_id', 'p.id')
        .leftJoin('users as u', 'p.user_id', 'u.id')
        .leftJoin('pattern_analytics as pa', 'p.id', 'pa.id')
        .where('pf.user_id', '=', userId)
        .where('p.deleted_at', 'is', null)
        .orderBy('pf.created_at', 'desc');

      if (pagination.offset) {
        query = query.offset(pagination.offset);
      }
      query = query.limit(pagination.limit);

      const results = await query
        .select([
          'p.id', 'p.user_id', 'p.name', 'p.sequence', 'p.palette_id', 'p.size',
          'p.is_public', 'p.is_ai_generated', 'p.generation_prompt', 'p.tags',
          'p.difficulty_rating', 'p.view_count', 'p.like_count', 'p.complexity_score',
          'p.estimated_time_minutes', 'p.version', 'p.parent_pattern_id', 'p.search_vector',
          'p.deleted_at', 'p.deleted_by',
          'p.created_at', 'p.updated_at',
          'u.username as user_username',
          'u.full_name as user_full_name',
          'u.avatar_url as user_avatar_url',
          sql<string[]>`ARRAY[]::text[]`.as('collection_names')
        ])
        .execute();

      return results.map(result => ({
        ...result,
        is_favorited: true,
        analytics: null
      }) as PatternWithDetails);

    } catch (error) {
      console.error('Error getting user favorites:', error);
      throw new Error('Failed to get user favorites');
    }
  }

  // Log pattern usage action
  private async logPatternAction(
    trx: any,
    patternId: string,
    userId: string | null,
    action: PatternActionType
  ): Promise<void> {
    try {
      await trx
        .insertInto('pattern_usage_stats')
        .values({
          pattern_id: patternId,
          user_id: userId,
          action_type: action
        })
        .execute();

      // Update pattern view count for view actions
      if (action === 'view') {
        await trx
          .updateTable('patterns')
          .set({ view_count: sql`view_count + 1` })
          .where('id', '=', patternId)
          .execute();
      }
    } catch (error) {
      console.error('Error logging pattern action:', error);
      // Don't throw - logging failures shouldn't break the main operation
    }
  }

  // Get pattern analytics
  async getPatternAnalytics(patternId: string): Promise<any> {
    try {
      const analytics = await db
        .selectFrom('pattern_analytics')
        .selectAll()
        .where('id', '=', patternId)
        .executeTakeFirst();

      if (!analytics) {
        // Refresh analytics for this pattern
        await sql`REFRESH MATERIALIZED VIEW CONCURRENTLY pattern_analytics`.execute(db);
        return await db
          .selectFrom('pattern_analytics')
          .selectAll()
          .where('id', '=', patternId)
          .executeTakeFirst();
      }

      return analytics;
    } catch (error) {
      console.error('Error getting pattern analytics:', error);
      throw new Error('Failed to get pattern analytics');
    }
  }

  // Validate pattern sequence structure
  static validatePatternSequence(sequence: any): sequence is PatternSequence {
    if (!sequence || typeof sequence !== 'object') return false;
    if (!Array.isArray(sequence.emojis)) return false;
    if (!sequence.metadata || typeof sequence.metadata !== 'object') return false;

    return sequence.emojis.every((cell: any) =>
      typeof cell.emoji === 'string' &&
      typeof cell.position === 'object' &&
      typeof cell.position.row === 'number' &&
      typeof cell.position.col === 'number'
    );
  }
}

export const patternService = new PatternService();