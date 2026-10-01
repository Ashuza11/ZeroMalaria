import type { DbUser, Env, PublicUser, Role, TokenPayload } from './types';

const encoder = new TextEncoder();

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function base64url(value: string | ArrayBuffer): string {
  const bytes = typeof value === 'string' ? encoder.encode(value) : new Uint8Array(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function decodeBase64url(value: string): string {
  const padded = value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - (value.length % 4)) % 4);
  return atob(padded);
}

async function hmac(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return base64url(await crypto.subtle.sign('HMAC', key, encoder.encode(value)));
}

function authSecret(env: Env): string {
  if (env.AUTH_SECRET) return env.AUTH_SECRET;
  if (env.DEMO_MODE === 'true') return 'local-demo-secret-change-before-deploy';
  throw new Error('AUTH_SECRET is required');
}

export async function createToken(user: DbUser, env: Env): Promise<string> {
  const payload: TokenPayload = {
    sub: user.id,
    username: user.username,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + 8 * 60 * 60,
  };
  const encoded = base64url(JSON.stringify(payload));
  return `${encoded}.${await hmac(encoded, authSecret(env))}`;
}

export async function verifyToken(token: string, env: Env): Promise<TokenPayload | null> {
  const [payloadPart, signature] = token.split('.');
  if (!payloadPart || !signature) return null;
  const expected = await hmac(payloadPart, authSecret(env));
  if (signature !== expected) return null;
  try {
    const payload = JSON.parse(decodeBase64url(payloadPart)) as TokenPayload;
    return payload.exp > Math.floor(Date.now() / 1000) ? payload : null;
  } catch {
    return null;
  }
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, salt, expected] = stored.split('$');
  if (scheme !== 'pbkdf2' || !salt || !expected) return false;
  const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: encoder.encode(salt), iterations: 100_000 },
    material,
    256,
  );
  return bytesToHex(new Uint8Array(derived)) === expected;
}

export function permissionsFor(role: Role): string[] {
  if (role === 'CHW') return ['triage:write', 'referrals:own', 'voice:use'];
  if (role === 'HEALTH_CENTER') return ['referrals:facility', 'referrals:status', 'messages:write'];
  if (role === 'RBC_ADMIN') return ['analytics:read', 'referrals:all', 'stock:read'];
  return ['*'];
}

export function publicUser(user: DbUser): PublicUser {
  const { password_hash: _passwordHash, active, ...safe } = user;
  return {
    ...safe,
    email: '',
    phone: '',
    village_id: '',
    active: Boolean(active),
    permissions: permissionsFor(user.role),
    must_change_password: false,
    password_prompt_status: 'dismissed',
  };
}

export async function currentUser(request: Request, env: Env): Promise<DbUser | null> {
  const header = request.headers.get('authorization') || '';
  if (!header.toLowerCase().startsWith('bearer ')) return null;
  const payload = await verifyToken(header.slice(7).trim(), env);
  if (!payload) return null;
  const user = await env.DB.prepare('SELECT * FROM users WHERE id = ? AND active = 1')
    .bind(payload.sub)
    .first<DbUser>();
  return user || null;
}

export function canAccessReferral(user: DbUser, referral: { facility_id: string; chw_id: string }): boolean {
  if (user.role === 'RBC_ADMIN' || user.role === 'SUPER_ADMIN') return true;
  if (user.role === 'HEALTH_CENTER') return user.facility_id === referral.facility_id;
  return user.chw_code === referral.chw_id;
}
