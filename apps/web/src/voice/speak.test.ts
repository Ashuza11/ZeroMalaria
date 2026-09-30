import { describe, expect, it, vi, beforeEach } from 'vitest';
import { browserTtsMatchesLang } from './speak';

describe('browserTtsMatchesLang', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      speechSynthesis: {
        getVoices: () => [],
      },
    });
  });

  it('allows English fallback when voice list is empty', () => {
    expect(browserTtsMatchesLang('en')).toBe(true);
  });

  it('does not allow Kinyarwanda when only English voices exist', () => {
    vi.stubGlobal('window', {
      speechSynthesis: {
        getVoices: () => [{ lang: 'en-US', name: 'English' }],
      },
    });
    expect(browserTtsMatchesLang('rw')).toBe(false);
    expect(browserTtsMatchesLang('en')).toBe(true);
  });

  it('matches Kinyarwanda voices (rw, rw-RW, kin)', () => {
    vi.stubGlobal('window', {
      speechSynthesis: {
        getVoices: () => [
          { lang: 'rw-RW', name: 'Kinyarwanda' },
          { lang: 'en-US', name: 'English' },
        ],
      },
    });
    expect(browserTtsMatchesLang('rw')).toBe(true);
  });
});
