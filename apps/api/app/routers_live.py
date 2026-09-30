"""Live events (SSE + poll) and referral message threads."""

from __future__ import annotations

import asyncio
import json
import uuid
from datetime import datetime, timedelta
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.auth import get_current_user, write_audit
from app.db import Referral, ReferralMessage, User, get_db
from app.schemas import ReferralMessageCreate, ReferralMessageOut
from app.services.live_events import (
    append_event,
    append_referral_event,
    event_to_wire,
    scoped_events_query,
    user_can_access_referral,
)

router = APIRouter(tags=["live"])
bearer_optional = HTTPBearer(auto_error=False)


def _parse_since(since: str | None) -> datetime:
    if not since:
        return datetime.utcnow()
    raw = since.strip().replace("Z", "")
    try:
        return datetime.fromisoformat(raw)
    except ValueError as exc:
        raise HTTPException(400, "Invalid since timestamp (use ISO-8601)") from exc


def _resolve_user(
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_optional)],
    access_token: Annotated[str | None, Query(alias="access_token")] = None,
    db: Session = Depends(get_db),
) -> User:
    token = creds.credentials if creds and creds.credentials else access_token
    if not token:
        raise HTTPException(401, "Not authenticated")
    from app.auth import decode_token

    data = decode_token(token)
    user = db.query(User).filter(User.id == data.get("sub")).first()
    if not user or not user.active:
        raise HTTPException(401, "User inactive or missing")
    return user


def _message_out(row: ReferralMessage) -> ReferralMessageOut:
    return ReferralMessageOut(
        id=row.id,
        referral_id=row.referral_id,
        sender_id=row.sender_id,
        sender_role=row.sender_role,
        body=row.body,
        created_at=row.created_at,
        read_at=row.read_at,
    )


@router.get("/events/poll")
def poll_events(
    user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
    since: str | None = Query(None, description="ISO timestamp; events strictly after this"),
) -> dict[str, Any]:
    since_dt = _parse_since(since) if since else datetime.utcnow() - timedelta(seconds=10)
    rows = scoped_events_query(db, user, since_dt).limit(200).all()
    return {
        "events": [event_to_wire(r) for r in rows],
        "server_at": datetime.utcnow().isoformat() + "Z",
    }


@router.get("/events")
async def sse_events(
    user: Annotated[User, Depends(_resolve_user)],
    db: Session = Depends(get_db),
    since: str | None = Query(None),
) -> StreamingResponse:
    since_dt = _parse_since(since) if since else datetime.utcnow()

    async def generate():
        cursor = since_dt
        tick = 0
        while True:
            db.expire_all()
            rows = scoped_events_query(db, user, cursor).limit(50).all()
            for row in rows:
                wire = event_to_wire(row)
                yield f"data: {json.dumps(wire)}\n\n"
                if row.created_at and row.created_at > cursor:
                    cursor = row.created_at
            tick += 1
            if tick % 8 == 0:
                hb = {
                    "type": "heartbeat",
                    "payload": {},
                    "at": datetime.utcnow().isoformat() + "Z",
                }
                yield f"data: {json.dumps(hb)}\n\n"
            await asyncio.sleep(2)

    return StreamingResponse(generate(), media_type="text/event-stream")


@router.get("/referrals/{referral_id}/messages", response_model=list[ReferralMessageOut])
def list_messages(
    referral_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> list[ReferralMessageOut]:
    referral = db.query(Referral).filter(Referral.id == referral_id).first()
    if not referral:
        raise HTTPException(404, "Referral not found")
    if not user_can_access_referral(user, referral):
        raise HTTPException(403, "Outside your scope")
    rows = (
        db.query(ReferralMessage)
        .filter(ReferralMessage.referral_id == referral_id)
        .order_by(ReferralMessage.created_at.asc())
        .all()
    )
    return [_message_out(r) for r in rows]


@router.post("/referrals/{referral_id}/messages", response_model=ReferralMessageOut)
def create_message(
    referral_id: str,
    body: ReferralMessageCreate,
    user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> ReferralMessageOut:
    referral = db.query(Referral).filter(Referral.id == referral_id).first()
    if not referral:
        raise HTTPException(404, "Referral not found")
    if not user_can_access_referral(user, referral):
        raise HTTPException(403, "Outside your scope")
    text = (body.body or "").strip()
    if not text:
        raise HTTPException(400, "Message body required")
    if len(text) > 2000:
        raise HTTPException(400, "Message too long")
    row = ReferralMessage(
        id=str(uuid.uuid4()),
        referral_id=referral_id,
        sender_id=user.id,
        sender_role=user.role,
        body=text,
        created_at=datetime.utcnow(),
    )
    db.add(row)
    append_event(
        db,
        event_type="referral.message",
        payload={
            "referral_id": referral_id,
            "message_id": row.id,
            "sender_role": user.role,
            "preview": text[:120],
        },
        chw_id=referral.chw_id,
        facility_id=referral.facility_id,
    )
    write_audit(
        db,
        action="referral_message",
        actor_id=user.id,
        actor_username=user.username,
        resource_type="referral",
        resource_id=referral_id,
        detail=text[:200],
    )
    db.commit()
    db.refresh(row)
    return _message_out(row)
