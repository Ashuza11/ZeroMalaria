const API_BASE = import.meta.env.VITE_API_BASE || '/api';
export const SESSION_KEY = 'zm_session';

export type PasswordPromptStatus = 'pending' | 'changed' | 'dismissed';

export type AuthUser = {
  id: string;
  username: string;
  email?: string;
  display_name: string;
  role: 'CHW' | 'HEALTH_CENTER' | 'RBC_ADMIN' | 'SUPER_ADMIN';
  phone: string;
  district: string;
  facility_id: string;
  village: string;
  village_id?: string;
  chw_code: string;
  active: boolean;
  permissions?: string[];
  /** Legacy; only true under enforce+pending. Prefer password_prompt_status. */
  must_change_password?: boolean;
  password_prompt_status?: PasswordPromptStatus;
  deleted_at?: string | null;
  version?: number;
};

export type LoginResponse = {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  user: AuthUser;
  must_change_password?: boolean;
  password_prompt_status?: PasswordPromptStatus;
  password_change_policy?: 'prompt' | 'enforce';
};

export type PageResult<T> = {
  items: T[];
  total: number;
  page: number;
  page_size: number;
};

export type LiveWireEvent = {
  type: string;
  payload: Record<string, unknown>;
  at: string;
};

export type ReferralMessage = {
  id: string;
  referral_id: string;
  sender_id?: string | null;
  sender_role: string;
  body: string;
  created_at: string;
  read_at?: string | null;
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
    const err = new Error(text || res.statusText) as Error & { status?: number };
    err.status = res.status;
    throw err;
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
  listUsers: (params?: Record<string, string | number | undefined>) => {
    const q = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== '') q.set(k, String(v));
    });
    const suffix = q.toString() ? `?${q}` : '';
    return request<PageResult<AuthUser>>(`/users${suffix}`);
  },
  createUser: (body: {
    username: string;
    password: string;
    display_name: string;
    role?: string;
    email?: string;
    phone?: string;
    district?: string;
    facility_id?: string;
    village?: string;
    village_id?: string;
    chw_code?: string;
  }) => request<AuthUser>('/users', { method: 'POST', body: JSON.stringify(body) }),
  patchUser: (
    userId: string,
    body: Partial<{
      active: boolean;
      role: string;
      facility_id: string;
      village: string;
      village_id: string;
      district: string;
      phone: string;
      email: string;
      display_name: string;
      version: number;
    }>,
  ) => request<AuthUser>(`/users/${userId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  softDeleteUser: (userId: string) =>
    request<AuthUser>(`/users/${userId}`, { method: 'DELETE' }),
  restoreUser: (userId: string) =>
    request<AuthUser>(`/users/${userId}/restore`, { method: 'POST' }),
  resetPassword: (userId: string) =>
    request<{ temporary_password: string }>(`/users/${userId}/reset-password`, { method: 'POST' }),
  changePassword: (current_password: string, new_password: string) =>
    request<{ ok: boolean; password_prompt_status?: PasswordPromptStatus }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ current_password, new_password }),
    }),
  dismissPasswordPrompt: () =>
    request<{ ok: boolean; password_prompt_status?: PasswordPromptStatus }>(
      '/auth/password-prompt/dismiss',
      { method: 'POST' },
    ),
  rbacMatrix: () =>
    request<{ roles: string[]; permissions: string[]; granted: Record<string, string[]> }>('/rbac/matrix'),
  rbacToggle: (role_code: string, permission_code: string, allowed: boolean) =>
    request('/rbac/matrix/toggle', {
      method: 'POST',
      body: JSON.stringify({ role_code, permission_code, allowed }),
    }),
  listAuditLogs: (params?: Record<string, string | number | undefined>) => {
    const q = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== '') q.set(k, String(v));
    });
    const suffix = q.toString() ? `?${q}` : '';
    return request<PageResult<Record<string, unknown>>>(`/admin/audit-logs${suffix}`);
  },
  listAdminFacilities: (params?: Record<string, string | number | undefined>) => {
    const q = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== '') q.set(k, String(v));
    });
    const suffix = q.toString() ? `?${q}` : '';
    return request<PageResult<Record<string, unknown>>>(`/admin/facilities${suffix}`);
  },
  listAdminStock: (params?: Record<string, string | number | undefined>) => {
    const q = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== '') q.set(k, String(v));
    });
    const suffix = q.toString() ? `?${q}` : '';
    return request<PageResult<Record<string, unknown>>>(`/admin/stock${suffix}`);
  },
  getConfig: () => request<{ key: string; value: string; label: string }[]>('/admin/config'),
  patchConfig: (key: string, value: string) =>
    request<{ key: string; value: string; label: string }>(`/admin/config/${key}`, {
      method: 'PATCH',
      body: JSON.stringify({ value }),
    }),

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
  pollEvents: (since?: string) => {
    const q = since ? `?since=${encodeURIComponent(since)}` : '';
    return request<{ events: LiveWireEvent[]; server_at: string }>(`/events/poll${q}`);
  },
  listReferralMessages: (referralId: string) =>
    request<ReferralMessage[]>(`/referrals/${referralId}/messages`),
  postReferralMessage: (referralId: string, body: string) =>
    request<ReferralMessage>(`/referrals/${referralId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    }),
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
  aiAdvisory: (body: {
    answers: Record<string, unknown>;
    rules_decision: string;
    public_decision?: string;
    reasons?: string[];
    triggered_rules?: string[];
    reason_details?: unknown[];
    missing_info?: string[];
    protocol_reference?: string;
    language?: string;
  }) => request<Record<string, unknown>>('/ai/advisory', { method: 'POST', body: JSON.stringify(body) }),
  aiAdvisoryFeedback: (body: {
    rules_decision: string;
    chw_followed: boolean;
    suggested_escalation?: boolean;
  }) =>
    request<Record<string, unknown>>('/ai/advisory-feedback', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  aiInsights: (body: { aggregated_stats: Record<string, unknown>; language?: string }) =>
    request<Record<string, unknown>>('/ai/insights', { method: 'POST', body: JSON.stringify(body) }),
  assistantChat: (body: { message: string; language?: string; decision?: string }) =>
    request<Record<string, unknown>>('/assistant/chat', { method: 'POST', body: JSON.stringify(body) }),
  voiceSpeak: (body: { phrase_id: string; language?: string; text: string }) =>
    request<Record<string, unknown>>('/voice/speak', { method: 'POST', body: JSON.stringify(body) }),
};
