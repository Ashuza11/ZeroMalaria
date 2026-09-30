#!/usr/bin/env python3
"""Seed SQLite from synthetic CSVs + deterministic demo scenario referrals."""

from __future__ import annotations

import json
import sys
import uuid
from datetime import datetime, timedelta
from pathlib import Path

import pandas as pd

API_ROOT = Path(__file__).resolve().parents[1]
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))

from app.auth import hash_password
from app.config import REPO_ROOT, settings
from app.db import Base, CaseRecord, Facility, Referral, SessionLocal, StockRecord, User, init_db

DATA = REPO_ROOT / "data"


def load_csvs(db) -> None:
    facilities = pd.read_csv(DATA / "facilities.csv")
    for _, row in facilities.iterrows():
        db.merge(
            Facility(
                facility_id=row["facility_id"],
                name=row["name"],
                district=row["district"],
                sector=row["sector"],
                pilot=int(row["pilot"]),
                remote=int(row["remote"]),
                latitude=float(row["latitude"]),
                longitude=float(row["longitude"]),
            )
        )

    # Load a recent window of cases for analytics speed (last ~120 days of window)
    cases = pd.read_csv(DATA / "cases_synthetic.csv")
    cases = cases[cases["date"] >= "2026-06-01"]
    for _, row in cases.iterrows():
        delay = row["arrival_delay_hours"]
        db.merge(
            CaseRecord(
                case_id=row["case_id"],
                date=row["date"],
                district=row["district"],
                sector=row["sector"],
                chw_id=row["chw_id"],
                age_months=int(row["age_months"]),
                sex=row["sex"],
                temperature_c=float(row["temperature_c"]),
                fever_days=int(row["fever_days"]),
                convulsions=int(row["convulsions"]),
                unable_to_drink=int(row["unable_to_drink"]),
                vomiting_everything=int(row["vomiting_everything"]),
                lethargy=int(row["lethargy"]),
                severe_breathing_difficulty=int(row["severe_breathing_difficulty"]),
                tdr_result=row["tdr_result"],
                decision=row["decision"],
                referral_completed=int(row["referral_completed"]),
                arrival_delay_hours=None if pd.isna(delay) else float(delay),
                outcome=row["outcome"],
            )
        )

    stock = pd.read_csv(DATA / "stock_synthetic.csv")
    stock = stock[stock["week_start"] >= "2026-07-01"]
    for _, row in stock.iterrows():
        db.add(
            StockRecord(
                facility_id=row["facility_id"],
                facility_name=row["facility_name"],
                district=row["district"],
                week_start=row["week_start"],
                commodity=row["commodity"],
                unit=row["unit"],
                stock_on_hand=int(row["stock_on_hand"]),
                quantity_consumed=int(row["quantity_consumed"]),
                stockout=int(row["stockout"]),
                weeks_of_cover=float(row["weeks_of_cover"]),
            )
        )


def seed_users(db) -> None:
    """Deterministic demo accounts. Password for all: demo1234."""
    users = [
        {
            "id": "user-chw-demo",
            "username": "chw.demo",
            "display_name": "CHW Demo (Nyamata)",
            "role": "chw",
            "district": "Bugesera",
            "facility_id": "HC-BUG-01",
            "village": "Nyamata",
            "chw_code": "CHW-BUG-01-01",
            "phone": "+250780000001",
        },
        {
            "id": "user-nurse-demo",
            "username": "nurse.demo",
            "display_name": "Nurse Demo (Nyamata HC)",
            "role": "nurse",
            "district": "Bugesera",
            "facility_id": "HC-BUG-01",
            "village": "",
            "chw_code": "",
            "phone": "+250780000002",
        },
        {
            "id": "user-supervisor-demo",
            "username": "supervisor.demo",
            "display_name": "Supervisor Demo (Bugesera)",
            "role": "supervisor",
            "district": "Bugesera",
            "facility_id": "HC-BUG-01",
            "village": "",
            "chw_code": "",
            "phone": "+250780000003",
        },
        {
            "id": "user-rbc-demo",
            "username": "rbc.demo",
            "display_name": "RBC Officer Demo",
            "role": "rbc",
            "district": "",
            "facility_id": "",
            "village": "",
            "chw_code": "",
            "phone": "+250780000004",
        },
    ]
    pw = hash_password(settings.demo_password)
    for u in users:
        if db.query(User).filter(User.username == u["username"]).first():
            continue
        db.add(User(password_hash=pw, active=True, **u))


def seed_demo_scenario(db) -> None:
    """Deterministic demo referrals for Phase 8 script."""
    today = datetime.fromisoformat(settings.demo_today)
    facility_id = "HC-BUG-01"
    # Case B style urgent referral — waiting to be received at health center
    urgent_uuid = "demo-urgent-case-b"
    existing = db.query(Referral).filter(Referral.client_uuid == urgent_uuid).first()
    if not existing:
        db.add(
            Referral(
                id=str(uuid.uuid5(uuid.NAMESPACE_URL, urgent_uuid)),
                client_uuid=urgent_uuid,
                case_id="DEMO-CASE-B",
                facility_id=facility_id,
                chw_id="CHW-BUG-01-01",
                district="Bugesera",
                sector="Nyamata",
                age_months=28,
                sex="male",
                decision="urgent_refer",
                reasons_json=json.dumps(["Convulsions (fits) reported"]),
                summary="URGENT: Male, 28 months, TDR+, convulsions. Digital handover from CHW.",
                status="sent",
                created_at=today - timedelta(hours=2),
                demo_flag=True,
            )
        )

    # Overdue never-arrived referral for CHW alert
    overdue_uuid = "demo-overdue-never-arrived"
    existing2 = db.query(Referral).filter(Referral.client_uuid == overdue_uuid).first()
    if not existing2:
        db.add(
            Referral(
                id=str(uuid.uuid5(uuid.NAMESPACE_URL, overdue_uuid)),
                client_uuid=overdue_uuid,
                case_id="DEMO-CASE-MISS",
                facility_id=facility_id,
                chw_id="CHW-BUG-01-01",
                district="Bugesera",
                sector="Nyamata",
                age_months=18,
                sex="female",
                decision="urgent_refer",
                reasons_json=json.dumps(["Unable to drink or feed"]),
                summary="URGENT: Female, 18 months, unable to drink. Follow up — not arrived.",
                status="sent",
                created_at=today - timedelta(hours=36),
                demo_flag=True,
            )
        )

    # Routine referral already received
    routine_uuid = "demo-routine-received"
    if not db.query(Referral).filter(Referral.client_uuid == routine_uuid).first():
        db.add(
            Referral(
                id=str(uuid.uuid5(uuid.NAMESPACE_URL, routine_uuid)),
                client_uuid=routine_uuid,
                case_id="DEMO-CASE-R",
                facility_id=facility_id,
                chw_id="CHW-BUG-01-02",
                district="Bugesera",
                sector="Nyamata",
                age_months=40,
                sex="female",
                decision="refer",
                reasons_json=json.dumps(["Invalid TDR — refer for repeat testing / assessment"]),
                summary="Referral: Female, 40 months, invalid TDR.",
                status="received",
                created_at=today - timedelta(hours=8),
                received_at=today - timedelta(hours=6),
                demo_flag=True,
            )
        )


def main() -> None:
    db_path = Path(settings.database_url.replace("sqlite:///", ""))
    if db_path.exists():
        try:
            db_path.unlink()
        except PermissionError:
            # DB locked by a running server — clear tables instead
            init_db()
            db = SessionLocal()
            try:
                for table in reversed(Base.metadata.sorted_tables):
                    db.execute(table.delete())
                db.commit()
            finally:
                db.close()
    init_db()
    db = SessionLocal()
    try:
        print("Loading synthetic CSVs into SQLite...")
        load_csvs(db)
        print("Seeding demo users (password: demo1234)...")
        seed_users(db)
        print("Seeding demo scenario...")
        seed_demo_scenario(db)
        db.commit()
        n_cases = db.query(CaseRecord).count()
        n_ref = db.query(Referral).count()
        n_stock = db.query(StockRecord).count()
        n_users = db.query(User).count()
        print(f"Seeded cases={n_cases} referrals={n_ref} stock_rows={n_stock} users={n_users}")
        print("Demo logins: chw.demo / nurse.demo / supervisor.demo / rbc.demo")
        print(f"DB: {db_path}")
        print("SYNTHETIC DEMO DATA - not for clinical use")
    finally:
        db.close()


if __name__ == "__main__":
    main()
