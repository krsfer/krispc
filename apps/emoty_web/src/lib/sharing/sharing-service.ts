/**
 * Sharing service with privacy controls and cross-platform support
 */
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import type { PatternState } from '@/types/pattern';

export interface ShareOptions {
  expirationDays?: number | null; // null for no expiration
  maxDownloads?: number | null; // null for unlimited
  password?: string;
  includeMetadata: boolean;
  isPublic: boolean;
  allowComments?: boolean;
  allowRemix?: boolean;
  watermark?: boolean;
}

export interface ShareResult {
  success: boolean;
  shareId?: string;
  shortCode?: string;
  shareUrl?: string;
  qrCodeUrl?: string;
  embedCode?: string;
  error?: string;
  expiresAt?: Date;
}

export interface ShareData {
  id: string;
  shortCode: string;
  patternId: string;
  patternData: PatternState;
  options: ShareOptions;
  createdAt: Date;
  expiresAt?: Date;
  downloadCount: number;
  viewCount: number;
  createdBy: string;
  isActive: boolean;
}

export interface SocialSharePlatform {
  name: string;
  icon: string;
  url: string;
  color: string;
  supportsImage: boolean;
  supportsText: boolean;
}

export class SharingService {
  private baseUrl: string;
  private shares: Map<string, ShareData> = new Map();

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  }

  /**
   * Create a shareable link for a pattern
   */
  async createShare(
    pattern: PatternState,
    userId: string,
    options: ShareOptions
  ): Promise<ShareResult> {
    try {
      const shareId = uuidv4();
      const shortCode = this.generateShortCode();
      const expiresAt = options.expirationDays 
        ? new Date(Date.now() + options.expirationDays * 24 * 60 * 60 * 1000)
        : undefined;

      // Create share data
      const shareData: ShareData = {
        id: shareId,
        shortCode,
        patternId: pattern.id || shareId,
        patternData: this.sanitizePatternData(pattern, options),
        options,
        createdAt: new Date(),
        expiresAt,
        downloadCount: 0,
        viewCount: 0,
        createdBy: userId,
        isActive: true
      };

      // Store share data (in real app, this would be in database)
      this.shares.set(shareId, shareData);
      this.shares.set(shortCode, shareData); // Also store by short code for quick lookup

      const shareUrl = `${this.baseUrl}/share/${shortCode}`;
      const qrCodeUrl = await this.generateQRCode(shareUrl);
      const embedCode = this.generateEmbedCode(shortCode, pattern.name || 'Emoji Pattern');

      return {
        success: true,
        shareId,
        shortCode,
        shareUrl,
        qrCodeUrl,
        embedCode,
        expiresAt
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create share'
      };
    }
  }

  /**
   * Get share data by short code or ID
   */
  async getShare(identifier: string): Promise<ShareData | null> {
    const shareData = this.shares.get(identifier);
    
    if (!shareData) {
      return null;
    }

    // Check if share is expired
    if (shareData.expiresAt && shareData.expiresAt < new Date()) {
      shareData.isActive = false;
      return null;
    }

    // Check if max downloads reached
    if (shareData.options.maxDownloads && shareData.downloadCount >= shareData.options.maxDownloads) {
      shareData.isActive = false;
      return null;
    }

    // Increment view count
    shareData.viewCount++;

    return shareData;
  }

  /**
   * Verify password for protected share
   */
  async verifySharePassword(identifier: string, password: string): Promise<boolean> {
    const shareData = this.shares.get(identifier);
    
    if (!shareData || !shareData.options.password) {
      return false;
    }

    // In a real app, you'd use proper password hashing
    return shareData.options.password === password;
  }

  /**
   * Increment download count for a share
   */
  async recordDownload(identifier: string): Promise<boolean> {
    const shareData = this.shares.get(identifier);
    
    if (!shareData || !shareData.isActive) {
      return false;
    }

    shareData.downloadCount++;
    
    // Check if this was the last allowed download
    if (shareData.options.maxDownloads && shareData.downloadCount >= shareData.options.maxDownloads) {
      shareData.isActive = false;
    }

    return true;
  }

  /**
   * Delete a share
   */
  async deleteShare(identifier: string, userId: string): Promise<boolean> {
    const shareData = this.shares.get(identifier);
    
    if (!shareData || shareData.createdBy !== userId) {
      return false;
    }

    this.shares.delete(shareData.id);
    this.shares.delete(shareData.shortCode);
    
    return true;
  }

  /**
   * Get all shares created by a user
   */
  async getUserShares(userId: string): Promise<ShareData[]> {
    return Array.from(this.shares.values())
      .filter(share => share.createdBy === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Generate social media sharing URLs
   */
  generateSocialShares(shareUrl: string, pattern: PatternState): SocialSharePlatform[] {
    const text = encodeURIComponent(`Check out this emoji pattern: ${pattern.name || 'Untitled Pattern'}`);
    const url = encodeURIComponent(shareUrl);

    return [
      {
        name: 'Twitter',
        icon: '🐦',
        url: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
        color: '#1DA1F2',
        supportsImage: true,
        supportsText: true
      },
      {
        name: 'Facebook',
        icon: '📘',
        url: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
        color: '#4267B2',
        supportsImage: true,
        supportsText: true
      },
      {
        name: 'LinkedIn',
        icon: '💼',
        url: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
        color: '#0077B5',
        supportsImage: true,
        supportsText: true
      },
      {
        name: 'Reddit',
        icon: '🤖',
        url: `https://reddit.com/submit?url=${url}&title=${text}`,
        color: '#FF4500',
        supportsImage: true,
        supportsText: true
      },
      {
        name: 'WhatsApp',
        icon: '💬',
        url: `https://api.whatsapp.com/send?text=${text}%20${url}`,
        color: '#25D366',
        supportsImage: false,
        supportsText: true
      },
      {
        name: 'Telegram',
        icon: '✈️',
        url: `https://t.me/share/url?url=${url}&text=${text}`,
        color: '#0088CC',
        supportsImage: true,
        supportsText: true
      },
      {
        name: 'Pinterest',
        icon: '📌',
        url: `https://pinterest.com/pin/create/button/?url=${url}&description=${text}`,
        color: '#BD081C',
        supportsImage: true,
        supportsText: true
      }
    ];
  }

  /**
   * Generate email sharing content
   */
  generateEmailShare(shareUrl: string, pattern: PatternState): {
    subject: string;
    body: string;
    url: string;
  } {
    const subject = encodeURIComponent(`Emoji Pattern: ${pattern.name || 'Untitled Pattern'}`);
    const body = encodeURIComponent(
      `Hi!\n\nI wanted to share this emoji pattern with you: ${pattern.name || 'Untitled Pattern'}\n\n` +
      `${pattern.description ? `Description: ${pattern.description}\n\n` : ''}` +
      `View it here: ${shareUrl}\n\n` +
      `Created with Emo-Web`
    );

    return {
      subject,
      body,
      url: `mailto:?subject=${subject}&body=${body}`
    };
  }

  /**
   * Generate QR code for sharing
   */
  private async generateQRCode(url: string): Promise<string> {
    try {
      return await QRCode.toDataURL(url, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });
    } catch (error) {
      console.error('Failed to generate QR code:', error);
      return '';
    }
  }

  /**
   * Generate embed code
   */
  private generateEmbedCode(shortCode: string, title: string): string {
    const embedUrl = `${this.baseUrl}/embed/${shortCode}`;
    
    return `<iframe src="${embedUrl}" width="400" height="400" frameborder="0" title="${title}"></iframe>`;
  }

  /**
   * Generate short code for share
   */
  private generateShortCode(): string {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let result = '';
    
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Make sure it's unique
    if (this.shares.has(result)) {
      return this.generateShortCode();
    }
    
    return result;
  }

  /**
   * Sanitize pattern data based on sharing options
   */
  private sanitizePatternData(pattern: PatternState, options: ShareOptions): PatternState {
    const sanitized = { ...pattern };

    // Remove sensitive data if not including metadata
    if (!options.includeMetadata) {
      delete sanitized.metadata;
      delete sanitized.createdAt;
      delete sanitized.updatedAt;
    }

    // Remove user-specific data for public shares
    if (options.isPublic) {
      delete sanitized.id; // Generate new ID for public shares
      sanitized.id = uuidv4();
    }

    return sanitized;
  }

  /**
   * Get sharing analytics for a user
   */
  async getShareAnalytics(userId: string): Promise<{
    totalShares: number;
    totalViews: number;
    totalDownloads: number;
    activeShares: number;
    topSharedPattern: string | null;
    recentActivity: Array<{
      shareId: string;
      action: 'created' | 'viewed' | 'downloaded';
      timestamp: Date;
    }>;
  }> {
    const userShares = await this.getUserShares(userId);
    
    const totalViews = userShares.reduce((sum, share) => sum + share.viewCount, 0);
    const totalDownloads = userShares.reduce((sum, share) => sum + share.downloadCount, 0);
    const activeShares = userShares.filter(share => share.isActive).length;
    
    // Find most viewed pattern
    const topShare = userShares.reduce((top, current) => 
      current.viewCount > (top?.viewCount || 0) ? current : top, 
      null as ShareData | null
    );

    return {
      totalShares: userShares.length,
      totalViews,
      totalDownloads,
      activeShares,
      topSharedPattern: topShare?.patternData.name || null,
      recentActivity: [] // Would be populated from activity log in real app
    };
  }

  /**
   * Clean up expired shares
   */
  async cleanupExpiredShares(): Promise<number> {
    const now = new Date();
    let cleaned = 0;
    
    for (const [key, share] of this.shares.entries()) {
      if (share.expiresAt && share.expiresAt < now) {
        this.shares.delete(key);
        cleaned++;
      }
    }
    
    return cleaned;
  }

  /**
   * Validate share options
   */
  validateShareOptions(options: ShareOptions): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (options.expirationDays !== null && options.expirationDays !== undefined) {
      if (options.expirationDays < 1 || options.expirationDays > 365) {
        errors.push('Expiration days must be between 1 and 365');
      }
    }

    if (options.maxDownloads !== null && options.maxDownloads !== undefined) {
      if (options.maxDownloads < 1 || options.maxDownloads > 10000) {
        errors.push('Max downloads must be between 1 and 10,000');
      }
    }

    if (options.password && options.password.length < 4) {
      errors.push('Password must be at least 4 characters long');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// Export singleton instance
export const sharingService = new SharingService();