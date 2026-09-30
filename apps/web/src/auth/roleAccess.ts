import type { UserRole } from './AuthContext';

const VIEW_KEY = 'zm_preferred_view';

export type PreferredView = 'web' | 'mobile' | 'auto';

export function getPreferredView(): PreferredView {
  const v = localStorage.getItem(VIEW_KEY);
  if (v === 'web' || v === 'mobile') return v;
  return 'auto';
}

export function setPreferredView(view: PreferredView) {
  localStorage.setItem(VIEW_KEY, view);
}

function isDesktopViewport() {
  return typeof window !== 'undefined' && window.innerWidth >= 1024;
}

function isMobileViewport() {
  return typeof window !== 'undefined' && window.innerWidth < 768;
}

/** Paths each role may open (prefix match). */
const ROLE_ALLOW: Record<UserRole, string[]> = {
  chw: [
    '/m',
    '/app/chw',
    '/app/my-referrals',
    '/app/my-patients',
    '/app/alerts',
    '/app/settings',
    '/app/not-authorized',
    '/login',
  ],
  nurse: [
    '/app/referrals',
    '/app/patients',
    '/app/settings',
    '/app/not-authorized',
    '/login',
    '/m',
  ],
  supervisor: ['/app', '/login', '/m', '/app/not-authorized'],
  rbc: ['/app', '/login', '/m', '/app/not-authorized'],
};

const BLOCKED_FOR_CHW = [
  '/app/dashboard',
  '/app/analytics',
  '/app/supplies',
  '/app/users',
  '/app/referrals',
];

const BLOCKED_FOR_NURSE = ['/app/dashboard', '/app/analytics', '/app/supplies', '/app/users', '/app/chw'];

export function homePath(role: UserRole): string {
  const pref = getPreferredView();
  const wantMobile = pref === 'mobile' || (pref === 'auto' && isMobileViewport());
  const wantWeb = pref === 'web' || (pref === 'auto' && isDesktopViewport());

  if (role === 'chw') {
    if (wantMobile && !wantWeb) return '/m/home';
    if (wantWeb || isDesktopViewport()) return '/app/chw';
    return '/m/home';
  }
  if (role === 'nurse') return '/app/referrals';
  if (role === 'supervisor') return '/app/dashboard';
  return '/app/dashboard';
}

export function canAccess(path: string, role: UserRole | null | undefined): boolean {
  if (!role) return path === '/login' || path.startsWith('/lang');
  const normalized = path.split('?')[0];
  if (normalized === '/login' || normalized.startsWith('/app/not-authorized')) return true;

  if (role === 'chw') {
    if (BLOCKED_FOR_CHW.some((p) => normalized === p || normalized.startsWith(`${p}/`))) return false;
    if (normalized === '/app' || normalized === '/app/') return false;
    return ROLE_ALLOW.chw.some((p) => normalized === p || normalized.startsWith(`${p}/`) || normalized === p);
  }

  if (role === 'nurse') {
    if (BLOCKED_FOR_NURSE.some((p) => normalized === p || normalized.startsWith(`${p}/`))) return false;
    if (normalized === '/app' || normalized === '/app/dashboard') return false;
    return ROLE_ALLOW.nurse.some((p) => normalized === p || normalized.startsWith(`${p}/`));
  }

  // supervisor / rbc: full /app except nothing blocked
  return ROLE_ALLOW[role].some((p) => normalized === p || normalized.startsWith(`${p}/`));
}

export { ROLE_ALLOW as ROLE_PREFIXES };
