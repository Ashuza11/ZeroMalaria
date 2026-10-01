export type Role = 'CHW' | 'HEALTH_CENTER' | 'RBC_ADMIN' | 'SUPER_ADMIN';

export type Env = {
  DB: D1Database;
  ASSETS: Fetcher;
  AUTH_SECRET?: string;
  DEMO_MODE?: string;
  OVERDUE_HOURS?: string;
  PINDO_ACCESS_MODE?: 'public' | 'authenticated';
  PINDO_API_TOKEN?: string;
  PINDO_API_BASE_URL?: string;
  CLAUDE_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  CLAUDE_MODEL?: string;
};

export type DbUser = {
  id: string;
  username: string;
  password_hash: string;
  display_name: string;
  role: Role;
  district: string;
  facility_id: string;
  village: string;
  chw_code: string;
  active: number;
};

export type PublicUser = Omit<DbUser, 'password_hash' | 'active'> & {
  email: string;
  phone: string;
  village_id: string;
  active: boolean;
  permissions: string[];
  must_change_password: boolean;
  password_prompt_status: 'dismissed';
};

export type TokenPayload = {
  sub: string;
  username: string;
  role: Role;
  exp: number;
};
