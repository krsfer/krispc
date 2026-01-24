/**
 * Translation loader and manager
 */
import type { SupportedLanguage, TranslationNamespace } from '@/types/i18n';

// Import base translations
import { en } from './en';
import { fr } from './fr';
import { es } from './es';

// Translation cache to avoid repeated loading
const translationCache = new Map<SupportedLanguage, TranslationNamespace>();

// Base translations that are always available
const BASE_TRANSLATIONS: Record<SupportedLanguage, TranslationNamespace | null> = {
  en,
  fr,
  es,
  de: null, // Will be loaded dynamically
  it: null,
  pt: null,
  ja: null,
  ko: null,
  zh: null,
  ar: null,
  he: null,
  hi: null,
  ru: null
};

/**
 * Load translations for a specific language
 */
export async function loadTranslations(language: SupportedLanguage): Promise<TranslationNamespace> {
  // Check cache first
  if (translationCache.has(language)) {
    return translationCache.get(language)!;
  }

  // Check if we have base translations
  const baseTranslation = BASE_TRANSLATIONS[language];
  if (baseTranslation) {
    translationCache.set(language, baseTranslation);
    return baseTranslation;
  }

  // For languages not yet implemented, create partial translations
  // This allows the app to work while translations are being developed
  try {
    const partialTranslations = await createPartialTranslations(language);
    translationCache.set(language, partialTranslations);
    return partialTranslations;
  } catch (error) {
    console.warn(`Failed to create translations for ${language}, falling back to English`);
    
    // Ultimate fallback to English
    if (language !== 'en') {
      return loadTranslations('en');
    }
    
    throw new Error(`Failed to load translations for ${language}`);
  }
}

/**
 * Create partial translations by mixing available translations with English fallback
 */
async function createPartialTranslations(language: SupportedLanguage): Promise<TranslationNamespace> {
  const englishTranslations = await loadTranslations('en');
  
  // For now, we'll use English as fallback
  // In a real app, you might load partial translations from a file or API
  const partialTranslations: TranslationNamespace = {
    ...englishTranslations,
    // Add any language-specific overrides here
  };

  // Apply language-specific modifications based on the language
  return applyLanguageSpecificModifications(partialTranslations, language);
}

/**
 * Apply language-specific modifications to translations
 */
function applyLanguageSpecificModifications(
  translations: TranslationNamespace, 
  language: SupportedLanguage
): TranslationNamespace {
  const modified = { ...translations };

  // Language-specific date/time format preferences
  switch (language) {
    case 'de':
      // German preferences
      break;
    case 'it':
      // Italian preferences
      break;
    case 'pt':
      // Portuguese preferences
      break;
    case 'ja':
      // Japanese preferences - different structure for UI elements
      break;
    case 'ko':
      // Korean preferences
      break;
    case 'zh':
      // Chinese preferences
      break;
    case 'ar':
      // Arabic preferences - RTL considerations
      break;
    case 'he':
      // Hebrew preferences - RTL considerations
      break;
    case 'hi':
      // Hindi preferences
      break;
    case 'ru':
      // Russian preferences - complex plural rules
      break;
  }

  return modified;
}

/**
 * Preload translations for multiple languages
 */
export async function preloadTranslations(languages: SupportedLanguage[]): Promise<void> {
  const promises = languages.map(lang => 
    loadTranslations(lang).catch(error => {
      console.warn(`Failed to preload translations for ${lang}:`, error);
    })
  );
  
  await Promise.allSettled(promises);
}

/**
 * Check if translations are available for a language
 */
export function isLanguageSupported(language: SupportedLanguage): boolean {
  return language in BASE_TRANSLATIONS;
}

/**
 * Get available languages with translation status
 */
export function getLanguageAvailability(): Record<SupportedLanguage, 'complete' | 'partial' | 'unavailable'> {
  return {
    en: 'complete',
    fr: 'complete',
    es: 'complete',
    de: 'partial',
    it: 'partial',
    pt: 'partial',
    ja: 'partial',
    ko: 'partial',
    zh: 'partial',
    ar: 'partial',
    he: 'partial',
    hi: 'partial',
    ru: 'partial'
  };
}

/**
 * Clear translation cache (useful for testing or hot reloading)
 */
export function clearTranslationCache(): void {
  translationCache.clear();
}

/**
 * Validate translation completeness
 */
export function validateTranslations(translations: TranslationNamespace): {
  isComplete: boolean;
  missingKeys: string[];
  warnings: string[];
} {
  const missingKeys: string[] = [];
  const warnings: string[] = [];
  
  // Check for required keys
  const requiredKeys = [
    'common.loading',
    'common.save',
    'common.cancel',
    'navigation.home',
    'patterns.createPattern',
    'errors.error'
  ];
  
  for (const keyPath of requiredKeys) {
    const keys = keyPath.split('.');
    let value: any = translations;
    
    for (const key of keys) {
      value = value?.[key];
      if (value === undefined) {
        missingKeys.push(keyPath);
        break;
      }
    }
  }
  
  // Check for potential issues
  if (typeof translations.validation?.fieldRequired !== 'function') {
    warnings.push('validation.fieldRequired should be a function');
  }
  
  return {
    isComplete: missingKeys.length === 0,
    missingKeys,
    warnings
  };
}

/**
 * Get translation statistics
 */
export function getTranslationStats(translations: TranslationNamespace): {
  totalKeys: number;
  translatedKeys: number;
  completionPercentage: number;
} {
  let totalKeys = 0;
  let translatedKeys = 0;
  
  function countKeys(obj: any, path = ''): void {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        countKeys(value, currentPath);
      } else {
        totalKeys++;
        if (value !== null && value !== undefined && value !== '') {
          translatedKeys++;
        }
      }
    }
  }
  
  countKeys(translations);
  
  return {
    totalKeys,
    translatedKeys,
    completionPercentage: totalKeys > 0 ? (translatedKeys / totalKeys) * 100 : 0
  };
}