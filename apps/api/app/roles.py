"""Canonical role identifiers (UPPER_SNAKE_CASE) — 4 roles."""

from __future__ import annotations

SUPER_ADMIN = "SUPER_ADMIN"
RBC_ADMIN = "RBC_ADMIN"
HEALTH_CENTER = "HEALTH_CENTER"
CHW = "CHW"

# Removed roles (migration targets only)
RBC_OFFICER = "RBC_OFFICER"  # legacy constant for migration mapping
SUPERVISOR = "SUPERVISOR"  # legacy constant for migration mapping

ALL_ROLES = (
    SUPER_ADMIN,
    RBC_ADMIN,
    HEALTH_CENTER,
    CHW,
)

REMOVED_ROLES = (SUPERVISOR, RBC_OFFICER)

# One-time / request normalize aliases → current 4 roles
LEGACY_ROLE_MAP = {
    "chw": CHW,
    "nurse": HEALTH_CENTER,
    "supervisor": RBC_ADMIN,  # default string normalize; per-user migrate may use HEALTH_CENTER
    "rbc": RBC_ADMIN,
    "RBC_OFFICER": RBC_ADMIN,
    "SUPERVISOR": RBC_ADMIN,
    SUPER_ADMIN: SUPER_ADMIN,
    RBC_ADMIN: RBC_ADMIN,
    HEALTH_CENTER: HEALTH_CENTER,
    CHW: CHW,
}

NATIONAL_ROLES = {SUPER_ADMIN, RBC_ADMIN}
FACILITY_ROLES = {HEALTH_CENTER}
VILLAGE_ROLES = {CHW}

DEMO_USERNAMES = {
    SUPER_ADMIN: "super.admin",
    RBC_ADMIN: "rbc.admin",
    HEALTH_CENTER: "health.center",
    CHW: "chw.demo",
}


def normalize_role(role: str | None) -> str:
    if not role:
        return ""
    mapped = LEGACY_ROLE_MAP.get(role)
    if mapped:
        return mapped
    upper = role.upper()
    return LEGACY_ROLE_MAP.get(upper, upper if upper in ALL_ROLES else "")


def migrate_user_role(role: str | None, *, district: str = "", facility_id: str = "") -> str:
    """Per-user conversion for SUPERVISOR / RBC_OFFICER (and lowercase legacy)."""
    raw = (role or "").strip()
    upper = raw.upper()
    if upper in {"RBC_OFFICER", "RBC"} or raw in {"rbc", "RBC_OFFICER"}:
        return RBC_ADMIN
    if upper == "SUPERVISOR" or raw == "supervisor":
        if (district or "").strip() or not (facility_id or "").strip():
            return RBC_ADMIN
        return HEALTH_CENTER
    return normalize_role(raw) or CHW


def is_national(role: str) -> bool:
    return normalize_role(role) in NATIONAL_ROLES


def rank(role: str) -> int:
    order = {
        CHW: 1,
        HEALTH_CENTER: 2,
        RBC_ADMIN: 3,
        SUPER_ADMIN: 4,
    }
    return order.get(normalize_role(role), 0)


def assignable_roles(actor_role: str) -> tuple[str, ...]:
    a = normalize_role(actor_role)
    if a == SUPER_ADMIN:
        return ALL_ROLES
    if a == RBC_ADMIN:
        return (HEALTH_CENTER, CHW)
    return ()
