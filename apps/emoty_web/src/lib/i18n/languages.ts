/**
 * Language definitions and metadata
 */
import type { LanguageInfo, SupportedLanguage } from '@/types/i18n';

export const SUPPORTED_LANGUAGES: Record<SupportedLanguage, LanguageInfo> = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    direction: 'ltr',
    region: 'US',
    flag: '🇺🇸',
    dateFormat: 'MM/dd/yyyy',
    numberFormat: { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 2 },
    pluralRules: (count: number) => {
      if (count === 1) return 'one';
      return 'other';
    }
  },
  fr: {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    direction: 'ltr',
    region: 'FR',
    flag: '🇫🇷',
    dateFormat: 'dd/MM/yyyy',
    numberFormat: { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 2 },
    pluralRules: (count: number) => {
      if (count === 0 || count === 1) return 'one';
      return 'other';
    }
  },
  es: {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    direction: 'ltr',
    region: 'ES',
    flag: '🇪🇸',
    dateFormat: 'dd/MM/yyyy',
    numberFormat: { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 2 },
    pluralRules: (count: number) => {
      if (count === 1) return 'one';
      return 'other';
    }
  },
  de: {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    direction: 'ltr',
    region: 'DE',
    flag: '🇩🇪',
    dateFormat: 'dd.MM.yyyy',
    numberFormat: { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 2 },
    pluralRules: (count: number) => {
      if (count === 1) return 'one';
      return 'other';
    }
  },
  it: {
    code: 'it',
    name: 'Italian',
    nativeName: 'Italiano',
    direction: 'ltr',
    region: 'IT',
    flag: '🇮🇹',
    dateFormat: 'dd/MM/yyyy',
    numberFormat: { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 2 },
    pluralRules: (count: number) => {
      if (count === 1) return 'one';
      return 'other';
    }
  },
  pt: {
    code: 'pt',
    name: 'Portuguese',
    nativeName: 'Português',
    direction: 'ltr',
    region: 'PT',
    flag: '🇵🇹',
    dateFormat: 'dd/MM/yyyy',
    numberFormat: { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 2 },
    pluralRules: (count: number) => {
      if (count === 1) return 'one';
      return 'other';
    }
  },
  ja: {
    code: 'ja',
    name: 'Japanese',
    nativeName: '日本語',
    direction: 'ltr',
    region: 'JP',
    flag: '🇯🇵',
    dateFormat: 'yyyy/MM/dd',
    numberFormat: { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 2 },
    pluralRules: (count: number) => 'other'
  },
  ko: {
    code: 'ko',
    name: 'Korean',
    nativeName: '한국어',
    direction: 'ltr',
    region: 'KR',
    flag: '🇰🇷',
    dateFormat: 'yyyy.MM.dd',
    numberFormat: { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 2 },
    pluralRules: (count: number) => 'other'
  },
  zh: {
    code: 'zh',
    name: 'Chinese',
    nativeName: '中文',
    direction: 'ltr',
    region: 'CN',
    flag: '🇨🇳',
    dateFormat: 'yyyy年MM月dd日',
    numberFormat: { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 2 },
    pluralRules: (count: number) => 'other'
  },
  ar: {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    direction: 'rtl',
    region: 'SA',
    flag: '🇸🇦',
    dateFormat: 'dd/MM/yyyy',
    numberFormat: { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 2 },
    pluralRules: (count: number) => {
      if (count === 0) return 'zero';
      if (count === 1) return 'one';
      if (count === 2) return 'two';
      if (count >= 3 && count <= 10) return 'few';
      if (count >= 11 && count <= 99) return 'many';
      return 'other';
    }
  },
  he: {
    code: 'he',
    name: 'Hebrew',
    nativeName: 'עברית',
    direction: 'rtl',
    region: 'IL',
    flag: '🇮🇱',
    dateFormat: 'dd/MM/yyyy',
    numberFormat: { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 2 },
    pluralRules: (count: number) => {
      if (count === 1) return 'one';
      if (count === 2) return 'two';
      if (count >= 3 && count <= 10) return 'few';
      return 'other';
    }
  },
  hi: {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    direction: 'ltr',
    region: 'IN',
    flag: '🇮🇳',
    dateFormat: 'dd/MM/yyyy',
    numberFormat: { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 2 },
    pluralRules: (count: number) => {
      if (count === 0 || count === 1) return 'one';
      return 'other';
    }
  },
  ru: {
    code: 'ru',
    name: 'Russian',
    nativeName: 'Русский',
    direction: 'ltr',
    region: 'RU',
    flag: '🇷🇺',
    dateFormat: 'dd.MM.yyyy',
    numberFormat: { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 2 },
    pluralRules: (count: number) => {
      const lastDigit = count % 10;
      const lastTwoDigits = count % 100;
      
      if (lastDigit === 1 && lastTwoDigits !== 11) return 'one';
      if (lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 12 || lastTwoDigits > 14)) return 'few';
      return 'many';
    }
  }
};

export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

export const RTL_LANGUAGES: SupportedLanguage[] = ['ar', 'he'];

export const LANGUAGE_PRIORITIES: Record<string, SupportedLanguage[]> = {
  'US': ['en', 'es', 'fr'],
  'CA': ['en', 'fr', 'es'],
  'GB': ['en', 'fr', 'de'],
  'FR': ['fr', 'en', 'de', 'es', 'it'],
  'ES': ['es', 'en', 'fr', 'pt'],
  'DE': ['de', 'en', 'fr', 'it'],
  'IT': ['it', 'en', 'fr', 'de'],
  'PT': ['pt', 'es', 'en', 'fr'],
  'BR': ['pt', 'es', 'en'],
  'JP': ['ja', 'en'],
  'KR': ['ko', 'en', 'ja'],
  'CN': ['zh', 'en', 'ja'],
  'SA': ['ar', 'en', 'fr'],
  'IL': ['he', 'en', 'ar'],
  'IN': ['hi', 'en'],
  'RU': ['ru', 'en', 'de']
};

/**
 * Detect user's preferred language based on browser settings and region
 */
export function detectUserLanguage(): SupportedLanguage {
  // Check browser language settings
  const browserLanguages = navigator.languages || [navigator.language];
  
  for (const browserLang of browserLanguages) {
    const langCode = browserLang.split('-')[0] as SupportedLanguage;
    if (langCode in SUPPORTED_LANGUAGES) {
      return langCode;
    }
  }
  
  // Check timezone for region-based detection
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const region = timezone.split('/')[0];
    
    // Map timezone regions to language priorities
    const regionLanguages = LANGUAGE_PRIORITIES[region];
    if (regionLanguages?.length > 0) {
      return regionLanguages[0];
    }
  } catch (error) {
    console.warn('Could not detect timezone for language selection:', error);
  }
  
  return DEFAULT_LANGUAGE;
}

/**
 * Get languages available for a specific region
 */
export function getRegionalLanguages(region: string): SupportedLanguage[] {
  return LANGUAGE_PRIORITIES[region] || [DEFAULT_LANGUAGE];
}

/**
 * Check if a language uses right-to-left text direction
 */
export function isRTLLanguage(language: SupportedLanguage): boolean {
  return RTL_LANGUAGES.includes(language);
}

/**
 * Get the language info for a specific language code
 */
export function getLanguageInfo(language: SupportedLanguage): LanguageInfo {
  return SUPPORTED_LANGUAGES[language] || SUPPORTED_LANGUAGES[DEFAULT_LANGUAGE];
}

/**
 * Get all supported languages as an array
 */
export function getAllLanguages(): LanguageInfo[] {
  return Object.values(SUPPORTED_LANGUAGES);
}

/**
 * Format a date according to the language's preferred format
 */
export function formatDateForLanguage(date: Date, language: SupportedLanguage): string {
  const langInfo = getLanguageInfo(language);
  
  try {
    return new Intl.DateTimeFormat(`${language}-${langInfo.region}`, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date);
  } catch (error) {
    return date.toLocaleDateString();
  }
}

/**
 * Format a number according to the language's preferred format
 */
export function formatNumberForLanguage(number: number, language: SupportedLanguage): string {
  const langInfo = getLanguageInfo(language);
  
  try {
    return new Intl.NumberFormat(`${language}-${langInfo.region}`, langInfo.numberFormat).format(number);
  } catch (error) {
    return number.toString();
  }
}

/**
 * Get the appropriate plural form for a count in the given language
 */
export function getPluralForm(count: number, language: SupportedLanguage): 'zero' | 'one' | 'two' | 'few' | 'many' | 'other' {
  const langInfo = getLanguageInfo(language);
  return langInfo.pluralRules(count);
}