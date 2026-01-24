import { LocalAIService } from '../local-ai-service';
import type { PatternSequence } from '@/db/types';

// Mock the types module since it might not be available in test environment
jest.mock('@/db/types', () => ({
  // Add minimal type definitions needed for tests
}), { virtual: true });

describe('LocalAIService', () => {
  let localAI: LocalAIService;

  beforeEach(() => {
    localAI = new LocalAIService();
  });

  describe('Pattern Generation', () => {
    it('should generate a pattern from a simple prompt', async () => {
      const response = await localAI.generatePattern({
        prompt: 'flower garden',
        language: 'en',
        difficulty: 'simple',
        size: 3,
      });

      expect(response.success).toBe(true);
      expect(response.pattern).toBeDefined();
      expect(response.patternName).toBeDefined();
      expect(response.explanation).toBeDefined();
      
      if (response.pattern) {
        expect(response.pattern.emojis).toHaveLength(9); // 3x3 = 9 cells
        expect(response.pattern.metadata.created_with).toBe('local_ai');
        
        // Each emoji should have valid position
        response.pattern.emojis.forEach(cell => {
          expect(cell.emoji).toMatch(/[\u{1F000}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u);
          expect(cell.position.row).toBeGreaterThanOrEqual(0);
          expect(cell.position.col).toBeGreaterThanOrEqual(0);
          expect(cell.position.row).toBeLessThan(3);
          expect(cell.position.col).toBeLessThan(3);
        });
      }
    });

    it('should generate different patterns for different prompts', async () => {
      const response1 = await localAI.generatePattern({
        prompt: 'ocean waves',
        language: 'en',
        difficulty: 'medium',
        size: 3,
      });

      const response2 = await localAI.generatePattern({
        prompt: 'space galaxy',
        language: 'en', 
        difficulty: 'medium',
        size: 3,
      });

      expect(response1.success).toBe(true);
      expect(response2.success).toBe(true);
      
      // Patterns should likely be different (though not guaranteed)
      if (response1.pattern && response2.pattern) {
        const emojis1 = response1.pattern.emojis.map(c => c.emoji).sort();
        const emojis2 = response2.pattern.emojis.map(c => c.emoji).sort();
        
        // At least some emojis should be different
        const intersection = emojis1.filter(e => emojis2.includes(e));
        expect(intersection.length).toBeLessThan(emojis1.length);
      }
    });

    it('should handle different pattern sizes', async () => {
      const sizes = [3, 5, 7];
      
      for (const size of sizes) {
        const response = await localAI.generatePattern({
          prompt: 'test pattern',
          language: 'en',
          size,
        });

        expect(response.success).toBe(true);
        if (response.pattern) {
          expect(response.pattern.emojis).toHaveLength(size * size);
        }
      }
    });

    it('should handle different difficulty levels', async () => {
      const difficulties = ['simple', 'medium', 'complex'] as const;
      
      for (const difficulty of difficulties) {
        const response = await localAI.generatePattern({
          prompt: 'test pattern',
          language: 'en',
          difficulty,
          size: 5,
        });

        expect(response.success).toBe(true);
        expect(response.pattern).toBeDefined();
        
        // Could check that complex patterns have more emoji variety
        if (response.pattern && difficulty === 'complex') {
          const uniqueEmojis = new Set(response.pattern.emojis.map(c => c.emoji));
          expect(uniqueEmojis.size).toBeGreaterThan(2);
        }
      }
    });

    it('should support French language', async () => {
      const response = await localAI.generatePattern({
        prompt: 'jardin de fleurs',
        language: 'fr',
        difficulty: 'simple',
        size: 3,
      });

      expect(response.success).toBe(true);
      expect(response.patternName).toBeDefined();
      expect(response.explanation).toBeDefined();
      
      // French responses should contain French text
      if (response.explanation) {
        expect(response.explanation).toMatch(/créé|motif|emojis/i);
      }
    });

    it('should suggest appropriate palette', async () => {
      const response = await localAI.generatePattern({
        prompt: 'ocean waves',
        language: 'en',
        difficulty: 'simple',
        size: 3,
      });

      expect(response.success).toBe(true);
      expect(response.suggestedPalette).toBeDefined();
      
      // Ocean prompt should suggest ocean-related palette
      if (response.suggestedPalette) {
        expect(response.suggestedPalette).toMatch(/ocean|blue/i);
      }
    });

    it('should handle unknown prompts gracefully', async () => {
      const response = await localAI.generatePattern({
        prompt: 'completely unknown concept xyz',
        language: 'en',
        difficulty: 'simple',
        size: 3,
      });

      // Should still generate something, falling back to default template
      expect(response.success).toBe(true);
      expect(response.pattern).toBeDefined();
    });
  });

  describe('Pattern Naming', () => {
    const samplePattern: PatternSequence = {
      emojis: [
        { emoji: '🌸', position: { row: 0, col: 0 } },
        { emoji: '🌿', position: { row: 0, col: 1 } },
        { emoji: '🦋', position: { row: 0, col: 2 } },
        { emoji: '🌿', position: { row: 1, col: 0 } },
        { emoji: '🌸', position: { row: 1, col: 1 } },
        { emoji: '🌿', position: { row: 1, col: 2 } },
        { emoji: '🦋', position: { row: 2, col: 0 } },
        { emoji: '🌿', position: { row: 2, col: 1 } },
        { emoji: '🌸', position: { row: 2, col: 2 } },
      ],
      metadata: {
        version: 1,
        created_with: 'test',
        last_modified: new Date(),
      },
    };

    it('should generate multiple names for a pattern', async () => {
      const response = await localAI.generatePatternNames({
        pattern: samplePattern,
        language: 'en',
        style: 'creative',
      });

      expect(response.success).toBe(true);
      expect(response.names).toBeDefined();
      expect(response.explanation).toBeDefined();
      
      if (response.names) {
        expect(response.names.length).toBeGreaterThanOrEqual(3);
        expect(response.names.length).toBeLessThanOrEqual(5);
        
        // Each name should be a non-empty string
        response.names.forEach(name => {
          expect(name).toBeTruthy();
          expect(typeof name).toBe('string');
          expect(name.length).toBeGreaterThan(0);
        });
      }
    });

    it('should generate different names for different styles', async () => {
      const styles = ['creative', 'descriptive', 'playful', 'elegant'] as const;
      const results: { [key: string]: string[] } = {};
      
      for (const style of styles) {
        const response = await localAI.generatePatternNames({
          pattern: samplePattern,
          language: 'en',
          style,
        });

        expect(response.success).toBe(true);
        if (response.names) {
          results[style] = response.names;
        }
      }

      // Different styles should produce different names
      const allNames = Object.values(results).flat();
      const uniqueNames = new Set(allNames);
      expect(uniqueNames.size).toBeGreaterThan(styles.length);
    });

    it('should support French naming', async () => {
      const response = await localAI.generatePatternNames({
        pattern: samplePattern,
        language: 'fr',
        style: 'creative',
      });

      expect(response.success).toBe(true);
      expect(response.names).toBeDefined();
      
      if (response.names) {
        // Should contain French words
        const allText = response.names.join(' ').toLowerCase();
        expect(allText).toMatch(/nature|motif|créatif|beau|jardin|fleur/);
      }
    });

    it('should analyze pattern theme correctly', async () => {
      const spacePattern: PatternSequence = {
        emojis: [
          { emoji: '⭐', position: { row: 0, col: 0 } },
          { emoji: '🌙', position: { row: 0, col: 1 } },
          { emoji: '🚀', position: { row: 1, col: 0 } },
        ],
        metadata: {
          version: 1,
          created_with: 'test',
          last_modified: new Date(),
        },
      };

      const response = await localAI.generatePatternNames({
        pattern: spacePattern,
        language: 'en',
        style: 'descriptive',
      });

      expect(response.success).toBe(true);
      if (response.names) {
        const allText = response.names.join(' ').toLowerCase();
        expect(allText).toMatch(/space|star|cosmic|galaxy|universe/);
      }
    });

    it('should handle empty patterns gracefully', async () => {
      const emptyPattern: PatternSequence = {
        emojis: [],
        metadata: {
          version: 1,
          created_with: 'test',
          last_modified: new Date(),
        },
      };

      const response = await localAI.generatePatternNames({
        pattern: emptyPattern,
        language: 'en',
        style: 'creative',
      });

      // Should still generate fallback names
      expect(response.success).toBe(true);
      expect(response.names).toBeDefined();
    });
  });

  describe('Pattern Templates', () => {
    it('should have multiple pattern templates', () => {
      // This tests the internal template system
      const templates = (localAI as any).patternTemplates;
      
      expect(templates).toBeDefined();
      expect(templates.length).toBeGreaterThan(5);
      
      templates.forEach((template: any) => {
        expect(template.name).toBeDefined();
        expect(template.keywords).toBeDefined();
        expect(template.emojiSets).toBeDefined();
        expect(template.pattern).toBeDefined();
        expect(template.difficulty).toBeDefined();
      });
    });

    it('should match prompts to appropriate templates', () => {
      const findBestTemplate = (localAI as any).findBestTemplate.bind(localAI);
      
      const natureTemplate = findBestTemplate('beautiful garden with flowers', 'medium');
      const spaceTemplate = findBestTemplate('cosmic stars and planets', 'complex');
      
      expect(natureTemplate).toBeDefined();
      expect(spaceTemplate).toBeDefined();
      expect(natureTemplate.name).not.toBe(spaceTemplate.name);
    });
  });

  describe('Pattern Generation Algorithms', () => {
    it('should generate concentric patterns correctly', () => {
      const generateConcentricPattern = (localAI as any).generateConcentricPattern.bind(localAI);
      const emojis: any[] = [];
      const emojiSets = [['🔴'], ['🟡'], ['🟢']];
      
      generateConcentricPattern(emojis, emojiSets, 3, 1);
      
      expect(emojis).toHaveLength(9);
      
      // Check that positions are valid
      emojis.forEach(cell => {
        expect(cell.position.row).toBeGreaterThanOrEqual(0);
        expect(cell.position.col).toBeGreaterThanOrEqual(0);
        expect(cell.position.row).toBeLessThan(3);
        expect(cell.position.col).toBeLessThan(3);
      });
    });

    it('should generate spiral patterns correctly', () => {
      const generateSpiralPattern = (localAI as any).generateSpiralPattern.bind(localAI);
      const emojis: any[] = [];
      const emojiSets = [['🔴'], ['🟡'], ['🟢']];
      
      generateSpiralPattern(emojis, emojiSets, 3, 1);
      
      expect(emojis).toHaveLength(9);
      
      // All positions should be unique
      const positions = new Set(emojis.map(cell => `${cell.position.row},${cell.position.col}`));
      expect(positions.size).toBe(9);
    });
  });

  describe('Health Check', () => {
    it('should report healthy status', async () => {
      const health = await localAI.healthCheck();
      
      expect(health.available).toBe(true);
      expect(health.latencyMs).toBeDefined();
      expect(health.latencyMs).toBeGreaterThan(0);
      expect(health.latencyMs).toBeLessThan(1000); // Should be fast
    });

    it('should handle health check errors gracefully', async () => {
      // Mock a failure in pattern generation
      const originalGeneratePattern = localAI.generatePattern;
      localAI.generatePattern = jest.fn().mockRejectedValue(new Error('Test error'));
      
      const health = await localAI.healthCheck();
      
      expect(health.available).toBe(false);
      expect(health.latencyMs).toBeDefined();
      
      // Restore original method
      localAI.generatePattern = originalGeneratePattern;
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid prompt gracefully', async () => {
      const response = await localAI.generatePattern({
        prompt: '',
        language: 'en',
      });

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });

    it('should handle invalid pattern data for naming', async () => {
      const response = await localAI.generatePatternNames({
        // @ts-ignore - Testing invalid input
        pattern: null,
        language: 'en',
      });

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });

    it('should handle unsupported language gracefully', async () => {
      const response = await localAI.generatePattern({
        prompt: 'test pattern',
        // @ts-ignore - Testing unsupported language
        language: 'xyz',
      });

      // Should fall back to English or handle gracefully
      expect(response.success).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should generate patterns quickly', async () => {
      const start = Date.now();
      
      const response = await localAI.generatePattern({
        prompt: 'test pattern',
        language: 'en',
        size: 5,
      });

      const duration = Date.now() - start;
      
      expect(response.success).toBe(true);
      expect(duration).toBeLessThan(100); // Should be very fast
    });

    it('should handle concurrent requests', async () => {
      const promises = Array.from({ length: 10 }, (_, i) => 
        localAI.generatePattern({
          prompt: `test pattern ${i}`,
          language: 'en',
          size: 3,
        })
      );

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.success).toBe(true);
      });
    });
  });
});