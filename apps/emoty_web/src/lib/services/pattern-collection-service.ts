// Pattern Collection Service for organizing patterns into folders
// Supports hierarchical organization and collaborative collections

import { sql } from 'kysely';
import { db } from '@/db/connection';
import type {
  PatternCollectionTable,
  PatternCollectionInsert,
  PatternCollectionUpdate,
  PatternCollectionWithDetails,
  PatternTable,
  PatternWithDetails,
  PaginationOptions
} from '@/db/types';

export class PatternCollectionService {
  // Create a new pattern collection
  async createCollection(data: PatternCollectionInsert): Promise<PatternCollectionTable> {
    try {
      const [collection] = await db
        .insertInto('pattern_collections')
        .values(data)
        .returning([
          'id', 'user_id', 'name', 'description', 'color', 
          'is_public', 'pattern_count', 'created_at', 'updated_at'
        ])
        .execute();

      return collection;
    } catch (error) {
      console.error('Error creating collection:', error);
      throw new Error('Failed to create collection');
    }
  }

  // Get collection by ID with patterns
  async getCollectionById(
    collectionId: string, 
    currentUserId?: string,
    includePatterns: boolean = true
  ): Promise<PatternCollectionWithDetails | null> {
    try {
      // Get collection basic info
      const collection = await db
        .selectFrom('pattern_collections as pc')
        .leftJoin('users as u', 'pc.user_id', 'u.id')
        .select([
          'pc.id', 'pc.user_id', 'pc.name', 'pc.description', 'pc.color',
          'pc.is_public', 'pc.pattern_count', 'pc.created_at', 'pc.updated_at',
          'u.username as user_username'
        ])
        .where('pc.id', '=', collectionId)
        .executeTakeFirst();

      if (!collection) return null;

      // Check access permissions
      if (!collection.is_public && collection.user_id !== currentUserId) {
        throw new Error('Permission denied');
      }

      let patterns: PatternTable[] = [];
      let preview_patterns: PatternTable[] = [];

      if (includePatterns) {
        // Get all patterns in collection
        patterns = await db
          .selectFrom('pattern_collection_items as pci')
          .innerJoin('patterns as p', 'pci.pattern_id', 'p.id')
          .select([
            'p.id', 'p.user_id', 'p.name', 'p.sequence', 'p.palette_id', 'p.size',
            'p.is_public', 'p.is_ai_generated', 'p.generation_prompt', 'p.tags',
            'p.difficulty_rating', 'p.view_count', 'p.like_count', 'p.complexity_score',
            'p.estimated_time_minutes', 'p.version', 'p.parent_pattern_id',
            'p.deleted_at', 'p.deleted_by', 'p.created_at', 'p.updated_at'
          ])
          .where('pci.collection_id', '=', collectionId)
          .where('p.deleted_at', 'is', null)
          .orderBy('pci.added_at', 'desc')
          .execute();

        // Get preview patterns (first 4)
        preview_patterns = patterns.slice(0, 4);
      }

      return {
        ...collection,
        patterns,
        preview_patterns
      } as PatternCollectionWithDetails;

    } catch (error) {
      console.error('Error getting collection:', error);
      throw error;
    }
  }

  // Get user's collections
  async getUserCollections(
    userId: string,
    includePublic: boolean = false,
    pagination: PaginationOptions = { limit: 20 }
  ): Promise<PatternCollectionWithDetails[]> {
    try {
      let query = db
        .selectFrom('pattern_collections as pc')
        .leftJoin('users as u', 'pc.user_id', 'u.id')
        .select([
          'pc.id', 'pc.user_id', 'pc.name', 'pc.description', 'pc.color',
          'pc.is_public', 'pc.pattern_count', 'pc.created_at', 'pc.updated_at',
          'u.username as user_username'
        ])
        .orderBy('pc.updated_at', 'desc');

      if (includePublic) {
        query = query.where((eb) => 
          eb.or([
            eb('pc.user_id', '=', userId),
            eb('pc.is_public', '=', true)
          ])
        );
      } else {
        query = query.where('pc.user_id', '=', userId);
      }

      if (pagination.offset) {
        query = query.offset(pagination.offset);
      }
      query = query.limit(pagination.limit);

      const collections = await query.execute();

      // Get preview patterns for each collection
      const collectionsWithPatterns = await Promise.all(
        collections.map(async (collection) => {
          const preview_patterns = await db
            .selectFrom('pattern_collection_items as pci')
            .innerJoin('patterns as p', 'pci.pattern_id', 'p.id')
            .select([
              'p.id', 'p.user_id', 'p.name', 'p.sequence', 'p.palette_id', 'p.size',
              'p.is_public', 'p.is_ai_generated', 'p.generation_prompt', 'p.tags',
              'p.difficulty_rating', 'p.view_count', 'p.like_count', 'p.complexity_score',
              'p.estimated_time_minutes', 'p.version', 'p.parent_pattern_id',
              'p.deleted_at', 'p.deleted_by', 'p.created_at', 'p.updated_at'
            ])
            .where('pci.collection_id', '=', collection.id)
            .where('p.deleted_at', 'is', null)
            .orderBy('pci.added_at', 'desc')
            .limit(4)
            .execute();

          return {
            ...collection,
            patterns: [], // Don't load all patterns for list view
            preview_patterns
          } as PatternCollectionWithDetails;
        })
      );

      return collectionsWithPatterns;

    } catch (error) {
      console.error('Error getting user collections:', error);
      throw new Error('Failed to get user collections');
    }
  }

  // Update collection
  async updateCollection(
    collectionId: string,
    updates: PatternCollectionUpdate,
    currentUserId: string
  ): Promise<PatternCollectionTable> {
    try {
      // Check ownership
      const collection = await db
        .selectFrom('pattern_collections')
        .select(['user_id'])
        .where('id', '=', collectionId)
        .executeTakeFirst();

      if (!collection) {
        throw new Error('Collection not found');
      }

      if (collection.user_id !== currentUserId) {
        throw new Error('Permission denied');
      }

      // Update collection
      const [updatedCollection] = await db
        .updateTable('pattern_collections')
        .set(updates)
        .where('id', '=', collectionId)
        .returning([
          'id', 'user_id', 'name', 'description', 'color',
          'is_public', 'pattern_count', 'created_at', 'updated_at'
        ])
        .execute();

      return updatedCollection;

    } catch (error) {
      console.error('Error updating collection:', error);
      throw error;
    }
  }

  // Delete collection
  async deleteCollection(collectionId: string, currentUserId: string): Promise<void> {
    try {
      await db.transaction().execute(async (trx) => {
        // Check ownership
        const collection = await trx
          .selectFrom('pattern_collections')
          .select(['user_id'])
          .where('id', '=', collectionId)
          .executeTakeFirst();

        if (!collection) {
          throw new Error('Collection not found');
        }

        if (collection.user_id !== currentUserId) {
          throw new Error('Permission denied');
        }

        // Delete collection items first
        await trx
          .deleteFrom('pattern_collection_items')
          .where('collection_id', '=', collectionId)
          .execute();

        // Delete collection
        await trx
          .deleteFrom('pattern_collections')
          .where('id', '=', collectionId)
          .execute();
      });

    } catch (error) {
      console.error('Error deleting collection:', error);
      throw error;
    }
  }

  // Add pattern to collection
  async addPatternToCollection(
    collectionId: string,
    patternId: string,
    currentUserId: string
  ): Promise<void> {
    try {
      await db.transaction().execute(async (trx) => {
        // Check collection ownership
        const collection = await trx
          .selectFrom('pattern_collections')
          .select(['user_id'])
          .where('id', '=', collectionId)
          .executeTakeFirst();

        if (!collection) {
          throw new Error('Collection not found');
        }

        if (collection.user_id !== currentUserId) {
          throw new Error('Permission denied');
        }

        // Check pattern exists and user has access
        const pattern = await trx
          .selectFrom('patterns')
          .select(['user_id', 'is_public'])
          .where('id', '=', patternId)
          .where('deleted_at', 'is', null)
          .executeTakeFirst();

        if (!pattern) {
          throw new Error('Pattern not found');
        }

        // Check access to pattern
        if (!pattern.is_public && pattern.user_id !== currentUserId) {
          throw new Error('Permission denied to access pattern');
        }

        // Check if already in collection
        const existing = await trx
          .selectFrom('pattern_collection_items')
          .select('id')
          .where('collection_id', '=', collectionId)
          .where('pattern_id', '=', patternId)
          .executeTakeFirst();

        if (existing) {
          throw new Error('Pattern already in collection');
        }

        // Add to collection
        await trx
          .insertInto('pattern_collection_items')
          .values({
            collection_id: collectionId,
            pattern_id: patternId
          })
          .execute();

        // Pattern count is automatically updated by trigger
      });

    } catch (error) {
      console.error('Error adding pattern to collection:', error);
      throw error;
    }
  }

  // Remove pattern from collection
  async removePatternFromCollection(
    collectionId: string,
    patternId: string,
    currentUserId: string
  ): Promise<void> {
    try {
      await db.transaction().execute(async (trx) => {
        // Check collection ownership
        const collection = await trx
          .selectFrom('pattern_collections')
          .select(['user_id'])
          .where('id', '=', collectionId)
          .executeTakeFirst();

        if (!collection) {
          throw new Error('Collection not found');
        }

        if (collection.user_id !== currentUserId) {
          throw new Error('Permission denied');
        }

        // Remove from collection
        const result = await trx
          .deleteFrom('pattern_collection_items')
          .where('collection_id', '=', collectionId)
          .where('pattern_id', '=', patternId)
          .execute();

        if (result.length === 0) {
          throw new Error('Pattern not found in collection');
        }

        // Pattern count is automatically updated by trigger
      });

    } catch (error) {
      console.error('Error removing pattern from collection:', error);
      throw error;
    }
  }

  // Add multiple patterns to collection
  async addPatternsToCollection(
    collectionId: string,
    patternIds: string[],
    currentUserId: string
  ): Promise<{ added: string[]; skipped: string[]; errors: string[] }> {
    const results = {
      added: [] as string[],
      skipped: [] as string[],
      errors: [] as string[]
    };

    try {
      await db.transaction().execute(async (trx) => {
        // Check collection ownership
        const collection = await trx
          .selectFrom('pattern_collections')
          .select(['user_id'])
          .where('id', '=', collectionId)
          .executeTakeFirst();

        if (!collection) {
          throw new Error('Collection not found');
        }

        if (collection.user_id !== currentUserId) {
          throw new Error('Permission denied');
        }

        // Get all patterns and check access
        const patterns = await trx
          .selectFrom('patterns')
          .select(['id', 'user_id', 'is_public'])
          .where('id', 'in', patternIds)
          .where('deleted_at', 'is', null)
          .execute();

        // Get existing items in collection
        const existingItems = await trx
          .selectFrom('pattern_collection_items')
          .select(['pattern_id'])
          .where('collection_id', '=', collectionId)
          .where('pattern_id', 'in', patternIds)
          .execute();

        const existingPatternIds = new Set(existingItems.map(item => item.pattern_id));

        // Process each pattern
        for (const patternId of patternIds) {
          try {
            const pattern = patterns.find(p => p.id === patternId);
            
            if (!pattern) {
              results.errors.push(`Pattern ${patternId} not found`);
              continue;
            }

            // Check access
            if (!pattern.is_public && pattern.user_id !== currentUserId) {
              results.errors.push(`No permission to access pattern ${patternId}`);
              continue;
            }

            // Check if already exists
            if (existingPatternIds.has(patternId)) {
              results.skipped.push(patternId);
              continue;
            }

            // Add to collection
            await trx
              .insertInto('pattern_collection_items')
              .values({
                collection_id: collectionId,
                pattern_id: patternId
              })
              .execute();

            results.added.push(patternId);

          } catch (error) {
            results.errors.push(`Error adding pattern ${patternId}: ${error.message}`);
          }
        }

        // Pattern count is automatically updated by trigger
      });

    } catch (error) {
      console.error('Error adding patterns to collection:', error);
      throw error;
    }

    return results;
  }

  // Get public collections
  async getPublicCollections(
    pagination: PaginationOptions = { limit: 20 },
    currentUserId?: string
  ): Promise<PatternCollectionWithDetails[]> {
    try {
      let query = db
        .selectFrom('pattern_collections as pc')
        .leftJoin('users as u', 'pc.user_id', 'u.id')
        .select([
          'pc.id', 'pc.user_id', 'pc.name', 'pc.description', 'pc.color',
          'pc.is_public', 'pc.pattern_count', 'pc.created_at', 'pc.updated_at',
          'u.username as user_username'
        ])
        .where('pc.is_public', '=', true)
        .orderBy('pc.updated_at', 'desc');

      if (pagination.offset) {
        query = query.offset(pagination.offset);
      }
      query = query.limit(pagination.limit);

      const collections = await query.execute();

      // Get preview patterns for each collection
      const collectionsWithPatterns = await Promise.all(
        collections.map(async (collection) => {
          const preview_patterns = await db
            .selectFrom('pattern_collection_items as pci')
            .innerJoin('patterns as p', 'pci.pattern_id', 'p.id')
            .select([
              'p.id', 'p.user_id', 'p.name', 'p.sequence', 'p.palette_id', 'p.size',
              'p.is_public', 'p.is_ai_generated', 'p.generation_prompt', 'p.tags',
              'p.difficulty_rating', 'p.view_count', 'p.like_count', 'p.complexity_score',
              'p.estimated_time_minutes', 'p.version', 'p.parent_pattern_id',
              'p.deleted_at', 'p.deleted_by', 'p.created_at', 'p.updated_at'
            ])
            .where('pci.collection_id', '=', collection.id)
            .where('p.deleted_at', 'is', null)
            .where('p.is_public', '=', true) // Only public patterns in public collections
            .orderBy('pci.added_at', 'desc')
            .limit(4)
            .execute();

          return {
            ...collection,
            patterns: [],
            preview_patterns
          } as PatternCollectionWithDetails;
        })
      );

      return collectionsWithPatterns;

    } catch (error) {
      console.error('Error getting public collections:', error);
      throw new Error('Failed to get public collections');
    }
  }

  // Search collections
  async searchCollections(
    query: string,
    isPublicOnly: boolean = true,
    currentUserId?: string,
    pagination: PaginationOptions = { limit: 20 }
  ): Promise<PatternCollectionWithDetails[]> {
    try {
      let searchQuery = db
        .selectFrom('pattern_collections as pc')
        .leftJoin('users as u', 'pc.user_id', 'u.id')
        .select([
          'pc.id', 'pc.user_id', 'pc.name', 'pc.description', 'pc.color',
          'pc.is_public', 'pc.pattern_count', 'pc.created_at', 'pc.updated_at',
          'u.username as user_username'
        ]);

      // Text search
      if (query.trim()) {
        searchQuery = searchQuery.where((eb) => 
          eb.or([
            eb('pc.name', 'ilike', `%${query}%`),
            eb('pc.description', 'ilike', `%${query}%`)
          ])
        );
      }

      // Privacy filter
      if (isPublicOnly || !currentUserId) {
        searchQuery = searchQuery.where('pc.is_public', '=', true);
      } else {
        searchQuery = searchQuery.where((eb) =>
          eb.or([
            eb('pc.is_public', '=', true),
            eb('pc.user_id', '=', currentUserId)
          ])
        );
      }

      searchQuery = searchQuery.orderBy('pc.pattern_count', 'desc');

      if (pagination.offset) {
        searchQuery = searchQuery.offset(pagination.offset);
      }
      searchQuery = searchQuery.limit(pagination.limit);

      const collections = await searchQuery.execute();

      // Get preview patterns for each collection
      const collectionsWithPatterns = await Promise.all(
        collections.map(async (collection) => {
          const preview_patterns = await db
            .selectFrom('pattern_collection_items as pci')
            .innerJoin('patterns as p', 'pci.pattern_id', 'p.id')
            .select([
              'p.id', 'p.user_id', 'p.name', 'p.sequence', 'p.palette_id', 'p.size',
              'p.is_public', 'p.is_ai_generated', 'p.generation_prompt', 'p.tags',
              'p.difficulty_rating', 'p.view_count', 'p.like_count', 'p.complexity_score',
              'p.estimated_time_minutes', 'p.version', 'p.parent_pattern_id',
              'p.deleted_at', 'p.deleted_by', 'p.created_at', 'p.updated_at'
            ])
            .where('pci.collection_id', '=', collection.id)
            .where('p.deleted_at', 'is', null)
            .where((eb) => {
              if (isPublicOnly || !currentUserId) {
                return eb('p.is_public', '=', true);
              } else {
                return eb.or([
                  eb('p.is_public', '=', true),
                  eb('p.user_id', '=', currentUserId)
                ]);
              }
            })
            .orderBy('pci.added_at', 'desc')
            .limit(4)
            .execute();

          return {
            ...collection,
            patterns: [],
            preview_patterns
          } as PatternCollectionWithDetails;
        })
      );

      return collectionsWithPatterns;

    } catch (error) {
      console.error('Error searching collections:', error);
      throw new Error('Failed to search collections');
    }
  }

  // Get collection statistics
  async getCollectionStats(collectionId: string): Promise<{
    total_patterns: number;
    public_patterns: number;
    private_patterns: number;
    ai_patterns: number;
    total_views: number;
    total_likes: number;
    unique_creators: number;
  }> {
    try {
      const stats = await db
        .selectFrom('pattern_collection_items as pci')
        .innerJoin('patterns as p', 'pci.pattern_id', 'p.id')
        .select([
          sql`COUNT(*)`.as('total_patterns'),
          sql`COUNT(*) FILTER (WHERE p.is_public = true)`.as('public_patterns'),
          sql`COUNT(*) FILTER (WHERE p.is_public = false)`.as('private_patterns'),
          sql`COUNT(*) FILTER (WHERE p.is_ai_generated = true)`.as('ai_patterns'),
          sql`SUM(p.view_count)`.as('total_views'),
          sql`SUM(p.like_count)`.as('total_likes'),
          sql`COUNT(DISTINCT p.user_id)`.as('unique_creators')
        ])
        .where('pci.collection_id', '=', collectionId)
        .where('p.deleted_at', 'is', null)
        .executeTakeFirst();

      return {
        total_patterns: parseInt(stats?.total_patterns as string || '0', 10),
        public_patterns: parseInt(stats?.public_patterns as string || '0', 10),
        private_patterns: parseInt(stats?.private_patterns as string || '0', 10),
        ai_patterns: parseInt(stats?.ai_patterns as string || '0', 10),
        total_views: parseInt(stats?.total_views as string || '0', 10),
        total_likes: parseInt(stats?.total_likes as string || '0', 10),
        unique_creators: parseInt(stats?.unique_creators as string || '0', 10)
      };

    } catch (error) {
      console.error('Error getting collection stats:', error);
      throw new Error('Failed to get collection statistics');
    }
  }
}

export const patternCollectionService = new PatternCollectionService();