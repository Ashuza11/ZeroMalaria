/** Deterministic demo scenario payloads (Phase 8). Works offline. */

import type { TriageInput } from '../types';

export const DEMO_CASE_A: TriageInput = {
  age_months: 36,
  sex: 'female',
  temperature_c: 38.6,
  fever_days: 2,
  convulsions: false,
  unable_to_drink: false,
  vomiting_everything: false,
  lethargy: false,
  severe_breathing_difficulty: false,
  tdr_result: 'positive',
};

export const DEMO_CASE_B: TriageInput = {
  age_months: 28,
  sex: 'male',
  temperature_c: 39.4,
  fever_days: 2,
  convulsions: true,
  unable_to_drink: false,
  vomiting_everything: false,
  lethargy: false,
  severe_breathing_difficulty: false,
  tdr_result: 'positive',
};

/** Rules treat_at_home; API demo_scenario=ml_escalate raises to refer (synthetic ML score 0.42). */
export const DEMO_CASE_ML: TriageInput = {
  age_months: 36,
  sex: 'female',
  temperature_c: 38.8,
  fever_days: 2,
  convulsions: false,
  unable_to_drink: false,
  vomiting_everything: false,
  lethargy: false,
  severe_breathing_difficulty: false,
  tdr_result: 'positive',
};

export const DEMO_FACILITY = {
  facility_id: 'HC-BUG-01',
  name: 'Nyamata Health Center',
  district: 'Bugesera',
  sector: 'Nyamata',
  chw_id: 'CHW-BUG-01-01',
};

export const DEMO_STEPS = [
  'Case A: simple malaria → treat at home',
  'Case B: convulsions → URGENT referral (works offline)',
  'Health center receives Case B',
  'Overdue patient never arrives → CHW alert',
  'RBC dashboard: surge + stock pressure',
] as const;
