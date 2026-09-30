"""Privacy sanitizer: only allowlisted clinical fields may leave for external AI."""

from __future__ import annotations

import re
from typing import Any

ALLOWED_KEYS = frozenset(
    {
        "age_months",
        "sex",
        "symptoms",
        "temperature_c",
        "fever_days",
        "tdr_result",
        "decision",
        "rules_decision",
        "public_decision",
        "convulsions",
        "unable_to_drink",
        "vomiting_everything",
        "lethargy",
        "severe_breathing_difficulty",
        "language",
        "free_text",
        "message",
        "summary_seed",
        "triggered_rules",
        "reasons",
        "reason_details",
        "missing_info",
        "protocol_reference",
        "protocol_excerpts",
        "answers",
        "aggregated_stats",
    }
)

BLOCKED_PATTERNS = [
    re.compile(r"\b\d{8,}\b"),  # long numeric IDs / phones
    re.compile(r"\+?250\d{8,9}\b"),
    re.compile(r"\b[A-Z]{2,3}-\d{5,}\b"),  # national-id-like
]


def sanitize_for_ai(payload: dict[str, Any]) -> dict[str, Any]:
    """Return a copy with only allowlisted keys; scrub free_text of identifiers."""
    out: dict[str, Any] = {}
    for key, value in payload.items():
        if key not in ALLOWED_KEYS:
            continue
        if key == "free_text" and isinstance(value, str):
            cleaned = value
            for pat in BLOCKED_PATTERNS:
                cleaned = pat.sub("[redacted]", cleaned)
            # Drop likely person names: sequences of capitalized words longer than 1
            cleaned = re.sub(r"\b([A-Z][a-z]{2,}\s+){1,3}[A-Z][a-z]{2,}\b", "[name]", cleaned)
            out[key] = cleaned
        else:
            out[key] = value
    return out


def assert_safe_payload(payload: dict[str, Any]) -> None:
    extra = set(payload) - ALLOWED_KEYS
    if extra:
        raise ValueError(f"Unsafe keys for AI: {sorted(extra)}")
