/* AUTO-GENERATED from rules/malaria_rules.yaml — do not edit by hand.
 * Run: python apps/web/scripts/generate_rules_ts.py
 * PLACEHOLDER - TO BE VALIDATED against Rwanda national malaria treatment guidelines
 * and WHO iCCM guidance by a clinician.
 */
export const MALARIA_RULES = {
  "meta": {
    "version": "1.0.0-placeholder",
    "synthetic_demo": true,
    "disclaimer": "Decision support tool. Not a replacement for clinical judgment.",
    "validation_banner": "PLACEHOLDER - TO BE VALIDATED against the Rwanda national malaria treatment guidelines and WHO iCCM guidance by a clinician."
  },
  "decision_rank": {
    "treat_at_home": 0,
    "refer": 1,
    "urgent_refer": 2
  },
  "infant_refer_months": 2,
  "persistent_fever_days": 3,
  "danger_signs": [
    {
      "id": "convulsions",
      "field": "convulsions",
      "when_true": "urgent_refer",
      "reason_en": "Convulsions (fits) reported",
      "reason_rw": "Gusetsa (fits) byavuzwe"
    },
    {
      "id": "unable_to_drink",
      "field": "unable_to_drink",
      "when_true": "urgent_refer",
      "reason_en": "Unable to drink or feed",
      "reason_rw": "Ntashobora kunywa cyangwa kurya"
    },
    {
      "id": "vomiting_everything",
      "field": "vomiting_everything",
      "when_true": "urgent_refer",
      "reason_en": "Vomiting everything",
      "reason_rw": "Araruka byose"
    },
    {
      "id": "lethargy",
      "field": "lethargy",
      "when_true": "urgent_refer",
      "reason_en": "Lethargy or unconsciousness",
      "reason_rw": "Yacitse intege cyangwa ntabona"
    },
    {
      "id": "severe_breathing_difficulty",
      "field": "severe_breathing_difficulty",
      "when_true": "urgent_refer",
      "reason_en": "Severe breathing difficulty",
      "reason_rw": "Agorwa cyane n'uruhuha"
    }
  ],
  "rules": [
    {
      "id": "infant_age_referral",
      "description": "PLACEHOLDER: sick infants below infant_refer_months are referred urgently from community care (common iCCM convention). Not a Rwanda-validated cutoff.",
      "when": {
        "age_months_lt": "infant_refer_months"
      },
      "decision": "urgent_refer",
      "reason_en": "Age under {infant_refer_months} months (placeholder young-infant rule)",
      "reason_rw": "Imyaka iri munsi ya {infant_refer_months} amezi (amategeko ya placeholder)"
    },
    {
      "id": "invalid_tdr_refer",
      "description": "PLACEHOLDER operational referral for invalid TDR \u2014 not a severity grade.",
      "when": {
        "tdr_result": "invalid",
        "no_urgent_already": true
      },
      "decision": "refer",
      "reason_en": "Invalid TDR \u2014 refer for repeat testing / assessment",
      "reason_rw": "TDR ntabwo yemewe \u2014 ohereze gukorera ikizamini cyangwa gusuzumwa"
    },
    {
      "id": "persistent_fever_negative_tdr",
      "description": "PLACEHOLDER: common iCCM counseling interval (~day 3) if illness is not improving and TDR is negative. Not a severe-malaria threshold.",
      "when": {
        "tdr_result": "negative",
        "fever_days_gte": "persistent_fever_days",
        "no_urgent_already": true
      },
      "decision": "refer",
      "reason_en": "Fever for {persistent_fever_days}+ days with negative TDR (placeholder follow-up)",
      "reason_rw": "Ubushyuhe bw'iminsi {persistent_fever_days}+ hamwe na TDR mbi (placeholder)"
    },
    {
      "id": "default_treat_at_home",
      "description": "Default when no referral rule fires. Includes uncomplicated TDR-positive fever in this demo. Does NOT prescribe drugs or doses.",
      "when": {
        "no_referral_already": true
      },
      "decision": "treat_at_home",
      "reason_en": "No placeholder danger sign or referral rule triggered",
      "reason_rw": "Nta ikimenyetso cy'akaga cyangwa itegeko ryo kohereza ryabonetse"
    }
  ],
  "ml_escalation": {
    "severe_case": {
      "escalate_treat_to_refer_threshold": 0.35,
      "escalate_refer_to_urgent_threshold": 0.55
    },
    "referral_not_completed": {
      "high_risk_threshold": 0.45
    }
  },
  "feature_labels_en": {
    "age_months": "Age (months)",
    "temperature_c": "Temperature",
    "fever_days": "Days of fever",
    "convulsions": "Convulsions",
    "unable_to_drink": "Unable to drink or feed",
    "vomiting_everything": "Vomiting everything",
    "lethargy": "Lethargy",
    "severe_breathing_difficulty": "Severe breathing difficulty",
    "tdr_positive": "TDR positive",
    "tdr_negative": "TDR negative",
    "tdr_invalid": "TDR invalid",
    "sex_female": "Sex female"
  }
} as const;

export type MalariaRules = typeof MALARIA_RULES;
