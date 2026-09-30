"""Mock / optional LLM symptom extraction. Feature-flagged; never decides triage."""

from __future__ import annotations

import re
from typing import Any


KIN_PATTERNS = {
    "convulsions": [r"gusetsa", r"fits", r"convuls"],
    "unable_to_drink": [r"ntashobora kunywa", r"unable to drink", r"can't drink", r"cannot drink", r"ntashobora kurya"],
    "vomiting_everything": [r"araruka", r"vomit", r"vomiting"],
    "lethargy": [r"intege", r"letharg", r"unconscious", r"ntabona"],
    "severe_breathing_difficulty": [r"uruhuha", r"breath", r"respir"],
}


def extract_symptoms_mock(text: str, language: str = "en") -> dict[str, Any]:
    """Rule-based mock extractor used when LLM flag is off or unavailable."""
    lowered = (text or "").lower()
    flags = {key: False for key in KIN_PATTERNS}
    matched: list[str] = []
    for key, patterns in KIN_PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, lowered, flags=re.IGNORECASE):
                flags[key] = True
                matched.append(key)
                break

    fever = None
    m = re.search(r"(\d+(?:\.\d+)?)\s*°?\s*c", lowered)
    if m:
        fever = float(m.group(1))

    age = None
    m_age = re.search(r"(\d+)\s*(months?|amezi|mo\b)", lowered)
    if m_age:
        age = int(m_age.group(1))
    else:
        m_yr = re.search(r"(\d+)\s*(years?|imyaka|yrs?)", lowered)
        if m_yr:
            age = int(m_yr.group(1)) * 12

    return {
        "source": "mock_nlp",
        "matched_signs": matched,
        "suggested_fields": {
            **{k: flags[k] for k in flags},
            **({"temperature_c": fever} if fever is not None else {}),
            **({"age_months": age} if age is not None else {}),
        },
        "note": "Layer 3 NLP only fills the form. It does not choose the decision.",
    }
