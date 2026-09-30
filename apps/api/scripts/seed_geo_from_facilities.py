"""One-shot helper — also called from migrate."""
from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.db import District, Facility, Sector


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
        exists = (
            db.query(Sector)
            .filter(Sector.district_id == did, Sector.name == sname)
            .first()
        )
        if not exists:
            db.add(Sector(id=str(uuid.uuid4()), district_id=did, name=sname, active=True))
