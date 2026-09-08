import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';

export type ThemeMode = 'system' | 'light' | 'dark';
export type ResolvedTheme = Exclude<ThemeMode, 'system'>;

type ThemeContextValue = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  resolvedTheme: ResolvedTheme;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(
    () => (localStorage.getItem('theme-mode') as ThemeMode | null) ?? 'system',
  );
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(
    mediaQuery.matches ? 'dark' : 'light',
  );
  const resolvedTheme = mode === 'system' ? systemTheme : mode;

  useEffect(() => {
    const updateSystemTheme = (event: MediaQueryListEvent) =>
      setSystemTheme(event.matches ? 'dark' : 'light');

    mediaQuery.addEventListener('change', updateSystemTheme);
    return () => mediaQuery.removeEventListener('change', updateSystemTheme);
  }, []);

  useEffect(() => {
    localStorage.setItem('theme-mode', mode);
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.style.colorScheme = resolvedTheme;
  }, [mode, resolvedTheme]);

  return (
    <ThemeContext.Provider value={{ mode, setMode, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }

  return context;
}
