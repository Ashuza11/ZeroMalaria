import { describe, expect, it } from 'vitest';
import type { TriageInput } from '../types';
import { buildBugeseraTreatmentPlan } from './treatmentPlan';

const eligible: TriageInput = {
  age_months: 96,
  sex: 'male',
  temperature_c: 38.5,
  fever_days: 1,
  convulsions: false,
  unable_to_drink: false,
  vomiting_everything: false,
  lethargy: false,
  severe_breathing_difficulty: false,
  tdr_result: 'positive',
  weight_kg: 25,
  pregnant_first_trimester: false,
  aspy_allergy: false,
  severe_liver_disease: false,
  severe_renal_disease: false,
  recent_malaria_treatment_failure: false,
  aspy_in_stock: true,
};

describe('Bugesera MFT treatment plan', () => {
  it('selects the official ASPY weight band during Year 2', () => {
    const plan = buildBugeseraTreatmentPlan(eligible, new Date('2026-10-01T00:00:00Z'));
    expect(plan?.dose_each_time).toBe('2 tablets (60 mg/180 mg each)');
    expect(plan?.total_quantity).toBe('6 tablets');
  });

  it('fails closed after the configured rotation expires', () => {
    expect(buildBugeseraTreatmentPlan(eligible, new Date('2027-09-01T00:00:00Z'))).toBeNull();
  });
});
