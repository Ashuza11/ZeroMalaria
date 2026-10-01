import { afterEach, describe, expect, it, vi } from 'vitest';
import { pindoAccessMode, speakWithPindo } from '../src/pindo';
import type { Env } from '../src/types';

const env = (values: Partial<Env> = {}) => values as Env;

describe('Pindo access mode', () => {
  afterEach(() => vi.unstubAllGlobals());
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

  it('falls back to public TTS when authenticated balance is exhausted', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ error: { details: 'Insufficient balance', message: 'Insufficient balance' } }),
          { status: 409, headers: { 'content-type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { generated_audio_url: 'audio/test.wav' } }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const url = await speakWithPindo(env({ PINDO_API_TOKEN: 'real-token' }), 'Muraho', 1);

    expect(url).toBe('https://api.pindo.io/audio/test.wav');
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://api.pindo.io/ai/tts/rw/public',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
