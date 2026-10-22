'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { translations, Language, TranslationKeys } from './translations';
import { useIsClient } from '@/lib/hooks/useIsClient';
import { usePathname } from 'next/navigation';

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationKeys;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const STORAGE_KEY = 'cctp-language';

export function I18nProvider({ children, initialLanguage = 'en' }: { children: ReactNode; initialLanguage?: Language }) {
  const pathname = usePathname();
  const routeLanguage = pathname === '/zh' ? 'zh' : pathname === '/en' || pathname === '/' ? 'en' : null;
  const [language, setLanguageState] = useState<Language>(() => {
    if (routeLanguage) return routeLanguage;
    if (typeof window === 'undefined') return initialLanguage;

    const queryLanguage = new URLSearchParams(window.location.search).get('lang');
    if (queryLanguage === 'en' || queryLanguage === 'zh') {
      return queryLanguage;
    }

    let stored: string | null = null;
    try { stored = localStorage.getItem(STORAGE_KEY); } catch { /* Storage can be disabled. */ }
    if (stored && (stored === 'en' || stored === 'zh')) {
      return stored;
    }

    const browserLang = navigator.language.toLowerCase();
    return browserLang.startsWith('zh') ? 'zh' : 'en';
  });
  const mounted = useIsClient();

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* Storage can be disabled. */ }
    }
  }, []);

  const activeLanguage = routeLanguage ?? language;

  useEffect(() => {
    document.documentElement.lang = activeLanguage === 'zh' ? 'zh-CN' : 'en';
  }, [activeLanguage]);

  const t = translations[activeLanguage];

  // 避免 hydration mismatch
  if (!mounted) {
    return (
      <I18nContext.Provider value={{ language: initialLanguage, setLanguage, t: translations[initialLanguage] }}>
        {children}
      </I18nContext.Provider>
    );
  }

  return (
    <I18nContext.Provider value={{ language: activeLanguage, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}

export function useTranslation() {
  const { t, language, setLanguage } = useI18n();
  return { t, language, setLanguage };
}
