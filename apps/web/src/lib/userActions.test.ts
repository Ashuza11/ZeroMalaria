import { describe, expect, it } from 'vitest';
import type { AuthUser } from '../api/client';
import { gateUserAction } from './userActions';

const actor = (over: Partial<AuthUser> = {}): AuthUser => ({
  id: 'a1',
  username: 'admin',
  display_name: 'Admin',
  role: 'SUPER_ADMIN',
  phone: '',
  district: '',
  facility_id: '',
  village: '',
  chw_code: '',
  active: true,
  permissions: ['users:read', 'users:create', 'users:update', 'users:delete'],
  ...over,
});

const target = (over: Partial<AuthUser> = {}): AuthUser => ({
  id: 't1',
  username: 'chw1',
  display_name: 'CHW One',
  role: 'CHW',
  phone: '',
  district: 'Gasabo',
  facility_id: 'F1',
  village: 'V1',
  chw_code: 'CHW-1',
  active: true,
  ...over,
});

describe('gateUserAction', () => {
  it('shows view/edit/reset/deactivate/delete for SUPER_ADMIN on CHW', () => {
    const ctx = { actor: actor(), target: target(), permissions: actor().permissions!, superAdminCount: 2 };
    expect(gateUserAction('view', ctx).show).toBe(true);
    expect(gateUserAction('edit', ctx).disabled).toBe(false);
    expect(gateUserAction('resetPassword', ctx).disabled).toBe(false);
    expect(gateUserAction('deactivate', ctx).disabled).toBe(false);
    expect(gateUserAction('delete', ctx).disabled).toBe(false);
  });

  it('disables self deactivate/delete', () => {
    const self = actor({ id: 'same' });
    const ctx = {
      actor: self,
      target: target({ id: 'same', role: 'SUPER_ADMIN' }),
      permissions: self.permissions!,
      superAdminCount: 2,
    };
    expect(gateUserAction('deactivate', ctx).disabled).toBe(true);
    expect(gateUserAction('delete', ctx).reasonKey).toBe('users.forbiddenSelf');
  });

  it('disables last SUPER_ADMIN delete', () => {
    const ctx = {
      actor: actor(),
      target: target({ role: 'SUPER_ADMIN', id: 's2' }),
      permissions: actor().permissions!,
      superAdminCount: 1,
    };
    expect(gateUserAction('delete', ctx).reasonKey).toBe('users.forbiddenLastSuper');
  });

  it('hides mutate actions without permission', () => {
    const ctx = {
      actor: actor({ permissions: ['users:read'] }),
      target: target(),
      permissions: ['users:read'],
    };
    expect(gateUserAction('edit', ctx).show).toBe(false);
    expect(gateUserAction('delete', ctx).show).toBe(false);
    expect(gateUserAction('view', ctx).show).toBe(true);
  });

  it('shows restore only for deleted rows', () => {
    const ctx = {
      actor: actor(),
      target: target({ deleted_at: '2026-01-01', active: false }),
      permissions: actor().permissions!,
    };
    expect(gateUserAction('delete', ctx).show).toBe(false);
    expect(gateUserAction('restore', ctx).show).toBe(true);
  });
});
