"""Auth security: rate limit, demo login, analytics RBAC."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

API_ROOT = Path(__file__).resolve().parents[1]
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))

from app.auth import hash_password
from app.config import settings
from app.db import Base, Facility, User, configure_engine, init_db
from app.main import app
from app.routers_auth import clear_login_rate_limits


@pytest.fixture(autouse=True)
def _reset_login_rate_limits():
    clear_login_rate_limits()
    yield
    clear_login_rate_limits()


@pytest.fixture()
def client(tmp_path):
    clear_login_rate_limits()
    db_file = tmp_path / "sec.db"
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
    pw = hash_password(settings.demo_password)
    db.add_all(
        [
            User(
                id="u-chw",
                username="chw.demo",
                password_hash=pw,
                display_name="CHW",
                role="CHW",
                facility_id="HC-BUG-01",
                district="Bugesera",
                village="Nyamata",
                chw_code="CHW-BUG-01-01",
                active=True,
            ),
            User(
                id="u-rbc",
                username="rbc.admin",
                password_hash=pw,
                display_name="RBC",
                role="RBC_ADMIN",
                active=True,
            ),
        ]
    )
    db.commit()
    db.close()
    with TestClient(app) as c:
        yield c


def test_wrong_password_returns_401(client):
    r = client.post("/auth/login", json={"username": "chw.demo", "password": "wrong-pass"})
    assert r.status_code == 401
    assert r.json()["detail"] == "invalid_credentials"


def test_chw_forbidden_on_analytics_kpis(client):
    login = client.post(
        "/auth/login",
        json={"username": "chw.demo", "password": settings.demo_password},
    )
    token = login.json()["access_token"]
    r = client.get("/analytics/kpis", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 403


def test_demo_login_requires_demo_mode(client, monkeypatch):
    monkeypatch.setattr(settings, "demo_mode", True)
    r = client.post("/auth/demo-login", json={"role": "CHW"})
    assert r.status_code == 200
    assert r.json()["user"]["role"] == "CHW"

    monkeypatch.setattr(settings, "demo_mode", False)
    r2 = client.post("/auth/demo-login", json={"role": "CHW"})
    assert r2.status_code == 403


def test_login_rate_limit_eventually_429(client, monkeypatch):
    monkeypatch.setattr("app.routers_auth._LOGIN_MAX_ATTEMPTS", 3)
    clear_login_rate_limits()
    for _ in range(3):
        client.post("/auth/login", json={"username": "chw.demo", "password": "badpassword"})
    r = client.post("/auth/login", json={"username": "chw.demo", "password": "badpassword"})
    assert r.status_code == 429
    assert r.json()["detail"] == "login_locked"
