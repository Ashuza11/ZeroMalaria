import { MALARIA_RULES } from './malariaRules.generated';
import type {
  Decision,
  PublicDecision,
  ReasonDetail,
  RulesResult,
  TriageInput,
} from '../types';
import {
  buildBugeseraTreatmentPlan,
  hasTreatmentContraindication,
  TREATMENT_SAFETY_FIELDS,
} from './treatmentPlan';

type Lang = 'en' | 'rw';

const PUBLIC_DECISION: Record<Decision, PublicDecision> = {
  no_antimalarial: 'monitor',
  treat_at_home: 'treat_locally',
  refer: 'monitor',
  urgent_refer: 'urgent_referral',
};

const DANGER_FIELDS = [
  'convulsions',
  'unable_to_drink',
  'vomiting_everything',
  'lethargy',
  'severe_breathing_difficulty',
] as const;

function reasonOf(
  obj: { reason_en: string; reason_rw?: string; protocol_section?: string },
  lang: Lang,
  cfg: typeof MALARIA_RULES,
): string {
  const template = lang === 'rw' && obj.reason_rw ? obj.reason_rw : obj.reason_en;
  return template
    .replaceAll('{infant_refer_months}', String(cfg.infant_refer_months))
    .replaceAll('{persistent_fever_days}', String(cfg.persistent_fever_days));
}

export function decisionRank(decision: Decision): number {
  if (decision === 'no_antimalarial') return 0;
  return MALARIA_RULES.decision_rank[decision];
}

export function maxDecision(a: Decision, b: Decision): Decision {
  return decisionRank(a) >= decisionRank(b) ? a : b;
}

export function toPublicDecision(decision: Decision): PublicDecision {
  return PUBLIC_DECISION[decision];
}

/** Offline deterministic rules. Never invents thresholds. */
export function evaluateRules(
  input: TriageInput,
  language: Lang = 'en',
  answeredFields?: Iterable<string>,
): RulesResult {
  const cfg = MALARIA_RULES;
  const reasons: string[] = [];
  const triggered: string[] = [];
  const reason_details: ReasonDetail[] = [];
  const missing: string[] = [];
  let decision: Decision = 'no_antimalarial';
  const answered = answeredFields ? new Set(answeredFields) : null;

  const isAnswered = (name: string) => {
    if (answered) return answered.has(name);
    return true; // legacy: treat all fields as answered when set not provided
  };

  for (const sign of cfg.danger_signs) {
    const field = sign.field as keyof TriageInput;
    if (!isAnswered(String(field))) {
      missing.push(String(field));
      continue;
    }
    if (input[field]) {
      decision = 'urgent_refer';
      triggered.push(sign.id);
      const text = reasonOf(sign, language, cfg);
      reasons.push(text);
      reason_details.push({
        rule_id: sign.id,
        field: String(field),
        answer: true,
        text,
        protocol_section: 'protocol_section' in sign ? String((sign as { protocol_section?: string }).protocol_section || '') : null,
      });
    }
  }

  if (!isAnswered('age_months')) {
    missing.push('age_months');
  } else if (input.age_months < cfg.infant_refer_months) {
    decision = 'urgent_refer';
    if (!triggered.includes('infant_age_referral')) {
      triggered.push('infant_age_referral');
      const infant = cfg.rules.find((r) => r.id === 'infant_age_referral');
      if (infant) {
        const text = reasonOf(infant, language, cfg);
        reasons.push(text);
        reason_details.push({
          rule_id: 'infant_age_referral',
          field: 'age_months',
          answer: input.age_months,
          text,
          protocol_section: 'protocol_section' in infant ? String((infant as { protocol_section?: string }).protocol_section || '') : null,
        });
      }
    }
  }

  const urgent = decision === 'urgent_refer';

  if (!isAnswered('tdr_result')) missing.push('tdr_result');
  if (!isAnswered('fever_days')) missing.push('fever_days');
  if (!isAnswered('temperature_c')) missing.push('temperature_c');
  if (!isAnswered('sex')) missing.push('sex');

  if (!urgent && isAnswered('tdr_result') && input.tdr_result === 'invalid') {
    decision = 'refer';
    triggered.push('invalid_tdr_refer');
    const rule = cfg.rules.find((r) => r.id === 'invalid_tdr_refer');
    if (rule) {
      const text = reasonOf(rule, language, cfg);
      reasons.push(text);
      reason_details.push({
        rule_id: 'invalid_tdr_refer',
        field: 'tdr_result',
        answer: 'invalid',
        text,
        protocol_section: 'protocol_section' in rule ? String((rule as { protocol_section?: string }).protocol_section || '') : null,
      });
    }
  }

  if (
    !urgent &&
    decision !== 'refer' &&
    isAnswered('tdr_result') &&
    isAnswered('fever_days') &&
    input.tdr_result === 'negative' &&
    input.fever_days >= cfg.persistent_fever_days
  ) {
    decision = 'refer';
    triggered.push('persistent_fever_negative_tdr');
    const rule = cfg.rules.find((r) => r.id === 'persistent_fever_negative_tdr');
    if (rule) {
      const text = reasonOf(rule, language, cfg);
      reasons.push(text);
      reason_details.push({
        rule_id: 'persistent_fever_negative_tdr',
        field: 'fever_days',
        answer: input.fever_days,
        text,
        protocol_section: 'protocol_section' in rule ? String((rule as { protocol_section?: string }).protocol_section || '') : null,
      });
    }
  }

  const missingDanger = DANGER_FIELDS.some((f) => missing.includes(f));
  if (!urgent && missingDanger && decision === 'no_antimalarial') {
    decision = 'refer';
    triggered.push('incomplete_assessment');
    const rule = cfg.rules.find((r) => r.id === 'incomplete_assessment');
    const text = rule
      ? reasonOf(rule, language, cfg)
      : 'Incomplete assessment - danger signs not fully answered';
    reasons.push(text);
    reason_details.push({
      rule_id: 'incomplete_assessment',
      field: null,
      answer: null,
      text,
      protocol_section: rule && 'protocol_section' in rule ? String((rule as { protocol_section?: string }).protocol_section || '') : null,
    });
  }

  const addReason = (ruleId: string, field: string | null, answer: unknown, en: string, rw: string) => {
    const text = language === 'rw' ? rw : en;
    triggered.push(ruleId);
    reasons.push(text);
    reason_details.push({ rule_id: ruleId, field, answer, text, protocol_section: cfg.meta.protocol_reference });
  };

  if (!urgent && decision !== 'refer' && isAnswered('tdr_result')) {
    if (input.tdr_result === 'negative') {
      decision = 'no_antimalarial';
      addReason(
        'negative_rdt_no_antimalarial',
        'tdr_result',
        'negative',
        'Negative RDT: do not give malaria medicine; assess other causes and follow up.',
        'TDR ni negative: ntutange umuti wa malaria; shakisha izindi mpamvu kandi ukurikirane umurwayi.',
      );
    } else if (input.tdr_result === 'positive') {
      const pregnancyRequired = input.sex === 'female' && input.age_months >= 120;
      const safetyFields = [
        ...TREATMENT_SAFETY_FIELDS,
        ...(pregnancyRequired ? (['pregnant_first_trimester'] as const) : []),
      ];
      const missingSafety = safetyFields.filter((field) => !isAnswered(field));
      if (missingSafety.length) {
        missing.push(...missingSafety);
        decision = 'refer';
        addReason(
          'incomplete_treatment_safety_check',
          null,
          missingSafety,
          'Treatment safety check is incomplete; do not give an antimalarial dose.',
          'Isuzuma ry’umutekano w’umuti ntiryuzuye; ntutange umuti wa malaria.',
        );
      } else if (input.weight_kg < 5) {
        decision = 'refer';
        addReason(
          'weight_below_aspy_chw_band',
          'weight_kg',
          input.weight_kg,
          'Weight is below the supported ASPY community-treatment band; refer for assessment.',
          'Ibiro biri munsi y’urugero rwa ASPY rutangirwa mu mudugudu; ohereza umurwayi gusuzumwa.',
        );
      } else if (hasTreatmentContraindication(input)) {
        decision = 'refer';
        addReason(
          'aspy_contraindication_or_treatment_failure',
          null,
          true,
          'ASPY contraindication or possible treatment failure: refer for an alternative regimen.',
          'Hari impamvu ibuza ASPY cyangwa umuti ushobora kuba waranze: ohereza umurwayi guhabwa undi muti.',
        );
      } else if (!input.aspy_in_stock) {
        decision = 'refer';
        addReason(
          'aspy_stock_unavailable',
          'aspy_in_stock',
          false,
          'The correct ASPY treatment pack is unavailable; refer for treatment.',
          'Agapaki ka ASPY gakwiye ntikaboneka; ohereza umurwayi guhabwa umuti.',
        );
      } else {
        decision = 'treat_at_home';
        addReason(
          'confirmed_uncomplicated_malaria',
          'tdr_result',
          'positive',
          'Positive RDT, complete danger-sign check, and no recorded ASPY contraindication.',
          'TDR ni positive, ibimenyetso by’akaga byasuzumwe byose, kandi nta kibuza ASPY cyanditswe.',
        );
      }
    }
  }

  const protocol_reference =
    'protocol_reference' in cfg.meta ? String((cfg.meta as { protocol_reference?: string }).protocol_reference || '') : '';

  const treatmentPlan = decision === 'treat_at_home' ? buildBugeseraTreatmentPlan(input) : null;
  if (decision === 'treat_at_home' && !treatmentPlan) {
    decision = 'refer';
    addReason(
      'treatment_plan_unavailable',
      null,
      null,
      'A verified treatment plan could not be generated; refer instead of guessing a dose.',
      'Gahunda y’umuti yemewe ntiyabonetse; ohereza umurwayi aho gukeka ingano y’umuti.',
    );
  }

  return {
    decision,
    public_decision: toPublicDecision(decision),
    reasons,
    triggered_rules: triggered,
    reason_details,
    missing_info: [...new Set(missing)].sort(),
    protocol_reference,
    treatment_plan: treatmentPlan,
  };
}

export function localDecide(
  input: TriageInput,
  language: Lang = 'en',
  answeredFields?: Iterable<string>,
) {
  const rules = evaluateRules(input, language, answeredFields);
  return {
    ...rules,
    rules_decision: rules.decision,
    ml_escalated: false,
    severe_risk: null as number | null,
    shap_factors: [] as string[],
    confidence: rules.decision === 'urgent_refer' ? 0.95 : 0.72,
    human_confirmation_required: true as const,
    disclaimer: cfgDisclaimer(),
    ai_advisory: null,
  };
}

function cfgDisclaimer(): string {
  return (
    MALARIA_RULES.meta.disclaimer ||
    'Decision support tool. Not a replacement for clinical judgment.'
  );
}

export { MALARIA_RULES };
