import { describe, expect, it, vi } from 'vitest';

vi.mock('./AuthContext', () => ({
  useAuth: () => ({
    user: { permissions: ['users:read', 'users:create'] },
  }),
}));

import { useCan } from './permissions';

describe('useCan', () => {
  it('returns true for granted permission', () => {
    expect(useCan('users:create')).toBe(true);
  });

  it('returns false for missing permission', () => {
    expect(useCan('users:delete')).toBe(false);
  });
});
