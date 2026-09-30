"""Roles & permissions matrix API (SUPER_ADMIN manages matrix)."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import get_current_user, require_permission, require_roles, write_audit
from app.db import Permission, RolePermission, RoleRow, User, get_db
from app.rbac_matrix import DEFAULT_MATRIX, all_permission_codes
from app.roles import ALL_ROLES, SUPER_ADMIN, normalize_role

router = APIRouter(prefix="/rbac", tags=["rbac"])


class MatrixOut(BaseModel):
    roles: list[str]
    permissions: list[str]
    granted: dict[str, list[str]]  # role -> [codes]


class ToggleIn(BaseModel):
    role_code: str
    permission_code: str
    allowed: bool


@router.get("/matrix", response_model=MatrixOut)
def get_matrix(
    user: Annotated[User, Depends(require_permission("permissions:read"))],
    db: Session = Depends(get_db),
) -> MatrixOut:
    roles = list(ALL_ROLES)
    perms = all_permission_codes()
    granted: dict[str, list[str]] = {r: [] for r in roles}
    for row in db.query(RolePermission).all():
        if row.role_code in granted:
            granted[row.role_code].append(row.permission_code)
    # SUPER_ADMIN always all
    granted[SUPER_ADMIN] = list(perms)
    return MatrixOut(roles=roles, permissions=perms, granted=granted)


@router.post("/matrix/toggle")
def toggle_permission(
    body: ToggleIn,
    actor: Annotated[User, Depends(require_roles(SUPER_ADMIN))],
    db: Session = Depends(get_db),
) -> dict:
    role = normalize_role(body.role_code)
    if role == SUPER_ADMIN:
        raise HTTPException(403, detail="SUPER_ADMIN permissions are locked")
    if body.permission_code not in all_permission_codes():
        raise HTTPException(422, detail="Unknown permission")
    # anti-escalation: actor must hold the permission
    from app.auth import has_permission

    if not has_permission(db, actor, body.permission_code):
        raise HTTPException(403, detail="Cannot grant a permission you do not hold")
    row = (
        db.query(RolePermission)
        .filter(RolePermission.role_code == role, RolePermission.permission_code == body.permission_code)
        .first()
    )
    if body.allowed and not row:
        db.add(RolePermission(role_code=role, permission_code=body.permission_code))
    elif not body.allowed and row:
        db.delete(row)
    db.commit()
    write_audit(
        db,
        action="rbac_toggle",
        actor_id=actor.id,
        actor_username=actor.username,
        resource_type="role_permissions",
        resource_id=f"{role}:{body.permission_code}",
        detail=f"allowed={body.allowed}",
    )
    return {"ok": True, "role_code": role, "permission_code": body.permission_code, "allowed": body.allowed}


@router.get("/roles")
def list_roles(user: Annotated[User, Depends(get_current_user)]) -> list[dict]:
    return [{"code": r, "locked": r == SUPER_ADMIN} for r in ALL_ROLES]
