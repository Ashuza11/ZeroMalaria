import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type ThemeCtx = {
  dark: boolean;
  toggleDark: () => void;
  offlineSim: boolean;
  setOfflineSim: (v: boolean) => void;
};

const ThemeContext = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(() => localStorage.getItem('zm_dark') === '1');
  const [offlineSim, setOfflineSim] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('zm_dark', dark ? '1' : '0');
  }, [dark]);

  useEffect(() => {
    if (!offlineSim) return;
    const block = (e: Event) => {
      // Soft simulation: pages already handle fetch failures; we also flip online state consumers.
      e.stopImmediatePropagation?.();
    };
    window.dispatchEvent(new Event('offline'));
    return () => {
      window.dispatchEvent(new Event('online'));
      void block;
    };
  }, [offlineSim]);

  const value = useMemo(
    () => ({
      dark,
      toggleDark: () => setDark((d) => !d),
      offlineSim,
      setOfflineSim,
    }),
    [dark, offlineSim],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme outside provider');
  return ctx;
}
