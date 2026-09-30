"""Auth and user management routes (RBAC-aware)."""

from __future__ import annotations

import time
import uuid
from datetime import datetime, timedelta
from typing import Annotated, Any, Iterable, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from pydantic import BaseModel, Field
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.auth import (
    assert_can_modify_user,
    assert_not_last_super_admin,
    can_manage_user,
    create_access_token,
    create_refresh_token_value,
    get_current_user,
    has_permission,
    hash_password,
    hash_token,
    require_permission,
    require_roles,
    user_permissions,
    validate_password_policy,
    verify_password,
    write_audit,
    apply_scope_filter_users,
    mask_sensitive,
)
from app.config import settings
from app.db import Facility, RefreshToken, User, get_db
from app.migrate import is_demo_username
from app.roles import (
    ALL_ROLES,
    CHW,
    DEMO_USERNAMES,
    HEALTH_CENTER,
    RBC_ADMIN,
    SUPER_ADMIN,
    assignable_roles,
    normalize_role,
)

PASSWORD_PROMPT_PENDING = "pending"
PASSWORD_PROMPT_CHANGED = "changed"
PASSWORD_PROMPT_DISMISSED = "dismissed"


def password_change_policy() -> str:
    pol = (settings.password_change_policy or "prompt").strip().lower()
    return pol if pol in {"prompt", "enforce"} else "prompt"


def _set_password_prompt(user: User, status: str) -> None:
    user.password_prompt_status = status
    user.must_change_password = status == PASSWORD_PROMPT_PENDING


_LOGIN_WINDOW_SEC = 900  # 15 min lockout window
_LOGIN_MAX_ATTEMPTS = 5
_login_attempts: dict[str, list[float]] = {}

# Presenter-only demo-login (not shown on login page)
DemoRole = Literal[
    "CHW",
    "HEALTH_CENTER",
    "RBC_ADMIN",
    "SUPER_ADMIN",
    # legacy aliases map to current roles
    "chw",
    "nurse",
    "supervisor",
    "rbc",
    "SUPERVISOR",
    "RBC_OFFICER",
]


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
            detail="login_locked",
        )


def record_failed_login_attempt(username: str, client_host: str) -> None:
    now = time.time()
    key = _login_rate_key(username, client_host)
    attempts = _prune_attempts(key, now)
    attempts.append(now)
    _login_attempts[key] = attempts


def clear_login_rate_limits() -> None:
    _login_attempts.clear()


router = APIRouter(prefix="/auth", tags=["auth"])
users_router = APIRouter(prefix="/users", tags=["users"])


class LoginRequest(BaseModel):
    username: str = Field(min_length=3, max_length=128)  # username or email
    password: str = Field(min_length=8, max_length=128)


class DemoLoginRequest(BaseModel):
    role: DemoRole


class TokenOut(BaseModel):
    access_token: str
    refresh_token: str | None = None
    token_type: str = "bearer"
    user: "UserOut"
    must_change_password: bool = False
    password_prompt_status: str = PASSWORD_PROMPT_CHANGED
    password_change_policy: str = "prompt"


class UserOut(BaseModel):
    id: str
    username: str
    email: str = ""
    display_name: str
    role: str
    phone: str
    district: str
    facility_id: str
    village: str
    village_id: str = ""
    chw_code: str
    active: bool
    must_change_password: bool = False
    password_prompt_status: str = PASSWORD_PROMPT_CHANGED
    last_login: datetime | None = None
    deleted_at: datetime | None = None
    version: int = 1
    permissions: list[str] = []


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=64)
    email: str = ""
    password: str = Field(min_length=10, max_length=128)
    display_name: str
    role: str = CHW
    phone: str = ""
    district: str = ""
    facility_id: str = ""
    village: str = ""
    village_id: str = ""
    chw_code: str = ""


class UserPatch(BaseModel):
    active: bool | None = None
    facility_id: str | None = None
    village: str | None = None
    village_id: str | None = None
    district: str | None = None
    phone: str | None = None
    display_name: str | None = None
    email: str | None = None
    role: str | None = None
    version: int | None = None


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=8, max_length=128)
    new_password: str = Field(min_length=10, max_length=128)


class RefreshRequest(BaseModel):
    refresh_token: str | None = None


class PageOut(BaseModel):
    items: list[UserOut]
    total: int
    page: int
    page_size: int


def _prompt_status(u: User) -> str:
    status = (getattr(u, "password_prompt_status", None) or "").strip().lower()
    if status in {PASSWORD_PROMPT_PENDING, PASSWORD_PROMPT_CHANGED, PASSWORD_PROMPT_DISMISSED}:
        return status
    return PASSWORD_PROMPT_PENDING if getattr(u, "must_change_password", False) else PASSWORD_PROMPT_CHANGED


def _token_out(access: str, refresh: str | None, user: User, perms: Iterable[str] | None = None) -> TokenOut:
    uout = _user_out(user, perms)
    return TokenOut(
        access_token=access,
        refresh_token=refresh,
        user=uout,
        must_change_password=uout.must_change_password,
        password_prompt_status=uout.password_prompt_status,
        password_change_policy=password_change_policy(),
    )


def _user_out(u: User, perms: Iterable[str] | None = None) -> UserOut:
    status = _prompt_status(u)
    return UserOut(
        id=u.id,
        username=u.username,
        email=getattr(u, "email", "") or "",
        display_name=u.display_name,
        role=normalize_role(u.role),
        phone=u.phone,
        district=u.district,
        facility_id=u.facility_id,
        village=u.village,
        village_id=getattr(u, "village_id", "") or "",
        chw_code=u.chw_code,
        active=u.active,
        # Legacy flag: only true under enforce+pending (frontend must not use for soft prompt)
        must_change_password=status == PASSWORD_PROMPT_PENDING and password_change_policy() == "enforce",
        password_prompt_status=status,
        last_login=getattr(u, "last_login", None),
        deleted_at=getattr(u, "deleted_at", None),
        version=getattr(u, "version", 1) or 1,
        permissions=list(perms or []),
    )


def _issue_refresh(db: Session, user: User) -> str:
    raw = create_refresh_token_value()
    db.add(
        RefreshToken(
            id=str(uuid.uuid4()),
            user_id=user.id,
            token_hash=hash_token(raw),
            expires_at=datetime.utcnow() + timedelta(days=14),
        )
    )
    return raw


def _set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key="zm_refresh",
        value=token,
        httponly=True,
        samesite="lax",
        max_age=14 * 24 * 3600,
        path="/",
    )


def _find_user_by_login(db: Session, login: str) -> User | None:
    q = login.strip()
    return (
        db.query(User)
        .filter(or_(User.username == q, User.email == q), User.deleted_at.is_(None))
        .first()
    )


def _demo_username_for_role(role: str) -> str:
    r = normalize_role(role)
    return DEMO_USERNAMES.get(r, "")


@router.post("/login", response_model=TokenOut)
def login(body: LoginRequest, request: Request, response: Response, db: Session = Depends(get_db)) -> TokenOut:
    client_host = request.client.host if request.client else "unknown"
    check_login_rate_limit(body.username, client_host)
    user = _find_user_by_login(db, body.username)
    if user and user.locked_until and user.locked_until > datetime.utcnow():
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="login_locked")
    if not user or not verify_password(body.password, user.password_hash):
        record_failed_login_attempt(body.username, client_host)
        if user:
            user.failed_login_count = (user.failed_login_count or 0) + 1
            if user.failed_login_count >= _LOGIN_MAX_ATTEMPTS:
                user.locked_until = datetime.utcnow() + timedelta(minutes=15)
            db.commit()
        write_audit(db, action="failed_login", actor_username=body.username, detail=f"ip={client_host}", ip=client_host)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_credentials")
    if not user.active or user.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="account_deactivated")
    user.failed_login_count = 0
    user.locked_until = None
    user.last_login = datetime.utcnow()
    user.role = normalize_role(user.role)
    access = create_access_token(user)
    refresh = _issue_refresh(db, user)
    db.commit()
    _set_refresh_cookie(response, refresh)
    write_audit(db, action="login", actor_id=user.id, actor_username=user.username, ip=client_host)
    return _token_out(access, refresh, user, user_permissions(db, user))


@router.post("/demo-login", response_model=TokenOut)
def demo_login(body: DemoLoginRequest, response: Response, db: Session = Depends(get_db)) -> TokenOut:
    if not settings.demo_mode:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Demo login is disabled on this server")
    username = _demo_username_for_role(body.role)
    candidates = [username]
    if normalize_role(body.role) == HEALTH_CENTER:
        candidates.append("health.center")
    if normalize_role(body.role) == RBC_ADMIN:
        candidates.extend(["rbc.admin", "rbc.demo"])
    user = None
    for cand in candidates:
        if not cand:
            continue
        user = db.query(User).filter(User.username == cand, User.deleted_at.is_(None)).first()
        if user:
            break
    if not user or not user.active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Demo user not found")
    if not verify_password(settings.demo_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Demo account misconfigured — re-run seed with matching ZM_DEMO_PASSWORD",
        )
    user.role = normalize_role(user.role)
    user.last_login = datetime.utcnow()
    access = create_access_token(user)
    refresh = _issue_refresh(db, user)
    db.commit()
    _set_refresh_cookie(response, refresh)
    write_audit(db, action="demo_login", actor_id=user.id, actor_username=user.username, detail=f"role={body.role}")
    return _token_out(access, refresh, user, user_permissions(db, user))


@router.post("/refresh", response_model=TokenOut)
def refresh_token(
    body: RefreshRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> TokenOut:
    raw = body.refresh_token or request.cookies.get("zm_refresh")
    if not raw:
        raise HTTPException(401, detail="Missing refresh token")
    row = (
        db.query(RefreshToken)
        .filter(RefreshToken.token_hash == hash_token(raw), RefreshToken.revoked_at.is_(None))
        .first()
    )
    if not row or row.expires_at < datetime.utcnow():
        raise HTTPException(401, detail="Invalid refresh token")
    user = db.query(User).filter(User.id == row.user_id).first()
    if not user or not user.active or user.deleted_at is not None:
        raise HTTPException(401, detail="User inactive")
    user.role = normalize_role(user.role)
    access = create_access_token(user)
    # rotate
    row.revoked_at = datetime.utcnow()
    new_refresh = _issue_refresh(db, user)
    db.commit()
    _set_refresh_cookie(response, new_refresh)
    return _token_out(access, new_refresh, user, user_permissions(db, user))


@router.get("/me", response_model=UserOut)
def me(user: Annotated[User, Depends(get_current_user)], db: Session = Depends(get_db)) -> UserOut:
    return _user_out(user, user_permissions(db, user))


@router.get("/permissions", response_model=list[str])
def my_permissions(user: Annotated[User, Depends(get_current_user)], db: Session = Depends(get_db)) -> list[str]:
    return sorted(user_permissions(db, user))


@router.post("/change-password")
def change_password(
    body: ChangePasswordRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    if not verify_password(body.current_password, user.password_hash):
        raise HTTPException(400, detail="invalid_current_password")
    err = validate_password_policy(body.new_password, user.username)
    if err:
        raise HTTPException(422, detail=err)
    user.password_hash = hash_password(body.new_password)
    _set_password_prompt(user, PASSWORD_PROMPT_CHANGED)
    user.version = (user.version or 1) + 1
    user.updated_at = datetime.utcnow()
    db.commit()
    write_audit(db, action="change_password", actor_id=user.id, actor_username=user.username, resource_type="users", resource_id=user.id)
    return {"ok": True, "password_prompt_status": PASSWORD_PROMPT_CHANGED}


@router.post("/password-prompt/dismiss")
def dismiss_password_prompt(
    user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """User dismisses the one-time password prompt (prompt policy only)."""
    if password_change_policy() == "enforce":
        raise HTTPException(403, detail="password_change_required")
    _set_password_prompt(user, PASSWORD_PROMPT_DISMISSED)
    user.version = (user.version or 1) + 1
    user.updated_at = datetime.utcnow()
    db.commit()
    write_audit(
        db,
        action="password_prompt_dismissed",
        actor_id=user.id,
        actor_username=user.username,
        resource_type="users",
        resource_id=user.id,
    )
    return {"ok": True, "password_prompt_status": PASSWORD_PROMPT_DISMISSED}


@router.post("/logout")
def logout(
    request: Request,
    response: Response,
    user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> dict:
    raw = request.cookies.get("zm_refresh")
    if raw:
        row = db.query(RefreshToken).filter(RefreshToken.token_hash == hash_token(raw)).first()
        if row:
            row.revoked_at = datetime.utcnow()
            db.commit()
    response.delete_cookie("zm_refresh", path="/")
    write_audit(db, action="logout", actor_id=user.id, actor_username=user.username)
    return {"ok": True}


@users_router.get("", response_model=PageOut)
def list_users(
    user: Annotated[User, Depends(require_permission("users:read"))],
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    q: str | None = None,
    role: str | None = None,
    status_filter: str | None = Query(None, alias="status"),
    district: str | None = None,
    facility_id: str | None = None,
    sort_by: str = "created_at",
    order: str = "desc",
) -> PageOut:
    query = db.query(User)
    query = apply_scope_filter_users(query, user)
    if status_filter == "deleted":
        query = query.filter(User.deleted_at.isnot(None))
    elif status_filter == "inactive":
        query = query.filter(User.active.is_(False), User.deleted_at.is_(None))
    else:
        query = query.filter(User.deleted_at.is_(None))
        if status_filter == "active":
            query = query.filter(User.active.is_(True))
    if role:
        query = query.filter(User.role == normalize_role(role))
    if district:
        query = query.filter(User.district == district)
    if facility_id:
        query = query.filter(User.facility_id == facility_id)
    if q:
        like = f"%{q}%"
        query = query.filter(
            or_(
                User.username.ilike(like),
                User.display_name.ilike(like),
                User.email.ilike(like),
                User.phone.ilike(like),
            )
        )
    # Newest first by default so freshly created users stay at the top (not mixed alphabetically).
    allowed_sort = {"created_at", "updated_at", "display_name", "username", "role", "district"}
    sort_key = sort_by if sort_by in allowed_sort else "created_at"
    sort_col = getattr(User, sort_key, User.created_at)
    query = query.order_by(sort_col.desc() if order.lower() != "asc" else sort_col.asc())
    total = query.count()
    rows = query.offset((page - 1) * page_size).limit(page_size).all()
    return PageOut(items=[_user_out(u) for u in rows], total=total, page=page, page_size=page_size)


@users_router.post("", response_model=UserOut)
def create_user(
    body: UserCreate,
    actor: Annotated[User, Depends(require_permission("users:create"))],
    db: Session = Depends(get_db),
) -> UserOut:
    role = normalize_role(body.role)
    allowed = set(assignable_roles(actor.role))
    if role not in allowed or not can_manage_user(actor, role):
        raise HTTPException(403, detail="Cannot create this role")
    err = validate_password_policy(body.password, body.username)
    if err:
        raise HTTPException(422, detail=err)
    if db.query(User).filter(User.username == body.username).first():
        raise HTTPException(422, detail="username_taken")
    if body.email and db.query(User).filter(User.email == body.email).first():
        raise HTTPException(422, detail="email_taken")
    if role == CHW and not (body.village or body.village_id):
        raise HTTPException(422, detail="chw_needs_village")
    if role == HEALTH_CENTER and not body.facility_id:
        raise HTTPException(422, detail="facility_required")
    if body.facility_id and not db.query(Facility).filter(Facility.facility_id == body.facility_id).first():
        raise HTTPException(422, detail="invalid_facility")
    row = User(
        id=str(uuid.uuid4()),
        username=body.username.strip(),
        email=(body.email or "").strip(),
        password_hash=hash_password(body.password),
        display_name=body.display_name.strip(),
        role=role,
        phone=body.phone,
        district=body.district or actor.district,
        facility_id=body.facility_id or "",
        village=body.village,
        village_id=body.village_id,
        chw_code=body.chw_code or (f"CHW-{body.username}" if role == CHW else ""),
        active=True,
        must_change_password=True,
        password_prompt_status=PASSWORD_PROMPT_PENDING,
    )
    _set_password_prompt(row, PASSWORD_PROMPT_PENDING)
    db.add(row)
    db.commit()
    write_audit(
        db,
        action="user_create",
        actor_id=actor.id,
        actor_username=actor.username,
        resource_type="users",
        resource_id=row.id,
        detail=str(mask_sensitive({"username": row.username, "role": row.role})),
    )
    return _user_out(row)


@users_router.patch("/{user_id}", response_model=UserOut)
def patch_user(
    user_id: str,
    body: UserPatch,
    actor: Annotated[User, Depends(require_permission("users:update"))],
    db: Session = Depends(get_db),
) -> UserOut:
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(404, detail="Not found")
    assert_can_modify_user(db, actor, target, new_role=body.role)
    if body.version is not None and body.version != (target.version or 1):
        raise HTTPException(409, detail="conflict_version")
    before = {"active": target.active, "role": target.role, "facility_id": target.facility_id}
    if body.role is not None:
        new_role = normalize_role(body.role)
        if new_role != normalize_role(target.role) and normalize_role(target.role) == SUPER_ADMIN:
            assert_not_last_super_admin(db, target, demoting=True)
        target.role = new_role
    if body.active is not None:
        if body.active is False and normalize_role(target.role) == SUPER_ADMIN:
            assert_not_last_super_admin(db, target, demoting=True)
        if actor.id == target.id and body.active is False:
            raise HTTPException(403, detail="Cannot deactivate yourself")
        target.active = body.active
    for field in ("facility_id", "village", "village_id", "district", "phone", "display_name", "email"):
        val = getattr(body, field)
        if val is not None:
            setattr(target, field, val)
    target.version = (target.version or 1) + 1
    target.updated_at = datetime.utcnow()
    db.commit()
    write_audit(
        db,
        action="user_update",
        actor_id=actor.id,
        actor_username=actor.username,
        resource_type="users",
        resource_id=target.id,
        detail=str({"before": before, "after": {"active": target.active, "role": target.role}}),
    )
    return _user_out(target)


@users_router.delete("/{user_id}", response_model=UserOut)
def soft_delete_user(
    user_id: str,
    actor: Annotated[User, Depends(require_permission("users:delete"))],
    db: Session = Depends(get_db),
) -> UserOut:
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(404, detail="Not found")
    if actor.id == target.id:
        raise HTTPException(403, detail="Cannot delete yourself")
    assert_can_modify_user(db, actor, target)
    if normalize_role(target.role) == SUPER_ADMIN:
        assert_not_last_super_admin(db, target, demoting=True)
    target.deleted_at = datetime.utcnow()
    target.active = False
    target.version = (target.version or 1) + 1
    db.commit()
    write_audit(db, action="user_soft_delete", actor_id=actor.id, actor_username=actor.username, resource_type="users", resource_id=target.id)
    return _user_out(target)


@users_router.post("/{user_id}/restore", response_model=UserOut)
def restore_user(
    user_id: str,
    actor: Annotated[User, Depends(require_permission("users:delete"))],
    db: Session = Depends(get_db),
) -> UserOut:
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(404, detail="Not found")
    assert_can_modify_user(db, actor, target)
    target.deleted_at = None
    target.active = True
    target.version = (target.version or 1) + 1
    db.commit()
    write_audit(db, action="user_restore", actor_id=actor.id, actor_username=actor.username, resource_type="users", resource_id=target.id)
    return _user_out(target)


@users_router.post("/{user_id}/reset-password")
def reset_password(
    user_id: str,
    actor: Annotated[User, Depends(require_permission("users:update"))],
    db: Session = Depends(get_db),
) -> dict[str, str]:
    target = db.query(User).filter(User.id == user_id, User.deleted_at.is_(None)).first()
    if not target:
        raise HTTPException(404, detail="Not found")
    assert_can_modify_user(db, actor, target)
    temp = f"Tmp-{uuid.uuid4().hex[:10]}"
    target.password_hash = hash_password(temp)
    _set_password_prompt(target, PASSWORD_PROMPT_PENDING)
    target.version = (target.version or 1) + 1
    db.commit()
    write_audit(db, action="user_reset_password", actor_id=actor.id, actor_username=actor.username, resource_type="users", resource_id=target.id)
    return {"temporary_password": temp}
