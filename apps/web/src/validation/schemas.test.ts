import { describe, expect, it } from 'vitest';
import { loginSchema } from './schemas';

describe('loginSchema', () => {
  it('accepts valid credentials', () => {
    const result = loginSchema.safeParse({
      username: 'chw.demo',
      password: 'password1',
    });
    expect(result.success).toBe(true);
  });

  it('rejects short username', () => {
    const result = loginSchema.safeParse({
      username: 'ab',
      password: 'password1',
    });
    expect(result.success).toBe(false);
  });

  it('rejects short password', () => {
    const result = loginSchema.safeParse({
      username: 'chw.demo',
      password: 'short',
    });
    expect(result.success).toBe(false);
  });
});
