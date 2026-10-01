export type Decision = 'no_antimalarial' | 'treat_at_home' | 'refer' | 'urgent_refer';
/** Public labels for UI / eval (maps from Decision). */
export type PublicDecision = 'treat_locally' | 'monitor' | 'urgent_referral';

export type TriageInput = {
  age_months: number;
  sex: 'female' | 'male';
  temperature_c: number;
  fever_days: number;
  convulsions: boolean;
  unable_to_drink: boolean;
  vomiting_everything: boolean;
  lethargy: boolean;
  severe_breathing_difficulty: boolean;
  tdr_result: 'positive' | 'negative' | 'invalid';
  weight_kg: number;
  pregnant_first_trimester: boolean;
  aspy_allergy: boolean;
  severe_liver_disease: boolean;
  severe_renal_disease: boolean;
  recent_malaria_treatment_failure: boolean;
  aspy_in_stock: boolean;
};

export type TreatmentPlan = {
  source: 'deterministic_rbc_mft';
  district: string;
  mft_block: 'A';
  rotation_year: '2026-2027';
  medicine: 'Artesunate–Pyronaridine (ASPY)';
  weight_band: string;
  dose_each_time: string;
  frequency: 'once_daily';
  duration_days: 3;
  total_quantity: string;
  instructions_en: string[];
  instructions_rw: string[];
  protocol_reference: string;
};

export type ReasonDetail = {
  rule_id: string;
  field: string | null;
  answer: unknown;
  text: string;
  protocol_section?: string | null;
};

export type RulesResult = {
  decision: Decision;
  public_decision: PublicDecision;
  reasons: string[];
  triggered_rules: string[];
  reason_details: ReasonDetail[];
  missing_info: string[];
  protocol_reference: string;
  treatment_plan: TreatmentPlan | null;
};

export type DecisionResult = RulesResult & {
  rules_decision: Decision;
  ml_escalated: boolean;
  severe_risk: number | null;
  shap_factors: string[];
  confidence: number;
  human_confirmation_required: true;
  disclaimer: string;
  ai_advisory?: AiAdvisory | null;
};

export type AiAdvisory = {
  explanation_rw: string;
  explanation_en: string;
  inconsistencies: string[];
  caregiver_advice_rw: string;
  handover_summary: string;
  suggested_escalation: boolean;
  citations: string[];
  needs_native_review: boolean;
  chw_followed?: boolean | null;
};

export type ReferralStatus = 'sent' | 'received' | 'arrived' | 'treated';

export type LocalReferral = {
  id?: number;
  client_uuid: string;
  facility_id: string;
  chw_id: string;
  district: string;
  sector: string;
  age_months: number;
  sex: string;
  decision: 'refer' | 'urgent_refer';
  reasons: string[];
  summary: string;
  temperature_c?: number;
  fever_days?: number;
  tdr_result?: string;
  other_symptoms?: string;
  triggered_rules?: string[];
  protocol_reference?: string;
  ai_brief?: string;
  status: ReferralStatus;
  created_at: string;
  received_at?: string;
  arrived_at?: string;
  treated_at?: string;
  synced: boolean;
  demo?: boolean;
};

export type SyncQueueItem = {
  id?: number;
  client_uuid: string;
  type: 'referral';
  payload: Record<string, unknown>;
  created_at: string;
};
