/* Reviewed TypeScript representation of rules/malaria_rules.yaml.
 * PLACEHOLDER - TO BE VALIDATED against Rwanda national malaria treatment guidelines
 * and WHO iCCM guidance by a clinician.
 */
export const MALARIA_RULES = {
  "meta": {
    "version": "1.1.0-placeholder",
    "synthetic_demo": true,
    "disclaimer": "Decision support tool. Not a replacement for clinical judgment.",
    "validation_banner": "PLACEHOLDER - TO BE VALIDATED against the Rwanda national malaria treatment guidelines and WHO iCCM guidance by a clinician.",
    "protocol_reference": "WHO iCCM / Rwanda national malaria community care (PLACEHOLDER)",
    "clinical_config": "rules/clinical_config.yaml"
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
      "protocol_section": "iCCM danger signs - convulsions / fits",
      "reason_en": "Convulsions (fits) reported",
      "reason_rw": "Gusetsa (fits) byavuzwe"
    },
    {
      "id": "unable_to_drink",
      "field": "unable_to_drink",
      "when_true": "urgent_refer",
      "protocol_section": "iCCM danger signs - unable to drink or feed",
      "reason_en": "Unable to drink or feed",
      "reason_rw": "Ntashobora kunywa cyangwa kurya"
    },
    {
      "id": "vomiting_everything",
      "field": "vomiting_everything",
      "when_true": "urgent_refer",
      "protocol_section": "iCCM danger signs - vomiting everything",
      "reason_en": "Vomiting everything",
      "reason_rw": "Araruka byose"
    },
    {
      "id": "lethargy",
      "field": "lethargy",
      "when_true": "urgent_refer",
      "protocol_section": "iCCM danger signs - lethargy / unconscious",
      "reason_en": "Lethargy or unconsciousness",
      "reason_rw": "Yacitse intege cyangwa ntabona"
    },
    {
      "id": "severe_breathing_difficulty",
      "field": "severe_breathing_difficulty",
      "when_true": "urgent_refer",
      "protocol_section": "iCCM danger signs - severe breathing difficulty",
      "reason_en": "Severe breathing difficulty",
      "reason_rw": "Agorwa cyane n'uruhuha"
    }
  ],
  "rules": [
    {
      "id": "negative_rdt_no_antimalarial",
      "description": "A negative malaria RDT never authorizes antimalarial treatment.",
      "protocol_section": "Rwanda Integrated Malaria Control Guidelines 2024 - parasitological confirmation",
      "when": { "tdr_result": "negative", "no_referral_already": true },
      "decision": "no_antimalarial",
      "reason_en": "Negative RDT: do not give malaria medicine; assess other causes and follow up.",
      "reason_rw": "TDR ni negative: ntutange umuti wa malaria; shakisha izindi mpamvu kandi ukurikirane umurwayi."
    },
    {
      "id": "confirmed_uncomplicated_malaria",
      "description": "A positive RDT may enter community treatment only after all treatment-safety checks are complete.",
      "protocol_section": "Rwanda MFT Implementation Guide - community case management",
      "when": { "tdr_result": "positive", "no_referral_already": true, "treatment_safety_complete": true },
      "decision": "treat_at_home",
      "reason_en": "Positive RDT with complete treatment safety checks.",
      "reason_rw": "TDR ni positive kandi isuzuma ry'umutekano w'umuti ryuzuye."
    },
    {
      "id": "infant_age_referral",
      "description": "PLACEHOLDER: sick infants below infant_refer_months are referred urgently from community care (common iCCM convention). Not a Rwanda-validated cutoff.",
      "protocol_section": "iCCM young infant referral",
      "when": {
        "age_months_lt": "infant_refer_months"
      },
      "decision": "urgent_refer",
      "reason_en": "Age under {infant_refer_months} months (placeholder young-infant rule)",
      "reason_rw": "Imyaka iri munsi ya {infant_refer_months} amezi (amategeko ya placeholder)"
    },
    {
      "id": "invalid_tdr_refer",
      "description": "PLACEHOLDER operational referral for invalid TDR - not a severity grade.",
      "protocol_section": "RDT invalid / repeat testing",
      "when": {
        "tdr_result": "invalid",
        "no_urgent_already": true
      },
      "decision": "refer",
      "reason_en": "Invalid TDR - refer for repeat testing / assessment",
      "reason_rw": "TDR ntabwo yemewe - ohereze gukorera ikizamini cyangwa gusuzumwa"
    },
    {
      "id": "persistent_fever_negative_tdr",
      "description": "PLACEHOLDER: common iCCM counseling interval (~day 3) if illness is not improving and TDR is negative. Not a severe-malaria threshold.",
      "protocol_section": "iCCM fever follow-up with negative RDT",
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
      "id": "incomplete_assessment",
      "description": "Fired when required danger-sign answers are missing. Unanswered is never treated as No; default home care is withheld.",
      "protocol_section": "Incomplete community assessment (operational)",
      "when": {
        "missing_danger_signs": true,
        "no_urgent_already": true
      },
      "decision": "refer",
      "reason_en": "Incomplete assessment - danger signs not fully answered",
      "reason_rw": "Isuzuma ntiruzuye - ibimenyetso by'akaga ntibyuzuye"
    },
    {
      "id": "default_treat_at_home",
      "description": "Legacy compatibility identifier. New decisions use confirmed_uncomplicated_malaria; there is no default malaria treatment.",
      "protocol_section": "Uncomplicated malaria community care (PLACEHOLDER)",
      "when": {
        "no_referral_already": true,
        "assessment_complete": true
      },
      "decision": "treat_at_home",
      "reason_en": "No placeholder danger sign or referral rule triggered",
      "reason_rw": "Nta ikimenyetso cy'akaga cyangwa itegeko ryo kohereza ryabonetse"
    }
  ]
} as const;

export type MalariaRules = typeof MALARIA_RULES;
