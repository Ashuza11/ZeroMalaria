const API_BASE = import.meta.env.VITE_API_BASE || '/api';
export const SESSION_KEY = 'zm_session';

export type AuthUser = {
  id: string;
  username: string;
  display_name: string;
  role: 'chw' | 'nurse' | 'supervisor' | 'rbc';
  phone: string;
  district: string;
  facility_id: string;
  village: string;
  chw_code: string;
  active: boolean;
};

export type LoginResponse = {
  access_token: string;
  token_type: string;
  user: AuthUser;
};

export function clearAuthSession(redirect = true) {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
  if (
    redirect &&
    typeof window !== 'undefined' &&
    !window.location.pathname.startsWith('/login')
  ) {
    window.location.assign('/login');
  }
}

function authHeaders(): Record<string, string> {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return {};
    const session = JSON.parse(raw) as { access_token?: string };
    if (session.access_token) {
      return { Authorization: `Bearer ${session.access_token}` };
    }
  } catch {
    /* ignore */
  }
  return {};
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(init?.headers || {}),
    },
    ...init,
  });
  if (res.status === 401) {
    clearAuthSession(true);
    const text = await res.text();
    throw new Error(text || 'Unauthorized');
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  health: () => request<{ status: string }>('/health'),
  login: (username: string, password: string) =>
    request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  demoLogin: (role: AuthUser['role']) =>
    request<LoginResponse>('/auth/demo-login', {
      method: 'POST',
      body: JSON.stringify({ role }),
    }),
  me: () => request<AuthUser>('/auth/me'),
  logout: () => request<{ ok: boolean }>('/auth/logout', { method: 'POST' }),
  listUsers: () => request<AuthUser[]>('/users'),
  createUser: (body: {
    username: string;
    password: string;
    display_name: string;
    role?: string;
    phone?: string;
    district?: string;
    facility_id?: string;
    village?: string;
    chw_code?: string;
  }) => request<AuthUser>('/users', { method: 'POST', body: JSON.stringify(body) }),
  patchUser: (userId: string, body: Partial<{ active: boolean; facility_id: string; village: string; district: string; phone: string; display_name: string }>) =>
    request<AuthUser>(`/users/${userId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  triage: (body: unknown) => request('/triage', { method: 'POST', body: JSON.stringify(body) }),
  referrals: (params?: { facility_id?: string; chw_id?: string }) => {
    const q = new URLSearchParams();
    if (params?.facility_id) q.set('facility_id', params.facility_id);
    if (params?.chw_id) q.set('chw_id', params.chw_id);
    const suffix = q.toString() ? `?${q}` : '';
    return request<any[]>(`/referrals${suffix}`);
  },
  scopedReferrals: () => request<any[]>('/referrals/scoped'),
  createReferral: (body: unknown) =>
    request('/referrals', { method: 'POST', body: JSON.stringify(body) }),
  patchStatus: (id: string, status: string) =>
    request(`/referrals/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  alerts: (chw_id?: string) =>
    request<any[]>(`/alerts${chw_id ? `?chw_id=${encodeURIComponent(chw_id)}` : ''}`),
  kpis: (district?: string) =>
    request<any>(`/analytics/kpis${district ? `?district=${encodeURIComponent(district)}` : ''}`),
  surge: (params?: Record<string, string>) => {
    const q = new URLSearchParams(params || {});
    return request<any>(`/analytics/surge?${q}`);
  },
  stock: (params?: Record<string, string>) => {
    const q = new URLSearchParams(params || {});
    return request<any>(`/analytics/stock?${q}`);
  },
  funnel: (district?: string) =>
    request<any>(`/analytics/funnel${district ? `?district=${encodeURIComponent(district)}` : ''}`),
  hotspots: (params?: Record<string, string>) => {
    const q = new URLSearchParams(params || {});
    const suffix = q.toString() ? `?${q}` : '';
    return request<any>(`/analytics/hotspots${suffix}`);
  },
  facilities: () => request<any[]>('/facilities'),
  sync: (items: unknown[]) =>
    request('/sync', { method: 'POST', body: JSON.stringify({ items }) }),
  extract: (text: string, language: string) =>
    request('/nlp/extract', { method: 'POST', body: JSON.stringify({ text, language }) }),
  aiExtract: (body: {
    free_text: string;
    language?: string;
    age_months?: number;
    sex?: string;
    temperature_c?: number;
    fever_days?: number;
    tdr_result?: string;
  }) => request<Record<string, unknown>>('/ai/extract-symptoms', { method: 'POST', body: JSON.stringify(body) }),
  aiExplain: (body: {
    decision: string;
    reasons?: string[];
    triggered_rules?: string[];
    language?: string;
  }) => request<Record<string, unknown>>('/ai/explain', { method: 'POST', body: JSON.stringify(body) }),
  aiInsights: (body: { aggregated_stats: Record<string, unknown>; language?: string }) =>
    request<Record<string, unknown>>('/ai/insights', { method: 'POST', body: JSON.stringify(body) }),
  assistantChat: (body: { message: string; language?: string; decision?: string }) =>
    request<Record<string, unknown>>('/assistant/chat', { method: 'POST', body: JSON.stringify(body) }),
  voiceSpeak: (body: { phrase_id: string; language?: string; text: string }) =>
    request<Record<string, unknown>>('/voice/speak', { method: 'POST', body: JSON.stringify(body) }),
};
