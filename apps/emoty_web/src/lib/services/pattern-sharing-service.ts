// Pattern Sharing and Permissions Service
// Handles pattern sharing, permissions, and collaborative access

import { sql, Selectable } from 'kysely';
import { db } from '@/db/connection';
import type {
  PatternShareTable,
  PatternShareInsert,
  PatternPermissionLevel,
  PatternTable,
  PatternWithDetails
} from '@/db/types';

export class PatternSharingService {
  // Share pattern with user
  async sharePattern(
    patternId: string,
    sharedByUserId: string,
    sharedWithUserId: string,
    permissionLevel: PatternPermissionLevel = 'view',
    expiresAt?: Date
  ): Promise<Selectable<PatternShareTable>> {
    try {
      return await db.transaction().execute(async (trx) => {
        // Verify the sharer owns the pattern or has admin permission
        const pattern = await trx
          .selectFrom('patterns as p')
          .leftJoin('pattern_shares as ps', (join) =>
            join
              .onRef('ps.pattern_id', '=', 'p.id')
              .on('ps.shared_with_user_id', '=', sharedByUserId)
          )
          .select([
            'p.user_id',
            'p.is_public',
            'ps.permission_level'
          ])
          .where('p.id', '=', patternId)
          .where('p.deleted_at', 'is', null)
          .executeTakeFirst();

        if (!pattern) {
          throw new Error('Pattern not found');
        }

        // Check permissions
        const canShare =
          pattern.user_id === sharedByUserId || // Owner
          pattern.permission_level === 'admin'; // Has admin permission

        if (!canShare) {
          throw new Error('Permission denied');
        }

        // Check if user exists
        const targetUser = await trx
          .selectFrom('users')
          .select('id')
          .where('id', '=', sharedWithUserId)
          .where('is_active', '=', true)
          .executeTakeFirst();

        if (!targetUser) {
          throw new Error('Target user not found');
        }

        // Check if already shared
        const existingShare = await trx
          .selectFrom('pattern_shares')
          .select('id')
          .where('pattern_id', '=', patternId)
          .where('shared_with_user_id', '=', sharedWithUserId)
          .executeTakeFirst();

        if (existingShare) {
          // Update existing share
          const [updatedShare] = await trx
            .updateTable('pattern_shares')
            .set({
              permission_level: permissionLevel,
              expires_at: expiresAt || null,
              shared_by_user_id: sharedByUserId
            })
            .where('id', '=', existingShare.id)
            .returning([
              'id', 'pattern_id', 'shared_by_user_id', 'shared_with_user_id',
              'permission_level', 'expires_at', 'created_at'
            ])
            .execute();

          return updatedShare;
        } else {
          // Create new share
          const [newShare] = await trx
            .insertInto('pattern_shares')
            .values({
              pattern_id: patternId,
              shared_by_user_id: sharedByUserId,
              shared_with_user_id: sharedWithUserId,
              permission_level: permissionLevel,
              expires_at: expiresAt || null
            })
            .returning([
              'id', 'pattern_id', 'shared_by_user_id', 'shared_with_user_id',
              'permission_level', 'expires_at', 'created_at'
            ])
            .execute();

          return newShare;
        }
      });

    } catch (error) {
      console.error('Error sharing pattern:', error);
      throw error;
    }
  }

  // Create public share link (anonymous access)
  async createPublicShare(
    patternId: string,
    sharedByUserId: string,
    expiresAt?: Date
  ): Promise<Selectable<PatternShareTable>> {
    try {
      return await db.transaction().execute(async (trx) => {
        // Verify the sharer owns the pattern
        const pattern = await trx
          .selectFrom('patterns')
          .select(['user_id'])
          .where('id', '=', patternId)
          .where('deleted_at', 'is', null)
          .executeTakeFirst();

        if (!pattern) {
          throw new Error('Pattern not found');
        }

        if (pattern.user_id !== sharedByUserId) {
          throw new Error('Permission denied');
        }

        // Check if public share already exists
        const existingShare = await trx
          .selectFrom('pattern_shares')
          .select('id')
          .where('pattern_id', '=', patternId)
          .where('shared_with_user_id', 'is', null)
          .executeTakeFirst();

        if (existingShare) {
          // Update existing public share
          const [updatedShare] = await trx
            .updateTable('pattern_shares')
            .set({
              expires_at: expiresAt || null,
              shared_by_user_id: sharedByUserId
            })
            .where('id', '=', existingShare.id)
            .returning([
              'id', 'pattern_id', 'shared_by_user_id', 'shared_with_user_id',
              'permission_level', 'expires_at', 'created_at'
            ])
            .execute();

          return updatedShare;
        } else {
          // Create new public share
          const [newShare] = await trx
            .insertInto('pattern_shares')
            .values({
              pattern_id: patternId,
              shared_by_user_id: sharedByUserId,
              shared_with_user_id: null, // null = public share
              permission_level: 'view',
              expires_at: expiresAt || null
            })
            .returning([
              'id', 'pattern_id', 'shared_by_user_id', 'shared_with_user_id',
              'permission_level', 'expires_at', 'created_at'
            ])
            .execute();

          return newShare;
        }
      });

    } catch (error) {
      console.error('Error creating public share:', error);
      throw error;
    }
  }

  // Revoke share
  async revokeShare(
    patternId: string,
    sharedWithUserId: string | null, // null for public shares
    currentUserId: string
  ): Promise<void> {
    try {
      await db.transaction().execute(async (trx) => {
        // Verify permissions
        const pattern = await trx
          .selectFrom('patterns as p')
          .leftJoin('pattern_shares as ps', (join) =>
            join
              .onRef('ps.pattern_id', '=', 'p.id')
              .on('ps.shared_with_user_id', '=', currentUserId)
          )
          .select([
            'p.user_id',
            'ps.permission_level'
          ])
          .where('p.id', '=', patternId)
          .where('p.deleted_at', 'is', null)
          .executeTakeFirst();

        if (!pattern) {
          throw new Error('Pattern not found');
        }

        const canRevoke =
          pattern.user_id === currentUserId || // Owner
          pattern.permission_level === 'admin'; // Has admin permission

        if (!canRevoke) {
          throw new Error('Permission denied');
        }

        // Delete the share
        const result = await trx
          .deleteFrom('pattern_shares')
          .where('pattern_id', '=', patternId)
          .where('shared_with_user_id', sharedWithUserId ? '=' : 'is', sharedWithUserId)
          .execute();

        if (result.length === 0) {
          throw new Error('Share not found');
        }
      });

    } catch (error) {
      console.error('Error revoking share:', error);
      throw error;
    }
  }

  // Get pattern shares
  async getPatternShares(patternId: string, currentUserId: string): Promise<Array<{
    id: string;
    shared_with_user_id: string | null;
    shared_with_username: string | null;
    shared_with_full_name: string | null;
    permission_level: PatternPermissionLevel;
    expires_at: Date | null;
    created_at: Date;
    is_expired: boolean;
  }>> {
    try {
      // Verify user has access to see shares
      const pattern = await db
        .selectFrom('patterns as p')
        .leftJoin('pattern_shares as ps', (join) =>
          join
            .onRef('ps.pattern_id', '=', 'p.id')
            .on('ps.shared_with_user_id', '=', currentUserId)
        )
        .select([
          'p.user_id',
          'ps.permission_level'
        ])
        .where('p.id', '=', patternId)
        .where('p.deleted_at', 'is', null)
        .executeTakeFirst();

      if (!pattern) {
        throw new Error('Pattern not found');
      }

      const canViewShares =
        pattern.user_id === currentUserId || // Owner
        pattern.permission_level === 'admin'; // Has admin permission

      if (!canViewShares) {
        throw new Error('Permission denied');
      }

      // Get all shares for the pattern
      const shares = await db
        .selectFrom('pattern_shares as ps')
        .leftJoin('users as u', 'ps.shared_with_user_id', 'u.id')
        .select([
          'ps.id',
          'ps.shared_with_user_id',
          'u.username as shared_with_username',
          'u.full_name as shared_with_full_name',
          'ps.permission_level',
          'ps.expires_at',
          'ps.created_at'
        ])
        .where('ps.pattern_id', '=', patternId)
        .orderBy('ps.created_at', 'desc')
        .execute();

      return shares.map(share => ({
        ...share,
        is_expired: share.expires_at ? new Date() > share.expires_at : false
      }));

    } catch (error) {
      console.error('Error getting pattern shares:', error);
      throw error;
    }
  }

  // Get patterns shared with user
  async getSharedPatterns(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<PatternWithDetails[]> {
    try {
      const patterns = await db
        .selectFrom('pattern_shares as ps')
        .innerJoin('patterns as p', 'ps.pattern_id', 'p.id')
        .leftJoin('users as u', 'p.user_id', 'u.id')
        .leftJoin('pattern_favorites as pf', (join) =>
          join
            .onRef('pf.pattern_id', '=', 'p.id')
            .on('pf.user_id', '=', userId)
        )
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
          sql<string[]>`ARRAY[]::text[]`.as('collection_names'),
          'ps.permission_level',
          'ps.expires_at'
        ])
        .where('ps.shared_with_user_id', '=', userId)
        .where('p.deleted_at', 'is', null)
        .where((eb) =>
          eb.or([
            eb('ps.expires_at', 'is', null),
            eb('ps.expires_at', '>', new Date())
          ])
        )
        .orderBy('ps.created_at', 'desc')
        .offset(offset)
        .limit(limit)
        .execute();

      return patterns.map(pattern => ({
        ...pattern,
        analytics: null
      }) as PatternWithDetails);

    } catch (error) {
      console.error('Error getting shared patterns:', error);
      throw new Error('Failed to get shared patterns');
    }
  }

  // Check user's permission for a pattern
  async getUserPatternPermission(
    patternId: string,
    userId: string
  ): Promise<{
    hasAccess: boolean;
    permission: PatternPermissionLevel | null;
    isOwner: boolean;
    isPublic: boolean;
  }> {
    try {
      const result = await db
        .selectFrom('patterns as p')
        .leftJoin('pattern_shares as ps', (join) =>
          join
            .onRef('ps.pattern_id', '=', 'p.id')
            .on('ps.shared_with_user_id', '=', userId)
        )
        .select([
          'p.user_id',
          'p.is_public',
          'ps.permission_level',
          'ps.expires_at'
        ])
        .where('p.id', '=', patternId)
        .where('p.deleted_at', 'is', null)
        .executeTakeFirst();

      if (!result) {
        return {
          hasAccess: false,
          permission: null,
          isOwner: false,
          isPublic: false
        };
      }

      const isOwner = result.user_id === userId;
      const isPublic = result.is_public;

      // Check if share is expired
      const shareExpired = result.expires_at && new Date() > result.expires_at;

      let hasAccess = false;
      let permission: PatternPermissionLevel | null = null;

      if (isOwner) {
        hasAccess = true;
        permission = 'admin';
      } else if (isPublic) {
        hasAccess = true;
        permission = 'view';
      } else if (result.permission_level && !shareExpired) {
        hasAccess = true;
        permission = result.permission_level;
      }

      return {
        hasAccess,
        permission,
        isOwner,
        isPublic
      };

    } catch (error) {
      console.error('Error checking user pattern permission:', error);
      return {
        hasAccess: false,
        permission: null,
        isOwner: false,
        isPublic: false
      };
    }
  }

  // Clean up expired shares (maintenance function)
  async cleanupExpiredShares(): Promise<number> {
    try {
      const result = await db
        .deleteFrom('pattern_shares')
        .where('expires_at', '<', new Date())
        .execute();

      return result.length;

    } catch (error) {
      console.error('Error cleaning up expired shares:', error);
      return 0;
    }
  }

  // Get sharing statistics for a pattern
  async getPatternSharingStats(patternId: string): Promise<{
    total_shares: number;
    active_shares: number;
    expired_shares: number;
    permission_breakdown: Record<PatternPermissionLevel, number>;
  }> {
    try {
      const stats = await db
        .selectFrom('pattern_shares')
        .select([
          sql`COUNT(*)`.as('total_shares'),
          sql`COUNT(*) FILTER (WHERE expires_at IS NULL OR expires_at > NOW())`.as('active_shares'),
          sql`COUNT(*) FILTER (WHERE expires_at IS NOT NULL AND expires_at <= NOW())`.as('expired_shares'),
          sql`COUNT(*) FILTER (WHERE permission_level = 'view')`.as('view_permissions'),
          sql`COUNT(*) FILTER (WHERE permission_level = 'edit')`.as('edit_permissions'),
          sql`COUNT(*) FILTER (WHERE permission_level = 'admin')`.as('admin_permissions')
        ])
        .where('pattern_id', '=', patternId)
        .executeTakeFirst();

      return {
        total_shares: parseInt(stats?.total_shares as string || '0', 10),
        active_shares: parseInt(stats?.active_shares as string || '0', 10),
        expired_shares: parseInt(stats?.expired_shares as string || '0', 10),
        permission_breakdown: {
          view: parseInt(stats?.view_permissions as string || '0', 10),
          edit: parseInt(stats?.edit_permissions as string || '0', 10),
          admin: parseInt(stats?.admin_permissions as string || '0', 10)
        }
      };

    } catch (error) {
      console.error('Error getting pattern sharing stats:', error);
      throw new Error('Failed to get sharing statistics');
    }
  }

  // Batch share pattern with multiple users
  async sharePatternWithMultipleUsers(
    patternId: string,
    sharedByUserId: string,
    userIds: string[],
    permissionLevel: PatternPermissionLevel = 'view',
    expiresAt?: Date
  ): Promise<{
    successful: string[];
    failed: Array<{ userId: string; error: string }>;
  }> {
    const results = {
      successful: [] as string[],
      failed: [] as Array<{ userId: string; error: string }>
    };

    // Process each user individually to handle partial failures
    for (const userId of userIds) {
      try {
        await this.sharePattern(
          patternId,
          sharedByUserId,
          userId,
          permissionLevel,
          expiresAt
        );
        results.successful.push(userId);
      } catch (error) {
        results.failed.push({
          userId,
          error: (error as any).message || 'Unknown error'
        });
      }
    }

    return results;
  }
}

export const patternSharingService = new PatternSharingService();