/**
 * Cultural adaptation system for emoji patterns and UI elements
 */
import type { SupportedLanguage, CulturalAdaptation } from '@/types/i18n';

// Cultural mappings for different regions and languages
export const CULTURAL_ADAPTATIONS: Record<SupportedLanguage, CulturalAdaptation> = {
  en: {
    emojiMapping: {
      // Base mapping - no changes needed
    },
    colorPreferences: {
      primary: ['#3B82F6', '#1D4ED8', '#2563EB'],
      success: ['#10B981', '#059669', '#047857'],
      warning: ['#F59E0B', '#D97706', '#B45309'],
      error: ['#EF4444', '#DC2626', '#B91C1C']
    },
    patternStyles: {
      borderRadius: '0.5rem',
      spacing: '1rem',
      shadowIntensity: 'medium'
    },
    dateFormats: {
      short: 'MM/dd/yyyy',
      long: 'MMMM dd, yyyy',
      time: 'h:mm a'
    },
    numberFormats: {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    },
    currencyFormats: {
      style: 'currency',
      currency: 'USD'
    },
    textDirections: {
      main: 'ltr'
    },
    fontPreferences: [
      'system-ui',
      '-apple-system',
      'BlinkMacSystemFont',
      'Segoe UI',
      'Roboto',
      'sans-serif'
    ]
  },

  fr: {
    emojiMapping: {
      // French cultural preferences
      '🍟': '🥖', // Replace fries with baguette for French context
      '🏈': '⚽', // American football to soccer
    },
    colorPreferences: {
      primary: ['#2563EB', '#1D4ED8', '#1E40AF'],
      success: ['#059669', '#047857', '#065F46'],
      warning: ['#D97706', '#B45309', '#92400E'],
      error: ['#DC2626', '#B91C1C', '#991B1B']
    },
    patternStyles: {
      borderRadius: '0.375rem',
      spacing: '1rem',
      shadowIntensity: 'medium'
    },
    dateFormats: {
      short: 'dd/MM/yyyy',
      long: 'dd MMMM yyyy',
      time: 'HH:mm'
    },
    numberFormats: {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    },
    currencyFormats: {
      style: 'currency',
      currency: 'EUR'
    },
    textDirections: {
      main: 'ltr'
    },
    fontPreferences: [
      'system-ui',
      '-apple-system',
      'Segoe UI',
      'Roboto',
      'sans-serif'
    ]
  },

  es: {
    emojiMapping: {
      '🍟': '🌮', // Fries to tacos
      '🏈': '⚽', // American football to soccer
      '🥶': '🌶️', // Cold to spicy (cultural preference)
    },
    colorPreferences: {
      primary: ['#DC2626', '#B91C1C', '#991B1B'],
      success: ['#059669', '#047857', '#065F46'],
      warning: ['#F59E0B', '#D97706', '#B45309'],
      error: ['#EF4444', '#DC2626', '#B91C1C']
    },
    patternStyles: {
      borderRadius: '0.5rem',
      spacing: '1rem',
      shadowIntensity: 'high'
    },
    dateFormats: {
      short: 'dd/MM/yyyy',
      long: 'dd de MMMM de yyyy',
      time: 'HH:mm'
    },
    numberFormats: {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    },
    currencyFormats: {
      style: 'currency',
      currency: 'EUR'
    },
    textDirections: {
      main: 'ltr'
    },
    fontPreferences: [
      'system-ui',
      '-apple-system',
      'Segoe UI',
      'Roboto',
      'sans-serif'
    ]
  },

  de: {
    emojiMapping: {
      '🍟': '🥨', // Fries to pretzel
      '🏈': '⚽', // American football to soccer
    },
    colorPreferences: {
      primary: ['#1F2937', '#374151', '#4B5563'],
      success: ['#059669', '#047857', '#065F46'],
      warning: ['#F59E0B', '#D97706', '#B45309'],
      error: ['#DC2626', '#B91C1C', '#991B1B']
    },
    patternStyles: {
      borderRadius: '0.25rem',
      spacing: '0.75rem',
      shadowIntensity: 'low'
    },
    dateFormats: {
      short: 'dd.MM.yyyy',
      long: 'dd. MMMM yyyy',
      time: 'HH:mm'
    },
    numberFormats: {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    },
    currencyFormats: {
      style: 'currency',
      currency: 'EUR'
    },
    textDirections: {
      main: 'ltr'
    },
    fontPreferences: [
      'system-ui',
      '-apple-system',
      'Segoe UI',
      'Roboto',
      'sans-serif'
    ]
  },

  it: {
    emojiMapping: {
      '🍟': '🍝', // Fries to pasta
      '🏈': '⚽', // American football to soccer
    },
    colorPreferences: {
      primary: ['#059669', '#047857', '#065F46'],
      success: ['#10B981', '#059669', '#047857'],
      warning: ['#F59E0B', '#D97706', '#B45309'],
      error: ['#DC2626', '#B91C1C', '#991B1B']
    },
    patternStyles: {
      borderRadius: '0.75rem',
      spacing: '1.25rem',
      shadowIntensity: 'medium'
    },
    dateFormats: {
      short: 'dd/MM/yyyy',
      long: 'dd MMMM yyyy',
      time: 'HH:mm'
    },
    numberFormats: {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    },
    currencyFormats: {
      style: 'currency',
      currency: 'EUR'
    },
    textDirections: {
      main: 'ltr'
    },
    fontPreferences: [
      'system-ui',
      '-apple-system',
      'Segoe UI',
      'Roboto',
      'sans-serif'
    ]
  },

  pt: {
    emojiMapping: {
      '🍟': '🧀', // Fries to cheese
      '🏈': '⚽', // American football to soccer
    },
    colorPreferences: {
      primary: ['#059669', '#047857', '#065F46'],
      success: ['#10B981', '#059669', '#047857'],
      warning: ['#F59E0B', '#D97706', '#B45309'],
      error: ['#DC2626', '#B91C1C', '#991B1B']
    },
    patternStyles: {
      borderRadius: '0.5rem',
      spacing: '1rem',
      shadowIntensity: 'medium'
    },
    dateFormats: {
      short: 'dd/MM/yyyy',
      long: 'dd de MMMM de yyyy',
      time: 'HH:mm'
    },
    numberFormats: {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    },
    currencyFormats: {
      style: 'currency',
      currency: 'EUR'
    },
    textDirections: {
      main: 'ltr'
    },
    fontPreferences: [
      'system-ui',
      '-apple-system',
      'Segoe UI',
      'Roboto',
      'sans-serif'
    ]
  },

  ja: {
    emojiMapping: {
      '🍟': '🍱', // Fries to bento
      '🏈': '⚾', // American football to baseball
      '🥪': '🍙', // Sandwich to onigiri
      '🍞': '🍚', // Bread to rice
    },
    colorPreferences: {
      primary: ['#DC2626', '#B91C1C', '#991B1B'],
      success: ['#059669', '#047857', '#065F46'],
      warning: ['#F59E0B', '#D97706', '#B45309'],
      error: ['#EF4444', '#DC2626', '#B91C1C']
    },
    patternStyles: {
      borderRadius: '0.125rem',
      spacing: '0.5rem',
      shadowIntensity: 'low'
    },
    dateFormats: {
      short: 'yyyy/MM/dd',
      long: 'yyyy年MM月dd日',
      time: 'HH:mm'
    },
    numberFormats: {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    },
    currencyFormats: {
      style: 'currency',
      currency: 'JPY'
    },
    textDirections: {
      main: 'ltr'
    },
    fontPreferences: [
      'Noto Sans JP',
      'Hiragino Kaku Gothic ProN',
      'Yu Gothic',
      'Meiryo',
      'sans-serif'
    ]
  },

  ko: {
    emojiMapping: {
      '🍟': '🍜', // Fries to noodles
      '🏈': '⚾', // American football to baseball
      '🥪': '🍙', // Sandwich to rice ball
    },
    colorPreferences: {
      primary: ['#DC2626', '#B91C1C', '#991B1B'],
      success: ['#059669', '#047857', '#065F46'],
      warning: ['#F59E0B', '#D97706', '#B45309'],
      error: ['#EF4444', '#DC2626', '#B91C1C']
    },
    patternStyles: {
      borderRadius: '0.25rem',
      spacing: '0.75rem',
      shadowIntensity: 'medium'
    },
    dateFormats: {
      short: 'yyyy.MM.dd',
      long: 'yyyy년 MM월 dd일',
      time: 'HH:mm'
    },
    numberFormats: {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    },
    currencyFormats: {
      style: 'currency',
      currency: 'KRW'
    },
    textDirections: {
      main: 'ltr'
    },
    fontPreferences: [
      'Noto Sans KR',
      'Malgun Gothic',
      'Apple SD Gothic Neo',
      'sans-serif'
    ]
  },

  zh: {
    emojiMapping: {
      '🍟': '🥟', // Fries to dumpling
      '🏈': '🏓', // American football to ping pong
      '🥪': '🥢', // Sandwich to chopsticks
    },
    colorPreferences: {
      primary: ['#DC2626', '#B91C1C', '#991B1B'],
      success: ['#059669', '#047857', '#065F46'],
      warning: ['#F59E0B', '#D97706', '#B45309'],
      error: ['#EF4444', '#DC2626', '#B91C1C']
    },
    patternStyles: {
      borderRadius: '0.375rem',
      spacing: '0.75rem',
      shadowIntensity: 'medium'
    },
    dateFormats: {
      short: 'yyyy/MM/dd',
      long: 'yyyy年MM月dd日',
      time: 'HH:mm'
    },
    numberFormats: {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    },
    currencyFormats: {
      style: 'currency',
      currency: 'CNY'
    },
    textDirections: {
      main: 'ltr'
    },
    fontPreferences: [
      'Noto Sans SC',
      'PingFang SC',
      'Hiragino Sans GB',
      'Microsoft YaHei',
      'sans-serif'
    ]
  },

  ar: {
    emojiMapping: {
      '🍟': '🫓', // Fries to flatbread
      '🏈': '⚽', // American football to soccer
      '🥪': '🌯', // Sandwich to wrap
      '🍞': '🫓', // Bread to flatbread
      '👋': '🤚', // Wave to raised hand (cultural greeting)
    },
    colorPreferences: {
      primary: ['#059669', '#047857', '#065F46'],
      success: ['#10B981', '#059669', '#047857'],
      warning: ['#F59E0B', '#D97706', '#B45309'],
      error: ['#DC2626', '#B91C1C', '#991B1B']
    },
    patternStyles: {
      borderRadius: '0.5rem',
      spacing: '1.25rem',
      shadowIntensity: 'high'
    },
    dateFormats: {
      short: 'dd/MM/yyyy',
      long: 'dd MMMM yyyy',
      time: 'HH:mm'
    },
    numberFormats: {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    },
    currencyFormats: {
      style: 'currency',
      currency: 'SAR'
    },
    textDirections: {
      main: 'rtl'
    },
    fontPreferences: [
      'Noto Sans Arabic',
      'Arial Unicode MS',
      'Tahoma',
      'sans-serif'
    ]
  },

  he: {
    emojiMapping: {
      '🍟': '🧆', // Fries to falafel
      '🏈': '⚽', // American football to soccer
      '🥪': '🧆', // Sandwich to falafel
      '👋': '🤚', // Wave to raised hand
    },
    colorPreferences: {
      primary: ['#2563EB', '#1D4ED8', '#1E40AF'],
      success: ['#059669', '#047857', '#065F46'],
      warning: ['#F59E0B', '#D97706', '#B45309'],
      error: ['#DC2626', '#B91C1C', '#991B1B']
    },
    patternStyles: {
      borderRadius: '0.5rem',
      spacing: '1rem',
      shadowIntensity: 'medium'
    },
    dateFormats: {
      short: 'dd/MM/yyyy',
      long: 'dd MMMM yyyy',
      time: 'HH:mm'
    },
    numberFormats: {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    },
    currencyFormats: {
      style: 'currency',
      currency: 'ILS'
    },
    textDirections: {
      main: 'rtl'
    },
    fontPreferences: [
      'Noto Sans Hebrew',
      'Arial Unicode MS',
      'Tahoma',
      'sans-serif'
    ]
  },

  hi: {
    emojiMapping: {
      '🍟': '🍛', // Fries to curry rice
      '🏈': '🏏', // American football to cricket
      '🥪': '🫓', // Sandwich to flatbread
      '🍞': '🫓', // Bread to flatbread
    },
    colorPreferences: {
      primary: ['#F59E0B', '#D97706', '#B45309'],
      success: ['#059669', '#047857', '#065F46'],
      warning: ['#EF4444', '#DC2626', '#B91C1C'],
      error: ['#DC2626', '#B91C1C', '#991B1B']
    },
    patternStyles: {
      borderRadius: '0.75rem',
      spacing: '1.25rem',
      shadowIntensity: 'high'
    },
    dateFormats: {
      short: 'dd/MM/yyyy',
      long: 'dd MMMM yyyy',
      time: 'HH:mm'
    },
    numberFormats: {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    },
    currencyFormats: {
      style: 'currency',
      currency: 'INR'
    },
    textDirections: {
      main: 'ltr'
    },
    fontPreferences: [
      'Noto Sans Devanagari',
      'Arial Unicode MS',
      'sans-serif'
    ]
  },

  ru: {
    emojiMapping: {
      '🍟': '🥟', // Fries to dumpling
      '🏈': '🏒', // American football to hockey
      '🥪': '🥙', // Sandwich to stuffed flatbread
    },
    colorPreferences: {
      primary: ['#DC2626', '#B91C1C', '#991B1B'],
      success: ['#059669', '#047857', '#065F46'],
      warning: ['#F59E0B', '#D97706', '#B45309'],
      error: ['#EF4444', '#DC2626', '#B91C1C']
    },
    patternStyles: {
      borderRadius: '0.25rem',
      spacing: '0.75rem',
      shadowIntensity: 'low'
    },
    dateFormats: {
      short: 'dd.MM.yyyy',
      long: 'dd MMMM yyyy г.',
      time: 'HH:mm'
    },
    numberFormats: {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    },
    currencyFormats: {
      style: 'currency',
      currency: 'RUB'
    },
    textDirections: {
      main: 'ltr'
    },
    fontPreferences: [
      'system-ui',
      '-apple-system',
      'Segoe UI',
      'Roboto',
      'sans-serif'
    ]
  }
};

/**
 * Get cultural adaptation for a specific language
 */
export function getCulturalAdaptation(language: SupportedLanguage): CulturalAdaptation {
  return CULTURAL_ADAPTATIONS[language] || CULTURAL_ADAPTATIONS.en;
}

/**
 * Adapt emoji based on cultural preferences
 */
export function adaptEmoji(emoji: string, language: SupportedLanguage): string {
  const adaptation = getCulturalAdaptation(language);
  return adaptation.emojiMapping[emoji] || emoji;
}

/**
 * Adapt a sequence of emojis for cultural preferences
 */
export function adaptEmojiSequence(emojis: string[], language: SupportedLanguage): string[] {
  const adaptation = getCulturalAdaptation(language);
  return emojis.map(emoji => adaptation.emojiMapping[emoji] || emoji);
}

/**
 * Get color preferences for a language
 */
export function getColorPreferences(language: SupportedLanguage): Record<string, string[]> {
  const adaptation = getCulturalAdaptation(language);
  return adaptation.colorPreferences;
}

/**
 * Get pattern style preferences for a language
 */
export function getPatternStylePreferences(language: SupportedLanguage): Record<string, any> {
  const adaptation = getCulturalAdaptation(language);
  return adaptation.patternStyles;
}

/**
 * Get font preferences for a language
 */
export function getFontPreferences(language: SupportedLanguage): string[] {
  const adaptation = getCulturalAdaptation(language);
  return adaptation.fontPreferences;
}

/**
 * Apply cultural adaptations to CSS custom properties
 */
export function applyCulturalStyles(language: SupportedLanguage): void {
  if (typeof document === 'undefined') return;

  const adaptation = getCulturalAdaptation(language);
  const root = document.documentElement;

  // Apply color preferences
  Object.entries(adaptation.colorPreferences).forEach(([key, colors]) => {
    colors.forEach((color, index) => {
      root.style.setProperty(`--color-${key}-${index + 1}`, color);
    });
  });

  // Apply pattern styles
  Object.entries(adaptation.patternStyles).forEach(([key, value]) => {
    root.style.setProperty(`--pattern-${key}`, value);
  });

  // Apply font preferences
  root.style.setProperty('--font-family', adaptation.fontPreferences.join(', '));

  // Apply text direction
  root.style.setProperty('--text-direction', adaptation.textDirections.main);
}

/**
 * Check if cultural adaptation is available for language
 */
export function isCulturalAdaptationAvailable(language: SupportedLanguage): boolean {
  return language in CULTURAL_ADAPTATIONS;
}

/**
 * Get cultural adaptation statistics
 */
export function getCulturalAdaptationStats(language: SupportedLanguage): {
  hasEmojiMappings: boolean;
  emojiMappingCount: number;
  hasColorPreferences: boolean;
  hasPatternStyles: boolean;
  hasFontPreferences: boolean;
  isRTL: boolean;
} {
  const adaptation = getCulturalAdaptation(language);
  
  return {
    hasEmojiMappings: Object.keys(adaptation.emojiMapping).length > 0,
    emojiMappingCount: Object.keys(adaptation.emojiMapping).length,
    hasColorPreferences: Object.keys(adaptation.colorPreferences).length > 0,
    hasPatternStyles: Object.keys(adaptation.patternStyles).length > 0,
    hasFontPreferences: adaptation.fontPreferences.length > 0,
    isRTL: adaptation.textDirections.main === 'rtl'
  };
}