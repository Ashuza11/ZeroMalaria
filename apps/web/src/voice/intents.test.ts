import { describe, expect, it } from 'vitest';
import { parseVoiceIntents } from './intents';

describe('parseVoiceIntents', () => {
  it('parses English yes/no', () => {
    expect(parseVoiceIntents('yes', 'en').yes).toBe(true);
    expect(parseVoiceIntents('no', 'en').no).toBe(true);
    expect(parseVoiceIntents('nope', 'en').no).toBe(true);
  });

  it('parses Kinyarwanda yes/no', () => {
    expect(parseVoiceIntents('yego', 'rw').yes).toBe(true);
    expect(parseVoiceIntents('oya', 'rw').no).toBe(true);
  });

  it('parses numbers', () => {
    expect(parseVoiceIntents('28 months', 'en').number).toBe(28);
    expect(parseVoiceIntents('39.4', 'en').number).toBe(39.4);
  });

  it('parses TDR and sex intents', () => {
    expect(parseVoiceIntents('positive', 'en').positive).toBe(true);
    expect(parseVoiceIntents('invalid', 'en').invalid).toBe(true);
    expect(parseVoiceIntents('female', 'en').female).toBe(true);
    expect(parseVoiceIntents('umugabo', 'rw').male).toBe(true);
  });
});
