interface SafetyConfig {
  enableContentFiltering: boolean;
  enableAgeVerification: boolean;
  enableDataMinimization: boolean;
  maxInputLength: number;
  maxOutputLength: number;
  blockedTerms: string[];
  requiredConsent: string[];
}

interface ContentFilterResult {
  isAllowed: boolean;
  reason?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  blockedTerms?: string[];
}

interface UserConsentRecord {
  userId: string;
  consentType: 'ai_features' | 'data_processing' | 'third_party_apis';
  granted: boolean;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  minorStatus?: 'adult' | 'minor_with_consent' | 'minor_without_consent';
}

interface AuditLogEntry {
  id: string;
  userId: string;
  action: 'ai_request' | 'content_filtered' | 'consent_granted' | 'consent_revoked' | 'safety_violation';
  details: Record<string, any>;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

/**
 * AI Safety and Privacy System
 * Provides COPPA compliance, content filtering, and data protection
 */
export class AISafety {
  private config: SafetyConfig;
  private auditLogs: Map<string, AuditLogEntry[]> = new Map();
  private consentRecords: Map<string, UserConsentRecord[]> = new Map();

  constructor(config: Partial<SafetyConfig> = {}) {
    this.config = {
      enableContentFiltering: config.enableContentFiltering ?? true,
      enableAgeVerification: config.enableAgeVerification ?? true,
      enableDataMinimization: config.enableDataMinimization ?? true,
      maxInputLength: config.maxInputLength ?? 500,
      maxOutputLength: config.maxOutputLength ?? 2000,
      blockedTerms: [
        // Violence and weapons
        'violence', 'weapon', 'gun', 'knife', 'sword', 'bomb', 'kill', 'murder', 'death',
        'fight', 'attack', 'hurt', 'harm', 'blood', 'war', 'battle',
        
        // Inappropriate content
        'drug', 'alcohol', 'cigarette', 'smoke', 'drunk', 'high', 'pills',
        'sex', 'sexual', 'porn', 'naked', 'nude', 'kiss', 'love', 'romance',
        
        // Hate speech and discrimination
        'hate', 'racist', 'discrimination', 'prejudice', 'slur', 'offensive',
        'stupid', 'idiot', 'dumb', 'ugly', 'fat', 'skinny',
        
        // Scary or disturbing content
        'scary', 'monster', 'ghost', 'demon', 'devil', 'horror', 'nightmare',
        'spider', 'snake', 'darkness', 'evil', 'creepy',
        
        // Personal information
        'address', 'phone', 'email', 'password', 'credit', 'ssn', 'social security',
        'age', 'birthday', 'school', 'teacher', 'parent', 'mom', 'dad',
        
        ...config.blockedTerms || [],
      ],
      requiredConsent: [
        'ai_features',
        'data_processing',
        ...(config.requiredConsent || []),
      ],
    };
  }

  /**
   * Filter content for safety and appropriateness
   */
  filterContent(input: string, context?: { userId?: string; userAge?: number }): ContentFilterResult {
    try {
      // Input length check
      if (input.length > this.config.maxInputLength) {
        return {
          isAllowed: false,
          reason: `Input too long (max ${this.config.maxInputLength} characters)`,
          severity: 'medium',
        };
      }

      // Content filtering for inappropriate terms
      if (this.config.enableContentFiltering) {
        const lowerInput = input.toLowerCase();
        const foundBlockedTerms: string[] = [];

        for (const term of this.config.blockedTerms) {
          if (lowerInput.includes(term.toLowerCase())) {
            foundBlockedTerms.push(term);
          }
        }

        if (foundBlockedTerms.length > 0) {
          const severity = this.determineSeverity(foundBlockedTerms);
          
          // Log the safety violation
          if (context?.userId) {
            this.auditLog({
              userId: context.userId,
              action: 'content_filtered',
              details: {
                input: input.substring(0, 100) + '...', // Truncated for privacy
                blockedTerms: foundBlockedTerms,
                severity,
              },
              severity: severity === 'critical' ? 'critical' : 'warning',
            });
          }

          return {
            isAllowed: false,
            reason: 'Content contains inappropriate terms for a family-friendly app',
            severity,
            blockedTerms: foundBlockedTerms,
          };
        }
      }

      // Special checks for minors
      if (context?.userAge && context.userAge < 13) {
        const extraRestrictiveTerms = ['friend', 'meet', 'location', 'where'];
        const lowerInput = input.toLowerCase();
        
        for (const term of extraRestrictiveTerms) {
          if (lowerInput.includes(term)) {
            return {
              isAllowed: false,
              reason: 'Content not suitable for users under 13',
              severity: 'high',
            };
          }
        }
      }

      return {
        isAllowed: true,
        severity: 'low',
      };

    } catch (error) {
      console.error('Content filtering error:', error);
      return {
        isAllowed: false,
        reason: 'Content filtering system error',
        severity: 'critical',
      };
    }
  }

  /**
   * Sanitize AI output to ensure it's safe
   */
  sanitizeOutput(output: string, context?: { userId?: string; userAge?: number }): {
    sanitized: string;
    modifications: string[];
  } {
    let sanitized = output;
    const modifications: string[] = [];

    try {
      // Length check
      if (sanitized.length > this.config.maxOutputLength) {
        sanitized = sanitized.substring(0, this.config.maxOutputLength) + '...';
        modifications.push('Truncated due to length limit');
      }

      // Remove any potential personal information patterns
      const personalInfoPatterns = [
        /\b\d{3}-\d{3}-\d{4}\b/g, // Phone numbers
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email addresses
        /\b\d{1,5}\s+\w+\s+(street|st|avenue|ave|road|rd|lane|ln|drive|dr)\b/gi, // Addresses
      ];

      personalInfoPatterns.forEach((pattern, index) => {
        if (pattern.test(sanitized)) {
          sanitized = sanitized.replace(pattern, '[REDACTED]');
          modifications.push(`Removed personal information pattern ${index + 1}`);
        }
      });

      // Ensure emojis are appropriate
      const inappropriateEmojiPatterns = [
        /🔫|💣|🗡️|⚔️|🏹/, // Weapons
        /🍺|🍷|🍸|🍹|🚬/, // Alcohol/smoking
        /👙|🩱|🩲/, // Inappropriate clothing
      ];

      inappropriateEmojiPatterns.forEach((pattern, index) => {
        if (pattern.test(sanitized)) {
          sanitized = sanitized.replace(pattern, '🎨');
          modifications.push(`Replaced inappropriate emoji pattern ${index + 1}`);
        }
      });

      // Log if modifications were made
      if (modifications.length > 0 && context?.userId) {
        this.auditLog({
          userId: context.userId,
          action: 'content_filtered',
          details: {
            modifications,
            outputLength: output.length,
            sanitizedLength: sanitized.length,
          },
          severity: 'info',
        });
      }

      return { sanitized, modifications };

    } catch (error) {
      console.error('Output sanitization error:', error);
      return {
        sanitized: 'Sorry, I encountered an error processing that response.',
        modifications: ['Error during sanitization'],
      };
    }
  }

  /**
   * Check if user has required consent for AI features
   */
  async checkUserConsent(userId: string, requiredConsent: string[] = this.config.requiredConsent): Promise<{
    hasConsent: boolean;
    missingConsent: string[];
  }> {
    try {
      const userConsents = this.consentRecords.get(userId) || [];
      const grantedConsents = new Set(
        userConsents
          .filter(record => record.granted)
          .map(record => record.consentType)
      );

      const missingConsent = requiredConsent.filter(consent => !grantedConsents.has(consent));

      return {
        hasConsent: missingConsent.length === 0,
        missingConsent,
      };

    } catch (error) {
      console.error('Consent check error:', error);
      return {
        hasConsent: false,
        missingConsent: requiredConsent,
      };
    }
  }

  /**
   * Record user consent
   */
  async grantConsent(
    userId: string,
    consentType: UserConsentRecord['consentType'],
    metadata: {
      ipAddress?: string;
      userAgent?: string;
      minorStatus?: UserConsentRecord['minorStatus'];
    } = {}
  ): Promise<void> {
    try {
      const consentRecord: UserConsentRecord = {
        userId,
        consentType,
        granted: true,
        timestamp: new Date(),
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        minorStatus: metadata.minorStatus,
      };

      const userConsents = this.consentRecords.get(userId) || [];
      
      // Remove any existing consent of the same type
      const filteredConsents = userConsents.filter(
        record => record.consentType !== consentType
      );
      
      filteredConsents.push(consentRecord);
      this.consentRecords.set(userId, filteredConsents);

      // Audit log
      this.auditLog({
        userId,
        action: 'consent_granted',
        details: {
          consentType,
          minorStatus: metadata.minorStatus,
        },
        severity: 'info',
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
      });

    } catch (error) {
      console.error('Grant consent error:', error);
      throw new Error('Failed to record consent');
    }
  }

  /**
   * Revoke user consent
   */
  async revokeConsent(userId: string, consentType: UserConsentRecord['consentType']): Promise<void> {
    try {
      const userConsents = this.consentRecords.get(userId) || [];
      
      // Add revocation record
      const revocationRecord: UserConsentRecord = {
        userId,
        consentType,
        granted: false,
        timestamp: new Date(),
      };
      
      userConsents.push(revocationRecord);
      this.consentRecords.set(userId, userConsents);

      // Audit log
      this.auditLog({
        userId,
        action: 'consent_revoked',
        details: { consentType },
        severity: 'info',
      });

    } catch (error) {
      console.error('Revoke consent error:', error);
      throw new Error('Failed to revoke consent');
    }
  }

  /**
   * COPPA compliance check
   */
  async checkCOPPACompliance(userId: string, userAge?: number): Promise<{
    compliant: boolean;
    reason?: string;
    requiredActions?: string[];
  }> {
    try {
      // If user is 13 or older, standard compliance applies
      if (userAge && userAge >= 13) {
        const consentCheck = await this.checkUserConsent(userId);
        return {
          compliant: consentCheck.hasConsent,
          reason: consentCheck.hasConsent ? undefined : 'Missing required consent',
          requiredActions: consentCheck.missingConsent,
        };
      }

      // For users under 13, check for parental consent
      const userConsents = this.consentRecords.get(userId) || [];
      const hasParentalConsent = userConsents.some(
        record => 
          record.granted && 
          record.minorStatus === 'minor_with_consent'
      );

      if (!hasParentalConsent) {
        return {
          compliant: false,
          reason: 'COPPA requires parental consent for users under 13',
          requiredActions: ['parental_consent'],
        };
      }

      return { compliant: true };

    } catch (error) {
      console.error('COPPA compliance check error:', error);
      return {
        compliant: false,
        reason: 'Error checking COPPA compliance',
        requiredActions: ['manual_review'],
      };
    }
  }

  /**
   * Minimize data in AI requests (remove PII)
   */
  minimizeData(data: any): any {
    try {
      if (typeof data === 'string') {
        // Remove email patterns
        data = data.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]');
        
        // Remove phone patterns
        data = data.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]');
        
        // Remove common PII patterns
        data = data.replace(/\b(my name is|i am|i'm)\s+[a-zA-Z]+/gi, '$1 [NAME]');
        data = data.replace(/\b(age|old)\s+\d+/gi, '$1 [AGE]');
        
        return data;
      }

      if (typeof data === 'object' && data !== null) {
        const minimized = { ...data };
        
        // Remove common PII fields
        delete minimized.email;
        delete minimized.phone;
        delete minimized.address;
        delete minimized.fullName;
        delete minimized.age;
        delete minimized.birthday;
        
        // Recursively minimize nested objects
        Object.keys(minimized).forEach(key => {
          minimized[key] = this.minimizeData(minimized[key]);
        });
        
        return minimized;
      }

      return data;

    } catch (error) {
      console.error('Data minimization error:', error);
      return '[DATA_MINIMIZATION_ERROR]';
    }
  }

  /**
   * Create audit log entry
   */
  private auditLog(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): void {
    try {
      const logEntry: AuditLogEntry = {
        ...entry,
        id: crypto.randomUUID(),
        timestamp: new Date(),
      };

      const userLogs = this.auditLogs.get(entry.userId) || [];
      userLogs.push(logEntry);
      
      // Keep only last 1000 entries per user
      if (userLogs.length > 1000) {
        userLogs.splice(0, userLogs.length - 1000);
      }
      
      this.auditLogs.set(entry.userId, userLogs);

      // In production, this would be sent to a secure logging service
      if (logEntry.severity === 'critical' || logEntry.severity === 'error') {
        console.error('AI Safety Audit Log:', logEntry);
      }

    } catch (error) {
      console.error('Audit logging error:', error);
    }
  }

  /**
   * Determine severity based on blocked terms
   */
  private determineSeverity(blockedTerms: string[]): ContentFilterResult['severity'] {
    const criticalTerms = ['weapon', 'violence', 'kill', 'murder', 'bomb', 'drug', 'sex', 'hate'];
    const highTerms = ['fight', 'hurt', 'alcohol', 'stupid', 'scary', 'demon'];
    
    if (blockedTerms.some(term => criticalTerms.includes(term))) return 'critical';
    if (blockedTerms.some(term => highTerms.includes(term))) return 'high';
    if (blockedTerms.length > 2) return 'medium';
    return 'low';
  }

  /**
   * Get audit logs for user (for compliance/debugging)
   */
  getUserAuditLogs(userId: string, limit = 100): AuditLogEntry[] {
    const logs = this.auditLogs.get(userId) || [];
    return logs.slice(-limit);
  }

  /**
   * Export user data (for GDPR compliance)
   */
  exportUserData(userId: string): {
    consents: UserConsentRecord[];
    auditLogs: AuditLogEntry[];
    exportedAt: Date;
  } {
    return {
      consents: this.consentRecords.get(userId) || [],
      auditLogs: this.auditLogs.get(userId) || [],
      exportedAt: new Date(),
    };
  }

  /**
   * Delete user data (for GDPR compliance)
   */
  deleteUserData(userId: string): void {
    this.consentRecords.delete(userId);
    this.auditLogs.delete(userId);
  }

  /**
   * Health check for safety systems
   */
  healthCheck(): {
    contentFiltering: boolean;
    auditLogging: boolean;
    consentManagement: boolean;
    dataMinimization: boolean;
  } {
    try {
      // Test content filtering
      const testFilter = this.filterContent('test violence content');
      const contentFiltering = !testFilter.isAllowed;

      // Test audit logging
      this.auditLog({
        userId: 'health-check',
        action: 'safety_violation',
        details: { test: true },
        severity: 'info',
      });
      const auditLogging = this.auditLogs.has('health-check');

      // Test consent management
      const consentManagement = this.consentRecords instanceof Map;

      // Test data minimization
      const testData = this.minimizeData({ email: 'test@test.com', data: 'safe' });
      const dataMinimization = !testData.email && testData.data === 'safe';

      // Cleanup
      this.auditLogs.delete('health-check');

      return {
        contentFiltering,
        auditLogging,
        consentManagement,
        dataMinimization,
      };

    } catch (error) {
      console.error('Safety health check error:', error);
      return {
        contentFiltering: false,
        auditLogging: false,
        consentManagement: false,
        dataMinimization: false,
      };
    }
  }
}

// Export singleton instance
export const aiSafety = new AISafety();

// Export types for use in other modules
export type {
  SafetyConfig,
  ContentFilterResult,
  UserConsentRecord,
  AuditLogEntry,
};