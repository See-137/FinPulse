/**
 * Language Context and Hook
 * Provides internationalization support with RTL for Hebrew
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { translations, Language } from './translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (path: string) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

const STORAGE_KEY = 'finpulse_language';

/**
 * Get nested translation value by dot-notation path
 */
function getNestedValue(obj: any, path: string): string {
  const keys = path.split('.');
  let value = obj;
  
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return path; // Return path if not found (fallback)
    }
  }
  
  return typeof value === 'string' ? value : path;
}

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY) as Language;
      if (saved && (saved === 'en' || saved === 'he')) {
        return saved;
      }
    }
    return 'en';
  });

  const isRTL = language === 'he';

  // Apply RTL to document
  useEffect(() => {
    const html = document.documentElement;
    if (isRTL) {
      html.setAttribute('dir', 'rtl');
      html.setAttribute('lang', 'he');
    } else {
      html.setAttribute('dir', 'ltr');
      html.setAttribute('lang', 'en');
    }
  }, [isRTL]);

  // Persist language choice
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language);
  }, [language]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
  }, []);

  /**
   * Translation function
   * Usage: t('nav.mirror') or t('portfolio.title')
   */
  const t = useCallback((path: string): string => {
    return getNestedValue(translations[language], path);
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
};

/**
 * Hook to access language context
 */
export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

/**
 * Helper to format translation with variables
 * Usage: formatT(t('time.minutesAgo'), { n: 5 }) => "5m ago"
 */
export const formatT = (text: string, vars: Record<string, string | number>): string => {
  let result = text;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(`{${key}}`, String(value));
  }
  return result;
};

export default LanguageProvider;
