"""Unit tests: rules engine + ML cannot downgrade urgent referral."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

API_ROOT = Path(__file__).resolve().parents[1]
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))

from engine.decision import assert_never_downgrade, combine_decision
from engine.rules import decision_rank, evaluate_rules, max_decision


def base_case(**overrides):
    case = {
        "age_months": 36,
        "sex": "female",
        "temperature_c": 38.6,
        "fever_days": 2,
        "convulsions": 0,
        "unable_to_drink": 0,
        "vomiting_everything": 0,
        "lethargy": 0,
        "severe_breathing_difficulty": 0,
        "tdr_result": "positive",
    }
    case.update(overrides)
    return case


def test_treat_at_home_simple_malaria():
    result = evaluate_rules(base_case())
    assert result.decision == "treat_at_home"
    assert "default_treat_at_home" in result.triggered_rules


def test_convulsions_urgent():
    result = evaluate_rules(base_case(convulsions=1))
    assert result.decision == "urgent_refer"
    assert "convulsions" in result.triggered_rules


def test_infant_urgent():
    result = evaluate_rules(base_case(age_months=1, tdr_result="negative", fever_days=0))
    assert result.decision == "urgent_refer"
    assert "infant_age_referral" in result.triggered_rules


def test_invalid_tdr_refer():
    result = evaluate_rules(base_case(tdr_result="invalid"))
    assert result.decision == "refer"
    assert "invalid_tdr_refer" in result.triggered_rules


def test_persistent_fever_negative_refer():
    result = evaluate_rules(base_case(tdr_result="negative", fever_days=3, temperature_c=37.8))
    assert result.decision == "refer"


def test_danger_sign_beats_invalid_tdr():
    result = evaluate_rules(base_case(lethargy=1, tdr_result="invalid"))
    assert result.decision == "urgent_refer"


@pytest.mark.parametrize(
    "rules_decision,ml_proposed",
    [
        ("urgent_refer", "treat_at_home"),
        ("urgent_refer", "refer"),
        ("refer", "treat_at_home"),
        ("urgent_refer", "urgent_refer"),
        ("treat_at_home", "refer"),
    ],
)
def test_ml_cannot_downgrade(rules_decision, ml_proposed):
    combined = assert_never_downgrade(rules_decision, ml_proposed)
    assert decision_rank(combined) >= decision_rank(rules_decision)
    assert combined == max_decision(rules_decision, ml_proposed)


def test_combine_keeps_urgent_even_without_ml():
    result = combine_decision(base_case(convulsions=1), use_ml=False)
    assert result.decision == "urgent_refer"
    assert result.rules_decision == "urgent_refer"
    assert result.human_confirmation_required is True


def test_combine_never_below_rules_with_ml():
    """Even if ML bundle is missing or scores low, urgent stays urgent."""
    result = combine_decision(base_case(unable_to_drink=1), use_ml=True)
    assert result.decision == "urgent_refer"
    assert decision_rank(result.decision) >= decision_rank(result.rules_decision)
