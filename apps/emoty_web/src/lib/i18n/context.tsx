/**
 * Internationalization Context and Provider
 */
'use client';

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import type { 
  SupportedLanguage, 
  LanguageDirection, 
  I18nContext as I18nContextType,
  TranslationFunction,
  LanguageInfo
} from '@/types/i18n';
import { 
  detectUserLanguage, 
  getLanguageInfo, 
  getAllLanguages,
  formatDateForLanguage,
  formatNumberForLanguage,
  isRTLLanguage
} from './languages';
import { loadTranslations } from './translations';

const I18nContext = createContext<I18nContextType | null>(null);

interface I18nProviderProps {
  children: React.ReactNode;
  defaultLanguage?: SupportedLanguage;
  persistLanguage?: boolean;
}

export function I18nProvider({ 
  children, 
  defaultLanguage,
  persistLanguage = true 
}: I18nProviderProps) {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    // Server-side rendering safe initialization
    if (typeof window === 'undefined') {
      return defaultLanguage || 'en';
    }
    
    // Try to load from localStorage first
    if (persistLanguage) {
      const stored = localStorage.getItem('emo-web-language') as SupportedLanguage;
      if (stored && getAllLanguages().some(lang => lang.code === stored)) {
        return stored;
      }
    }
    
    // Fall back to user detection or default
    return defaultLanguage || detectUserLanguage();
  });

  const [translations, setTranslations] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load translations when language changes
  useEffect(() => {
    let isMounted = true;
    
    const loadLanguageTranslations = async () => {
      try {
        setIsLoading(true);
        const translationData = await loadTranslations(language);
        
        if (isMounted) {
          setTranslations(translationData);
          setIsLoading(false);
        }
      } catch (error) {
        console.error(`Failed to load translations for ${language}:`, error);
        
        // Fallback to English if current language fails
        if (language !== 'en' && isMounted) {
          try {
            const fallbackTranslations = await loadTranslations('en');
            setTranslations(fallbackTranslations);
          } catch (fallbackError) {
            console.error('Failed to load fallback translations:', fallbackError);
          }
        }
        
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadLanguageTranslations();
    
    return () => {
      isMounted = false;
    };
  }, [language]);

  // Update document properties when language changes
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const languageInfo = getLanguageInfo(language);
      document.documentElement.lang = language;
      document.documentElement.dir = languageInfo.direction;
      
      // Update CSS custom properties for RTL support
      document.documentElement.style.setProperty(
        '--text-direction', 
        languageInfo.direction === 'rtl' ? 'rtl' : 'ltr'
      );
    }
  }, [language]);

  // Persist language preference
  useEffect(() => {
    if (persistLanguage && typeof window !== 'undefined') {
      localStorage.setItem('emo-web-language', language);
    }
  }, [language, persistLanguage]);

  const setLanguage = (newLanguage: SupportedLanguage) => {
    setLanguageState(newLanguage);
  };

  // Create translation function
  const t: TranslationFunction = useMemo(() => {
    const translateFunction = (keyOrNamespace: any, subKey?: any, params?: any) => {
      if (!translations) {
        return keyOrNamespace; // Return key as fallback
      }

      try {
        let value: any;
        
        // Handle different calling patterns
        if (typeof subKey === 'string') {
          // Called as t('namespace', 'key', params)
          value = translations[keyOrNamespace]?.[subKey];
          params = params || {};
        } else {
          // Called as t('namespace.key') or t('key', params)
          const keys = keyOrNamespace.split('.');
          value = keys.reduce((obj: any, key: string) => obj?.[key], translations);
          params = subKey || {};
        }

        // Handle missing translations
        if (value === undefined || value === null) {
          console.warn(`Translation missing for key: ${keyOrNamespace}${subKey ? `.${subKey}` : ''}`);
          return keyOrNamespace;
        }

        // Handle function-based translations (for dynamic content)
        if (typeof value === 'function') {
          return value(params);
        }

        // Handle parameter substitution in strings
        if (typeof value === 'string' && params && Object.keys(params).length > 0) {
          return value.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return params[key] !== undefined ? String(params[key]) : match;
          });
        }

        return value;
      } catch (error) {
        console.error('Translation error:', error);
        return keyOrNamespace;
      }
    };

    return translateFunction;
  }, [translations]);

  const contextValue: I18nContextType = useMemo(() => ({
    language,
    direction: getLanguageInfo(language).direction,
    t,
    setLanguage,
    supportedLanguages: getAllLanguages(),
    formatDate: (date: Date) => formatDateForLanguage(date, language),
    formatNumber: (number: number) => formatNumberForLanguage(number, language),
    formatCurrency: (amount: number, currency: string) => {
      const languageInfo = getLanguageInfo(language);
      try {
        return new Intl.NumberFormat(`${language}-${languageInfo.region}`, {
          style: 'currency',
          currency: currency.toUpperCase()
        }).format(amount);
      } catch (error) {
        return `${currency.toUpperCase()} ${amount}`;
      }
    },
    formatRelativeTime: (date: Date) => {
      const languageInfo = getLanguageInfo(language);
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
      
      try {
        const rtf = new Intl.RelativeTimeFormat(`${language}-${languageInfo.region}`, {
          numeric: 'auto'
        });

        if (Math.abs(diffInSeconds) < 60) {
          return rtf.format(-diffInSeconds, 'second');
        } else if (Math.abs(diffInSeconds) < 3600) {
          return rtf.format(-Math.floor(diffInSeconds / 60), 'minute');
        } else if (Math.abs(diffInSeconds) < 86400) {
          return rtf.format(-Math.floor(diffInSeconds / 3600), 'hour');
        } else {
          return rtf.format(-Math.floor(diffInSeconds / 86400), 'day');
        }
      } catch (error) {
        return formatDateForLanguage(date, language);
      }
    }
  }), [language, t]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <I18nContext.Provider value={contextValue}>
      {children}
    </I18nContext.Provider>
  );
}

/**
 * Hook to access i18n context
 */
export function useI18n(): I18nContextType {
  const context = useContext(I18nContext);
  
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  
  return context;
}

/**
 * Hook to access translation function only
 */
export function useTranslation(): TranslationFunction {
  const { t } = useI18n();
  return t;
}

/**
 * Hook to access current language info
 */
export function useLanguageInfo(): LanguageInfo {
  const { language } = useI18n();
  return getLanguageInfo(language);
}

/**
 * Hook to check if current language is RTL
 */
export function useIsRTL(): boolean {
  const { language } = useI18n();
  return isRTLLanguage(language);
}

/**
 * Hook for language switching
 */
export function useLanguageSwitcher() {
  const { language, setLanguage, supportedLanguages } = useI18n();
  
  const switchToLanguage = (newLanguage: SupportedLanguage) => {
    setLanguage(newLanguage);
  };
  
  const getLanguageDisplayName = (lang: SupportedLanguage) => {
    const langInfo = getLanguageInfo(lang);
    return langInfo.nativeName;
  };
  
  return {
    currentLanguage: language,
    supportedLanguages,
    switchToLanguage,
    getLanguageDisplayName
  };
}