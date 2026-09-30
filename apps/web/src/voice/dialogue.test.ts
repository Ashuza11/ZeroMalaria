import { describe, expect, it } from 'vitest';
import { PHRASES } from './phrases';
import { TRIAGE_DIALOGUE, TRIAGE_DIALOGUE_ORDER } from './dialogue';

describe('TRIAGE_DIALOGUE completeness', () => {
  it('every step has a phrase in the catalog', () => {
    for (const id of TRIAGE_DIALOGUE_ORDER) {
      const node = TRIAGE_DIALOGUE[id];
      expect(node).toBeDefined();
      expect(PHRASES[node.phraseId]).toBeDefined();
      if (node.repromptPhraseId) expect(PHRASES[node.repromptPhraseId]).toBeDefined();
      if (node.helpPhraseId) expect(PHRASES[node.helpPhraseId]).toBeDefined();
    }
  });

  it('chains from age through tdr', () => {
    expect(TRIAGE_DIALOGUE.age.next).toBe('sex');
    expect(TRIAGE_DIALOGUE.tdr.next).toBeNull();
  });
});
