/**
 * Language switcher component with accessibility support
 */
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useLanguageSwitcher, useTranslation, useIsRTL } from '@/lib/i18n/context';
import { getLanguageInfo } from '@/lib/i18n/languages';
import type { SupportedLanguage } from '@/types/i18n';

interface LanguageSwitcherProps {
  variant?: 'dropdown' | 'compact' | 'full';
  showFlags?: boolean;
  className?: string;
}

export function LanguageSwitcher({ 
  variant = 'dropdown', 
  showFlags = true, 
  className = '' 
}: LanguageSwitcherProps) {
  const t = useTranslation();
  const isRTL = useIsRTL();
  const { currentLanguage, supportedLanguages, switchToLanguage, getLanguageDisplayName } = useLanguageSwitcher();
  
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setFocusedIndex(0);
        } else if (focusedIndex >= 0) {
          const language = supportedLanguages[focusedIndex];
          switchToLanguage(language.code);
          setIsOpen(false);
          setFocusedIndex(-1);
          buttonRef.current?.focus();
        }
        break;
      
      case 'Escape':
        setIsOpen(false);
        setFocusedIndex(-1);
        buttonRef.current?.focus();
        break;
      
      case 'ArrowDown':
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setFocusedIndex(0);
        } else {
          setFocusedIndex(prev => 
            prev < supportedLanguages.length - 1 ? prev + 1 : 0
          );
        }
        break;
      
      case 'ArrowUp':
        event.preventDefault();
        if (isOpen) {
          setFocusedIndex(prev => 
            prev > 0 ? prev - 1 : supportedLanguages.length - 1
          );
        }
        break;
      
      case 'Home':
        if (isOpen) {
          event.preventDefault();
          setFocusedIndex(0);
        }
        break;
      
      case 'End':
        if (isOpen) {
          event.preventDefault();
          setFocusedIndex(supportedLanguages.length - 1);
        }
        break;
    }
  };

  const handleLanguageSelect = (language: SupportedLanguage) => {
    switchToLanguage(language);
    setIsOpen(false);
    setFocusedIndex(-1);
    buttonRef.current?.focus();
  };

  const currentLanguageInfo = getLanguageInfo(currentLanguage);

  if (variant === 'compact') {
    return (
      <div className={`relative ${className}`} ref={dropdownRef}>
        <button
          ref={buttonRef}
          onClick={() => setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-lg
            bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600
            hover:bg-gray-50 dark:hover:bg-gray-700
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            transition-colors duration-200
            ${isRTL ? 'flex-row-reverse' : ''}
          `}
          aria-label={t('common.currentLanguage', { language: getLanguageDisplayName(currentLanguage) })}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          {showFlags && (
            <span className="text-lg" role="img" aria-label={currentLanguageInfo.name}>
              {currentLanguageInfo.flag}
            </span>
          )}
          <span className="text-sm font-medium">{currentLanguage.toUpperCase()}</span>
          <svg 
            className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <div 
            className={`
              absolute top-full mt-1 w-48 py-2
              bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600
              rounded-lg shadow-lg z-50
              ${isRTL ? 'right-0' : 'left-0'}
            `}
            role="listbox"
            aria-label={t('common.selectLanguage')}
          >
            {supportedLanguages.map((language, index) => (
              <button
                key={language.code}
                onClick={() => handleLanguageSelect(language.code)}
                className={`
                  w-full px-4 py-2 text-left flex items-center gap-3
                  hover:bg-gray-100 dark:hover:bg-gray-700
                  ${focusedIndex === index ? 'bg-gray-100 dark:bg-gray-700' : ''}
                  ${currentLanguage === language.code ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : ''}
                  transition-colors duration-150
                  ${isRTL ? 'flex-row-reverse text-right' : ''}
                `}
                role="option"
                aria-selected={currentLanguage === language.code}
                tabIndex={-1}
              >
                {showFlags && (
                  <span className="text-lg" role="img" aria-label={language.name}>
                    {language.flag}
                  </span>
                )}
                <div className={`flex-1 ${isRTL ? 'text-right' : ''}`}>
                  <div className="font-medium">{language.nativeName}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{language.name}</div>
                </div>
                {currentLanguage === language.code && (
                  <svg 
                    className="w-4 h-4 text-blue-600 dark:text-blue-400" 
                    fill="currentColor" 
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                  >
                    <path 
                      fillRule="evenodd" 
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
                      clipRule="evenodd" 
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (variant === 'full') {
    return (
      <div className={`space-y-2 ${className}`}>
        <h3 className="text-lg font-semibold mb-4">{t('common.selectLanguage')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {supportedLanguages.map((language) => (
            <button
              key={language.code}
              onClick={() => handleLanguageSelect(language.code)}
              className={`
                p-3 rounded-lg border-2 transition-all duration-200
                flex items-center gap-3
                ${currentLanguage === language.code 
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }
                ${isRTL ? 'flex-row-reverse text-right' : ''}
              `}
              aria-pressed={currentLanguage === language.code}
            >
              {showFlags && (
                <span className="text-2xl" role="img" aria-label={language.name}>
                  {language.flag}
                </span>
              )}
              <div className={`flex-1 ${isRTL ? 'text-right' : ''}`}>
                <div className="font-medium">{language.nativeName}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{language.name}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Default dropdown variant
  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg
          bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600
          hover:bg-gray-50 dark:hover:bg-gray-700
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          transition-colors duration-200
          ${isRTL ? 'flex-row-reverse' : ''}
        `}
        aria-label={t('common.currentLanguage', { language: getLanguageDisplayName(currentLanguage) })}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {showFlags && (
          <span className="text-lg" role="img" aria-label={currentLanguageInfo.name}>
            {currentLanguageInfo.flag}
          </span>
        )}
        <span className="font-medium">{getLanguageDisplayName(currentLanguage)}</span>
        <svg 
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div 
          className={`
            absolute top-full mt-1 w-56 py-2
            bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600
            rounded-lg shadow-lg z-50
            ${isRTL ? 'right-0' : 'left-0'}
          `}
          role="listbox"
          aria-label={t('common.selectLanguage')}
        >
          {supportedLanguages.map((language, index) => (
            <button
              key={language.code}
              onClick={() => handleLanguageSelect(language.code)}
              className={`
                w-full px-4 py-3 text-left flex items-center gap-3
                hover:bg-gray-100 dark:hover:bg-gray-700
                ${focusedIndex === index ? 'bg-gray-100 dark:bg-gray-700' : ''}
                ${currentLanguage === language.code ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : ''}
                transition-colors duration-150
                ${isRTL ? 'flex-row-reverse text-right' : ''}
              `}
              role="option"
              aria-selected={currentLanguage === language.code}
              tabIndex={-1}
            >
              {showFlags && (
                <span className="text-xl" role="img" aria-label={language.name}>
                  {language.flag}
                </span>
              )}
              <div className={`flex-1 ${isRTL ? 'text-right' : ''}`}>
                <div className="font-medium">{language.nativeName}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{language.name}</div>
              </div>
              {currentLanguage === language.code && (
                <svg 
                  className="w-5 h-5 text-blue-600 dark:text-blue-400" 
                  fill="currentColor" 
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path 
                    fillRule="evenodd" 
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
                    clipRule="evenodd" 
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}