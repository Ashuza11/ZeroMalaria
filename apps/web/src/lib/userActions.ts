import type { AuthUser } from '../api/client';
import { normalizeRole, type UserRole } from '../auth/roles';

const RANK: Record<UserRole, number> = {
  CHW: 1,
  HEALTH_CENTER: 2,
  RBC_ADMIN: 3,
  SUPER_ADMIN: 4,
};

export type UserAction =
  | 'view'
  | 'edit'
  | 'resetPassword'
  | 'activate'
  | 'deactivate'
  | 'delete'
  | 'restore';

export type ActionGate = {
  show: boolean;
  disabled: boolean;
  reasonKey?: string;
};

type GateCtx = {
  actor: AuthUser | null | undefined;
  target: AuthUser;
  permissions: string[];
  superAdminCount?: number;
};

function canManageRole(actorRole: UserRole, targetRole: UserRole): boolean {
  if (actorRole === 'SUPER_ADMIN') return true;
  if (targetRole === 'SUPER_ADMIN' || targetRole === 'RBC_ADMIN') return false;
  if (actorRole === 'RBC_ADMIN') return targetRole === 'HEALTH_CENTER' || targetRole === 'CHW';
  return false;
}

/** Permission + scope gating for Users row actions. */
export function gateUserAction(action: UserAction, ctx: GateCtx): ActionGate {
  const { actor, target, permissions, superAdminCount = 2 } = ctx;
  if (!actor) return { show: false, disabled: true };

  const aRole = normalizeRole(actor.role);
  const tRole = normalizeRole(target.role);
  const deleted = Boolean(target.deleted_at);
  const isSelf = actor.id === target.id;
  const inScope = canManageRole(aRole, tRole) || (aRole === 'SUPER_ADMIN' && action === 'view');
  const higher = RANK[tRole] > RANK[aRole];

  if (action === 'view') {
    return { show: permissions.includes('users:read'), disabled: false };
  }

  if (action === 'restore') {
    if (!deleted || !permissions.includes('users:delete')) return { show: false, disabled: true };
    if (!inScope || higher) return { show: true, disabled: true, reasonKey: 'users.forbiddenHigher' };
    return { show: true, disabled: false };
  }

  if (deleted) return { show: false, disabled: true };

  if (action === 'edit') {
    if (!permissions.includes('users:update')) return { show: false, disabled: true };
    if (isSelf && aRole !== 'SUPER_ADMIN')
      return { show: true, disabled: true, reasonKey: 'users.forbiddenSelf' };
    if (!inScope || higher) return { show: true, disabled: true, reasonKey: 'users.forbiddenHigher' };
    return { show: true, disabled: false };
  }

  if (action === 'resetPassword') {
    if (!permissions.includes('users:update')) return { show: false, disabled: true };
    if (isSelf) return { show: true, disabled: true, reasonKey: 'users.forbiddenSelf' };
    if (!inScope || higher) return { show: true, disabled: true, reasonKey: 'users.forbiddenHigher' };
    return { show: true, disabled: false };
  }

  if (action === 'deactivate' || action === 'activate') {
    if (!permissions.includes('users:update')) return { show: false, disabled: true };
    const wantsDeactivate = action === 'deactivate';
    if (wantsDeactivate !== target.active) return { show: false, disabled: true };
    if (isSelf) return { show: true, disabled: true, reasonKey: 'users.forbiddenSelf' };
    if (wantsDeactivate && tRole === 'SUPER_ADMIN' && superAdminCount <= 1) {
      return { show: true, disabled: true, reasonKey: 'users.forbiddenLastSuper' };
    }
    if (!inScope || higher) return { show: true, disabled: true, reasonKey: 'users.forbiddenHigher' };
    return { show: true, disabled: false };
  }

  if (action === 'delete') {
    if (!permissions.includes('users:delete')) return { show: false, disabled: true };
    if (isSelf) return { show: true, disabled: true, reasonKey: 'users.forbiddenSelf' };
    if (tRole === 'SUPER_ADMIN' && superAdminCount <= 1) {
      return { show: true, disabled: true, reasonKey: 'users.forbiddenLastSuper' };
    }
    if (!inScope || higher) return { show: true, disabled: true, reasonKey: 'users.forbiddenHigher' };
    return { show: true, disabled: false };
  }

  return { show: false, disabled: true };
}

export function generateTempPassword(): string {
  const hex = Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `Tmp-${hex}Aa1`;
}
