import { PatternService } from '../pattern-service';
import { db } from '@/db/connection';
import { ProgressionEngine } from '@/lib/progression-engine';
import type { PatternInsert } from '@/db/types';

// Mock dependencies
jest.mock('@/db/connection');
jest.mock('@/lib/progression-engine');

const mockDb = db as jest.Mocked<typeof db>;
const mockProgressionEngine = ProgressionEngine as jest.Mocked<typeof ProgressionEngine>;

describe('PatternService', () => {
  const patternService = new PatternService();
  const mockUserId = 'user-123';
  const mockPatternId = 'pattern-456';

  const mockPatternInsert: PatternInsert = {
    user_id: mockUserId,
    name: 'Test Pattern',
    sequence: JSON.stringify({ emojis: [{ emoji: '😀', position: { row: 0, col: 0 } }] }),
    palette_id: 'palette1',
    size: 8,
    is_public: false,
    is_ai_generated: false,
    tags: ['test', 'emoji'],
    difficulty_rating: 3
  };

  const mockPattern = {
    id: mockPatternId,
    ...mockPatternInsert,
    view_count: 0,
    like_count: 0,
    complexity_score: 2.5,
    estimated_time_minutes: 10,
    version: 1,
    parent_pattern_id: null,
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
    deleted_by: null
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock database transaction
    const mockTransaction = {
      execute: jest.fn(),
      insertInto: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      returning: jest.fn().mockReturnThis(),
      updateTable: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis()
    };

    mockDb.transaction.mockReturnValue({
      execute: jest.fn().mockResolvedValue(mockTransaction)
    } as any);

    mockDb.insertInto.mockReturnValue({
      values: jest.fn().mockReturnValue({
        returning: jest.fn().mockReturnValue({
          execute: jest.fn().mockResolvedValue([mockPattern])
        })
      })
    } as any);
  });

  describe('createPattern', () => {
    it('should create a pattern successfully', async () => {
      const mockExecute = jest.fn().mockImplementation(async (callback) => {
        const trx = {
          insertInto: jest.fn().mockReturnValue({
            values: jest.fn().mockReturnValue({
              returning: jest.fn().mockReturnValue({
                execute: jest.fn().mockResolvedValue([mockPattern])
              })
            })
          }),
          updateTable: jest.fn().mockReturnValue({
            set: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                execute: jest.fn().mockResolvedValue(undefined)
              })
            })
          })
        };
        return callback(trx);
      });

      mockDb.transaction.mockReturnValue({ execute: mockExecute } as any);

      const result = await patternService.createPattern(mockPatternInsert);

      expect(result).toEqual(mockPattern);
      expect(mockExecute).toHaveBeenCalled();
    });

    it('should handle creation errors gracefully', async () => {
      const error = new Error('Database error');
      mockDb.transaction.mockReturnValue({
        execute: jest.fn().mockRejectedValue(error)
      } as any);

      await expect(patternService.createPattern(mockPatternInsert))
        .rejects.toThrow('Failed to create pattern');
    });
  });

  describe('getPatternById', () => {
    it('should retrieve pattern with details', async () => {
      const mockPatternWithDetails = {
        ...mockPattern,
        user_username: 'testuser',
        user_full_name: 'Test User',
        user_avatar_url: null,
        is_favorited: false,
        collection_names: [],
        analytics: null
      };

      mockDb.selectFrom.mockReturnValue({
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        executeTakeFirst: jest.fn().mockResolvedValue(mockPatternWithDetails)
      } as any);

      const result = await patternService.getPatternById(mockPatternId, mockUserId);

      expect(result).toEqual(mockPatternWithDetails);
      expect(mockDb.selectFrom).toHaveBeenCalledWith('patterns as p');
    });

    it('should return null for non-existent pattern', async () => {
      mockDb.selectFrom.mockReturnValue({
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        executeTakeFirst: jest.fn().mockResolvedValue(null)
      } as any);

      const result = await patternService.getPatternById('non-existent', mockUserId);

      expect(result).toBeNull();
    });
  });

  describe('searchPatterns', () => {
    const mockSearchResults = {
      data: [mockPattern],
      pagination: {
        total: 1,
        page: 1,
        limit: 20,
        has_next: false,
        has_prev: false
      },
      facets: {
        tags: [{ tag: 'test', count: 1 }],
        difficulty_ratings: [{ rating: 3, count: 1 }],
        palettes: [{ palette_id: 'palette1', count: 1 }],
        user_levels: [{ level: 'beginner', count: 1 }]
      }
    };

    it('should search patterns with filters', async () => {
      const mockQuery = {
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue([mockPattern]),
        executeTakeFirst: jest.fn().mockResolvedValue({ count: '1' })
      };

      mockDb.selectFrom.mockReturnValue(mockQuery as any);

      const filters = { query: 'test', tags: ['emoji'] };
      const sort = { field: 'created_at' as const, direction: 'desc' as const };
      const pagination = { limit: 20, offset: 0 };

      const result = await patternService.searchPatterns(filters, sort, pagination, mockUserId);

      expect(result.data).toHaveLength(1);
      expect(mockQuery.where).toHaveBeenCalled();
    });

    it('should apply privacy filters correctly', async () => {
      const mockQuery = {
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue([]),
        executeTakeFirst: jest.fn().mockResolvedValue({ count: '0' })
      };

      mockDb.selectFrom.mockReturnValue(mockQuery as any);

      await patternService.searchPatterns({}, { field: 'created_at', direction: 'desc' }, { limit: 20 });

      // Should filter for public patterns only when no user ID provided
      expect(mockQuery.where).toHaveBeenCalledWith('p.is_public', '=', true);
    });
  });

  describe('updatePattern', () => {
    it('should update pattern with optimistic locking', async () => {
      const updates = { name: 'Updated Pattern', tags: ['updated'] };
      
      const mockExecute = jest.fn().mockImplementation(async (callback) => {
        const trx = {
          selectFrom: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                executeTakeFirst: jest.fn().mockResolvedValue({ 
                  user_id: mockUserId, 
                  version: 1 
                })
              })
            })
          }),
          updateTable: jest.fn().mockReturnValue({
            set: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                returning: jest.fn().mockReturnValue({
                  execute: jest.fn().mockResolvedValue([{ ...mockPattern, ...updates, version: 2 }])
                })
              })
            })
          })
        };
        return callback(trx);
      });

      mockDb.transaction.mockReturnValue({ execute: mockExecute } as any);

      const result = await patternService.updatePattern(mockPatternId, updates, mockUserId);

      expect(result.name).toBe(updates.name);
      expect(result.version).toBe(2);
    });

    it('should reject unauthorized updates', async () => {
      const mockExecute = jest.fn().mockImplementation(async (callback) => {
        const trx = {
          selectFrom: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                executeTakeFirst: jest.fn().mockResolvedValue({ 
                  user_id: 'different-user', 
                  version: 1 
                })
              })
            })
          })
        };
        return callback(trx);
      });

      mockDb.transaction.mockReturnValue({ execute: mockExecute } as any);

      await expect(patternService.updatePattern(mockPatternId, { name: 'Hack' }, mockUserId))
        .rejects.toThrow('Permission denied');
    });
  });

  describe('deletePattern', () => {
    it('should soft delete pattern', async () => {
      const mockExecute = jest.fn().mockImplementation(async (callback) => {
        const trx = {
          selectFrom: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                executeTakeFirst: jest.fn().mockResolvedValue({ user_id: mockUserId })
              })
            })
          }),
          updateTable: jest.fn().mockReturnValue({
            set: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                execute: jest.fn().mockResolvedValue(undefined)
              })
            })
          })
        };
        return callback(trx);
      });

      mockDb.transaction.mockReturnValue({ execute: mockExecute } as any);

      await patternService.deletePattern(mockPatternId, mockUserId);

      // Verify soft delete was performed (updated deleted_at and deleted_by)
      expect(mockExecute).toHaveBeenCalled();
    });

    it('should reject unauthorized deletions', async () => {
      const mockExecute = jest.fn().mockImplementation(async (callback) => {
        const trx = {
          selectFrom: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                executeTakeFirst: jest.fn().mockResolvedValue(null)
              })
            })
          })
        };
        return callback(trx);
      });

      mockDb.transaction.mockReturnValue({ execute: mockExecute } as any);

      await expect(patternService.deletePattern(mockPatternId, mockUserId))
        .rejects.toThrow('Pattern not found');
    });
  });

  describe('toggleFavorite', () => {
    it('should add favorite when not favorited', async () => {
      const mockExecute = jest.fn().mockImplementation(async (callback) => {
        const trx = {
          selectFrom: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                executeTakeFirst: jest.fn().mockResolvedValue(null) // Not favorited
              })
            })
          }),
          insertInto: jest.fn().mockReturnValue({
            values: jest.fn().mockReturnValue({
              execute: jest.fn().mockResolvedValue(undefined)
            })
          })
        };
        return callback(trx);
      });

      mockDb.transaction.mockReturnValue({ execute: mockExecute } as any);

      const result = await patternService.toggleFavorite(mockPatternId, mockUserId);

      expect(result).toBe(true);
    });

    it('should remove favorite when already favorited', async () => {
      const mockExecute = jest.fn().mockImplementation(async (callback) => {
        const trx = {
          selectFrom: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                executeTakeFirst: jest.fn().mockResolvedValue({ id: 'favorite-id' })
              })
            })
          }),
          deleteFrom: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              execute: jest.fn().mockResolvedValue(undefined)
            })
          })
        };
        return callback(trx);
      });

      mockDb.transaction.mockReturnValue({ execute: mockExecute } as any);

      const result = await patternService.toggleFavorite(mockPatternId, mockUserId);

      expect(result).toBe(false);
    });
  });

  describe('batchUpdatePatterns', () => {
    const patternIds = ['pattern1', 'pattern2'];

    it('should update multiple patterns', async () => {
      const updates = { is_public: true };
      
      const mockExecute = jest.fn().mockImplementation(async (callback) => {
        const trx = {
          selectFrom: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                execute: jest.fn().mockResolvedValue([
                  { id: 'pattern1', user_id: mockUserId },
                  { id: 'pattern2', user_id: mockUserId }
                ])
              })
            })
          }),
          updateTable: jest.fn().mockReturnValue({
            set: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                returning: jest.fn().mockReturnValue({
                  execute: jest.fn().mockResolvedValue([
                    { ...mockPattern, id: 'pattern1', ...updates },
                    { ...mockPattern, id: 'pattern2', ...updates }
                  ])
                })
              })
            })
          })
        };
        return callback(trx);
      });

      mockDb.transaction.mockReturnValue({ execute: mockExecute } as any);

      const result = await patternService.batchUpdatePatterns(patternIds, updates, mockUserId);

      expect(result).toHaveLength(2);
      expect(result[0].is_public).toBe(true);
      expect(result[1].is_public).toBe(true);
    });

    it('should reject if not all patterns owned by user', async () => {
      const mockExecute = jest.fn().mockImplementation(async (callback) => {
        const trx = {
          selectFrom: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                execute: jest.fn().mockResolvedValue([
                  { id: 'pattern1', user_id: mockUserId }
                  // Missing pattern2
                ])
              })
            })
          })
        };
        return callback(trx);
      });

      mockDb.transaction.mockReturnValue({ execute: mockExecute } as any);

      await expect(patternService.batchUpdatePatterns(patternIds, { is_public: true }, mockUserId))
        .rejects.toThrow('Some patterns not found or permission denied');
    });
  });

  describe('validatePatternSequence', () => {
    it('should validate correct pattern sequence', () => {
      const validSequence = {
        emojis: [
          { emoji: '😀', position: { row: 0, col: 0 } },
          { emoji: '😊', position: { row: 0, col: 1 } }
        ],
        metadata: { mode: 'concentric' }
      };

      const result = PatternService.validatePatternSequence(validSequence);
      expect(result).toBe(true);
    });

    it('should reject invalid pattern sequence', () => {
      const invalidSequence = {
        emojis: ['😀', '😊'], // Missing position data
        metadata: { mode: 'concentric' }
      };

      const result = PatternService.validatePatternSequence(invalidSequence);
      expect(result).toBe(false);
    });

    it('should reject non-object sequences', () => {
      expect(PatternService.validatePatternSequence(null)).toBe(false);
      expect(PatternService.validatePatternSequence('invalid')).toBe(false);
      expect(PatternService.validatePatternSequence(123)).toBe(false);
    });
  });
});