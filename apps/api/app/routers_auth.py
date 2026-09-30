"""Auth and user management routes."""

from __future__ import annotations

import time
import uuid
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth import (
    can_manage_user,
    create_access_token,
    get_current_user,
    hash_password,
    require_roles,
    verify_password,
    write_audit,
)
from app.config import settings
from app.db import Facility, User, get_db

_LOGIN_WINDOW_SEC = 60
_LOGIN_MAX_ATTEMPTS = 5
_login_attempts: dict[str, list[float]] = {}

DEMO_USERNAMES: dict[str, str] = {
    "chw": "chw.demo",
    "nurse": "nurse.demo",
    "supervisor": "supervisor.demo",
    "rbc": "rbc.demo",
}


def _login_rate_key(username: str, client_host: str) -> str:
    return f"{username.lower()}:{client_host}"


def _prune_attempts(key: str, now: float) -> list[float]:
    window_start = now - _LOGIN_WINDOW_SEC
    attempts = [t for t in _login_attempts.get(key, []) if t >= window_start]
    _login_attempts[key] = attempts
    return attempts


def check_login_rate_limit(username: str, client_host: str) -> None:
    now = time.time()
    key = _login_rate_key(username, client_host)
    attempts = _prune_attempts(key, now)
    if len(attempts) >= _LOGIN_MAX_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts. Please wait a minute and try again.",
        )


def record_failed_login_attempt(username: str, client_host: str) -> None:
    now = time.time()
    key = _login_rate_key(username, client_host)
    attempts = _prune_attempts(key, now)
    attempts.append(now)
    _login_attempts[key] = attempts


def clear_login_rate_limits() -> None:
    """Test helper — reset in-memory login rate limit state."""
    _login_attempts.clear()

router = APIRouter(prefix="/auth", tags=["auth"])
users_router = APIRouter(prefix="/users", tags=["users"])


class LoginRequest(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=8, max_length=128)


class DemoLoginRequest(BaseModel):
    role: Literal["chw", "nurse", "supervisor", "rbc"]


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


class UserOut(BaseModel):
    id: str
    username: str
    display_name: str
    role: str
    phone: str
    district: str
    facility_id: str
    village: str
    chw_code: str
    active: bool


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=64)
    password: str = Field(min_length=6, max_length=128)
    display_name: str
    role: str = "chw"
    phone: str = ""
    district: str = ""
    facility_id: str = ""
    village: str = ""
    chw_code: str = ""


class UserPatch(BaseModel):
    active: bool | None = None
    facility_id: str | None = None
    village: str | None = None
    district: str | None = None
    phone: str | None = None
    display_name: str | None = None


def _user_out(u: User) -> UserOut:
    return UserOut(
        id=u.id,
        username=u.username,
        display_name=u.display_name,
        role=u.role,
        phone=u.phone,
        district=u.district,
        facility_id=u.facility_id,
        village=u.village,
        chw_code=u.chw_code,
        active=u.active,
    )


@router.post("/login", response_model=TokenOut)
def login(body: LoginRequest, request: Request, db: Session = Depends(get_db)) -> TokenOut:
    client_host = request.client.host if request.client else "unknown"
    check_login_rate_limit(body.username, client_host)
    user = db.query(User).filter(User.username == body.username).first()
    if not user or not verify_password(body.password, user.password_hash):
        record_failed_login_attempt(body.username, client_host)
        write_audit(
            db,
            action="failed_login",
            actor_username=body.username,
            detail=f"ip={client_host}",
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )
    if not user.active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account deactivated")
    token = create_access_token(user)
    write_audit(db, action="login", actor_id=user.id, actor_username=user.username)
    return TokenOut(access_token=token, user=_user_out(user))


@router.post("/demo-login", response_model=TokenOut)
def demo_login(body: DemoLoginRequest, db: Session = Depends(get_db)) -> TokenOut:
    if not settings.demo_mode:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Demo login is disabled on this server",
        )
    username = DEMO_USERNAMES[body.role]
    user = db.query(User).filter(User.username == username).first()
    if not user or not user.active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Demo user not found")
    if not verify_password(settings.demo_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Demo account misconfigured — re-run seed with matching ZM_DEMO_PASSWORD",
        )
    token = create_access_token(user)
    write_audit(
        db,
        action="demo_login",
        actor_id=user.id,
        actor_username=user.username,
        detail=f"role={body.role}",
    )
    return TokenOut(access_token=token, user=_user_out(user))


@router.get("/me", response_model=UserOut)
def me(user: Annotated[User, Depends(get_current_user)]) -> UserOut:
    return _user_out(user)


@router.post("/logout")
def logout(user: Annotated[User, Depends(get_current_user)], db: Session = Depends(get_db)) -> dict:
    write_audit(db, action="logout", actor_id=user.id, actor_username=user.username)
    return {"ok": True}


@users_router.get("", response_model=list[UserOut])
def list_users(
    user: Annotated[User, Depends(require_roles("supervisor", "rbc"))],
    db: Session = Depends(get_db),
) -> list[UserOut]:
    q = db.query(User)
    if user.role == "supervisor":
        q = q.filter(User.facility_id == user.facility_id, User.role == "chw")
    return [_user_out(u) for u in q.order_by(User.display_name).all()]


@users_router.post("", response_model=UserOut)
def create_user(
    body: UserCreate,
    actor: Annotated[User, Depends(require_roles("supervisor", "rbc"))],
    db: Session = Depends(get_db),
) -> UserOut:
    if actor.role == "supervisor":
        body.role = "chw"
    if not can_manage_user(actor, body.role):
        raise HTTPException(403, "Cannot create this role")
    if db.query(User).filter(User.username == body.username).first():
        raise HTTPException(400, "Username already exists")
    facility_id = body.facility_id or actor.facility_id
    district = body.district or actor.district
    if actor.role == "supervisor":
        facility_id = actor.facility_id
        district = actor.district
    if facility_id and not db.query(Facility).filter(Facility.facility_id == facility_id).first():
        raise HTTPException(400, "Unknown facility_id")
    chw_code = body.chw_code or (f"CHW-{facility_id}-01" if body.role == "chw" else "")
    row = User(
        id=str(uuid.uuid4()),
        username=body.username,
        password_hash=hash_password(body.password),
        display_name=body.display_name,
        role=body.role,
        phone=body.phone,
        district=district,
        facility_id=facility_id or "",
        village=body.village,
        chw_code=chw_code,
        active=True,
    )
    db.add(row)
    db.commit()
    write_audit(
        db,
        action="user_created",
        actor_id=actor.id,
        actor_username=actor.username,
        resource_type="user",
        resource_id=row.id,
        detail=f"role={row.role}",
    )
    return _user_out(row)


@users_router.patch("/{user_id}", response_model=UserOut)
def patch_user(
    user_id: str,
    body: UserPatch,
    actor: Annotated[User, Depends(require_roles("supervisor", "rbc"))],
    db: Session = Depends(get_db),
) -> UserOut:
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(404, "User not found")
    if actor.role == "supervisor":
        if target.role != "chw" or target.facility_id != actor.facility_id:
            raise HTTPException(403, "Supervisor may only manage CHWs in own facility")
    if body.active is not None:
        target.active = body.active
    if body.facility_id is not None and actor.role == "rbc":
        target.facility_id = body.facility_id
    if body.village is not None:
        target.village = body.village
    if body.district is not None and actor.role == "rbc":
        target.district = body.district
    if body.phone is not None:
        target.phone = body.phone
    if body.display_name is not None:
        target.display_name = body.display_name
    db.commit()
    db.refresh(target)
    write_audit(
        db,
        action="user_deactivated" if body.active is False else "user_updated",
        actor_id=actor.id,
        actor_username=actor.username,
        resource_type="user",
        resource_id=target.id,
    )
    return _user_out(target)
