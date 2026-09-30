import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { db } from '../db';
import { api } from '../api/client';
import { useTheme } from '../theme/ThemeContext';

export type SyncStatus = 'online' | 'offline' | 'syncing';

type SyncContextValue = {
  status: SyncStatus;
  pending: number;
  refreshPending: () => Promise<void>;
  syncNow: () => Promise<void>;
};

const SyncContext = createContext<SyncContextValue | null>(null);

export function SyncProvider({ children }: { children: ReactNode }) {
  const { offlineSim } = useTheme();
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [syncing, setSyncing] = useState(false);
  const [pending, setPending] = useState(0);

  const refreshPending = useCallback(async () => {
    const count = await db.syncQueue.count();
    setPending(count);
  }, []);

  const syncNow = useCallback(async () => {
    if (!navigator.onLine || offlineSim) return;
    setSyncing(true);
    try {
      const items = await db.syncQueue.toArray();
      if (items.length) {
        const payload = items.map((item) => ({
          client_uuid: item.client_uuid,
          type: item.type,
          payload: item.payload,
        }));
        await api.sync(payload);
        const ids = items.map((i) => i.id).filter((id): id is number => id != null);
        await db.syncQueue.bulkDelete(ids);
        await db.referrals.filter((r) => !r.synced).modify({ synced: true });
      }
    } catch {
      // stay queued
    } finally {
      setSyncing(false);
      await refreshPending();
    }
  }, [offlineSim, refreshPending]);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    // Queue count is external IndexedDB state.
    queueMicrotask(() => {
      void refreshPending();
    });
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, [refreshPending]);

  useEffect(() => {
    if (online && !offlineSim) {
      queueMicrotask(() => {
        void syncNow();
      });
    }
  }, [online, offlineSim, syncNow]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (navigator.onLine && !offlineSim) void syncNow();
    }, 15000);
    return () => window.clearInterval(id);
  }, [offlineSim, syncNow]);

  const status: SyncStatus = offlineSim || !online ? 'offline' : syncing ? 'syncing' : 'online';
  const value = useMemo(
    () => ({ status, pending, refreshPending, syncNow }),
    [status, pending, refreshPending, syncNow],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync() {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync outside provider');
  return ctx;
}
