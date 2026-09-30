"""Idempotent migrations: 4-role conversion + RBAC seed."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy.orm import Session

from app.db import (
    AppConfig,
    AuditLog,
    District,
    Facility,
    Permission,
    RolePermission,
    RoleRow,
    Sector,
    SessionLocal,
    User,
)
from app.rbac_matrix import DEFAULT_MATRIX, all_permission_codes
from app.roles import ALL_ROLES, DEMO_USERNAMES, REMOVED_ROLES, SUPER_ADMIN, migrate_user_role, normalize_role

PASSWORD_PROMPT_STATUSES = ("pending", "changed", "dismissed")
DEMO_USERNAME_SET = set(DEMO_USERNAMES.values()) | {
    "chw.demo",
    "health.center",
    "rbc.admin",
    "super.admin",
    "rbc.demo",
}


def is_demo_username(username: str | None) -> bool:
    if not username:
        return False
    u = username.lower()
    return u in DEMO_USERNAME_SET or u.endswith(".demo") or u.startswith("hc.hc-") or u.startswith("chw.synth.")


def migrate_password_prompt_status(db: Session) -> None:
    """Idempotent: map must_change_password → password_prompt_status; demos → dismissed."""
    flag = db.get(AppConfig, "migration_password_prompt_v1")
    if flag:
        return
    for user in db.query(User).all():
        current = (getattr(user, "password_prompt_status", None) or "").strip().lower()
        if is_demo_username(user.username):
            user.password_prompt_status = "dismissed"
            user.must_change_password = False
        elif current in PASSWORD_PROMPT_STATUSES and current != "changed":
            # Keep non-default already set (e.g. pending from prior partial run)
            user.must_change_password = current == "pending"
        elif bool(getattr(user, "must_change_password", False)):
            user.password_prompt_status = "pending"
        else:
            user.password_prompt_status = "changed"
            user.must_change_password = False
    db.add(
        AppConfig(
            key="migration_password_prompt_v1",
            value="1",
            label="Migrated must_change_password → password_prompt_status",
        )
    )


def reverse_password_prompt_migration(db: Session) -> None:
    """Reversible helper: sync must_change_password from status and clear migration flag."""
    for user in db.query(User).all():
        status = (getattr(user, "password_prompt_status", None) or "changed").lower()
        user.must_change_password = status == "pending"
    row = db.get(AppConfig, "migration_password_prompt_v1")
    if row:
        db.delete(row)


def migrate_user_roles_to_four(db: Session) -> list[dict]:
    """Convert SUPERVISOR / RBC_OFFICER (and legacy) → 4-role set. Returns change log."""
    changes: list[dict] = []
    for user in db.query(User).all():
        new_role = migrate_user_role(user.role, district=user.district or "", facility_id=user.facility_id or "")
        if new_role and new_role != user.role:
            changes.append(
                {
                    "user_id": user.id,
                    "username": user.username,
                    "from": user.role,
                    "to": new_role,
                }
            )
            user.role = new_role
    for c in changes:
        db.add(
            AuditLog(
                action="role_migration_4roles",
                actor_id=None,
                actor_username="system",
                resource_type="users",
                resource_id=c["user_id"],
                detail=f"{c['from']}->{c['to']} username={c['username']}",
                created_at=datetime.utcnow(),
            )
        )
    return changes


def prune_removed_role_rows(db: Session) -> None:
    for code in REMOVED_ROLES:
        db.query(RolePermission).filter(RolePermission.role_code == code).delete(synchronize_session=False)
        row = db.get(RoleRow, code)
        if row:
            db.delete(row)


def seed_permissions_catalog(db: Session) -> None:
    for code in all_permission_codes():
        resource, action = code.split(":", 1)
        if db.get(Permission, code):
            continue
        db.add(Permission(code=code, resource=resource, action=action, description=code))


def seed_roles_catalog(db: Session) -> None:
    for code in ALL_ROLES:
        row = db.get(RoleRow, code)
        if row:
            row.locked = code == SUPER_ADMIN
            continue
        db.add(
            RoleRow(
                code=code,
                label_key=f"auth.role_{code}",
                locked=(code == SUPER_ADMIN),
            )
        )


def seed_role_permissions(db: Session) -> None:
    # Drop grants for removed roles first
    prune_removed_role_rows(db)
    existing = {
        (r.role_code, r.permission_code)
        for r in db.query(RolePermission).all()
    }
    # Remove stale grants for roles not in DEFAULT_MATRIX
    for role_code, perm in list(existing):
        if role_code not in DEFAULT_MATRIX:
            db.query(RolePermission).filter(
                RolePermission.role_code == role_code,
                RolePermission.permission_code == perm,
            ).delete(synchronize_session=False)
            existing.discard((role_code, perm))
    for role, perms in DEFAULT_MATRIX.items():
        for code in perms:
            key = (role, code)
            if key in existing:
                continue
            db.add(RolePermission(role_code=role, permission_code=code))
            existing.add(key)


def seed_config(db: Session) -> None:
    if db.get(AppConfig, "sla_hours"):
        return
    db.add(
        AppConfig(
            key="sla_hours",
            value="24",
            label="SLA hours placeholder — not a clinical threshold",
        )
    )


def seed_geo_from_facilities(db: Session) -> None:
    districts: dict[str, str] = {}
    for fac in db.query(Facility).filter(Facility.deleted_at.is_(None)).all():
        dname = (fac.district or "").strip()
        if not dname:
            continue
        if dname not in districts:
            existing = db.query(District).filter(District.name == dname).first()
            if existing:
                districts[dname] = existing.id
            else:
                did = str(uuid.uuid4())
                db.add(District(id=did, name=dname, active=True))
                districts[dname] = did
        sname = (fac.sector or "").strip()
        if not sname:
            continue
        did = districts[dname]
        exists = db.query(Sector).filter(Sector.district_id == did, Sector.name == sname).first()
        if not exists:
            db.add(Sector(id=str(uuid.uuid4()), district_id=did, name=sname, active=True))


def run_migrations() -> list[dict]:
    db = SessionLocal()
    try:
        # Normalize any leftover lowercase before 4-role pass
        for user in db.query(User).all():
            if user.role and user.role != user.role.upper() and user.role.lower() in {
                "chw",
                "nurse",
                "supervisor",
                "rbc",
            }:
                pass  # handled in migrate_user_roles_to_four
        changes = migrate_user_roles_to_four(db)
        seed_permissions_catalog(db)
        seed_roles_catalog(db)
        seed_role_permissions(db)
        seed_config(db)
        seed_geo_from_facilities(db)
        migrate_password_prompt_status(db)
        db.commit()
        return changes
    finally:
        db.close()


__all__ = [
    "run_migrations",
    "migrate_user_roles_to_four",
    "migrate_password_prompt_status",
    "reverse_password_prompt_migration",
    "normalize_role",
    "is_demo_username",
]
