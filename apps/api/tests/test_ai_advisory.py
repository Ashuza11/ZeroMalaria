"""AI advisory: strict JSON schema + escalate-only guardrail."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

API_ROOT = Path(__file__).resolve().parents[1]
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))

from app.services.ai.router import (
    AIRouter,
    AdvisoryResult,
    LocalNlpProvider,
    MockProvider,
    apply_escalate_only_guardrail,
)


def test_advisory_schema_local():
    router = AIRouter(providers=[LocalNlpProvider()])
    res = router.run(
        "advisory",
        {
            "rules_decision": "treat_at_home",
            "reasons": ["No danger sign"],
            "triggered_rules": ["default_treat_at_home"],
            "answers": {
                "age_months": 36,
                "fever_days": 1,
                "tdr_result": "positive",
                "temperature_c": 38.5,
            },
            "missing_info": [],
            "language": "rw",
        },
    )
    assert res.ok
    data = AdvisoryResult.model_validate(res.data)
    assert data.explanation_rw
    assert data.explanation_en
    assert data.handover_summary
    assert data.citations
    assert data.needs_native_review is True
    assert data.rules_decision_locked == "treat_at_home"


def test_guardrail_clears_escalation_when_already_urgent():
    out = apply_escalate_only_guardrail(
        "urgent_refer",
        {
            "explanation_rw": "x",
            "explanation_en": "y",
            "inconsistencies": [],
            "caregiver_advice_rw": "z",
            "handover_summary": "h",
            "suggested_escalation": True,
            "citations": ["DS-01"],
            "decision": "treat_at_home",
        },
    )
    assert out["suggested_escalation"] is False
    assert out["rules_decision_locked"] == "urgent_refer"
    assert "decision" not in out


def test_guardrail_allows_escalation_flag_on_home():
    out = apply_escalate_only_guardrail(
        "treat_at_home",
        {
            "explanation_rw": "x",
            "explanation_en": "y",
            "inconsistencies": [],
            "caregiver_advice_rw": "z",
            "handover_summary": "h",
            "suggested_escalation": True,
            "citations": ["GEN-01"],
        },
    )
    assert out["suggested_escalation"] is True


def test_invalid_advisory_falls_back_to_local():
    router = AIRouter(providers=[MockProvider(mode="invalid"), LocalNlpProvider()])
    res = router.run(
        "advisory",
        {"rules_decision": "refer", "reasons": [], "triggered_rules": [], "answers": {}},
    )
    assert res.ok
    assert res.provider_used == "local"
    AdvisoryResult.model_validate(res.data)


def test_timeout_falls_back_quietly():
    router = AIRouter(providers=[MockProvider(mode="timeout"), LocalNlpProvider()])
    res = router.run(
        "advisory",
        {"rules_decision": "monitor", "reasons": [], "triggered_rules": [], "answers": {}},
    )
    assert res.ok
    assert res.data.get("rules_decision_locked") in {"monitor", "treat_at_home", "refer"}
