import { describe, expect, it } from 'vitest';
import { canAccess } from './roleAccess';

describe('canAccess', () => {
  it('denies CHW dashboard', () => {
    expect(canAccess('/app/dashboard', 'chw')).toBe(false);
  });

  it('denies nurse analytics', () => {
    expect(canAccess('/app/analytics', 'nurse')).toBe(false);
  });

  it('allows RBC dashboard', () => {
    expect(canAccess('/app/dashboard', 'rbc')).toBe(true);
  });
});
