import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Toast } from '../components/ui';

type ToastTone = 'info' | 'success' | 'warning' | 'danger';
type ToastCtx = { push: (message: string, tone?: ToastTone) => void };

const Ctx = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; tone: ToastTone } | null>(null);

  const push = useCallback((message: string, tone: ToastTone = 'info') => {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 2800);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <Toast open={Boolean(toast)} message={toast?.message || ''} tone={toast?.tone} />
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast outside provider');
  return ctx;
}
