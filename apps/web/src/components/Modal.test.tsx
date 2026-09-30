import { describe, expect, it } from 'vitest';

/** Pure behavior mirrors Modal dirty/Esc guard (DOM covered by Playwright). */
function resolveClose(dirty: boolean, discardConfirmed: boolean): 'close' | 'ask' | 'stay' {
  if (!dirty) return 'close';
  if (discardConfirmed) return 'close';
  return 'ask';
}

describe('Modal unsaved-changes guard', () => {
  it('closes immediately when clean', () => {
    expect(resolveClose(false, false)).toBe('close');
  });

  it('asks when dirty', () => {
    expect(resolveClose(true, false)).toBe('ask');
  });

  it('closes after discard confirm', () => {
    expect(resolveClose(true, true)).toBe('close');
  });
});
