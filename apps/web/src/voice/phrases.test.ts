import { describe, expect, it } from 'vitest';
import { MALARIA_RULES } from '../rules/malariaRules.generated';
import { PHRASES, type PhraseId } from './phrases';

describe('voice phrase catalog', () => {
  it('includes reason phrases for every danger sign and rule id', () => {
    const ids = [
      ...MALARIA_RULES.danger_signs.map((d) => d.id),
      ...MALARIA_RULES.rules.map((r) => r.id),
    ];
    const missing: string[] = [];
    for (const id of ids) {
      const key = `reason_${id}` as PhraseId;
      const entry = PHRASES[key];
      if (!entry?.en?.trim()) missing.push(`${key} en`);
      if (!entry?.rw?.trim()) missing.push(`${key} rw`);
    }
    expect(missing, missing.join(', ')).toEqual([]);
  });

  it('includes help phrases for triage steps', () => {
    const helpIds = [
      'help_age',
      'help_sex',
      'help_temperature',
      'help_fever_days',
      'help_convulsions',
      'help_unable_to_drink',
      'help_vomiting_everything',
      'help_lethargy',
      'help_severe_breathing_difficulty',
      'help_tdr',
      'help_freetext',
    ] as PhraseId[];
    for (const id of helpIds) {
      expect(PHRASES[id]?.en?.trim()).toBeTruthy();
      expect(PHRASES[id]?.rw?.trim()).toBeTruthy();
    }
  });
});
