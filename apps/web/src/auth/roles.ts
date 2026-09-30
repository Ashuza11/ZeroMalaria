export type UserRole = 'CHW' | 'HEALTH_CENTER' | 'RBC_ADMIN' | 'SUPER_ADMIN';

export const ALL_ROLES: UserRole[] = ['CHW', 'HEALTH_CENTER', 'RBC_ADMIN', 'SUPER_ADMIN'];

/** National / admin roles with broad /app access. */
export const BROAD_ROLES: UserRole[] = ['RBC_ADMIN', 'SUPER_ADMIN'];

export const NATIONAL_ROLES: UserRole[] = ['RBC_ADMIN', 'SUPER_ADMIN'];

const LEGACY_ROLE_MAP: Record<string, UserRole> = {
  chw: 'CHW',
  nurse: 'HEALTH_CENTER',
  supervisor: 'RBC_ADMIN',
  rbc: 'RBC_ADMIN',
  SUPERVISOR: 'RBC_ADMIN',
  RBC_OFFICER: 'RBC_ADMIN',
  CHW: 'CHW',
  HEALTH_CENTER: 'HEALTH_CENTER',
  RBC_ADMIN: 'RBC_ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
};

/** Map legacy session / API roles → current 4-role set. */
export function normalizeRole(role: string | null | undefined): UserRole {
  if (!role) return 'CHW';
  return LEGACY_ROLE_MAP[role] ?? LEGACY_ROLE_MAP[role.toUpperCase()] ?? 'CHW';
}

export function roleI18nKey(role: string | null | undefined): string {
  const r = normalizeRole(role);
  const map: Record<UserRole, string> = {
    CHW: 'auth.roleChw',
    HEALTH_CENTER: 'auth.roleHealthCenter',
    RBC_ADMIN: 'auth.roleRbcAdmin',
    SUPER_ADMIN: 'auth.roleSuperAdmin',
  };
  return map[r];
}

/** Roles the actor may assign when creating/editing users. */
export function assignableRoles(actorRole: string | null | undefined): UserRole[] {
  const a = normalizeRole(actorRole);
  if (a === 'SUPER_ADMIN') return [...ALL_ROLES];
  if (a === 'RBC_ADMIN') return ['HEALTH_CENTER', 'CHW'];
  return [];
}
