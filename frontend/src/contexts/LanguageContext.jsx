import { createContext, useContext, useState, useCallback } from 'react';
import en from '../locales/en.json';
import es from '../locales/es.json';

const translations = { en, es };
const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [locale, setLocale] = useState(() => {
    return localStorage.getItem('lang') || 'es';
  });

  const setLanguage = (lang) => {
    setLocale(lang);
    localStorage.setItem('lang', lang);
  };

  const t = useCallback((key) => {
    const keys = key.split('.');
    let result = translations[locale];
    for (const k of keys) {
      result = result?.[k];
    }
    return result ?? key;
  }, [locale]);

  const tVal = useCallback((value) => {
    if (!value) return value;
    const normalized = value.toLowerCase().replace(/ /g, '_');
    return translations[locale]?.values?.[normalized] ?? value;
  }, [locale]);

  return (
    <LanguageContext.Provider value={{ t, tVal, locale, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage debe usarse dentro de un LanguageProvider');
  }
  return context;
}