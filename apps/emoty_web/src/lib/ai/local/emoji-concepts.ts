/**
 * Comprehensive Emoji Concept Database
 * Provides categorization, semantic relationships, and multilingual support
 * for offline emoji pattern generation
 */

import type { LocalizedString } from '@/types/pattern';

export interface EmojiConcept {
  emoji: string;
  categories: ConceptCategory[];
  keywords: LocalizedString;
  emotions: EmotionWeight[];
  visualHarmony: VisualHarmonyScore;
  culturalContext: CulturalContext;
  accessibilityInfo: AccessibilityInfo;
  relationships: string[]; // Related emojis
}

export interface ConceptCategory {
  primary: string;
  secondary?: string;
  weight: number; // 0-1, how strongly it belongs to this category
}

export interface EmotionWeight {
  emotion: EmotionType;
  intensity: number; // 0-1
}

export type EmotionType = 
  | 'joy' | 'love' | 'surprise' | 'sadness' | 'fear' | 'anger' | 'disgust'
  | 'excitement' | 'calm' | 'peace' | 'energy' | 'mystery' | 'wonder';

export interface VisualHarmonyScore {
  colorFamily: ColorFamily;
  brightness: number; // 0-1
  complexity: number; // 0-1
  harmonizes: string[]; // Emojis that work well together
  conflicts: string[]; // Emojis that don't work well together
}

export type ColorFamily = 
  | 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink'
  | 'black' | 'white' | 'brown' | 'multicolor' | 'neutral';

export interface CulturalContext {
  universal: boolean; // Safe for all cultures
  culturalMeanings: Record<string, string>; // Culture code -> meaning
  appropriatenessLevel: 'child-safe' | 'teen-appropriate' | 'adult-context';
}

export interface AccessibilityInfo {
  altText: LocalizedString;
  screenReaderFriendly: boolean;
  highContrast: boolean;
  motionSensitive: boolean;
}

// Comprehensive emoji concept database
export const EMOJI_CONCEPTS: Record<string, EmojiConcept> = {
  // Hearts & Love
  '❤️': {
    emoji: '❤️',
    categories: [
      { primary: 'emotion', secondary: 'love', weight: 1.0 },
      { primary: 'symbol', secondary: 'heart', weight: 0.9 }
    ],
    keywords: {
      en: 'red heart, love, romance, passion, care',
      fr: 'cœur rouge, amour, romance, passion, soin'
    },
    emotions: [
      { emotion: 'love', intensity: 1.0 },
      { emotion: 'joy', intensity: 0.8 }
    ],
    visualHarmony: {
      colorFamily: 'red',
      brightness: 0.7,
      complexity: 0.2,
      harmonizes: ['💕', '💖', '💗', '🌹', '💐', '🌺'],
      conflicts: ['💔', '🖤', '💚']
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
    relationships: ['💕', '💖', '💗', '💝', '💘', '💞']
  },

  '💕': {
    emoji: '💕',
    categories: [
      { primary: 'emotion', secondary: 'love', weight: 0.9 },
      { primary: 'symbol', secondary: 'heart', weight: 0.8 }
    ],
    keywords: {
      en: 'two hearts, love, affection, caring, gentle',
      fr: 'deux cœurs, amour, affection, soin, doux'
    },
    emotions: [
      { emotion: 'love', intensity: 0.8 },
      { emotion: 'calm', intensity: 0.6 }
    ],
    visualHarmony: {
      colorFamily: 'pink',
      brightness: 0.8,
      complexity: 0.3,
      harmonizes: ['❤️', '💖', '🌸', '🌺', '💐'],
      conflicts: ['🖤', '💔']
    },
    culturalContext: {
      universal: true,
      culturalMeanings: {},
      appropriatenessLevel: 'child-safe'
    },
    accessibilityInfo: {
      altText: { en: 'two hearts', fr: 'deux cœurs' },
      screenReaderFriendly: true,
      highContrast: false,
      motionSensitive: false
    },
    relationships: ['❤️', '💖', '💗', '💝', '💘']
  },

  // Flowers & Nature
  '🌸': {
    emoji: '🌸',
    categories: [
      { primary: 'nature', secondary: 'flower', weight: 1.0 },
      { primary: 'beauty', secondary: 'delicate', weight: 0.8 }
    ],
    keywords: {
      en: 'cherry blossom, spring, delicate, pink, beauty, nature',
      fr: 'fleur de cerisier, printemps, délicat, rose, beauté, nature'
    },
    emotions: [
      { emotion: 'peace', intensity: 0.9 },
      { emotion: 'joy', intensity: 0.6 },
      { emotion: 'calm', intensity: 0.8 }
    ],
    visualHarmony: {
      colorFamily: 'pink',
      brightness: 0.9,
      complexity: 0.4,
      harmonizes: ['🌺', '🌻', '🌷', '💕', '❤️', '🌼'],
      conflicts: ['🔥', '⚡', '🌊']
    },
    culturalContext: {
      universal: true,
      culturalMeanings: {
        'ja': 'sakura - symbol of life\'s fleeting nature',
        'ko': 'beauty and renewal'
      },
      appropriatenessLevel: 'child-safe'
    },
    accessibilityInfo: {
      altText: { en: 'cherry blossom', fr: 'fleur de cerisier' },
      screenReaderFriendly: true,
      highContrast: false,
      motionSensitive: false
    },
    relationships: ['🌺', '🌻', '🌷', '🌹', '💐', '🌼']
  },

  // Ocean & Water
  '🌊': {
    emoji: '🌊',
    categories: [
      { primary: 'nature', secondary: 'water', weight: 1.0 },
      { primary: 'movement', secondary: 'dynamic', weight: 0.7 }
    ],
    keywords: {
      en: 'ocean wave, water, sea, movement, power, blue',
      fr: 'vague océan, eau, mer, mouvement, puissance, bleu'
    },
    emotions: [
      { emotion: 'energy', intensity: 0.8 },
      { emotion: 'calm', intensity: 0.6 },
      { emotion: 'mystery', intensity: 0.5 }
    ],
    visualHarmony: {
      colorFamily: 'blue',
      brightness: 0.6,
      complexity: 0.6,
      harmonizes: ['💙', '🐋', '🐟', '🐠', '💎', '❄️'],
      conflicts: ['🔥', '🌋', '☀️']
    },
    culturalContext: {
      universal: true,
      culturalMeanings: {},
      appropriatenessLevel: 'child-safe'
    },
    accessibilityInfo: {
      altText: { en: 'water wave', fr: 'vague d\'eau' },
      screenReaderFriendly: true,
      highContrast: true,
      motionSensitive: true // Contains implied motion
    },
    relationships: ['💙', '🌀', '🐋', '🐟', '🐠', '💧']
  },

  // Animals
  '🐶': {
    emoji: '🐶',
    categories: [
      { primary: 'animal', secondary: 'pet', weight: 1.0 },
      { primary: 'emotion', secondary: 'friendly', weight: 0.8 }
    ],
    keywords: {
      en: 'dog face, puppy, pet, loyal, friendly, cute',
      fr: 'visage de chien, chiot, animal domestique, loyal, amical, mignon'
    },
    emotions: [
      { emotion: 'joy', intensity: 0.9 },
      { emotion: 'love', intensity: 0.7 },
      { emotion: 'excitement', intensity: 0.8 }
    ],
    visualHarmony: {
      colorFamily: 'brown',
      brightness: 0.7,
      complexity: 0.5,
      harmonizes: ['🐱', '🐹', '🐰', '❤️', '💕', '🌟'],
      conflicts: ['😾', '💔']
    },
    culturalContext: {
      universal: true,
      culturalMeanings: {
        'zh': 'loyalty and protection',
        'jp': 'faithfulness'
      },
      appropriatenessLevel: 'child-safe'
    },
    accessibilityInfo: {
      altText: { en: 'dog face', fr: 'visage de chien' },
      screenReaderFriendly: true,
      highContrast: true,
      motionSensitive: false
    },
    relationships: ['🐕', '🐱', '🐹', '🐰', '🐻']
  },

  // Food
  '🍕': {
    emoji: '🍕',
    categories: [
      { primary: 'food', secondary: 'meal', weight: 1.0 },
      { primary: 'fun', secondary: 'casual', weight: 0.6 }
    ],
    keywords: {
      en: 'pizza, food, cheese, Italian, delicious, sharing',
      fr: 'pizza, nourriture, fromage, italien, délicieux, partage'
    },
    emotions: [
      { emotion: 'joy', intensity: 0.8 },
      { emotion: 'excitement', intensity: 0.7 }
    ],
    visualHarmony: {
      colorFamily: 'multicolor',
      brightness: 0.7,
      complexity: 0.7,
      harmonizes: ['🍔', '🌮', '🍰', '🎉', '😋'],
      conflicts: ['🤢', '💔', '😷']
    },
    culturalContext: {
      universal: true,
      culturalMeanings: {},
      appropriatenessLevel: 'child-safe'
    },
    accessibilityInfo: {
      altText: { en: 'slice of pizza', fr: 'part de pizza' },
      screenReaderFriendly: true,
      highContrast: true,
      motionSensitive: false
    },
    relationships: ['🍔', '🌮', '🍝', '🧀', '🍅']
  },

  // Technology
  '🚀': {
    emoji: '🚀',
    categories: [
      { primary: 'technology', secondary: 'space', weight: 1.0 },
      { primary: 'movement', secondary: 'fast', weight: 0.8 },
      { primary: 'achievement', secondary: 'progress', weight: 0.7 }
    ],
    keywords: {
      en: 'rocket, space, launch, fast, progress, achievement, technology',
      fr: 'fusée, espace, lancement, rapide, progrès, réussite, technologie'
    },
    emotions: [
      { emotion: 'excitement', intensity: 0.9 },
      { emotion: 'wonder', intensity: 0.8 },
      { emotion: 'energy', intensity: 0.9 }
    ],
    visualHarmony: {
      colorFamily: 'multicolor',
      brightness: 0.6,
      complexity: 0.8,
      harmonizes: ['⭐', '🌟', '✨', '🔥', '⚡'],
      conflicts: ['🐌', '😴', '🛑']
    },
    culturalContext: {
      universal: true,
      culturalMeanings: {},
      appropriatenessLevel: 'child-safe'
    },
    accessibilityInfo: {
      altText: { en: 'rocket', fr: 'fusée' },
      screenReaderFriendly: true,
      highContrast: true,
      motionSensitive: true
    },
    relationships: ['🛸', '🌌', '⭐', '🌟', '🔬']
  },

  // Weather & Sky
  '☀️': {
    emoji: '☀️',
    categories: [
      { primary: 'weather', secondary: 'sunny', weight: 1.0 },
      { primary: 'emotion', secondary: 'positive', weight: 0.8 }
    ],
    keywords: {
      en: 'sun, sunny, bright, warm, day, energy, positive',
      fr: 'soleil, ensoleillé, brillant, chaud, jour, énergie, positif'
    },
    emotions: [
      { emotion: 'joy', intensity: 0.9 },
      { emotion: 'energy', intensity: 0.8 },
      { emotion: 'excitement', intensity: 0.6 }
    ],
    visualHarmony: {
      colorFamily: 'yellow',
      brightness: 1.0,
      complexity: 0.3,
      harmonizes: ['🌻', '⭐', '🌟', '✨', '💛'],
      conflicts: ['🌙', '🌧️', '❄️', '🌊']
    },
    culturalContext: {
      universal: true,
      culturalMeanings: {},
      appropriatenessLevel: 'child-safe'
    },
    accessibilityInfo: {
      altText: { en: 'sun', fr: 'soleil' },
      screenReaderFriendly: true,
      highContrast: true,
      motionSensitive: false
    },
    relationships: ['🌞', '🌅', '🌄', '🌻', '💛']
  },

  // More comprehensive entries would continue here...
  // For brevity, including representative samples from each major category
};

/**
 * Semantic relationship engine for finding related emojis
 */
export class EmojiRelationshipEngine {
  private conceptMap: Map<string, EmojiConcept>;

  constructor() {
    this.conceptMap = new Map(Object.entries(EMOJI_CONCEPTS));
  }

  /**
   * Find emojis that harmonize visually with the given emoji
   */
  findVisualHarmonies(emoji: string): string[] {
    const concept = this.conceptMap.get(emoji);
    return concept?.visualHarmony.harmonizes || [];
  }

  /**
   * Find emojis that share emotional context
   */
  findEmotionalMatches(emoji: string, targetEmotion?: EmotionType): string[] {
    const concept = this.conceptMap.get(emoji);
    if (!concept) return [];

    const matches: string[] = [];
    
    for (const [otherEmoji, otherConcept] of this.conceptMap) {
      if (otherEmoji === emoji) continue;
      
      const sharedEmotions = concept.emotions.filter(emotion => 
        otherConcept.emotions.some(otherEmotion => 
          otherEmotion.emotion === emotion.emotion &&
          (!targetEmotion || emotion.emotion === targetEmotion)
        )
      );
      
      if (sharedEmotions.length > 0) {
        matches.push(otherEmoji);
      }
    }
    
    return matches;
  }

  /**
   * Find emojis in the same category
   */
  findCategoryMatches(emoji: string, primaryCategory?: string): string[] {
    const concept = this.conceptMap.get(emoji);
    if (!concept) return [];

    const matches: string[] = [];
    
    for (const [otherEmoji, otherConcept] of this.conceptMap) {
      if (otherEmoji === emoji) continue;
      
      const categoryMatch = concept.categories.some(category =>
        otherConcept.categories.some(otherCategory =>
          otherCategory.primary === category.primary &&
          (!primaryCategory || category.primary === primaryCategory)
        )
      );
      
      if (categoryMatch) {
        matches.push(otherEmoji);
      }
    }
    
    return matches;
  }

  /**
   * Get child-safe emojis only
   */
  getChildSafeEmojis(): string[] {
    return Array.from(this.conceptMap.entries())
      .filter(([, concept]) => concept.culturalContext.appropriatenessLevel === 'child-safe')
      .map(([emoji]) => emoji);
  }

  /**
   * Find emojis by color family
   */
  findByColorFamily(colorFamily: ColorFamily): string[] {
    return Array.from(this.conceptMap.entries())
      .filter(([, concept]) => concept.visualHarmony.colorFamily === colorFamily)
      .map(([emoji]) => emoji);
  }

  /**
   * Calculate compatibility score between two emojis
   */
  calculateCompatibility(emoji1: string, emoji2: string): number {
    const concept1 = this.conceptMap.get(emoji1);
    const concept2 = this.conceptMap.get(emoji2);
    
    if (!concept1 || !concept2) return 0;

    let score = 0;
    
    // Visual harmony check
    if (concept1.visualHarmony.harmonizes.includes(emoji2)) score += 0.4;
    if (concept1.visualHarmony.conflicts.includes(emoji2)) score -= 0.3;
    
    // Emotional compatibility
    const sharedEmotions = concept1.emotions.filter(emotion =>
      concept2.emotions.some(otherEmotion => otherEmotion.emotion === emotion.emotion)
    );
    score += sharedEmotions.length * 0.2;
    
    // Category compatibility
    const sharedCategories = concept1.categories.filter(category =>
      concept2.categories.some(otherCategory => otherCategory.primary === category.primary)
    );
    score += sharedCategories.length * 0.15;
    
    // Brightness compatibility (avoid too much contrast unless intentional)
    const brightnessDiff = Math.abs(
      concept1.visualHarmony.brightness - concept2.visualHarmony.brightness
    );
    if (brightnessDiff > 0.7) score -= 0.1;
    
    return Math.max(0, Math.min(1, score));
  }
}

export const emojiRelationshipEngine = new EmojiRelationshipEngine();