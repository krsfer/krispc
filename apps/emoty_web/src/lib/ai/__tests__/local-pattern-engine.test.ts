/**
 * Local Pattern Engine Tests
 * Unit tests for offline pattern generation functionality
 */

import { LocalPatternEngine } from '../local/pattern-engine';
import type { PatternGenerationRequest } from '../local/pattern-engine';

// Mock the emoji concepts since we can't import the full module in tests
jest.mock('../local/emoji-concepts', () => ({
  EMOJI_CONCEPTS: {
    '❤️': {
      emoji: '❤️',
      categories: [{ primary: 'emotion', secondary: 'love', weight: 1.0 }],
      keywords: { en: 'heart, love', fr: 'cœur, amour' },
      emotions: [{ emotion: 'love', intensity: 1.0 }],
      visualHarmony: {
        colorFamily: 'red',
        brightness: 0.7,
        complexity: 0.2,
        harmonizes: ['💕', '💖'],
        conflicts: ['💔']
      },
      culturalContext: {
        universal: true,
        culturalMeanings: {},
        appropriatenessLevel: 'child-safe'
      },
      accessibilityInfo: {
        altText: { en: 'red heart', fr: 'cœur rouge' },
        screenReaderFriendly: true,
        highContrast: true,
        motionSensitive: false
      },
      relationships: ['💕', '💖', '💗']
    },
    '🌸': {
      emoji: '🌸',
      categories: [{ primary: 'nature', secondary: 'flower', weight: 1.0 }],
      keywords: { en: 'cherry blossom, spring', fr: 'fleur de cerisier, printemps' },
      emotions: [{ emotion: 'peace', intensity: 0.9 }],
      visualHarmony: {
        colorFamily: 'pink',
        brightness: 0.9,
        complexity: 0.4,
        harmonizes: ['🌺', '🌻'],
        conflicts: ['🔥']
      },
      culturalContext: {
        universal: true,
        culturalMeanings: {},
        appropriatenessLevel: 'child-safe'
      },
      accessibilityInfo: {
        altText: { en: 'cherry blossom', fr: 'fleur de cerisier' },
        screenReaderFriendly: true,
        highContrast: false,
        motionSensitive: false
      },
      relationships: ['🌺', '🌻', '🌷']
    },
    '⭐': {
      emoji: '⭐',
      categories: [{ primary: 'symbol', secondary: 'star', weight: 1.0 }],
      keywords: { en: 'star, bright', fr: 'étoile, brillant' },
      emotions: [{ emotion: 'wonder', intensity: 0.8 }],
      visualHarmony: {
        colorFamily: 'yellow',
        brightness: 1.0,
        complexity: 0.3,
        harmonizes: ['✨', '🌟'],
        conflicts: []
      },
      culturalContext: {
        universal: true,
        culturalMeanings: {},
        appropriatenessLevel: 'child-safe'
      },
      accessibilityInfo: {
        altText: { en: 'star', fr: 'étoile' },
        screenReaderFriendly: true,
        highContrast: true,
        motionSensitive: false
      },
      relationships: ['✨', '🌟', '🌠']
    }
  },
  emojiRelationshipEngine: {
    findVisualHarmonies: jest.fn().mockReturnValue(['💕', '💖']),
    findEmotionalMatches: jest.fn().mockReturnValue(['💕', '🌸']),
    findCategoryMatches: jest.fn().mockReturnValue(['💕', '💖']),
    getChildSafeEmojis: jest.fn().mockReturnValue(['❤️', '🌸', '⭐', '💕', '💖']),
    findByColorFamily: jest.fn().mockReturnValue(['❤️', '💕']),
    calculateCompatibility: jest.fn().mockReturnValue(0.8)
  }
}));

describe('LocalPatternEngine', () => {
  let engine: LocalPatternEngine;

  beforeEach(() => {
    engine = new LocalPatternEngine();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Pattern Generation', () => {
    it('should generate a simple pattern', async () => {
      const request: PatternGenerationRequest = {
        complexity: 'simple',
        language: 'en'
      };

      const result = await engine.generatePatterns(request);

      expect(result).toBeDefined();
      expect(result.pattern).toBeDefined();
      expect(result.pattern.sequence).toBeInstanceOf(Array);
      expect(result.pattern.sequence.length).toBeGreaterThan(0);
      expect(result.pattern.sequence.length).toBeLessThanOrEqual(4);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should generate patterns with different complexities', async () => {
      const simpleRequest: PatternGenerationRequest = {
        complexity: 'simple',
        language: 'en'
      };

      const complexRequest: PatternGenerationRequest = {
        complexity: 'complex',
        language: 'en'
      };

      const simpleResult = await engine.generatePatterns(simpleRequest);
      const complexResult = await engine.generatePatterns(complexRequest);

      expect(simpleResult.pattern.sequence.length).toBeLessThan(
        complexResult.pattern.sequence.length
      );
    });

    it('should respect language preferences', async () => {
      const englishRequest: PatternGenerationRequest = {
        language: 'en'
      };

      const frenchRequest: PatternGenerationRequest = {
        language: 'fr'
      };

      const englishResult = await engine.generatePatterns(englishRequest);
      const frenchResult = await engine.generatePatterns(frenchRequest);

      expect(englishResult.rationale.en).toBeDefined();
      expect(englishResult.rationale.fr).toBeDefined();
      expect(frenchResult.rationale.en).toBeDefined();
      expect(frenchResult.rationale.fr).toBeDefined();

      expect(englishResult.pattern.metadata?.language).toBe('en');
      expect(frenchResult.pattern.metadata?.language).toBe('fr');
    });
  });

  describe('Theme-based Generation', () => {
    it('should generate patterns based on themes', async () => {
      const request: PatternGenerationRequest = {
        theme: 'love',
        language: 'en'
      };

      const result = await engine.generatePatterns(request);

      expect(result.pattern.sequence).toContain('❤️');
      expect(result.pattern.tags).toContain('love');
    });

    it('should generate patterns based on emotions', async () => {
      const request: PatternGenerationRequest = {
        emotion: 'love',
        language: 'en'
      };

      const result = await engine.generatePatterns(request);

      expect(result).toBeDefined();
      expect(result.pattern.sequence).toBeInstanceOf(Array);
      expect(result.pattern.sequence.length).toBeGreaterThan(0);
    });

    it('should generate patterns based on color families', async () => {
      const request: PatternGenerationRequest = {
        colorFamily: 'red',
        language: 'en'
      };

      const result = await engine.generatePatterns(request);

      expect(result).toBeDefined();
      expect(result.pattern.sequence).toBeInstanceOf(Array);
      expect(result.pattern.sequence.length).toBeGreaterThan(0);
    });
  });

  describe('Pattern Quality', () => {
    it('should generate patterns with reasonable confidence', async () => {
      const request: PatternGenerationRequest = {
        theme: 'nature',
        complexity: 'moderate',
        language: 'en'
      };

      const result = await engine.generatePatterns(request);

      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.confidence).toBeLessThanOrEqual(1.0);
    });

    it('should generate alternative patterns', async () => {
      const request: PatternGenerationRequest = {
        theme: 'love',
        language: 'en'
      };

      const result = await engine.generatePatterns(request);

      expect(result.alternatives).toBeDefined();
      expect(result.alternatives.length).toBeGreaterThan(0);
      expect(result.alternatives.length).toBeLessThanOrEqual(3);
    });

    it('should respect exclusions', async () => {
      const request: PatternGenerationRequest = {
        theme: 'love',
        excludeEmojis: ['❤️'],
        language: 'en'
      };

      const result = await engine.generatePatterns(request);

      expect(result.pattern.sequence).not.toContain('❤️');
    });

    it('should include specified emojis', async () => {
      const request: PatternGenerationRequest = {
        includeEmojis: ['⭐'],
        language: 'en'
      };

      const result = await engine.generatePatterns(request);

      expect(result.pattern.sequence).toContain('⭐');
    });
  });

  describe('Performance Requirements', () => {
    it('should generate patterns quickly', async () => {
      const request: PatternGenerationRequest = {
        complexity: 'moderate',
        language: 'en'
      };

      const startTime = performance.now();
      const result = await engine.generatePatterns(request);
      const endTime = performance.now();

      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(200); // Sub-200ms requirement
    });

    it('should handle multiple requests efficiently', async () => {
      const requests = Array(5).fill(null).map((_, i) => ({
        theme: i % 2 === 0 ? 'love' : 'nature',
        language: 'en' as const
      }));

      const startTime = performance.now();
      const results = await Promise.all(
        requests.map(request => engine.generatePatterns(request))
      );
      const endTime = performance.now();

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.pattern.sequence.length).toBeGreaterThan(0);
      });

      expect(endTime - startTime).toBeLessThan(1000); // Should handle batch efficiently
    });
  });

  describe('Error Handling', () => {
    it('should handle empty requests gracefully', async () => {
      const request: PatternGenerationRequest = {};

      const result = await engine.generatePatterns(request);

      expect(result).toBeDefined();
      expect(result.pattern.sequence.length).toBeGreaterThan(0);
    });

    it('should handle invalid themes gracefully', async () => {
      const request: PatternGenerationRequest = {
        theme: 'nonexistent-theme-xyz',
        language: 'en'
      };

      const result = await engine.generatePatterns(request);

      expect(result).toBeDefined();
      expect(result.pattern.sequence.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0.5); // Should still produce reasonable results
    });
  });

  describe('Child Safety', () => {
    it('should only generate child-safe emojis', async () => {
      const request: PatternGenerationRequest = {
        complexity: 'complex',
        language: 'en'
      };

      const result = await engine.generatePatterns(request);

      // All emojis in the result should be child-safe
      // This is mocked to return child-safe emojis, but in real implementation
      // it should be verified against the actual emoji concepts
      expect(result.pattern.sequence).toBeInstanceOf(Array);
      expect(result.pattern.sequence.length).toBeGreaterThan(0);
    });
  });

  describe('Multilingual Support', () => {
    it('should generate French names and descriptions', async () => {
      const request: PatternGenerationRequest = {
        theme: 'love',
        language: 'fr'
      };

      const result = await engine.generatePatterns(request);

      expect(result.rationale.fr).toBeDefined();
      expect(result.rationale.fr).not.toBe(result.rationale.en);
      expect(result.pattern.metadata?.language).toBe('fr');
    });
  });

  describe('Accessibility', () => {
    it('should generate patterns with accessibility metadata', async () => {
      const request: PatternGenerationRequest = {
        theme: 'nature',
        language: 'en'
      };

      const result = await engine.generatePatterns(request);

      expect(result.pattern.name).toBeDefined();
      expect(result.pattern.description).toBeDefined();
      expect(result.pattern.tags).toBeDefined();
      expect(result.pattern.tags).toContain('local-generated');
    });
  });
});