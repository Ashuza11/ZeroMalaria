#!/usr/bin/env python3
"""Print agreement rate (rules engine vs expected) and mean triage duration_ms.

Reports measured numbers only. Synthetic vignettes in tests/eval_cases.json.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

API_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = API_ROOT.parents[1]
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))

from engine.rules import PUBLIC_DECISION, evaluate_rules  # noqa: E402

ALL_FIELDS = [
    "age_months",
    "sex",
    "temperature_c",
    "fever_days",
    "convulsions",
    "unable_to_drink",
    "vomiting_everything",
    "lethargy",
    "severe_breathing_difficulty",
    "tdr_result",
]


def main() -> int:
    path = API_ROOT / "tests" / "eval_cases.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    cases = data["cases"]
    agree = 0
    durations: list[float] = []
    mismatches: list[str] = []

    for case in cases:
        answers = dict(case["answers"])
        answered = case.get("answered_fields") or [f for f in ALL_FIELDS if f in answers]
        result = evaluate_rules(answers, answered_fields=answered)
        public = result.public_decision or PUBLIC_DECISION.get(result.decision, result.decision)
        expected = case["expected_decision"]
        if public == expected:
            agree += 1
        else:
            mismatches.append(f"{case['id']}: got={public} expected={expected}")
        timing = case.get("timing") or {}
        if "duration_ms" in timing:
            durations.append(float(timing["duration_ms"]))

    n = len(cases)
    rate = (agree / n * 100.0) if n else 0.0
    mean_ms = (sum(durations) / len(durations)) if durations else 0.0

    print(f"cases={n}")
    print(f"agreement={agree}/{n} ({rate:.1f}%)")
    print(f"mean_triage_duration_ms={mean_ms:.1f}")
    print(f"duration_samples={len(durations)}")
    if mismatches:
        print("mismatches:")
        for line in mismatches:
            print(f"  {line}")
    return 0 if agree == n else 1


if __name__ == "__main__":
    raise SystemExit(main())
