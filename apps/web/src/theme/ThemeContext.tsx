import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

type ThemeCtx = {
  dark: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  cycleTheme: () => void;
  /** @deprecated use cycleTheme */
  toggleDark: () => void;
  offlineSim: boolean;
  setOfflineSim: (v: boolean) => void;
};

const ThemeContext = createContext<ThemeCtx | null>(null);
const THEME_KEY = 'zm_theme_mode';

function systemPrefersDark() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function resolveDark(mode: ThemeMode) {
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  return systemPrefersDark();
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(THEME_KEY) as ThemeMode | null;
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
    // Migrate legacy zm_dark
    if (localStorage.getItem('zm_dark') === '1') return 'dark';
    return 'system';
  });
  const [dark, setDark] = useState(() => resolveDark(
    (localStorage.getItem(THEME_KEY) as ThemeMode) ||
      (localStorage.getItem('zm_dark') === '1' ? 'dark' : 'system'),
  ));
  const [offlineSim, setOfflineSim] = useState(false);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    localStorage.setItem(THEME_KEY, mode);
    setDark(resolveDark(mode));
  };

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('zm_dark', dark ? '1' : '0');
  }, [dark]);

  useEffect(() => {
    if (themeMode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setDark(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [themeMode]);

  useEffect(() => {
    if (!offlineSim) return;
    window.dispatchEvent(new Event('offline'));
    return () => {
      window.dispatchEvent(new Event('online'));
    };
  }, [offlineSim]);

  const value = useMemo(() => {
    const cycleTheme = () => {
      const order: ThemeMode[] = ['light', 'dark', 'system'];
      const next = order[(order.indexOf(themeMode) + 1) % order.length];
      setThemeMode(next);
    };
    return {
      dark,
      themeMode,
      setThemeMode,
      cycleTheme,
      toggleDark: cycleTheme,
      offlineSim,
      setOfflineSim,
    };
  }, [dark, themeMode, offlineSim]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme outside provider');
  return ctx;
}
