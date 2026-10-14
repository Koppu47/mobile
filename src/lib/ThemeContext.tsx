import React, { createContext, useContext, useEffect } from 'react';
import { SafeStorage } from './safeStorage';

export type ThemeMode = 'dark';

interface ThemeColors {
  background: string;
  surface: string;
  surfaceSubtle: string;
  headerBg: string;
  headerBorder: string;
  border: string;
  borderSubtle: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primaryLight: string;
  primaryBg: string;
  cardShadow: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
}

export const darkColors: ThemeColors = {
  background: '#0b1120',
  surface: '#1e293b',
  surfaceSubtle: '#0f172a',
  headerBg: '#0f172a',
  headerBorder: '#1e293b',
  border: '#334155',
  borderSubtle: '#1e293b',
  text: '#f8fafc',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  primary: '#38bdf8',
  primaryLight: '#7dd3fc',
  primaryBg: 'rgba(56, 189, 248, 0.15)',
  cardShadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
};

interface ThemeContextType {
  theme: 'dark';
  isDark: true;
  colors: ThemeColors;
  setTheme: (theme: 'dark') => Promise<void>;
  toggleTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  isDark: true,
  colors: darkColors,
  setTheme: async () => {},
  toggleTheme: async () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Clear any previous theme preference to ensure 100% permanent dark mode
    SafeStorage.removeItem('carservices_theme').catch(() => {});
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme: 'dark',
        isDark: true,
        colors: darkColors,
        setTheme: async () => {},
        toggleTheme: async () => {},
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeMode() {
  return useContext(ThemeContext);
}
