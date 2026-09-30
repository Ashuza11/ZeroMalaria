"""Post-checks for AI text: no urgency downgrade, no invented doses, injection-resistant."""

from __future__ import annotations

import re
from typing import Any

DECISION_URGENCY = {
    "treat_at_home": 0,
    "treat_locally": 0,
    "refer": 1,
    "monitor": 1,
    "urgent_refer": 2,
    "urgent_referral": 2,
}
DRUG_PATTERN = re.compile(
    r"\b(artemether|lumefantrine|artesunate|quinine|coartem|asaq|mg/kg|tablets?|capsules?)\b",
    re.I,
)

DOWNGRADE_HINT = re.compile(
    r"\b(safe at home|treat at home|no referral|downgrade|ignore (the )?rules|"
    r"not urgent|stay home only|cancel referral)\b",
    re.I,
)
INJECTION_HINT = re.compile(
    r"(ignore (all )?(previous|prior|the) (instructions|rules)|reveal (your )?(system )?prompt|"
    r"disregard (the )?decision|you are now|jailbreak)",
    re.I,
)
DOSE_HINT = re.compile(
    r"\b(\d+\s*mg|\d+\s*tablets?|mg/kg|prescribe|dosage|coartem|artesunate|quinine)\b",
    re.I,
)


def locked_decision_rank(decision: str) -> int:
    return DECISION_URGENCY.get(decision, 0)


def rejects_downgrade_or_dose(text: str, locked_decision: str) -> bool:
    """True if output must be rejected."""
    if not text:
        return False
    if DOSE_HINT.search(text) or DRUG_PATTERN.search(text):
        return True
    if INJECTION_HINT.search(text):
        return True
    rank = locked_decision_rank(locked_decision)
    if rank >= 1 and DOWNGRADE_HINT.search(text):
        # Suggesting home/safe when locked is refer/urgent
        return True
    if rank >= 2 and re.search(r"\b(routine referral|non-urgent|monitor only)\b", text, re.I):
        return True
    return False


def safe_fallback_text(decision: str, language: str = "en") -> str:
    label = decision.replace("_", " ")
    if language.startswith("rw"):
        return f"Kurikiza amabwiriza: {label}. AI-generated, verify before use."
    if language.startswith("fr"):
        return f"Suivre le protocole : {label}. AI-generated, verify before use."
    return f"Follow protocol: {label}. AI-generated, verify before use."


def scrub_injection(user_text: str) -> str:
    """Treat user text as untrusted; strip common injection preambles."""
    text = (user_text or "").strip()
    text = INJECTION_HINT.sub("[ignored]", text)
    # Drop attempts to set a new decision
    text = re.sub(r"(?i)decision\s*[:=]\s*\w+", "[ignored]", text)
    return text[:800]


def sanitize_case_snapshot(raw: dict[str, Any]) -> dict[str, Any]:
    """Age band + clinical fields only — no name, phone, GPS, village, IDs."""
    age = raw.get("age_months")
    band = "unknown"
    try:
        m = int(age) if age is not None else None
        if m is not None:
            if m < 2:
                band = "under_2m"
            elif m < 12:
                band = "2_to_11m"
            elif m < 60:
                band = "12_to_59m"
            else:
                band = "60m_plus"
    except (TypeError, ValueError):
        band = "unknown"

    danger = {
        "convulsions": bool(raw.get("convulsions")),
        "unable_to_drink": bool(raw.get("unable_to_drink")),
        "vomiting_everything": bool(raw.get("vomiting_everything")),
        "lethargy": bool(raw.get("lethargy")),
        "severe_breathing_difficulty": bool(raw.get("severe_breathing_difficulty")),
    }
    return {
        "age_band": band,
        "sex": raw.get("sex") if raw.get("sex") in {"female", "male"} else None,
        "temperature_c": raw.get("temperature_c"),
        "fever_days": raw.get("fever_days"),
        "tdr_result": raw.get("tdr_result"),
        "danger_signs": danger,
        "rules_decision": raw.get("rules_decision") or raw.get("decision"),
        "decision": raw.get("decision"),
        "ml_score": raw.get("ml_score") or raw.get("severe_risk"),
        "ml_escalated": bool(raw.get("ml_escalated")),
        "top_factors": list(raw.get("top_factors") or raw.get("shap_factors") or [])[:3],
        "triggered_rules": list(raw.get("triggered_rules") or [])[:8],
        "language": str(raw.get("language") or "en")[:8],
    }


def guard_agent_text(text: str, locked_decision: str, language: str) -> tuple[str, bool]:
    """Return (text, rejected)."""
    if rejects_downgrade_or_dose(text, locked_decision):
        return safe_fallback_text(locked_decision, language), True
    footer = "AI-generated, verify before use"
    if footer.lower() not in text.lower():
        text = f"{text.rstrip()} {footer}"
    return text, False
