import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const LANGUAGES = {
  es: { label: 'Español (Chile)', flag: '🇨🇱' },
  en: { label: 'English (US)', flag: '🇺🇸' },
};

const LanguageSelector = () => {
  const { locale, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  // Cierra el dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentLang = LANGUAGES[locale] || LANGUAGES.es;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 bg-wellq-gray/5 dark:bg-white/[0.03] 
                   border border-transparent dark:border-white/5 rounded-2xl 
                   text-sm font-bold text-wellq-dark dark:text-white 
                   focus:outline-none focus:ring-2 focus:ring-wellq-cyan 
                   hover:border-wellq-gray/20 dark:hover:border-white/10
                   transition-all cursor-pointer"
      >
        <span className="flex items-center gap-2.5">
          <Globe size={18} className="text-wellq-cyan" />
          <span>{currentLang.flag} {currentLang.label}</span>
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
        >
          <ChevronDown size={18} className="text-wellq-gray dark:text-wellq-gray/70" />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop invisible para capturar clics fuera */}
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

            <motion.ul
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="absolute z-50 mt-2 w-full bg-white dark:bg-wellq-dark 
                         rounded-xl shadow-xl border border-wellq-gray/20 dark:border-white/10 
                         overflow-hidden backdrop-blur-sm"
            >
              {Object.entries(LANGUAGES).map(([key, lang]) => {
                const isSelected = locale === key;
                return (
                  <li key={key}>
                    <button
                      type="button"
                      onClick={() => {
                        setLanguage(key);
                        setOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-4 py-3 
                                  text-sm font-bold transition-colors
                                  ${
                                    isSelected
                                      ? 'bg-wellq-cyan/10 text-wellq-dark dark:text-white'
                                      : 'text-wellq-gray hover:bg-wellq-gray/5 dark:hover:bg-white/[0.05] dark:text-wellq-gray/80 dark:hover:text-white'
                                  }`}
                    >
                      <span>{lang.flag} {lang.label}</span>
                      {isSelected && <Check size={16} className="text-wellq-cyan" strokeWidth={2.5} />}
                    </button>
                  </li>
                );
              })}
            </motion.ul>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LanguageSelector;