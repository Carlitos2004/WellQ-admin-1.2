import { createContext, useContext, useState, useCallback } from 'react';
import en from '../locales/en.json';
import es from '../locales/es.json';

const translations = { en, es };
const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [locale, setLocale] = useState(() => {
    return localStorage.getItem('lang') || 'en';
  });

  const setLanguage = (lang) => {
    setLocale(lang);
    localStorage.setItem('lang', lang);
  };

  const t = useCallback((key, params = {}) => {
    const fallback = typeof params === 'string' ? params : key;
    const values = typeof params === 'object' && params !== null ? params : {};
    const keys = key.split('.');
    const resolve = (dict) => keys.reduce((acc, k) => acc?.[k], dict);
    const result = resolve(translations[locale]) ?? resolve(translations.en) ?? fallback;
    return typeof result === 'string'
      ? result.replace(/\{\{(\w+)\}\}/g, (_, k) => values[k] ?? `{{${k}}}`)
      : result;
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
