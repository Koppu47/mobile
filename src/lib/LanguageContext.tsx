import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SafeStorage } from './safeStorage';

export type Language = 'th' | 'en';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => Promise<void>;
  toggleLanguage: () => Promise<void>;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'th',
  setLang: async () => {},
  toggleLanguage: async () => {},
});

const STORAGE_KEY = 'carservices_lang';

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>('th');

  useEffect(() => {
    let isMounted = true;
    SafeStorage.getItem(STORAGE_KEY).then((saved) => {
      if (isMounted && (saved === 'en' || saved === 'th')) {
        setLangState(saved);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const setLang = useCallback(async (newLang: Language) => {
    setLangState(newLang);
    await SafeStorage.setItem(STORAGE_KEY, newLang);
  }, []);

  const toggleLanguage = useCallback(async () => {
    setLangState((prev) => {
      const next: Language = prev === 'th' ? 'en' : 'th';
      SafeStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
