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
      'help_weight',
      'help_pregnant_first_trimester',
      'help_aspy_allergy',
      'help_severe_liver_disease',
      'help_severe_renal_disease',
      'help_recent_malaria_treatment_failure',
      'help_aspy_in_stock',
      'help_freetext',
    ] as PhraseId[];
    for (const id of helpIds) {
      expect(PHRASES[id]?.en?.trim()).toBeTruthy();
      expect(PHRASES[id]?.rw?.trim()).toBeTruthy();
    }
  });

  it('includes spoken Kinyarwanda prompts for every treatment-safety step', () => {
    const ids = [
      'weight',
      'pregnant_first_trimester',
      'aspy_allergy',
      'severe_liver_disease',
      'severe_renal_disease',
      'recent_malaria_treatment_failure',
      'aspy_in_stock',
    ] as PhraseId[];
    for (const id of ids) expect(PHRASES[id]?.rw?.trim()).toBeTruthy();
  });
});
