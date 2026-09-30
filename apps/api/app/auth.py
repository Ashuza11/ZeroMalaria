"""Auth helpers: password hashing, JWT, role checks, audit logging."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Annotated, Callable, Iterable

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.config import settings
from app.db import AuditLog, User, get_db

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer = HTTPBearer(auto_error=False)

Role = str  # chw | nurse | supervisor | rbc


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(user: User, expires_hours: int | None = None) -> str:
    hours = expires_hours if expires_hours is not None else settings.jwt_expire_hours
    payload = {
        "sub": user.id,
        "username": user.username,
        "role": user.role,
        "facility_id": user.facility_id,
        "district": user.district,
        "exp": datetime.utcnow() + timedelta(hours=hours),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc


def write_audit(
    db: Session,
    *,
    action: str,
    actor_id: str | None = None,
    actor_username: str | None = None,
    resource_type: str | None = None,
    resource_id: str | None = None,
    detail: str | None = None,
) -> None:
    db.add(
        AuditLog(
            action=action,
            actor_id=actor_id,
            actor_username=actor_username,
            resource_type=resource_type,
            resource_id=resource_id,
            detail=detail or "",
            created_at=datetime.utcnow(),
        )
    )
    db.commit()


def get_current_user(
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    if creds is None or not creds.credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    data = decode_token(creds.credentials)
    user = db.query(User).filter(User.id == data.get("sub")).first()
    if not user or not user.active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User inactive or missing")
    return user


def require_roles(*roles: Role) -> Callable:
    allowed = set(roles)

    def _dep(
        user: Annotated[User, Depends(get_current_user)],
        db: Annotated[Session, Depends(get_db)],
    ) -> User:
        if user.role not in allowed:
            write_audit(
                db,
                action="denied_access",
                actor_id=user.id,
                actor_username=user.username,
                detail=f"required_roles={','.join(sorted(allowed))}",
            )
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for this action")
        return user

    return _dep


def assert_facility_scope(user: User, facility_id: str | None) -> None:
    if user.role == "rbc":
        return
    if user.role in {"nurse", "supervisor"} and user.facility_id and facility_id == user.facility_id:
        return
    if user.role == "chw" and user.facility_id and facility_id == user.facility_id:
        return
    if user.role == "supervisor" and user.district:
        return  # district checked by caller with facility.district
    raise HTTPException(status_code=403, detail="Outside your facility scope")


def assert_chw_own(user: User, chw_id: str | None) -> None:
    if user.role != "chw":
        return
    if chw_id and chw_id == user.chw_code:
        return
    raise HTTPException(status_code=403, detail="CHW may only access own records")


def can_manage_user(actor: User, target_role: str) -> bool:
    if actor.role == "rbc":
        return True
    if actor.role == "supervisor" and target_role == "chw":
        return True
    return False
