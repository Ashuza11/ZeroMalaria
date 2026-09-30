"""RBAC matrix, anti-escalation, soft-delete, optimistic lock, 4-role migration."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

API_ROOT = Path(__file__).resolve().parents[1]
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))

from app.auth import hash_password
from app.db import Base, Facility, RolePermission, RoleRow, User, configure_engine, init_db
from app.main import app
from app.roles import ALL_ROLES, HEALTH_CENTER, RBC_ADMIN, SUPER_ADMIN, migrate_user_role
from app.migrate import migrate_user_roles_to_four


@pytest.fixture()
def client(tmp_path):
    db_file = tmp_path / "rbac.db"
    configure_engine(f"sqlite:///{db_file}")
    from app import db as db_module

    Base.metadata.drop_all(bind=db_module.engine)
    init_db()
    db = db_module.SessionLocal()
    db.add(
        Facility(
            facility_id="HC-BUG-01",
            name="Nyamata HC",
            district="Bugesera",
            sector="Nyamata",
            pilot=1,
            remote=0,
            latitude=-2.18,
            longitude=30.14,
        )
    )
    pw = hash_password("demo1234")
    db.add_all(
        [
            User(
                id="u-super",
                username="super.admin",
                password_hash=pw,
                display_name="Super",
                role=SUPER_ADMIN,
                active=True,
            ),
            User(
                id="u-rbc-admin",
                username="rbc.admin",
                password_hash=pw,
                display_name="RBC Admin",
                role=RBC_ADMIN,
                active=True,
            ),
            User(
                id="u-hc",
                username="health.center",
                password_hash=pw,
                display_name="HC",
                role=HEALTH_CENTER,
                facility_id="HC-BUG-01",
                district="Bugesera",
                active=True,
            ),
        ]
    )
    db.commit()
    db.close()
    with TestClient(app) as c:
        yield c


def _token(client, username: str) -> str:
    r = client.post("/auth/login", json={"username": username, "password": "demo1234"})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def test_only_four_roles_in_catalog():
    assert set(ALL_ROLES) == {SUPER_ADMIN, RBC_ADMIN, HEALTH_CENTER, "CHW"}
    assert "SUPERVISOR" not in ALL_ROLES
    assert "RBC_OFFICER" not in ALL_ROLES


def test_migrate_user_role_rules():
    assert migrate_user_role("RBC_OFFICER") == RBC_ADMIN
    assert migrate_user_role("supervisor", district="Bugesera", facility_id="HC-1") == RBC_ADMIN
    assert migrate_user_role("SUPERVISOR", district="", facility_id="HC-1") == HEALTH_CENTER


def test_migration_converts_legacy_users(tmp_path):
    db_file = tmp_path / "mig.db"
    configure_engine(f"sqlite:///{db_file}")
    from app import db as db_module

    Base.metadata.drop_all(bind=db_module.engine)
    init_db()
    db = db_module.SessionLocal()
    pw = hash_password("demo1234")
    db.add_all(
        [
            User(id="a", username="sup1", password_hash=pw, display_name="S", role="SUPERVISOR", district="X", facility_id="HC-1", active=True),
            User(id="b", username="off1", password_hash=pw, display_name="O", role="RBC_OFFICER", active=True),
            User(id="c", username="sup2", password_hash=pw, display_name="S2", role="supervisor", district="", facility_id="HC-1", active=True),
        ]
    )
    db.commit()
    changes = migrate_user_roles_to_four(db)
    db.commit()
    assert len(changes) == 3
    assert db.get(User, "a").role == RBC_ADMIN
    assert db.get(User, "b").role == RBC_ADMIN
    assert db.get(User, "c").role == HEALTH_CENTER
    assert db.query(RoleRow).filter(RoleRow.code.in_(["SUPERVISOR", "RBC_OFFICER"])).count() == 0
    assert db.query(RolePermission).filter(RolePermission.role_code.in_(["SUPERVISOR", "RBC_OFFICER"])).count() == 0
    db.close()


def test_matrix_requires_permission(client):
    hc = _token(client, "health.center")
    r = client.get("/rbac/matrix", headers={"Authorization": f"Bearer {hc}"})
    assert r.status_code == 403
    admin = _token(client, "super.admin")
    r2 = client.get("/rbac/matrix", headers={"Authorization": f"Bearer {admin}"})
    assert r2.status_code == 200
    body = r2.json()
    assert set(body["roles"]) == set(ALL_ROLES)
    assert "SUPERVISOR" not in body["roles"]


def test_super_admin_row_locked(client):
    admin = _token(client, "super.admin")
    r = client.post(
        "/rbac/matrix/toggle",
        headers={"Authorization": f"Bearer {admin}"},
        json={"role_code": SUPER_ADMIN, "permission_code": "users:read", "allowed": False},
    )
    assert r.status_code == 403


def test_rbc_admin_cannot_edit_super_admin(client):
    token = _token(client, "rbc.admin")
    r = client.patch(
        "/users/u-super",
        headers={"Authorization": f"Bearer {token}"},
        json={"active": False, "version": 1},
    )
    assert r.status_code == 403


def test_last_super_admin_protected(client):
    token = _token(client, "super.admin")
    r = client.patch(
        "/users/u-super",
        headers={"Authorization": f"Bearer {token}"},
        json={"active": False, "version": 1},
    )
    assert r.status_code == 403


def test_optimistic_lock_409(client):
    token = _token(client, "super.admin")
    r = client.patch(
        "/users/u-hc",
        headers={"Authorization": f"Bearer {token}"},
        json={"phone": "+250700000001", "version": 999},
    )
    assert r.status_code == 409


def test_soft_delete_and_restore(client):
    token = _token(client, "super.admin")
    headers = {"Authorization": f"Bearer {token}"}
    d = client.delete("/users/u-hc", headers=headers)
    assert d.status_code == 200
    assert d.json()["deleted_at"] is not None
    rest = client.post("/users/u-hc/restore", headers=headers)
    assert rest.status_code == 200
    assert rest.json()["deleted_at"] is None
