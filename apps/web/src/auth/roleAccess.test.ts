import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  canAccess,
  homePath,
  mapPathAcrossShells,
  normalizeRole,
  setPreferredView,
  webHomePath,
} from './roleAccess';

const store = new Map<string, string>();

function stubViewport(width: number) {
  store.clear();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
  });
  vi.stubGlobal('window', { innerWidth: width });
}

describe('normalizeRole', () => {
  it('maps legacy roles onto the 4-role set', () => {
    expect(normalizeRole('chw')).toBe('CHW');
    expect(normalizeRole('nurse')).toBe('HEALTH_CENTER');
    expect(normalizeRole('supervisor')).toBe('RBC_ADMIN');
    expect(normalizeRole('rbc')).toBe('RBC_ADMIN');
    expect(normalizeRole('SUPERVISOR')).toBe('RBC_ADMIN');
    expect(normalizeRole('RBC_OFFICER')).toBe('RBC_ADMIN');
  });

  it('passthrough current roles', () => {
    expect(normalizeRole('HEALTH_CENTER')).toBe('HEALTH_CENTER');
    expect(normalizeRole('SUPER_ADMIN')).toBe('SUPER_ADMIN');
  });
});

describe('canAccess', () => {
  it('denies CHW dashboard', () => {
    expect(canAccess('/app/dashboard', 'CHW')).toBe(false);
  });

  it('denies HEALTH_CENTER analytics', () => {
    expect(canAccess('/app/analytics', 'HEALTH_CENTER')).toBe(false);
  });

  it('allows RBC_ADMIN dashboard', () => {
    expect(canAccess('/app/dashboard', 'RBC_ADMIN')).toBe(true);
    expect(canAccess('/app/dashboard', 'rbc')).toBe(true);
  });

  it('allows CHW /app/home', () => {
    expect(canAccess('/app/home', 'CHW')).toBe(true);
  });

  it('allows SUPER_ADMIN demo board', () => {
    expect(canAccess('/demo/board', 'SUPER_ADMIN')).toBe(true);
  });
});

describe('homePath viewport', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('desktop auto → role-specific web home', () => {
    stubViewport(1440);
    setPreferredView('auto');
    expect(homePath('CHW')).toBe('/app/home');
    expect(homePath('HEALTH_CENTER')).toBe('/app/referrals');
    expect(homePath('RBC_ADMIN')).toBe('/app/dashboard');
    expect(homePath('nurse')).toBe('/app/referrals');
  });

  it('mobile auto → /m/home for CHW', () => {
    stubViewport(390);
    setPreferredView('auto');
    expect(homePath('CHW')).toBe('/m/home');
  });
});

describe('webHomePath', () => {
  it('maps legacy supervisor/officer to RBC dashboard', () => {
    expect(webHomePath('SUPERVISOR')).toBe('/app/dashboard');
    expect(webHomePath('RBC_OFFICER')).toBe('/app/dashboard');
  });
});

describe('mapPathAcrossShells', () => {
  it('maps mobile referrals for HEALTH_CENTER', () => {
    expect(mapPathAcrossShells('/m/referrals', false, 'HEALTH_CENTER')).toBe('/app/referrals');
  });
});
