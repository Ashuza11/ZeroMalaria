import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, type AuthUser, type LoginResponse } from '../api/client';

export type UserRole = 'chw' | 'nurse' | 'supervisor' | 'rbc';

export const isDemoModeEnabled = import.meta.env.VITE_DEMO_MODE === 'true';

const SESSION_KEY = 'zm_session';
const OFFLINE_GRACE_MS = 7 * 24 * 60 * 60 * 1000;

export type SessionPayload = {
  access_token: string;
  user: AuthUser;
  offline_until?: number;
};

function readSession(): SessionPayload | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as SessionPayload;
    if (!navigator.onLine && session.offline_until && Date.now() > session.offline_until) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

function writeSession(session: SessionPayload | null) {
  if (!session) {
    sessionStorage.removeItem(SESSION_KEY);
    return;
  }
  const payload: SessionPayload = {
    ...session,
    offline_until: session.offline_until ?? Date.now() + OFFLINE_GRACE_MS,
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload));
}

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  demoModeEnabled: boolean;
  login: (username: string, password: string) => Promise<AuthUser>;
  quickDemoLogin?: (role: UserRole) => Promise<AuthUser>;
  logout: () => Promise<void>;
  switchRole: (role: UserRole) => Promise<AuthUser>;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function applyLoginResponse(data: LoginResponse): AuthUser {
  const session: SessionPayload = {
    access_token: data.access_token,
    user: data.user,
    offline_until: Date.now() + OFFLINE_GRACE_MS,
  };
  writeSession(session);
  return data.user;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => readSession()?.user ?? null);
  const [token, setToken] = useState<string | null>(() => readSession()?.access_token ?? null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      /* migrated to sessionStorage */
    }
    const s = readSession();
    if (!s?.access_token) {
      setLoading(false);
      return;
    }
    if (!navigator.onLine) {
      setUser(s.user);
      setToken(s.access_token);
      setLoading(false);
      return;
    }
    void (async () => {
      try {
        const me = await api.me();
        setUser(me);
        writeSession({ access_token: s.access_token, user: me, offline_until: s.offline_until });
        setToken(s.access_token);
      } catch {
        writeSession(null);
        setUser(null);
        setToken(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const data = await api.login(username, password);
    const u = applyLoginResponse(data);
    setUser(u);
    setToken(data.access_token);
    return u;
  }, []);

  const quickDemoLogin = useCallback(
    async (role: UserRole) => {
      if (!isDemoModeEnabled) {
        throw new Error('Demo login is not enabled in this build');
      }
      const data = await api.demoLogin(role);
      const u = applyLoginResponse(data);
      setUser(u);
      setToken(data.access_token);
      return u;
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      if (navigator.onLine && token) await api.logout();
    } catch {
      /* ignore offline / expired token */
    }
    writeSession(null);
    setUser(null);
    setToken(null);
  }, [token]);

  const switchRole = useCallback(
    async (role: UserRole) => {
      const isDemo = user?.username?.endsWith('.demo');
      if (!isDemo || !isDemoModeEnabled) {
        throw new Error('Role switch is only available for demo presenter sessions');
      }
      return quickDemoLogin(role);
    },
    [quickDemoLogin, user?.username],
  );

  const refreshMe = useCallback(async () => {
    if (!token) return;
    if (!navigator.onLine) return;
    try {
      const me = await api.me();
      setUser(me);
      const s = readSession();
      writeSession({ access_token: token, user: me, offline_until: s?.offline_until });
    } catch {
      await logout();
    }
  }, [logout, token]);

  const value = useMemo((): AuthContextValue => {
    const base: AuthContextValue = {
      user,
      token,
      loading,
      demoModeEnabled: isDemoModeEnabled,
      login,
      logout,
      switchRole,
      refreshMe,
    };
    if (isDemoModeEnabled) {
      base.quickDemoLogin = quickDemoLogin;
    }
    return base;
  }, [user, token, loading, login, quickDemoLogin, logout, switchRole, refreshMe]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export { SESSION_KEY };
