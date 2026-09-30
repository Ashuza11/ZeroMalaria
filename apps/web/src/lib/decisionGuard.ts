/** Frontend mirror of escalate-only lock — never display a downgraded decision. */

export type UrgencyDecision = 'treat_at_home' | 'refer' | 'urgent_refer' | string;

const RANK: Record<string, number> = {
  treat_at_home: 0,
  treat_locally: 0,
  refer: 1,
  monitor: 1,
  urgent_refer: 2,
  urgent_referral: 2,
};

export function decisionRank(d: string): number {
  return RANK[d] ?? 0;
}

/** Return the more urgent of rules vs proposed (ML/AI). */
export function maxDecision(rules: UrgencyDecision, proposed: UrgencyDecision): UrgencyDecision {
  return decisionRank(proposed) >= decisionRank(rules) ? proposed : rules;
}

export function assertNoDowngrade(rules: UrgencyDecision, final: UrgencyDecision): UrgencyDecision {
  return maxDecision(rules, final);
}

export function mlEscalateThreshold(): number {
  return 0.35;
}
