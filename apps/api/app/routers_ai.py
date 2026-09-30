"""AI and voice HTTP routes."""

from __future__ import annotations

from typing import Annotated, Any, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth import get_current_user, write_audit
from app.db import User, get_db
from app.services.ai.router import get_ai_router

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
    language: str = "en"
    text: str


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


@router.post("/ai/visit-summary")
def ai_summary(
    body: dict[str, Any],
    user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> dict:
    result = get_ai_router().run("summary", body)
    write_audit(db, action="ai_used", actor_id=user.id, actor_username=user.username, detail="summary")
    return result.model_dump()


@router.post("/ai/insights")
def ai_insights(
    body: InsightsBody,
    user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> dict:
    result = get_ai_router().run("insights", body.model_dump())
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
    """Mock cloud TTS — returns metadata; clients use Web Speech / pre-recorded audio."""
    return {
        "ok": True,
        "provider_used": "mock",
        "phrase_id": body.phrase_id,
        "language": body.language,
        "audio_url": None,
        "note": "No cloud audio in demo. Use browser speechSynthesis or /public/audio files.",
    }


@router.post("/voice/transcribe")
def voice_transcribe(user: Annotated[User, Depends(get_current_user)]) -> dict:
    return {
        "ok": True,
        "provider_used": "mock",
        "transcript": "",
        "note": "Use Web Speech API on device when available. Confirm before applying.",
    }
