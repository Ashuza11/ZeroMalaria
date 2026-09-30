"""Aggregate AI activity counters — no personal data or free text."""

from __future__ import annotations

import threading
import time
from dataclasses import dataclass, field
from typing import Any


@dataclass
class _Totals:
    calls: int = 0
    by_provider: dict[str, int] = field(default_factory=dict)
    fallbacks: int = 0
    escalations: int = 0
    consults: int = 0
    asks: int = 0
    rejected_outputs: int = 0
    latency_sum_ms: float = 0.0
    latency_count: int = 0
    by_task: dict[str, int] = field(default_factory=dict)


_lock = threading.Lock()
_totals = _Totals()


def record_ai_call(
    *,
    task: str,
    provider: str,
    latency_ms: int,
    fallback: bool = False,
    escalated: bool = False,
    rejected: bool = False,
) -> None:
    with _lock:
        _totals.calls += 1
        _totals.by_provider[provider] = _totals.by_provider.get(provider, 0) + 1
        _totals.by_task[task] = _totals.by_task.get(task, 0) + 1
        if fallback:
            _totals.fallbacks += 1
        if escalated:
            _totals.escalations += 1
        if rejected:
            _totals.rejected_outputs += 1
        if task == "consult":
            _totals.consults += 1
        if task == "ask":
            _totals.asks += 1
        _totals.latency_sum_ms += max(0, latency_ms)
        _totals.latency_count += 1


def get_activity_snapshot() -> dict[str, Any]:
    with _lock:
        avg = (
            _totals.latency_sum_ms / _totals.latency_count if _totals.latency_count else 0.0
        )
        return {
            "synthetic_note": "synthetic data, architecture demo only",
            "calls": _totals.calls,
            "by_provider": dict(_totals.by_provider),
            "by_task": dict(_totals.by_task),
            "fallbacks": _totals.fallbacks,
            "escalations": _totals.escalations,
            "consults": _totals.consults,
            "asks": _totals.asks,
            "rejected_outputs": _totals.rejected_outputs,
            "average_latency_ms": round(avg, 1),
            "as_of": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }


def reset_activity_for_tests() -> None:
    global _totals
    with _lock:
        _totals = _Totals()
