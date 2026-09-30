"""password_prompt_status: pending / dismissed / changed + policy enforce."""

from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient

from app.auth import hash_password
from app.config import settings
from app.db import User, configure_engine, init_db, SessionLocal
from app.main import app
from app.migrate import is_demo_username, migrate_password_prompt_status, reverse_password_prompt_migration
from app.roles import CHW, SUPER_ADMIN


@pytest.fixture()
def client(tmp_path, monkeypatch):
    db_path = tmp_path / "pw.db"
    configure_engine(f"sqlite:///{db_path}")
    init_db()
    monkeypatch.setattr(settings, "demo_mode", True)
    monkeypatch.setattr(settings, "password_change_policy", "prompt")
    monkeypatch.setattr(settings, "demo_password", "demo1234")
    db = SessionLocal()
    pw = hash_password("demo1234")
    db.add(
        User(
            id="user-super",
            username="super.admin",
            password_hash=pw,
            display_name="Super",
            role=SUPER_ADMIN,
            active=True,
            must_change_password=False,
            password_prompt_status="dismissed",
        )
    )
    db.commit()
    db.close()
    with TestClient(app) as c:
        yield c


def _login(client: TestClient, username: str, password: str = "demo1234") -> str:
    r = client.post("/auth/login", json={"username": username, "password": password})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def test_admin_created_user_pending_and_can_login(client):
    token = _login(client, "super.admin")
    uname = f"newchw_{uuid.uuid4().hex[:6]}"
    r = client.post(
        "/users",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "username": uname,
            "password": "Tmp-abcdef12Aa1",
            "display_name": "New CHW",
            "role": CHW,
            "village": "TestVillage",
        },
    )
    assert r.status_code == 200, r.text
    assert r.json()["password_prompt_status"] == "pending"
    login = client.post("/auth/login", json={"username": uname, "password": "Tmp-abcdef12Aa1"})
    assert login.status_code == 200
    body = login.json()
    assert body["password_prompt_status"] == "pending"
    assert body["password_change_policy"] == "prompt"
    # Soft prompt: must_change_password false under prompt policy
    assert body["must_change_password"] is False


def test_dismiss_sets_dismissed_and_login_no_longer_pending(client):
    token = _login(client, "super.admin")
    uname = f"newchw_{uuid.uuid4().hex[:6]}"
    client.post(
        "/users",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "username": uname,
            "password": "Tmp-abcdef12Aa1",
            "display_name": "New CHW",
            "role": CHW,
            "village": "V",
        },
    )
    utoken = _login(client, uname, "Tmp-abcdef12Aa1")
    d = client.post("/auth/password-prompt/dismiss", headers={"Authorization": f"Bearer {utoken}"})
    assert d.status_code == 200
    assert d.json()["password_prompt_status"] == "dismissed"
    again = client.post("/auth/login", json={"username": uname, "password": "Tmp-abcdef12Aa1"})
    assert again.json()["password_prompt_status"] == "dismissed"


def test_change_password_sets_changed(client):
    token = _login(client, "super.admin")
    uname = f"newchw_{uuid.uuid4().hex[:6]}"
    client.post(
        "/users",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "username": uname,
            "password": "Tmp-abcdef12Aa1",
            "display_name": "New CHW",
            "role": CHW,
            "village": "V",
        },
    )
    utoken = _login(client, uname, "Tmp-abcdef12Aa1")
    r = client.post(
        "/auth/change-password",
        headers={"Authorization": f"Bearer {utoken}"},
        json={"current_password": "Tmp-abcdef12Aa1", "new_password": "SecurePass99x"},
    )
    assert r.status_code == 200
    assert r.json()["password_prompt_status"] == "changed"
    again = client.post("/auth/login", json={"username": uname, "password": "SecurePass99x"})
    assert again.json()["password_prompt_status"] == "changed"


def test_admin_reset_sets_pending(client):
    token = _login(client, "super.admin")
    uname = f"newchw_{uuid.uuid4().hex[:6]}"
    created = client.post(
        "/users",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "username": uname,
            "password": "Tmp-abcdef12Aa1",
            "display_name": "New CHW",
            "role": CHW,
            "village": "V",
        },
    ).json()
    utoken = _login(client, uname, "Tmp-abcdef12Aa1")
    client.post("/auth/password-prompt/dismiss", headers={"Authorization": f"Bearer {utoken}"})
    reset = client.post(
        f"/users/{created['id']}/reset-password",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert reset.status_code == 200
    temp = reset.json()["temporary_password"]
    login = client.post("/auth/login", json={"username": uname, "password": temp})
    assert login.json()["password_prompt_status"] == "pending"


def test_cannot_dismiss_another_user(client):
    """Dismiss always acts on the authenticated principal only."""
    token = _login(client, "super.admin")
    uname = f"newchw_{uuid.uuid4().hex[:6]}"
    created = client.post(
        "/users",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "username": uname,
            "password": "Tmp-abcdef12Aa1",
            "display_name": "New CHW",
            "role": CHW,
            "village": "V",
        },
    ).json()
    # Super dismisses own prompt (already dismissed) — target stays pending
    client.post("/auth/password-prompt/dismiss", headers={"Authorization": f"Bearer {token}"})
    db = SessionLocal()
    target = db.get(User, created["id"])
    assert target is not None
    assert target.password_prompt_status == "pending"
    db.close()


def test_enforce_blocks_dismiss(client, monkeypatch):
    monkeypatch.setattr(settings, "password_change_policy", "enforce")
    token = _login(client, "super.admin")
    uname = f"newchw_{uuid.uuid4().hex[:6]}"
    client.post(
        "/users",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "username": uname,
            "password": "Tmp-abcdef12Aa1",
            "display_name": "New CHW",
            "role": CHW,
            "village": "V",
        },
    )
    utoken = _login(client, uname, "Tmp-abcdef12Aa1")
    d = client.post("/auth/password-prompt/dismiss", headers={"Authorization": f"Bearer {utoken}"})
    assert d.status_code == 403
    assert d.json()["detail"] == "password_change_required"


def test_demo_seed_users_dismissed(client):
    login = client.post("/auth/login", json={"username": "super.admin", "password": "demo1234"})
    assert login.json()["password_prompt_status"] == "dismissed"
    assert is_demo_username("super.admin")
    assert is_demo_username("chw.synth.001")


def test_migration_maps_must_change(tmp_path, monkeypatch):
    db_path = tmp_path / "mig.db"
    configure_engine(f"sqlite:///{db_path}")
    init_db()
    monkeypatch.setattr(settings, "demo_mode", True)
    db = SessionLocal()
    db.add(
        User(
            id="u1",
            username="legacy.pending",
            password_hash=hash_password("demo1234"),
            display_name="L",
            role=CHW,
            active=True,
            must_change_password=True,
            password_prompt_status="changed",
            village="V",
        )
    )
    db.add(
        User(
            id="u2",
            username="super.admin",
            password_hash=hash_password("demo1234"),
            display_name="S",
            role=SUPER_ADMIN,
            active=True,
            must_change_password=False,
            password_prompt_status="changed",
        )
    )
    db.commit()
    # Clear migration flag if present then re-run
    from app.db import AppConfig

    flag = db.get(AppConfig, "migration_password_prompt_v1")
    if flag:
        db.delete(flag)
        db.commit()
    migrate_password_prompt_status(db)
    db.commit()
    u1 = db.get(User, "u1")
    u2 = db.get(User, "u2")
    assert u1.password_prompt_status == "pending"
    assert u2.password_prompt_status == "dismissed"
    reverse_password_prompt_migration(db)
    db.commit()
    assert u1.must_change_password is True
    db.close()
