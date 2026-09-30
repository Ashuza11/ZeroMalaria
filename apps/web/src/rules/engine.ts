import { MALARIA_RULES } from './malariaRules.generated';
import type { Decision, RulesResult, TriageInput } from '../types';

type Lang = 'en' | 'rw';

function reasonOf(obj: { reason_en: string; reason_rw?: string }, lang: Lang, cfg: typeof MALARIA_RULES): string {
  const template = lang === 'rw' && obj.reason_rw ? obj.reason_rw : obj.reason_en;
  return template
    .replaceAll('{infant_refer_months}', String(cfg.infant_refer_months))
    .replaceAll('{persistent_fever_days}', String(cfg.persistent_fever_days));
}

export function decisionRank(decision: Decision): number {
  return MALARIA_RULES.decision_rank[decision];
}

export function maxDecision(a: Decision, b: Decision): Decision {
  return decisionRank(a) >= decisionRank(b) ? a : b;
}

/** Offline Layer 1 — same YAML as the API. Never invents thresholds. */
export function evaluateRules(input: TriageInput, language: Lang = 'en'): RulesResult {
  const cfg = MALARIA_RULES;
  const reasons: string[] = [];
  const triggered: string[] = [];
  let decision: Decision = 'treat_at_home';

  for (const sign of cfg.danger_signs) {
    const field = sign.field as keyof TriageInput;
    if (input[field]) {
      decision = 'urgent_refer';
      triggered.push(sign.id);
      reasons.push(reasonOf(sign, language, cfg));
    }
  }

  if (input.age_months < cfg.infant_refer_months) {
    decision = 'urgent_refer';
    if (!triggered.includes('infant_age_referral')) {
      triggered.push('infant_age_referral');
      const infant = cfg.rules.find((r) => r.id === 'infant_age_referral');
      if (infant) reasons.push(reasonOf(infant, language, cfg));
    }
  }

  const urgent = decision === 'urgent_refer';

  if (!urgent && input.tdr_result === 'invalid') {
    decision = 'refer';
    triggered.push('invalid_tdr_refer');
    const rule = cfg.rules.find((r) => r.id === 'invalid_tdr_refer');
    if (rule) reasons.push(reasonOf(rule, language, cfg));
  }

  if (
    !urgent &&
    decision !== 'refer' &&
    input.tdr_result === 'negative' &&
    input.fever_days >= cfg.persistent_fever_days
  ) {
    decision = 'refer';
    triggered.push('persistent_fever_negative_tdr');
    const rule = cfg.rules.find((r) => r.id === 'persistent_fever_negative_tdr');
    if (rule) reasons.push(reasonOf(rule, language, cfg));
  }

  if (decision === 'treat_at_home' && reasons.length === 0) {
    triggered.push('default_treat_at_home');
    const rule = cfg.rules.find((r) => r.id === 'default_treat_at_home');
    if (rule) reasons.push(reasonOf(rule, language, cfg));
  }

  return { decision, reasons, triggered_rules: triggered };
}

export function localDecide(input: TriageInput, language: Lang = 'en') {
  const rules = evaluateRules(input, language);
  return {
    ...rules,
    rules_decision: rules.decision,
    ml_escalated: false,
    severe_risk: null as number | null,
    shap_factors: [] as string[],
    confidence: rules.decision === 'urgent_refer' ? 0.95 : 0.72,
    human_confirmation_required: true as const,
    disclaimer: cfgDisclaimer(),
  };
}

function cfgDisclaimer(): string {
  return (
    MALARIA_RULES.meta.disclaimer ||
    'Decision support tool. Not a replacement for clinical judgment.'
  );
}

export { MALARIA_RULES };
