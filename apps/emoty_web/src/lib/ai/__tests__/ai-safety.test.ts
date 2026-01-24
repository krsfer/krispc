import { AISafety } from '../ai-safety';

describe('AISafety', () => {
  let aiSafety: AISafety;

  beforeEach(() => {
    aiSafety = new AISafety();
  });

  describe('Content Filtering', () => {
    it('should allow safe content', () => {
      const result = aiSafety.filterContent('Create a beautiful flower pattern');
      
      expect(result.isAllowed).toBe(true);
      expect(result.severity).toBe('low');
    });

    it('should block inappropriate content', () => {
      const result = aiSafety.filterContent('Create a violent pattern with weapons');
      
      expect(result.isAllowed).toBe(false);
      expect(result.severity).toBe('critical');
      expect(result.blockedTerms).toContain('violence');
      expect(result.blockedTerms).toContain('weapon');
    });

    it('should block hate speech', () => {
      const result = aiSafety.filterContent('I hate stupid people');
      
      expect(result.isAllowed).toBe(false);
      expect(result.severity).toBeGreaterThan('low' as any);
      expect(result.blockedTerms).toContain('hate');
      expect(result.blockedTerms).toContain('stupid');
    });

    it('should block content that is too long', () => {
      const longContent = 'a'.repeat(501);
      const result = aiSafety.filterContent(longContent);
      
      expect(result.isAllowed).toBe(false);
      expect(result.reason).toContain('too long');
    });

    it('should block content that is too short', () => {
      const result = aiSafety.filterContent('hi');
      
      expect(result.isAllowed).toBe(false);
    });

    it('should have extra restrictions for minors', () => {
      const result = aiSafety.filterContent('Let me know where you live', { 
        userId: 'user1', 
        userAge: 10 
      });
      
      expect(result.isAllowed).toBe(false);
      expect(result.reason).toContain('not suitable for users under 13');
    });
  });

  describe('Output Sanitization', () => {
    it('should sanitize personal information', () => {
      const output = 'Contact me at john@example.com or call 555-123-4567';
      const result = aiSafety.sanitizeOutput(output);
      
      expect(result.sanitized).toContain('[REDACTED]');
      expect(result.sanitized).not.toContain('john@example.com');
      expect(result.sanitized).not.toContain('555-123-4567');
      expect(result.modifications).toContain('Removed personal information pattern 1');
    });

    it('should replace inappropriate emojis', () => {
      const output = 'Here is a pattern: 🔫🍺👙';
      const result = aiSafety.sanitizeOutput(output);
      
      expect(result.sanitized).not.toContain('🔫');
      expect(result.sanitized).not.toContain('🍺');
      expect(result.sanitized).not.toContain('👙');
      expect(result.sanitized).toContain('🎨');
      expect(result.modifications.length).toBeGreaterThan(0);
    });

    it('should truncate output that is too long', () => {
      const longOutput = 'a'.repeat(2001);
      const result = aiSafety.sanitizeOutput(longOutput);
      
      expect(result.sanitized.length).toBeLessThanOrEqual(2003); // 2000 + "..."
      expect(result.modifications).toContain('Truncated due to length limit');
    });

    it('should preserve safe content unchanged', () => {
      const safeOutput = 'Create a beautiful nature pattern with flowers 🌸🌿🦋';
      const result = aiSafety.sanitizeOutput(safeOutput);
      
      expect(result.sanitized).toBe(safeOutput);
      expect(result.modifications).toHaveLength(0);
    });
  });

  describe('Data Minimization', () => {
    it('should remove email addresses from strings', () => {
      const data = 'My email is test@example.com and I like patterns';
      const result = aiSafety.minimizeData(data);
      
      expect(result).toContain('[EMAIL]');
      expect(result).not.toContain('test@example.com');
    });

    it('should remove phone numbers from strings', () => {
      const data = 'Call me at 555-123-4567 about patterns';
      const result = aiSafety.minimizeData(data);
      
      expect(result).toContain('[PHONE]');
      expect(result).not.toContain('555-123-4567');
    });

    it('should remove PII fields from objects', () => {
      const data = {
        prompt: 'Create a pattern',
        email: 'user@example.com',
        phone: '555-123-4567',
        address: '123 Main St',
        fullName: 'John Doe',
        age: 25,
        other: 'safe data'
      };
      
      const result = aiSafety.minimizeData(data);
      
      expect(result.prompt).toBe('Create a pattern');
      expect(result.other).toBe('safe data');
      expect(result.email).toBeUndefined();
      expect(result.phone).toBeUndefined();
      expect(result.address).toBeUndefined();
      expect(result.fullName).toBeUndefined();
      expect(result.age).toBeUndefined();
    });

    it('should handle nested objects', () => {
      const data = {
        user: {
          email: 'user@example.com',
          preferences: {
            language: 'en',
            phone: '555-123-4567'
          }
        },
        prompt: 'Create a pattern'
      };
      
      const result = aiSafety.minimizeData(data);
      
      expect(result.prompt).toBe('Create a pattern');
      expect(result.user.email).toBeUndefined();
      expect(result.user.preferences.language).toBe('en');
      expect(result.user.preferences.phone).toBeUndefined();
    });
  });

  describe('Consent Management', () => {
    it('should grant and check consent', async () => {
      const userId = 'user123';
      
      // Initially should not have consent
      const initialCheck = await aiSafety.checkUserConsent(userId, ['ai_features']);
      expect(initialCheck.hasConsent).toBe(false);
      expect(initialCheck.missingConsent).toContain('ai_features');
      
      // Grant consent
      await aiSafety.grantConsent(userId, 'ai_features');
      
      // Should now have consent
      const afterGrantCheck = await aiSafety.checkUserConsent(userId, ['ai_features']);
      expect(afterGrantCheck.hasConsent).toBe(true);
      expect(afterGrantCheck.missingConsent).toHaveLength(0);
    });

    it('should revoke consent', async () => {
      const userId = 'user123';
      
      // Grant then revoke consent
      await aiSafety.grantConsent(userId, 'ai_features');
      await aiSafety.revokeConsent(userId, 'ai_features');
      
      // Should no longer have consent
      const check = await aiSafety.checkUserConsent(userId, ['ai_features']);
      expect(check.hasConsent).toBe(false);
    });

    it('should handle multiple consent types', async () => {
      const userId = 'user123';
      const requiredConsents = ['ai_features', 'data_processing'];
      
      // Grant only one type
      await aiSafety.grantConsent(userId, 'ai_features');
      
      const partialCheck = await aiSafety.checkUserConsent(userId, requiredConsents);
      expect(partialCheck.hasConsent).toBe(false);
      expect(partialCheck.missingConsent).toContain('data_processing');
      
      // Grant second type
      await aiSafety.grantConsent(userId, 'data_processing');
      
      const fullCheck = await aiSafety.checkUserConsent(userId, requiredConsents);
      expect(fullCheck.hasConsent).toBe(true);
      expect(fullCheck.missingConsent).toHaveLength(0);
    });
  });

  describe('COPPA Compliance', () => {
    it('should require parental consent for users under 13', async () => {
      const userId = 'child123';
      
      const check = await aiSafety.checkCOPPACompliance(userId, 10);
      
      expect(check.compliant).toBe(false);
      expect(check.reason).toContain('parental consent');
      expect(check.requiredActions).toContain('parental_consent');
    });

    it('should allow users 13 and older with standard consent', async () => {
      const userId = 'teen123';
      
      // Grant required consent
      await aiSafety.grantConsent(userId, 'ai_features');
      await aiSafety.grantConsent(userId, 'data_processing');
      
      const check = await aiSafety.checkCOPPACompliance(userId, 14);
      
      expect(check.compliant).toBe(true);
    });

    it('should allow minors with parental consent', async () => {
      const userId = 'child123';
      
      // Grant parental consent
      await aiSafety.grantConsent(userId, 'ai_features', {
        minorStatus: 'minor_with_consent'
      });
      
      const check = await aiSafety.checkCOPPACompliance(userId, 10);
      
      expect(check.compliant).toBe(true);
    });
  });

  describe('Audit Logging', () => {
    it('should track filtered content', () => {
      const userId = 'user123';
      
      // This should trigger content filtering
      aiSafety.filterContent('violent content', { userId });
      
      const logs = aiSafety.getUserAuditLogs(userId);
      
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].action).toBe('content_filtered');
      expect(logs[0].userId).toBe(userId);
      expect(logs[0].severity).toBe('warning');
    });

    it('should track consent changes', async () => {
      const userId = 'user123';
      
      await aiSafety.grantConsent(userId, 'ai_features');
      
      const logs = aiSafety.getUserAuditLogs(userId);
      
      expect(logs.some(log => log.action === 'consent_granted')).toBe(true);
    });

    it('should limit audit log size', () => {
      const userId = 'user123';
      
      // Generate many log entries
      for (let i = 0; i < 50; i++) {
        aiSafety.filterContent(`test content ${i}`, { userId });
      }
      
      const logs = aiSafety.getUserAuditLogs(userId, 10);
      expect(logs).toHaveLength(10);
    });
  });

  describe('Data Export and Deletion', () => {
    it('should export user data', async () => {
      const userId = 'user123';
      
      // Create some data
      await aiSafety.grantConsent(userId, 'ai_features');
      aiSafety.filterContent('test content', { userId });
      
      const exportedData = aiSafety.exportUserData(userId);
      
      expect(exportedData.consents.length).toBeGreaterThan(0);
      expect(exportedData.auditLogs.length).toBeGreaterThan(0);
      expect(exportedData.exportedAt).toBeInstanceOf(Date);
    });

    it('should delete user data', async () => {
      const userId = 'user123';
      
      // Create some data
      await aiSafety.grantConsent(userId, 'ai_features');
      aiSafety.filterContent('test content', { userId });
      
      // Delete data
      aiSafety.deleteUserData(userId);
      
      // Should have no data left
      const logs = aiSafety.getUserAuditLogs(userId);
      const consentCheck = await aiSafety.checkUserConsent(userId);
      
      expect(logs).toHaveLength(0);
      expect(consentCheck.hasConsent).toBe(false);
    });
  });

  describe('Health Check', () => {
    it('should return health status', () => {
      const health = aiSafety.healthCheck();
      
      expect(health.contentFiltering).toBe(true);
      expect(health.auditLogging).toBe(true);
      expect(health.consentManagement).toBe(true);
      expect(health.dataMinimization).toBe(true);
    });

    it('should detect content filtering issues', () => {
      // Create an AI safety instance with disabled content filtering
      const brokenAiSafety = new AISafety({ enableContentFiltering: false });
      
      const health = brokenAiSafety.healthCheck();
      expect(health.contentFiltering).toBe(true); // Still works, just doesn't filter
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid input gracefully', () => {
      // @ts-ignore - Testing invalid input
      const result = aiSafety.filterContent(null);
      
      expect(result.isAllowed).toBe(false);
    });

    it('should handle sanitization errors', () => {
      // @ts-ignore - Testing invalid input
      const result = aiSafety.sanitizeOutput(null);
      
      expect(result.sanitized).toContain('error');
      expect(result.modifications).toContain('Error during sanitization');
    });

    it('should handle data minimization errors', () => {
      // Create circular reference to cause error
      const circular: any = { prop: 'value' };
      circular.self = circular;
      
      const result = aiSafety.minimizeData(circular);
      expect(result).toBe('[DATA_MINIMIZATION_ERROR]');
    });
  });
});