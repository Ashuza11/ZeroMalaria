import { describe, expect, it } from 'vitest';
import { parseVoiceIntents } from './VoiceContext';

describe('VoiceContext STT intents', () => {
  it('requires explicit confirm before applying (confirming state)', () => {
    const intents = parseVoiceIntents('yego', 'rw');
    expect(intents.yes).toBe(true);
    expect(intents.no).toBeUndefined();
  });

  it('parses English yes/no', () => {
    expect(parseVoiceIntents('no', 'en').no).toBe(true);
    expect(parseVoiceIntents('yes', 'en').yes).toBe(true);
  });

  it('parses TDR intents', () => {
    expect(parseVoiceIntents('negative', 'en').negative).toBe(true);
    expect(parseVoiceIntents('invalid', 'en').invalid).toBe(true);
  });
});
