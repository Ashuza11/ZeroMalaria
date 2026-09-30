"""AI and voice HTTP routes."""

from __future__ import annotations

from typing import Annotated, Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth import get_current_user, write_audit
from app.config import settings
from app.db import User, get_db
from app.services.ai.router import get_ai_router
from app.services.pindo import PindoTtsError, pindo_is_configured, synthesize_pindo_tts

router = APIRouter(tags=["ai"])


class ExtractBody(BaseModel):
    free_text: str
    language: str = "en"
    age_months: Optional[int] = None
    sex: Optional[str] = None
    temperature_c: Optional[float] = None
    fever_days: Optional[int] = None
    tdr_result: Optional[str] = None


class ExplainBody(BaseModel):
    decision: str
    reasons: list[str] = Field(default_factory=list)
    triggered_rules: list[str] = Field(default_factory=list)
    language: str = "en"


class InsightsBody(BaseModel):
    aggregated_stats: dict[str, Any]
    language: str = "en"


class ChatBody(BaseModel):
    message: str
    language: str = "en"
    decision: Optional[str] = None


class SpeakBody(BaseModel):
    phrase_id: str
    language: str = Field(default="rw", pattern="^rw$")
    text: str = Field(min_length=1, max_length=1024)
    speech_rate: float = Field(default=1.0, ge=0.5, le=2.0)


class AdvisoryBody(BaseModel):
    answers: dict[str, Any] = Field(default_factory=dict)
    rules_decision: str
    public_decision: str | None = None
    reasons: list[str] = Field(default_factory=list)
    triggered_rules: list[str] = Field(default_factory=list)
    reason_details: list[dict[str, Any]] = Field(default_factory=list)
    missing_info: list[str] = Field(default_factory=list)
    protocol_reference: str = ""
    language: str = "rw"


class AdvisoryFeedbackBody(BaseModel):
    rules_decision: str
    chw_followed: bool
    suggested_escalation: bool = False


@router.post("/ai/advisory")
def ai_advisory(
    body: AdvisoryBody,
    user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> dict:
    """Advisory-only layer. Rules decision is authoritative; failures return ok=false silently for UI."""
    from app.services.ai.router import load_protocol_excerpts

    payload = {
        **body.model_dump(),
        "decision": body.rules_decision,
        "protocol_excerpts": load_protocol_excerpts(),
    }
    try:
        result = get_ai_router().run("advisory", payload)
        write_audit(
            db,
            action="ai_used",
            actor_id=user.id,
            actor_username=user.username,
            resource_type="ai",
            detail=f"advisory via {result.provider_used}",
        )
        return result.model_dump()
    except Exception:
        # Never surface provider errors to the CHW; UI keeps rules result alone.
        return {
            "ok": False,
            "task": "advisory",
            "data": {},
            "provider_used": "none",
            "latency_ms": 0,
            "fallback_reason": "advisory_unavailable",
        }


@router.post("/ai/advisory-feedback")
def ai_advisory_feedback(
    body: AdvisoryFeedbackBody,
    user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> dict:
    write_audit(
        db,
        action="ai_advisory_feedback",
        actor_id=user.id,
        actor_username=user.username,
        resource_type="ai",
        detail=(
            f"chw_followed={body.chw_followed}; rules={body.rules_decision}; "
            f"suggested_escalation={body.suggested_escalation}"
        ),
    )
    return {"ok": True}


@router.post("/ai/extract-symptoms")
def ai_extract(
    body: ExtractBody,
    user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> dict:
    result = get_ai_router().run("extract", body.model_dump())
    write_audit(
        db,
        action="ai_used",
        actor_id=user.id,
        actor_username=user.username,
        resource_type="ai",
        detail=f"extract via {result.provider_used}",
    )
    return result.model_dump()


@router.post("/ai/explain")
def ai_explain(
    body: ExplainBody,
    user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> dict:
    result = get_ai_router().run("explain", body.model_dump())
    write_audit(
        db,
        action="ai_used",
        actor_id=user.id,
        actor_username=user.username,
        detail=f"explain via {result.provider_used}",
    )
    return result.model_dump()


class VisitSummaryBody(BaseModel):
    answers: dict[str, Any] = Field(default_factory=dict)
    decision: str = "treat_at_home"
    rules_decision: str | None = None
    reasons: list[str] = Field(default_factory=list)
    triggered_rules: list[str] = Field(default_factory=list)
    shap_factors: list[str] = Field(default_factory=list)
    severe_risk: float | None = None
    ml_escalated: bool = False
    language: str = "en"


class AskBody(BaseModel):
    question: str
    case: dict[str, Any] = Field(default_factory=dict)
    language: str = "en"


class ConsultBody(BaseModel):
    case: dict[str, Any] = Field(default_factory=dict)
    language: str = "en"
    follow_up: str | None = None
    session_id: str | None = None


@router.post("/ai/visit-summary")
def ai_summary(
    body: VisitSummaryBody,
    user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> dict:
    from app.services.ai.activity_metrics import record_ai_call
    from app.services.ai.guardrails import sanitize_case_snapshot

    snap = sanitize_case_snapshot(
        {
            **body.answers,
            "decision": body.decision,
            "rules_decision": body.rules_decision or body.decision,
            "shap_factors": body.shap_factors,
            "severe_risk": body.severe_risk,
            "ml_escalated": body.ml_escalated,
            "triggered_rules": body.triggered_rules,
            "language": body.language,
        }
    )
    seed = (
        f"Visit: decision={body.decision}; rules={body.rules_decision or body.decision}; "
        f"age_band={snap.get('age_band')}; RDT={snap.get('tdr_result')}; "
        f"fever_days={snap.get('fever_days')}; ML={body.severe_risk}; "
        f"escalated={body.ml_escalated}; factors={', '.join(body.shap_factors[:3])}."
    )
    result = get_ai_router().run(
        "summary",
        {"summary_seed": seed, "language": body.language, **snap},
    )
    record_ai_call(
        task="summary",
        provider=result.provider_used,
        latency_ms=result.latency_ms,
        fallback=bool(result.fallback_reason),
        escalated=body.ml_escalated,
    )
    data = dict(result.data)
    data["label"] = "AI-generated, verify before use"
    data["needs_native_review"] = body.language.startswith("rw") or data.get("needs_native_review")
    data["synthetic_note"] = "synthetic data, architecture demo only"
    data["snapshot"] = snap
    write_audit(db, action="ai_used", actor_id=user.id, actor_username=user.username, detail="summary")
    out = result.model_dump()
    out["data"] = data
    return out


@router.post("/ai/ask")
def ai_ask(
    body: AskBody,
    user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> dict:
    from app.services.ai.activity_metrics import record_ai_call
    from app.services.ai.ask import answer_case_question

    t0 = __import__("time").time()
    data = answer_case_question(body.question, body.case, language=body.language)
    latency = int((__import__("time").time() - t0) * 1000)
    record_ai_call(
        task="ask",
        provider=str(data.get("provider_used") or "local"),
        latency_ms=latency,
        rejected=bool(data.get("rejected")),
    )
    write_audit(
        db,
        action="ai_used",
        actor_id=user.id,
        actor_username=user.username,
        detail=f"ask via {data.get('provider_used')}",
    )
    return {"ok": True, "task": "ask", "data": data, "provider_used": data.get("provider_used"), "latency_ms": latency}


@router.post("/ai/consult")
def ai_consult(
    body: ConsultBody,
    user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> dict:
    from app.services.ai.consult import run_consult

    result = run_consult(
        body.case,
        language=body.language,
        follow_up=body.follow_up,
        session_id=body.session_id,
    )
    write_audit(
        db,
        action="ai_used",
        actor_id=user.id,
        actor_username=user.username,
        detail=f"consult turns={result.get('turn_count')}",
    )
    return {"ok": True, "task": "consult", **result}


@router.get("/ai/consult/{session_id}")
def ai_consult_poll(
    session_id: str,
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    from app.services.ai.consult import get_consult_session

    sess = get_consult_session(session_id)
    if not sess:
        return {"ok": False, "done": True, "error": "not_found"}
    return {"ok": True, **sess}


@router.get("/ai/activity")
def ai_activity(user: Annotated[User, Depends(get_current_user)]) -> dict:
    from app.services.ai.activity_metrics import get_activity_snapshot

    # Aggregate only — no personal data
    _ = user.id
    return get_activity_snapshot()


@router.post("/ai/insights")
def ai_insights(
    body: InsightsBody,
    user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> dict:
    from app.services.ai.activity_metrics import record_ai_call

    result = get_ai_router().run("insights", body.model_dump())
    record_ai_call(
        task="insights",
        provider=result.provider_used,
        latency_ms=result.latency_ms,
        fallback=bool(result.fallback_reason),
    )
    write_audit(db, action="ai_used", actor_id=user.id, actor_username=user.username, detail="insights")
    return result.model_dump()


@router.post("/assistant/chat")
def assistant_chat(
    body: ChatBody,
    user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> dict:
    result = get_ai_router().run("chat", body.model_dump())
    write_audit(db, action="ai_used", actor_id=user.id, actor_username=user.username, detail="chat")
    return result.model_dump()


@router.post("/voice/speak")
def voice_speak(body: SpeakBody, user: Annotated[User, Depends(get_current_user)]) -> dict:
    """Generate Kinyarwanda speech through the configured Pindo access mode."""
    try:
        audio_url = synthesize_pindo_tts(body.text, body.speech_rate)
    except PindoTtsError as exc:
        status_code = 503 if not pindo_is_configured() else 502
        raise HTTPException(status_code=status_code, detail=str(exc)) from exc
    return {
        "ok": True,
        "provider_used": "pindo",
        "phrase_id": body.phrase_id,
        "language": "rw",
        "audio_url": audio_url,
    }


@router.get("/voice/status")
def voice_status(user: Annotated[User, Depends(get_current_user)]) -> dict:
    return {
        "provider": "pindo",
        "configured": pindo_is_configured(),
        "access_mode": settings.pindo_access_mode,
        "supported_languages": ["rw"],
    }


@router.post("/voice/transcribe")
def voice_transcribe(user: Annotated[User, Depends(get_current_user)]) -> dict:
    return {
        "ok": True,
        "provider_used": "mock",
        "transcript": "",
        "note": "Use Web Speech API on device when available. Confirm before applying.",
    }
