import { describe, expect, it } from 'vitest';
import { pindoAccessMode } from '../src/pindo';
import type { Env } from '../src/types';

const env = (values: Partial<Env> = {}) => values as Env;

describe('Pindo access mode', () => {
  it('uses the public endpoint when no token is configured', () => {
    expect(pindoAccessMode(env())).toBe('public');
  });

  it('uses authenticated access when a real token is present', () => {
    expect(pindoAccessMode(env({ PINDO_API_TOKEN: 'real-token' }))).toBe('authenticated');
  });

  it('does not treat the example placeholder as a real token', () => {
    expect(pindoAccessMode(env({ PINDO_API_TOKEN: 'your-token' }))).toBe('public');
  });

  it('allows an explicit mode override', () => {
    expect(pindoAccessMode(env({ PINDO_API_TOKEN: 'real-token', PINDO_ACCESS_MODE: 'public' }))).toBe('public');
  });
});
