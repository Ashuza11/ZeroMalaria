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
};

describe('offline rules engine', () => {
  it('treats simple malaria at home', () => {
    expect(evaluateRules(base).decision).toBe('treat_at_home');
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
