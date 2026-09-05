import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, getTranslation, availableLanguages } from '../utils/translations.js';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('app_lang') || 'ta'; // Default to Tamil or saved preference!
  });

  useEffect(() => {
    localStorage.setItem('app_lang', lang);
  }, [lang]);

  const t = (key) => {
    return getTranslation(lang, key);
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, availableLanguages }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
