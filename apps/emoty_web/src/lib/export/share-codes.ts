import { db } from '@/db/connection';
import { gzip, ungzip } from 'pako';
import type { PatternState } from '@/types/pattern';
import type { ShareCodeData, ShareCodeOptions } from '@/types/export';
import type { ShareCodeInsert } from '@/db/types';

export class ShareCodeService {
  private static readonly CODE_LENGTH = 8;
  private static readonly CHARS = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789'; // Excluding confusing chars like O, 0, I, 1
  private static readonly DEFAULT_EXPIRATION_DAYS = 30;
  private static readonly BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  /**
   * Generate a share code for a pattern
   */
  static async generateShareCode(
    pattern: PatternState,
    userId: string,
    options: ShareCodeOptions = {}
  ): Promise<ShareCodeData> {
    try {
      // Generate unique code
      const code = await this.generateUniqueCode();
      
      // Prepare pattern data
      let patternData = {
        id: pattern.id,
        name: pattern.name,
        description: pattern.description,
        sequence: pattern.sequence,
        patternSize: pattern.patternSize,
        patternMode: pattern.patternMode,
        tags: pattern.tags,
        metadata: options.includeMetadata ? pattern.metadata : undefined,
      };

      // Compress data if requested
      let finalData: string;
      if (options.compress) {
        const jsonString = JSON.stringify(patternData);
        const compressed = gzip(jsonString, { to: 'string' });
        finalData = btoa(compressed); // Base64 encode
      } else {
        finalData = JSON.stringify(patternData);
      }

      // Calculate expiration
      const expiresAt = options.expirationDays 
        ? new Date(Date.now() + options.expirationDays * 24 * 60 * 60 * 1000)
        : null;

      // Store in database
      const shareCodeRecord: ShareCodeInsert = {
        code,
        pattern_id: pattern.id || '',
        user_id: userId,
        pattern_data: finalData,
        expires_at: expiresAt,
      };

      await db
        .insertInto('share_codes')
        .values(shareCodeRecord)
        .execute();

      const shareUrl = `${this.BASE_URL}/share/${code}`;

      return {
        code,
        url: shareUrl,
        expiresAt: expiresAt || undefined,
        pattern: {
          id: pattern.id || '',
          name: pattern.name || 'Unnamed Pattern',
          sequence: pattern.sequence,
          metadata: pattern.metadata,
        },
      };
    } catch (error) {
      console.error('Failed to generate share code:', error);
      throw new Error('Failed to generate share code');
    }
  }

  /**
   * Retrieve pattern from share code
   */
  static async getPatternFromShareCode(code: string): Promise<PatternState | null> {
    try {
      // Find share code in database
      const shareRecord = await db
        .selectFrom('share_codes')
        .selectAll()
        .where('code', '=', code.toUpperCase())
        .executeTakeFirst();

      if (!shareRecord) {
        return null;
      }

      // Check if expired
      if (shareRecord.expires_at && shareRecord.expires_at < new Date()) {
        // Clean up expired code
        await this.deleteShareCode(code);
        return null;
      }

      // Update view count
      await db
        .updateTable('share_codes')
        .set((eb) => ({
          view_count: eb('view_count', '+', 1),
        }))
        .where('code', '=', code.toUpperCase())
        .execute();

      // Decompress and parse pattern data
      let patternData: any;
      try {
        // Try to detect if data is compressed (base64 encoded)
        if (this.isBase64(shareRecord.pattern_data)) {
          const compressed = atob(shareRecord.pattern_data);
          const decompressed = ungzip(compressed, { to: 'string' });
          patternData = JSON.parse(decompressed);
        } else {
          patternData = JSON.parse(shareRecord.pattern_data);
        }
      } catch (parseError) {
        console.error('Failed to parse share code data:', parseError);
        return null;
      }

      // Reconstruct pattern state
      const pattern: PatternState = {
        id: patternData.id,
        name: patternData.name,
        description: patternData.description,
        sequence: patternData.sequence,
        insertionIndex: 0, // Reset for shared patterns
        patternSize: patternData.patternSize,
        patternMode: patternData.patternMode,
        activeInsertionMode: patternData.patternMode,
        tags: patternData.tags,
        metadata: patternData.metadata,
        // Don't include creation dates for shared patterns
        isFavorite: false, // Reset favorite status
      };

      return pattern;
    } catch (error) {
      console.error('Failed to retrieve pattern from share code:', error);
      return null;
    }
  }

  /**
   * Delete a share code
   */
  static async deleteShareCode(code: string): Promise<void> {
    try {
      await db
        .deleteFrom('share_codes')
        .where('code', '=', code.toUpperCase())
        .execute();
    } catch (error) {
      console.error('Failed to delete share code:', error);
    }
  }

  /**
   * Get share code statistics for a user
   */
  static async getUserShareStats(userId: string): Promise<{
    totalShares: number;
    totalViews: number;
    activeShares: number;
  }> {
    try {
      const stats = await db
        .selectFrom('share_codes')
        .select([
          (eb) => eb.fn.count('id').as('total_shares'),
          (eb) => eb.fn.sum('view_count').as('total_views'),
          (eb) => eb.fn.count('id').filterWhere(
            eb.or([
              eb('expires_at', 'is', null),
              eb('expires_at', '>', new Date())
            ])
          ).as('active_shares'),
        ])
        .where('user_id', '=', userId)
        .executeTakeFirst();

      return {
        totalShares: parseInt(stats?.total_shares?.toString() || '0'),
        totalViews: parseInt(stats?.total_views?.toString() || '0'),
        activeShares: parseInt(stats?.active_shares?.toString() || '0'),
      };
    } catch (error) {
      console.error('Failed to get user share stats:', error);
      return { totalShares: 0, totalViews: 0, activeShares: 0 };
    }
  }

  /**
   * Get all share codes for a user
   */
  static async getUserShareCodes(userId: string): Promise<Array<{
    code: string;
    patternName: string;
    viewCount: number;
    createdAt: Date;
    expiresAt: Date | null;
    isExpired: boolean;
  }>> {
    try {
      const shareCodes = await db
        .selectFrom('share_codes')
        .leftJoin('patterns', 'share_codes.pattern_id', 'patterns.id')
        .select([
          'share_codes.code',
          'share_codes.view_count',
          'share_codes.created_at',
          'share_codes.expires_at',
          'patterns.name as pattern_name',
        ])
        .where('share_codes.user_id', '=', userId)
        .orderBy('share_codes.created_at', 'desc')
        .execute();

      return shareCodes.map(record => ({
        code: record.code,
        patternName: record.pattern_name || 'Unnamed Pattern',
        viewCount: record.view_count,
        createdAt: record.created_at,
        expiresAt: record.expires_at,
        isExpired: record.expires_at ? record.expires_at < new Date() : false,
      }));
    } catch (error) {
      console.error('Failed to get user share codes:', error);
      return [];
    }
  }

  /**
   * Clean up expired share codes
   */
  static async cleanupExpiredCodes(): Promise<number> {
    try {
      const result = await db
        .deleteFrom('share_codes')
        .where('expires_at', '<', new Date())
        .where('expires_at', 'is not', null)
        .execute();

      const deletedCount = result.length;
      console.log(`Cleaned up ${deletedCount} expired share codes`);
      return deletedCount;
    } catch (error) {
      console.error('Failed to cleanup expired share codes:', error);
      return 0;
    }
  }

  /**
   * Generate a unique share code
   */
  private static async generateUniqueCode(): Promise<string> {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const code = this.generateRandomCode();
      
      // Check if code already exists
      const existing = await db
        .selectFrom('share_codes')
        .select('code')
        .where('code', '=', code)
        .executeTakeFirst();

      if (!existing) {
        return code;
      }

      attempts++;
    }

    throw new Error('Failed to generate unique share code after multiple attempts');
  }

  /**
   * Generate a random code
   */
  private static generateRandomCode(): string {
    let code = '';
    for (let i = 0; i < this.CODE_LENGTH; i++) {
      const randomIndex = Math.floor(Math.random() * this.CHARS.length);
      code += this.CHARS[randomIndex];
    }
    return code;
  }

  /**
   * Check if string is valid base64
   */
  private static isBase64(str: string): boolean {
    try {
      return btoa(atob(str)) === str;
    } catch (err) {
      return false;
    }
  }

  /**
   * Validate share code format
   */
  static isValidShareCode(code: string): boolean {
    if (!code || code.length !== this.CODE_LENGTH) {
      return false;
    }

    // Check if all characters are valid
    return Array.from(code.toUpperCase()).every(char => 
      this.CHARS.includes(char)
    );
  }

  /**
   * Get share URL for a pattern
   */
  static getShareUrl(code: string): string {
    return `${this.BASE_URL}/share/${code.toUpperCase()}`;
  }

  /**
   * Extract share code from URL
   */
  static extractShareCodeFromUrl(url: string): string | null {
    const match = url.match(/\/share\/([A-Z0-9]{8})/i);
    return match ? match[1].toUpperCase() : null;
  }

  /**
   * Check if user can create share codes based on their level
   */
  static canUserCreateShareCodes(userLevel: string): boolean {
    // Share codes require intermediate level or higher
    return ['intermediate', 'advanced', 'expert'].includes(userLevel);
  }

  /**
   * Get remaining share code quota for user level
   */
  static getShareCodeQuota(userLevel: string): number {
    switch (userLevel) {
      case 'beginner':
        return 0; // No share codes for beginners
      case 'intermediate':
        return 5; // 5 active share codes
      case 'advanced':
        return 15; // 15 active share codes
      case 'expert':
        return -1; // Unlimited
      default:
        return 0;
    }
  }

  /**
   * Check if user has reached their share code quota
   */
  static async hasUserReachedQuota(userId: string, userLevel: string): Promise<boolean> {
    const quota = this.getShareCodeQuota(userLevel);
    
    if (quota === -1) {
      return false; // Unlimited
    }

    if (quota === 0) {
      return true; // No quota
    }

    const stats = await this.getUserShareStats(userId);
    return stats.activeShares >= quota;
  }
}

// Utility functions for pattern compression
export class PatternCompressor {
  /**
   * Compress pattern data for sharing
   */
  static compress(pattern: PatternState, includeMetadata = false): string {
    const data = {
      s: pattern.sequence,
      n: pattern.name,
      d: pattern.description,
      sz: pattern.patternSize,
      m: pattern.patternMode,
      t: pattern.tags,
      ...(includeMetadata && { meta: pattern.metadata }),
    };

    const json = JSON.stringify(data);
    const compressed = gzip(json, { to: 'string' });
    return btoa(compressed);
  }

  /**
   * Decompress pattern data from share code
   */
  static decompress(compressedData: string): Partial<PatternState> | null {
    try {
      const compressed = atob(compressedData);
      const decompressed = ungzip(compressed, { to: 'string' });
      const data = JSON.parse(decompressed);

      return {
        sequence: data.s,
        name: data.n,
        description: data.d,
        patternSize: data.sz,
        patternMode: data.m,
        tags: data.t,
        metadata: data.meta,
      };
    } catch (error) {
      console.error('Failed to decompress pattern data:', error);
      return null;
    }
  }

  /**
   * Estimate compression ratio
   */
  static getCompressionRatio(pattern: PatternState): number {
    const original = JSON.stringify(pattern);
    const compressed = this.compress(pattern);
    return compressed.length / original.length;
  }
}