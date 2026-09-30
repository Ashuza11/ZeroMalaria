"""API smoke tests for triage, referrals, sync idempotency.

Uses an isolated SQLite file so pytest never wipes the demo seed DB.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

API_ROOT = Path(__file__).resolve().parents[1]
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))

from app.db import Base, configure_engine, engine, init_db
from app.main import app


@pytest.fixture()
def client(tmp_path):
    db_file = tmp_path / "test_api.db"
    configure_engine(f"sqlite:///{db_file}")
    from app import db as db_module

    Base.metadata.drop_all(bind=db_module.engine)
    init_db()
    with TestClient(app) as test_client:
        yield test_client


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"
    assert r.json()["synthetic"] is True


def test_triage_urgent_convulsions(client):
    r = client.post(
        "/triage",
        json={
            "age_months": 28,
            "sex": "male",
            "temperature_c": 39.4,
            "fever_days": 2,
            "convulsions": True,
            "tdr_result": "positive",
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert body["decision"] == "urgent_refer"
    assert body["rules_decision"] == "urgent_refer"
    assert body["human_confirmation_required"] is True


def test_triage_treat_at_home(client):
    r = client.post(
        "/triage",
        json={
            "age_months": 36,
            "sex": "female",
            "temperature_c": 38.6,
            "fever_days": 2,
            "tdr_result": "positive",
        },
    )
    assert r.status_code == 200
    assert r.json()["decision"] in {"treat_at_home", "refer"}


def test_referral_and_status_and_sync_idempotent(client):
    create = client.post(
        "/referrals",
        json={
            "client_uuid": "test-uuid-1",
            "facility_id": "HC-BUG-01",
            "chw_id": "CHW-BUG-01-01",
            "district": "Bugesera",
            "sector": "Nyamata",
            "age_months": 28,
            "sex": "male",
            "decision": "urgent_refer",
            "reasons": ["Convulsions"],
            "summary": "Demo urgent",
        },
    )
    assert create.status_code == 200
    rid = create.json()["id"]

    listed = client.get("/referrals", params={"facility_id": "HC-BUG-01"})
    assert listed.status_code == 200
    assert any(x["id"] == rid for x in listed.json())

    patched = client.patch(f"/referrals/{rid}/status", json={"status": "received"})
    assert patched.status_code == 200
    assert patched.json()["status"] == "received"

    sync1 = client.post(
        "/sync",
        json={
            "items": [
                {
                    "client_uuid": "test-uuid-2",
                    "type": "referral",
                    "payload": {
                        "client_uuid": "test-uuid-2",
                        "facility_id": "HC-BUG-01",
                        "chw_id": "CHW-BUG-01-01",
                        "district": "Bugesera",
                        "age_months": 20,
                        "decision": "refer",
                        "reasons": ["Invalid TDR"],
                        "summary": "Sync demo",
                    },
                }
            ]
        },
    )
    assert sync1.status_code == 200
    assert sync1.json()["accepted"] == 1

    sync2 = client.post(
        "/sync",
        json={
            "items": [
                {
                    "client_uuid": "test-uuid-2",
                    "type": "referral",
                    "payload": {
                        "client_uuid": "test-uuid-2",
                        "facility_id": "HC-BUG-01",
                        "chw_id": "CHW-BUG-01-01",
                        "district": "Bugesera",
                        "age_months": 20,
                        "decision": "refer",
                        "reasons": ["Invalid TDR"],
                        "summary": "Sync demo",
                    },
                }
            ]
        },
    )
    assert sync2.json()["duplicates"] == 1
