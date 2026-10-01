import { describe, expect, it } from 'vitest';
import { decisionRank, evaluateRules, maxDecision } from './engine';

const base = {
  age_months: 36,
  sex: 'female' as const,
  temperature_c: 38.6,
  fever_days: 2,
  convulsions: false,
  unable_to_drink: false,
  vomiting_everything: false,
  lethargy: false,
  severe_breathing_difficulty: false,
  tdr_result: 'positive' as const,
  weight_kg: 25,
  pregnant_first_trimester: false,
  aspy_allergy: false,
  severe_liver_disease: false,
  severe_renal_disease: false,
  recent_malaria_treatment_failure: false,
  aspy_in_stock: true,
};

describe('offline rules engine', () => {
  it('treats simple malaria at home', () => {
    const result = evaluateRules(base);
    expect(result.decision).toBe('treat_at_home');
    expect(result.treatment_plan?.medicine).toContain('ASPY');
    expect(result.treatment_plan?.dose_each_time).toContain('2 tablets');
  });

  it('never gives malaria treatment after a negative RDT', () => {
    const result = evaluateRules({ ...base, tdr_result: 'negative', fever_days: 1 });
    expect(result.decision).toBe('no_antimalarial');
    expect(result.treatment_plan).toBeNull();
  });

  it('refers when ASPY is contraindicated', () => {
    const result = evaluateRules({ ...base, severe_liver_disease: true });
    expect(result.decision).toBe('refer');
    expect(result.treatment_plan).toBeNull();
  });

  it('refers when the correct treatment pack is unavailable', () => {
    const result = evaluateRules({ ...base, aspy_in_stock: false });
    expect(result.decision).toBe('refer');
    expect(result.triggered_rules).toContain('aspy_stock_unavailable');
  });

  it('does not treat when positive-RDT safety answers are incomplete', () => {
    const answered = [
      'age_months',
      'sex',
      'temperature_c',
      'fever_days',
      'convulsions',
      'unable_to_drink',
      'vomiting_everything',
      'lethargy',
      'severe_breathing_difficulty',
      'tdr_result',
    ];
    const result = evaluateRules(base, 'en', answered);
    expect(result.decision).toBe('refer');
    expect(result.triggered_rules).toContain('incomplete_treatment_safety_check');
  });

  it('urgent on convulsions', () => {
    expect(evaluateRules({ ...base, convulsions: true }).decision).toBe('urgent_refer');
  });

  it('never lets maxDecision downgrade urgent', () => {
    expect(maxDecision('urgent_refer', 'treat_at_home')).toBe('urgent_refer');
    expect(decisionRank(maxDecision('urgent_refer', 'refer'))).toBeGreaterThanOrEqual(
      decisionRank('urgent_refer'),
    );
  });
});
