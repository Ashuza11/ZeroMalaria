"""Multi-provider AI layer with ordered fallback. Never decides urgency or doses."""

from __future__ import annotations

import json
import re
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any

from pydantic import BaseModel, Field, ValidationError

from app.config import settings
from app.nlp import extract_symptoms_mock
from app.services.ai.sanitize import sanitize_for_ai

# Matches clinical prescribing language in *user or model content* (not our refusal replies).
DRUG_PATTERN = re.compile(
    r"\b(artemether|lumefantrine|artesunate|quinine|coartem|asaq|mg/kg|tablets?|capsules?)\b",
    re.I,
)
DOSE_REQUEST = re.compile(r"\b(dose|dosage|prescribe|how many tablets)\b", re.I)


class ExtractResult(BaseModel):
    suggested_fields: dict[str, Any] = Field(default_factory=dict)
    matched_signs: list[str] = Field(default_factory=list)
    note: str = "Layer 3 NLP only. Does not choose the decision."
    needs_native_review: bool = False


class ExplainResult(BaseModel):
    explanation: str
    language: str = "en"
    needs_native_review: bool = False


class SummaryResult(BaseModel):
    summary: str
    needs_native_review: bool = False


class InsightResult(BaseModel):
    insight: str
    signal_level: str = "none"
    needs_native_review: bool = False


class ChatResult(BaseModel):
    reply: str
    open_triage: bool = False
    out_of_scope: bool = False
    needs_native_review: bool = False


class AIResponse(BaseModel):
    ok: bool = True
    task: str
    data: dict[str, Any]
    provider_used: str
    latency_ms: int
    fallback_reason: str | None = None


@dataclass
class CircuitState:
    failures: int = 0
    open_until: float = 0.0


class AIProvider(ABC):
    name: str = "base"

    @abstractmethod
    def complete(self, task: str, payload: dict[str, Any]) -> dict[str, Any]:
        ...


class LocalNlpProvider(AIProvider):
    name = "local"

    def complete(self, task: str, payload: dict[str, Any]) -> dict[str, Any]:
        lang = str(payload.get("language") or "en")
        if task == "extract":
            text = str(payload.get("free_text") or "")
            raw = extract_symptoms_mock(text, lang)
            return ExtractResult(
                suggested_fields=raw.get("suggested_fields") or {},
                matched_signs=raw.get("matched_signs") or [],
                note=raw.get("note") or "",
                needs_native_review=lang.startswith("rw"),
            ).model_dump()
        if task == "explain":
            reasons = payload.get("reasons") or []
            decision = payload.get("decision") or "treat_at_home"
            lines = "; ".join(reasons[:5]) if reasons else "No danger-sign rule fired."
            text = (
                f"The recommendation is {decision.replace('_', ' ')}. {lines} "
                "Please confirm. This is decision support, not a diagnosis."
            )
            if lang.startswith("rw"):
                text = (
                    f"Inama ni {decision}. {lines} Emeza icyemezo. "
                    "Igikoresho cy'ubufasha, ntabwo gisimbura umuganga."
                )
            return ExplainResult(
                explanation=text, language=lang, needs_native_review=lang.startswith("rw")
            ).model_dump()
        if task == "summary":
            return SummaryResult(
                summary=str(payload.get("summary_seed") or "Visit summary unavailable offline."),
                needs_native_review=lang.startswith("rw"),
            ).model_dump()
        if task == "insights":
            stats = payload.get("aggregated_stats") or {}
            pct = stats.get("percent_change")
            level = stats.get("signal_level") or "none"
            if level == "none":
                insight = "No statistical increase signal in the selected period (synthetic demo data)."
            else:
                insight = (
                    f"Potential increase detected (statistical signal): {pct}% vs baseline "
                    f"in {stats.get('location', 'selected area')}. Recommended: verify with facility records."
                )
            return InsightResult(
                insight=insight, signal_level=level, needs_native_review=False
            ).model_dump()
        if task == "chat":
            msg = str(payload.get("message") or "").lower()
            danger = any(
                w in msg
                for w in ["convuls", "gusetsa", "unable to drink", "ntashobora kunywa", "unconscious", "letharg"]
            )
            if DRUG_PATTERN.search(msg) or DOSE_REQUEST.search(msg) or "give medicine" in msg:
                return ChatResult(
                    reply="I can't name medicines or give amounts. Please ask the health center nurse.",
                    out_of_scope=True,
                ).model_dump()
            if danger:
                return ChatResult(
                    reply="Those signs may need urgent referral. Open triage and confirm danger signs. I cannot decide alone.",
                    open_triage=True,
                ).model_dump()
            if any(w in msg for w in ["weather", "football", "politics", "joke"]):
                reply = (
                    "Sinshobora gusubiza icyo. Baza umuforomo ku kigo nderabuzima."
                    if lang.startswith("rw")
                    else "I can't answer that. Please ask the health center nurse."
                )
                return ChatResult(
                    reply=reply, out_of_scope=True, needs_native_review=lang.startswith("rw")
                ).model_dump()
            return ChatResult(
                reply="I can help explain triage steps. Use the guided form. Confirm every answer yourself.",
            ).model_dump()
        raise ValueError(f"Unknown task {task}")


class MockProvider(AIProvider):
    """Test double: can simulate quota/timeout/invalid JSON."""

    name = "mock"

    def __init__(self, mode: str = "ok") -> None:
        self.mode = mode

    def complete(self, task: str, payload: dict[str, Any]) -> dict[str, Any]:
        if self.mode == "timeout":
            raise TimeoutError("mock timeout")
        if self.mode == "quota":
            raise RuntimeError("429 quota exceeded")
        if self.mode == "invalid":
            return {"not": "valid schema", "dosage": "2 tablets artesunate"}
        return LocalNlpProvider().complete(task, payload)


class GeminiProvider(AIProvider):
    name = "gemini"

    def complete(self, task: str, payload: dict[str, Any]) -> dict[str, Any]:
        if not settings.gemini_api_key:
            raise RuntimeError("GEMINI_API_KEY not configured")
        # Network call intentionally not implemented without a key — raise to trigger fallback.
        raise RuntimeError("Gemini live call not configured for this environment")


class GroqProvider(AIProvider):
    name = "groq"

    def complete(self, task: str, payload: dict[str, Any]) -> dict[str, Any]:
        if not settings.groq_api_key:
            raise RuntimeError("GROQ_API_KEY not configured")
        raise RuntimeError("Groq live call not configured for this environment")


class VertexProvider(AIProvider):
    name = "vertex"

    def complete(self, task: str, payload: dict[str, Any]) -> dict[str, Any]:
        if not settings.google_cloud_project:
            raise RuntimeError("Vertex disabled")
        raise RuntimeError("Vertex live call not configured")


TASK_MODELS = {
    "extract": ExtractResult,
    "explain": ExplainResult,
    "summary": SummaryResult,
    "insights": InsightResult,
    "chat": ChatResult,
}


class AIRouter:
    def __init__(self, providers: list[AIProvider] | None = None) -> None:
        self.circuits: dict[str, CircuitState] = {}
        if providers is not None:
            self.providers = providers
        else:
            order = [p.strip() for p in settings.ai_provider_order.split(",") if p.strip()]
            registry = {
                "gemini": GeminiProvider(),
                "groq": GroqProvider(),
                "vertex": VertexProvider(),
                "local": LocalNlpProvider(),
                "mock": MockProvider(),
            }
            self.providers = [registry[n] for n in order if n in registry]
            if not any(p.name == "local" for p in self.providers):
                self.providers.append(LocalNlpProvider())

    def _circuit_open(self, name: str) -> bool:
        state = self.circuits.get(name) or CircuitState()
        return time.time() < state.open_until

    def _fail(self, name: str) -> None:
        state = self.circuits.setdefault(name, CircuitState())
        state.failures += 1
        if state.failures >= 2:
            state.open_until = time.time() + 60

    def _ok(self, name: str) -> None:
        self.circuits[name] = CircuitState()

    def _validate(self, task: str, data: dict[str, Any]) -> dict[str, Any]:
        model = TASK_MODELS[task]
        parsed = model.model_validate(data)
        dumped = parsed.model_dump()
        blob = json.dumps(dumped)
        # Reject model inventing drug names; allow our own out-of-scope refusals.
        if dumped.get("out_of_scope"):
            return dumped
        if DRUG_PATTERN.search(blob) or re.search(r"\b\d+\s*mg\b", blob, re.I):
            raise ValueError("Provider output contained drug/dose language")
        return dumped

    def run(self, task: str, payload: dict[str, Any]) -> AIResponse:
        safe = sanitize_for_ai(payload)
        reasons: list[str] = []
        last_error = "none"
        for provider in self.providers:
            if provider.name != "local" and self._circuit_open(provider.name):
                reasons.append(f"{provider.name}:circuit_open")
                continue
            start = time.time()
            try:
                # Soft timeout simulation via settings (real HTTP would use httpx timeout)
                data = provider.complete(task, safe)
                validated = self._validate(task, data)
                latency = int((time.time() - start) * 1000)
                if latency > settings.ai_timeout_seconds * 1000 and provider.name != "local":
                    raise TimeoutError("exceeded AI_TIMEOUT_SECONDS")
                self._ok(provider.name)
                return AIResponse(
                    task=task,
                    data=validated,
                    provider_used=provider.name,
                    latency_ms=latency,
                    fallback_reason="; ".join(reasons) if reasons else None,
                )
            except (TimeoutError, RuntimeError, ValidationError, ValueError) as exc:
                last_error = str(exc)
                reasons.append(f"{provider.name}:{last_error}")
                if provider.name != "local":
                    self._fail(provider.name)
                continue
        # Absolute last resort
        local = LocalNlpProvider()
        data = self._validate(task, local.complete(task, safe))
        return AIResponse(
            task=task,
            data=data,
            provider_used="local",
            latency_ms=0,
            fallback_reason="; ".join(reasons) or last_error,
        )


_router: AIRouter | None = None


def get_ai_router() -> AIRouter:
    global _router
    if _router is None:
        _router = AIRouter()
    return _router
