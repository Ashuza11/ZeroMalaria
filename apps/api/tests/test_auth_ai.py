"""Auth isolation and AI safety tests."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

API_ROOT = Path(__file__).resolve().parents[1]
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))

from app.auth import hash_password
from app.db import Base, Facility, User, configure_engine, init_db
from app.main import app
from app.services.ai.router import AIRouter, LocalNlpProvider, MockProvider
from app.services.ai.sanitize import ALLOWED_KEYS, sanitize_for_ai
from engine.decision import assert_never_downgrade, combine_decision
from engine.rules import decision_rank


@pytest.fixture()
def client(tmp_path):
    db_file = tmp_path / "auth.db"
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
                id="u-chw",
                username="chw.demo",
                password_hash=pw,
                display_name="CHW",
                role="chw",
                facility_id="HC-BUG-01",
                district="Bugesera",
                village="Nyamata",
                chw_code="CHW-BUG-01-01",
                active=True,
            ),
            User(
                id="u-nurse",
                username="nurse.demo",
                password_hash=pw,
                display_name="Nurse",
                role="nurse",
                facility_id="HC-BUG-01",
                district="Bugesera",
                active=True,
            ),
            User(
                id="u-sup",
                username="supervisor.demo",
                password_hash=pw,
                display_name="Sup",
                role="supervisor",
                facility_id="HC-BUG-01",
                district="Bugesera",
                active=True,
            ),
            User(
                id="u-rbc",
                username="rbc.demo",
                password_hash=pw,
                display_name="RBC",
                role="rbc",
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
    assert r.status_code == 200
    return r.json()["access_token"]


def test_login_and_me(client):
    token = _token(client, "chw.demo")
    me = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["role"] == "chw"


def test_chw_cannot_list_users(client):
    token = _token(client, "chw.demo")
    r = client.get("/users", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 403


def test_supervisor_can_create_chw_only(client):
    token = _token(client, "supervisor.demo")
    r = client.post(
        "/users",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "username": "chw.new",
            "password": "demo1234",
            "display_name": "New CHW",
            "role": "nurse",
            "village": "Test",
        },
    )
    assert r.status_code == 200
    assert r.json()["role"] == "chw"  # forced


def test_scoped_referrals_chw_isolation(client):
    nurse = _token(client, "nurse.demo")
    client.post(
        "/referrals",
        headers={"Authorization": f"Bearer {nurse}"},
        json={
            "client_uuid": "iso-1",
            "facility_id": "HC-BUG-01",
            "chw_id": "CHW-BUG-01-01",
            "district": "Bugesera",
            "age_months": 20,
            "decision": "urgent_refer",
            "reasons": ["x"],
            "summary": "a",
        },
    )
    client.post(
        "/referrals",
        json={
            "client_uuid": "iso-2",
            "facility_id": "HC-BUG-01",
            "chw_id": "CHW-OTHER",
            "district": "Bugesera",
            "age_months": 20,
            "decision": "refer",
            "reasons": ["y"],
            "summary": "b",
        },
    )
    chw = _token(client, "chw.demo")
    scoped = client.get("/referrals/scoped", headers={"Authorization": f"Bearer {chw}"})
    assert scoped.status_code == 200
    assert all(x["chw_id"] == "CHW-BUG-01-01" for x in scoped.json())


def test_sanitizer_strips_disallowed_keys():
    dirty = {
        "age_months": 24,
        "sex": "female",
        "free_text": "Jean Claude has fever, phone +250788123456",
        "national_id": "1199880012345678",
        "patient_name": "Jean Claude",
        "address": "KG 123",
        "decision": "refer",
    }
    clean = sanitize_for_ai(dirty)
    assert "national_id" not in clean
    assert "patient_name" not in clean
    assert "address" not in clean
    assert set(clean) <= ALLOWED_KEYS
    assert "[redacted]" in clean["free_text"] or "+250" not in clean["free_text"]


def test_ai_fallback_chain_to_local():
    router = AIRouter(
        providers=[
            MockProvider("quota"),
            MockProvider("timeout"),
            MockProvider("invalid"),
            LocalNlpProvider(),
        ]
    )
    result = router.run("extract", {"free_text": "gusetsa", "language": "rw"})
    assert result.provider_used == "local"
    assert result.ok
    assert result.fallback_reason


def test_ai_chat_rejects_doses_and_opens_triage_on_danger():
    router = AIRouter(providers=[LocalNlpProvider()])
    dose = router.run("chat", {"message": "give 2 tablets artesunate", "language": "en"})
    assert dose.data["out_of_scope"] is True
    danger = router.run("chat", {"message": "child has convulsions", "language": "en"})
    assert danger.data["open_triage"] is True


def test_ml_and_ai_cannot_downgrade_urgent():
    combined = assert_never_downgrade("urgent_refer", "treat_at_home")
    assert decision_rank(combined) >= decision_rank("urgent_refer")
    # Decision engine still locks urgent even if we pretend AI wanted treat
    result = combine_decision(
        {
            "age_months": 28,
            "sex": "male",
            "temperature_c": 39.0,
            "fever_days": 2,
            "convulsions": 1,
            "unable_to_drink": 0,
            "vomiting_everything": 0,
            "lethargy": 0,
            "severe_breathing_difficulty": 0,
            "tdr_result": "positive",
        },
        use_ml=True,
    )
    assert result.decision == "urgent_refer"
    assert result.rules_decision == "urgent_refer"
