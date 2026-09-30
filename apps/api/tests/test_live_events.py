"""Live events poll scoping and referral messages."""

from __future__ import annotations

import sys
import uuid
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


@pytest.fixture()
def client(tmp_path):
    db_file = tmp_path / "live.db"
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
                chw_code="CHW-BUG-01-01",
                active=True,
            ),
            User(
                id="u-hc",
                username="health.center",
                password_hash=pw,
                display_name="Health Center",
                role="HEALTH_CENTER",
                facility_id="HC-BUG-01",
                district="Bugesera",
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


def _login(client: TestClient, username: str) -> str:
    r = client.post("/auth/login", json={"username": username, "password": settings.demo_password})
    assert r.status_code == 200
    return r.json()["access_token"]


def _create_referral(client: TestClient) -> str:
    cid = str(uuid.uuid4())
    r = client.post(
        "/referrals",
        json={
            "client_uuid": cid,
            "facility_id": "HC-BUG-01",
            "chw_id": "CHW-BUG-01-01",
            "district": "Bugesera",
            "age_months": 24,
            "decision": "urgent_refer",
            "reasons": ["Demo"],
            "summary": "Live comm test",
        },
    )
    assert r.status_code == 200
    return r.json()["id"]


def test_message_create_and_list(client):
    rid = _create_referral(client)
    token = _login(client, "health.center")
    headers = {"Authorization": f"Bearer {token}"}
    post = client.post(
        f"/referrals/{rid}/messages",
        json={"body": "Prepare transport for this patient."},
        headers=headers,
    )
    assert post.status_code == 200
    assert post.json()["sender_role"] == "HEALTH_CENTER"
    listed = client.get(f"/referrals/{rid}/messages", headers=headers)
    assert listed.status_code == 200
    assert len(listed.json()) == 1


def test_poll_events_role_scoped(client):
    rid = _create_referral(client)
    chw_token = _login(client, "chw.demo")
    hc_token = _login(client, "health.center")
    chw_headers = {"Authorization": f"Bearer {chw_token}"}
    hc_headers = {"Authorization": f"Bearer {hc_token}"}

    client.post(
        f"/referrals/{rid}/messages",
        json={"body": "Need more clinical info."},
        headers=hc_headers,
    )

    chw_poll = client.get("/events/poll", headers=chw_headers)
    assert chw_poll.status_code == 200
    chw_types = {e["type"] for e in chw_poll.json()["events"]}
    assert "referral.created" in chw_types
    assert "referral.message" in chw_types

    rbc_token = _login(client, "rbc.admin")
    rbc_poll = client.get("/events/poll", headers={"Authorization": f"Bearer {rbc_token}"})
    assert rbc_poll.status_code == 200
    assert any(e["type"] == "referral.created" for e in rbc_poll.json()["events"])
