import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import { api, type LiveWireEvent } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/ToastProvider';
import { useTheme } from '../theme/ThemeContext';

export const LIVE_EVENT_BUS = 'zm-live-event';

export type LiveEvent = LiveWireEvent;

type EventContextValue = {
  lastEvent: LiveEvent | null;
  unreadCount: number;
  clearUnread: () => void;
  subscribe: (fn: (ev: LiveEvent) => void) => () => void;
};

const EventCtx = createContext<EventContextValue | null>(null);

function dispatchBus(ev: LiveEvent) {
  window.dispatchEvent(new CustomEvent(LIVE_EVENT_BUS, { detail: ev }));
}

export function EventProvider({ children }: { children: ReactNode }) {
  const { user, token } = useAuth();
  const { offlineSim } = useTheme();
  const { push } = useToast();
  const { t } = useTranslation();
  const [lastEvent, setLastEvent] = useState<LiveEvent | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const sinceRef = useRef<string>(new Date(Date.now() - 5000).toISOString());
  const listenersRef = useRef(new Set<(ev: LiveEvent) => void>());

  const subscribe = useCallback((fn: (ev: LiveEvent) => void) => {
    listenersRef.current.add(fn);
    return () => listenersRef.current.delete(fn);
  }, []);

  const clearUnread = useCallback(() => setUnreadCount(0), []);

  const handleEvent = useCallback(
    (ev: LiveEvent) => {
      if (ev.type === 'heartbeat') return;
      setLastEvent(ev);
      setUnreadCount((n) => n + 1);
      dispatchBus(ev);
      listenersRef.current.forEach((fn) => fn(ev));
      if (ev.type === 'referral.created') {
        push(t('events.newReferral'), ev.payload?.decision === 'urgent_refer' ? 'warning' : 'info');
      } else if (ev.type === 'referral.status_changed') {
        push(t('events.statusChanged', { status: String(ev.payload?.new_status || '') }), 'success');
      } else if (ev.type === 'referral.message') {
        push(t('events.newMessage'), 'info');
      }
    },
    [push, t],
  );

  useEffect(() => {
    if (!user || !token || offlineSim) return;
    let cancelled = false;
    let es: EventSource | null = null;
    let pollId = 0;

    const tick = async () => {
      try {
        const data = await api.pollEvents(sinceRef.current);
        if (cancelled) return;
        for (const ev of data.events) {
          handleEvent(ev);
          if (ev.at && ev.at > sinceRef.current) sinceRef.current = ev.at;
        }
        if (data.server_at && data.server_at > sinceRef.current) {
          sinceRef.current = data.server_at;
        }
      } catch {
        /* offline or auth  -  skip */
      }
    };

    // Prefer SSE (token via query  -  EventSource cannot set Authorization).
    try {
      const base = import.meta.env.VITE_API_BASE || '/api';
      const url = `${base}/events?access_token=${encodeURIComponent(token)}&since=${encodeURIComponent(sinceRef.current)}`;
      es = new EventSource(url);
      es.onmessage = (msg) => {
        try {
          const ev = JSON.parse(msg.data) as LiveEvent;
          handleEvent(ev);
          if (ev.at && ev.at > sinceRef.current) sinceRef.current = ev.at;
        } catch {
          /* ignore malformed */
        }
      };
      es.onerror = () => {
        es?.close();
        es = null;
        if (!cancelled && !pollId) {
          void tick();
          pollId = window.setInterval(() => void tick(), 4000);
        }
      };
    } catch {
      void tick();
      pollId = window.setInterval(() => void tick(), 4000);
    }

    // Polling fallback always as safety net (slower) if SSE stays open
    if (!pollId) {
      pollId = window.setInterval(() => void tick(), 12000);
    }

    return () => {
      cancelled = true;
      es?.close();
      if (pollId) window.clearInterval(pollId);
    };
  }, [user, token, offlineSim, handleEvent]);

  const value = useMemo(
    () => ({ lastEvent, unreadCount, clearUnread, subscribe }),
    [lastEvent, unreadCount, clearUnread, subscribe],
  );

  return <EventCtx.Provider value={value}>{children}</EventCtx.Provider>;
}

export function useLiveEvents() {
  const ctx = useContext(EventCtx);
  if (!ctx) throw new Error('useLiveEvents outside EventProvider');
  return ctx;
}

export function useLiveEventRefresh(onRefresh: () => void, types?: string[]) {
  useEffect(() => {
    const handler = (e: Event) => {
      const ev = (e as CustomEvent<LiveEvent>).detail;
      if (types && !types.includes(ev.type)) return;
      onRefresh();
    };
    window.addEventListener(LIVE_EVENT_BUS, handler);
    return () => window.removeEventListener(LIVE_EVENT_BUS, handler);
  }, [onRefresh, types]);
}
