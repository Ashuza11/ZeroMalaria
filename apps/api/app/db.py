from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, Float, Integer, String, Text, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker

from app.config import settings


class Base(DeclarativeBase):
    pass


class Facility(Base):
    __tablename__ = "facilities"

    facility_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    name: Mapped[str] = mapped_column(String(128))
    district: Mapped[str] = mapped_column(String(64), index=True)
    sector: Mapped[str] = mapped_column(String(64))
    pilot: Mapped[int] = mapped_column(Integer, default=0)
    remote: Mapped[int] = mapped_column(Integer, default=0)
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)


class CaseRecord(Base):
    __tablename__ = "cases"

    case_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    date: Mapped[str] = mapped_column(String(16), index=True)
    district: Mapped[str] = mapped_column(String(64), index=True)
    sector: Mapped[str] = mapped_column(String(64))
    chw_id: Mapped[str] = mapped_column(String(32), index=True)
    age_months: Mapped[int] = mapped_column(Integer)
    sex: Mapped[str] = mapped_column(String(16))
    temperature_c: Mapped[float] = mapped_column(Float)
    fever_days: Mapped[int] = mapped_column(Integer)
    convulsions: Mapped[int] = mapped_column(Integer, default=0)
    unable_to_drink: Mapped[int] = mapped_column(Integer, default=0)
    vomiting_everything: Mapped[int] = mapped_column(Integer, default=0)
    lethargy: Mapped[int] = mapped_column(Integer, default=0)
    severe_breathing_difficulty: Mapped[int] = mapped_column(Integer, default=0)
    tdr_result: Mapped[str] = mapped_column(String(16))
    decision: Mapped[str] = mapped_column(String(32), index=True)
    referral_completed: Mapped[int] = mapped_column(Integer, default=0)
    arrival_delay_hours: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    outcome: Mapped[str] = mapped_column(String(32))


class StockRecord(Base):
    __tablename__ = "stock"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    facility_id: Mapped[str] = mapped_column(String(32), index=True)
    facility_name: Mapped[str] = mapped_column(String(128))
    district: Mapped[str] = mapped_column(String(64), index=True)
    week_start: Mapped[str] = mapped_column(String(16), index=True)
    commodity: Mapped[str] = mapped_column(String(64))
    unit: Mapped[str] = mapped_column(String(128))
    stock_on_hand: Mapped[int] = mapped_column(Integer)
    quantity_consumed: Mapped[int] = mapped_column(Integer)
    stockout: Mapped[int] = mapped_column(Integer, default=0)
    weeks_of_cover: Mapped[float] = mapped_column(Float)


class Referral(Base):
    __tablename__ = "referrals"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    client_uuid: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    case_id: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    facility_id: Mapped[str] = mapped_column(String(32), index=True)
    chw_id: Mapped[str] = mapped_column(String(32), index=True)
    district: Mapped[str] = mapped_column(String(64), index=True)
    sector: Mapped[str] = mapped_column(String(64))
    age_months: Mapped[int] = mapped_column(Integer)
    sex: Mapped[str] = mapped_column(String(16))
    decision: Mapped[str] = mapped_column(String(32), index=True)
    reasons_json: Mapped[str] = mapped_column(Text, default="[]")
    summary: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(32), default="sent", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    received_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    arrived_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    treated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    demo_flag: Mapped[bool] = mapped_column(Boolean, default=False)


class SyncEvent(Base):
    __tablename__ = "sync_events"

    client_uuid: Mapped[str] = mapped_column(String(64), primary_key=True)
    payload_type: Mapped[str] = mapped_column(String(32))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    display_name: Mapped[str] = mapped_column(String(128))
    role: Mapped[str] = mapped_column(String(32), index=True)  # chw|nurse|supervisor|rbc
    phone: Mapped[str] = mapped_column(String(32), default="")
    district: Mapped[str] = mapped_column(String(64), default="")
    facility_id: Mapped[str] = mapped_column(String(32), default="")
    village: Mapped[str] = mapped_column(String(128), default="")
    chw_code: Mapped[str] = mapped_column(String(32), default="")  # maps to referral.chw_id
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    action: Mapped[str] = mapped_column(String(64), index=True)
    actor_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    actor_username: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    resource_type: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    resource_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    detail: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)


class FollowUp(Base):
    __tablename__ = "follow_ups"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    referral_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    chw_id: Mapped[str] = mapped_column(String(32), index=True)
    facility_id: Mapped[str] = mapped_column(String(32), default="")
    due_date: Mapped[str] = mapped_column(String(16), index=True)
    status: Mapped[str] = mapped_column(String(32), default="due")  # due|overdue|completed
    note: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


def _make_engine(url: str | None = None):
    return create_engine(
        url or settings.database_url,
        connect_args={"check_same_thread": False},
    )


engine = _make_engine()
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def configure_engine(url: str) -> None:
    """Used by tests to point at an isolated SQLite file."""
    global engine, SessionLocal
    engine.dispose()
    engine = _make_engine(url)
    SessionLocal.configure(bind=engine)


def init_db() -> None:
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
