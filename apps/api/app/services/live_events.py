"""Persisted live events for SSE / poll (role-scoped on read)."""

from __future__ import annotations

import json
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.db import AppEvent, Referral, User


def append_event(
    db: Session,
    *,
    event_type: str,
    payload: dict[str, Any],
    chw_id: str | None = None,
    facility_id: str | None = None,
) -> AppEvent:
    now = datetime.utcnow()
    row = AppEvent(
        id=str(uuid.uuid4()),
        event_type=event_type,
        payload_json=json.dumps(payload),
        chw_id=chw_id or "",
        facility_id=facility_id or "",
        created_at=now,
    )
    db.add(row)
    db.flush()
    return row


def append_referral_event(db: Session, event_type: str, referral: Referral, extra: dict[str, Any] | None = None) -> AppEvent:
    payload: dict[str, Any] = {
        "referral_id": referral.id,
        "client_uuid": referral.client_uuid,
        "status": referral.status,
        "decision": referral.decision,
        "facility_id": referral.facility_id,
        "chw_id": referral.chw_id,
    }
    if extra:
        payload.update(extra)
    return append_event(
        db,
        event_type=event_type,
        payload=payload,
        chw_id=referral.chw_id,
        facility_id=referral.facility_id,
    )


def event_to_wire(row: AppEvent) -> dict[str, Any]:
    try:
        payload = json.loads(row.payload_json or "{}")
    except json.JSONDecodeError:
        payload = {}
    return {
        "type": row.event_type,
        "payload": payload,
        "at": row.created_at.isoformat() + "Z" if row.created_at else datetime.utcnow().isoformat() + "Z",
    }


def scoped_events_query(db: Session, user: User, since: datetime):
    from app.roles import CHW, HEALTH_CENTER, is_national, normalize_role

    q = db.query(AppEvent).filter(AppEvent.created_at > since)
    role = normalize_role(user.role)
    if role == CHW:
        q = q.filter(AppEvent.chw_id == user.chw_code)
    elif role == HEALTH_CENTER:
        if user.facility_id:
            q = q.filter(AppEvent.facility_id == user.facility_id)
    elif not is_national(role):
        q = q.filter(AppEvent.id == "")  # empty
    return q.order_by(AppEvent.created_at.asc())


def user_can_access_referral(user: User, referral: Referral) -> bool:
    from app.roles import CHW, HEALTH_CENTER, is_national, normalize_role

    role = normalize_role(user.role)
    if is_national(role):
        return True
    if role == CHW:
        return referral.chw_id == user.chw_code
    if role == HEALTH_CENTER:
        return bool(user.facility_id) and referral.facility_id == user.facility_id
    return False
