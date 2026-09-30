"""Clinical rules engine — Layer 1.

Loads /rules/malaria_rules.yaml. PLACEHOLDER rules only.
AI / ML must never downgrade an urgent_refer decision from this module.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml

REPO_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_RULES_PATH = REPO_ROOT / "rules" / "malaria_rules.yaml"

DECISION_ORDER = ("treat_at_home", "refer", "urgent_refer")


@dataclass
class RulesResult:
    decision: str
    reasons: list[str] = field(default_factory=list)
    triggered_rules: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "decision": self.decision,
            "reasons": list(self.reasons),
            "triggered_rules": list(self.triggered_rules),
        }


@lru_cache(maxsize=4)
def load_rules(path: str | None = None) -> dict[str, Any]:
    rules_path = Path(path) if path else DEFAULT_RULES_PATH
    with rules_path.open(encoding="utf-8") as handle:
        data = yaml.safe_load(handle)
    if not isinstance(data, dict):
        raise ValueError("malaria_rules.yaml must parse to a mapping")
    return data


def decision_rank(decision: str, rules: dict[str, Any] | None = None) -> int:
    cfg = rules or load_rules()
    ranks = cfg.get("decision_rank") or {
        "treat_at_home": 0,
        "refer": 1,
        "urgent_refer": 2,
    }
    if decision not in ranks:
        raise ValueError(f"Unknown decision: {decision}")
    return int(ranks[decision])


def max_decision(a: str, b: str, rules: dict[str, Any] | None = None) -> str:
    """Return the more urgent decision. Used to prove ML cannot downgrade."""
    cfg = rules or load_rules()
    return a if decision_rank(a, cfg) >= decision_rank(b, cfg) else b


def _as_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return int(value) == 1
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "y"}
    return bool(value)


def _format_reason(template: str, cfg: dict[str, Any]) -> str:
    return template.format(
        infant_refer_months=cfg.get("infant_refer_months", 2),
        persistent_fever_days=cfg.get("persistent_fever_days", 3),
    )


def evaluate_rules(
    case: dict[str, Any],
    *,
    language: str = "en",
    rules_path: str | None = None,
) -> RulesResult:
    """Apply deterministic placeholder rules.

    Order:
    1. Danger-sign fields -> urgent_refer
    2. Infant age -> urgent_refer
    3. Invalid TDR -> refer (if not already urgent)
    4. Persistent fever + negative TDR -> refer (if not already urgent)
    5. Default treat_at_home
    """
    cfg = load_rules(rules_path)
    reason_key = "reason_rw" if language.startswith("rw") else "reason_en"
    reasons: list[str] = []
    triggered: list[str] = []
    decision = "treat_at_home"

    for sign in cfg.get("danger_signs") or []:
        field_name = sign["field"]
        if _as_bool(case.get(field_name, 0)):
            decision = "urgent_refer"
            triggered.append(str(sign["id"]))
            reasons.append(_format_reason(sign.get(reason_key) or sign.get("reason_en", ""), cfg))

    infant_months = int(cfg.get("infant_refer_months", 2))
    age_months = int(case.get("age_months", 0) or 0)
    if age_months < infant_months:
        decision = "urgent_refer"
        if "infant_age_referral" not in triggered:
            triggered.append("infant_age_referral")
            # Prefer YAML reason if present
            infant_rule = next(
                (r for r in (cfg.get("rules") or []) if r.get("id") == "infant_age_referral"),
                None,
            )
            if infant_rule:
                reasons.append(
                    _format_reason(infant_rule.get(reason_key) or infant_rule.get("reason_en", ""), cfg)
                )
            else:
                reasons.append(f"Age under {infant_months} months (placeholder young-infant rule)")

    urgent = decision == "urgent_refer"
    tdr = str(case.get("tdr_result", "") or "").lower()
    fever_days = int(case.get("fever_days", 0) or 0)
    persistent = int(cfg.get("persistent_fever_days", 3))

    if not urgent and tdr == "invalid":
        decision = "refer"
        triggered.append("invalid_tdr_refer")
        invalid_rule = next(
            (r for r in (cfg.get("rules") or []) if r.get("id") == "invalid_tdr_refer"),
            None,
        )
        if invalid_rule:
            reasons.append(
                _format_reason(invalid_rule.get(reason_key) or invalid_rule.get("reason_en", ""), cfg)
            )
        else:
            reasons.append("Invalid TDR — refer for repeat testing / assessment")

    if not urgent and decision != "refer" and tdr == "negative" and fever_days >= persistent:
        decision = "refer"
        triggered.append("persistent_fever_negative_tdr")
        persist_rule = next(
            (r for r in (cfg.get("rules") or []) if r.get("id") == "persistent_fever_negative_tdr"),
            None,
        )
        if persist_rule:
            reasons.append(
                _format_reason(persist_rule.get(reason_key) or persist_rule.get("reason_en", ""), cfg)
            )
        else:
            reasons.append(
                f"Fever for {persistent}+ days with negative TDR (placeholder follow-up)"
            )

    if decision == "treat_at_home" and not reasons:
        triggered.append("default_treat_at_home")
        default_rule = next(
            (r for r in (cfg.get("rules") or []) if r.get("id") == "default_treat_at_home"),
            None,
        )
        if default_rule:
            reasons.append(
                _format_reason(default_rule.get(reason_key) or default_rule.get("reason_en", ""), cfg)
            )
        else:
            reasons.append("No placeholder danger sign or referral rule triggered")

    return RulesResult(decision=decision, reasons=reasons, triggered_rules=triggered)
