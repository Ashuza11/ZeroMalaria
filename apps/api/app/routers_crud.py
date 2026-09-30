"""Generic paginated CRUD for facilities, geography, stock, audit, config."""

from __future__ import annotations

import csv
import io
import uuid
from datetime import datetime
from typing import Annotated, Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth import (
    get_current_user,
    mask_sensitive,
    require_permission,
    write_audit,
)
from app.db import (
    AppConfig,
    AuditLog,
    Cell,
    District,
    Facility,
    Sector,
    StockMovement,
    StockRecord,
    User,
    Village,
    get_db,
)
from app.roles import CHW, HEALTH_CENTER, is_national, normalize_role

router = APIRouter(tags=["crud"])


class PageMeta(BaseModel):
    items: list[Any]
    total: int
    page: int
    page_size: int


def _page(items: list, total: int, page: int, page_size: int) -> dict:
    return {"items": items, "total": total, "page": page, "page_size": page_size}


# ----- Facilities -----


class FacilityIn(BaseModel):
    facility_id: str = Field(min_length=2, max_length=32)
    name: str
    district: str
    sector: str = ""
    facility_type: str = "health_center"  # health_center | hospital
    latitude: float = 0.0
    longitude: float = 0.0
    active: bool = True
    version: int | None = None


@router.get("/admin/facilities")
def list_facilities_admin(
    user: Annotated[User, Depends(require_permission("facilities:read"))],
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    q: str | None = None,
    district: str | None = None,
    status_filter: str | None = Query(None, alias="status"),
    sort_by: str = "name",
    order: str = "asc",
) -> dict:
    query = db.query(Facility)
    role = normalize_role(user.role)
    if not is_national(role):
        if user.district:
            query = query.filter(Facility.district == user.district)
        if role in {HEALTH_CENTER, CHW} and user.facility_id:
            query = query.filter(Facility.facility_id == user.facility_id)
    if status_filter == "deleted":
        query = query.filter(Facility.deleted_at.isnot(None))
    else:
        query = query.filter(Facility.deleted_at.is_(None))
        if status_filter == "inactive":
            query = query.filter(Facility.active.is_(False))
        elif status_filter == "active":
            query = query.filter(Facility.active.is_(True))
    if district:
        query = query.filter(Facility.district == district)
    if q:
        like = f"%{q}%"
        query = query.filter((Facility.name.ilike(like)) | (Facility.facility_id.ilike(like)))
    col = getattr(Facility, sort_by, Facility.name)
    query = query.order_by(col.desc() if order == "desc" else col.asc())
    total = query.count()
    rows = query.offset((page - 1) * page_size).limit(page_size).all()
    items = [
        {
            "facility_id": r.facility_id,
            "name": r.name,
            "district": r.district,
            "sector": r.sector,
            "facility_type": getattr(r, "facility_type", "health_center") or "health_center",
            "latitude": r.latitude,
            "longitude": r.longitude,
            "active": bool(getattr(r, "active", True)),
            "deleted_at": r.deleted_at,
            "version": getattr(r, "version", 1) or 1,
        }
        for r in rows
    ]
    return _page(items, total, page, page_size)


@router.post("/admin/facilities")
def create_facility(
    body: FacilityIn,
    actor: Annotated[User, Depends(require_permission("facilities:create"))],
    db: Session = Depends(get_db),
) -> dict:
    if db.query(Facility).filter(Facility.facility_id == body.facility_id).first():
        raise HTTPException(422, detail="facility_id_taken")
    row = Facility(
        facility_id=body.facility_id,
        name=body.name,
        district=body.district,
        sector=body.sector,
        facility_type=body.facility_type,
        latitude=body.latitude,
        longitude=body.longitude,
        active=body.active,
        pilot=0,
        remote=0,
    )
    db.add(row)
    db.commit()
    write_audit(
        db,
        action="facility_create",
        actor_id=actor.id,
        actor_username=actor.username,
        resource_type="facilities",
        resource_id=row.facility_id,
        detail=body.name,
    )
    return {"facility_id": row.facility_id, "name": row.name}


@router.patch("/admin/facilities/{facility_id}")
def patch_facility(
    facility_id: str,
    body: FacilityIn,
    actor: Annotated[User, Depends(require_permission("facilities:update"))],
    db: Session = Depends(get_db),
) -> dict:
    row = db.query(Facility).filter(Facility.facility_id == facility_id).first()
    if not row:
        raise HTTPException(404, detail="Not found")
    if body.version is not None and body.version != (getattr(row, "version", 1) or 1):
        raise HTTPException(409, detail="conflict_version")
    before = {"name": row.name, "active": getattr(row, "active", True)}
    row.name = body.name
    row.district = body.district
    row.sector = body.sector
    row.facility_type = body.facility_type
    row.latitude = body.latitude
    row.longitude = body.longitude
    row.active = body.active
    row.version = (getattr(row, "version", 1) or 1) + 1
    row.updated_at = datetime.utcnow()
    db.commit()
    write_audit(
        db,
        action="facility_update",
        actor_id=actor.id,
        actor_username=actor.username,
        resource_type="facilities",
        resource_id=facility_id,
        detail=str({"before": before, "after": {"name": row.name, "active": row.active}}),
    )
    return {"facility_id": row.facility_id, "version": row.version}


@router.delete("/admin/facilities/{facility_id}")
def soft_delete_facility(
    facility_id: str,
    actor: Annotated[User, Depends(require_permission("facilities:delete"))],
    db: Session = Depends(get_db),
) -> dict:
    row = db.query(Facility).filter(Facility.facility_id == facility_id).first()
    if not row:
        raise HTTPException(404, detail="Not found")
    row.deleted_at = datetime.utcnow()
    row.active = False
    row.version = (getattr(row, "version", 1) or 1) + 1
    db.commit()
    write_audit(
        db,
        action="facility_soft_delete",
        actor_id=actor.id,
        actor_username=actor.username,
        resource_type="facilities",
        resource_id=facility_id,
    )
    return {"ok": True}


@router.post("/admin/facilities/{facility_id}/restore")
def restore_facility(
    facility_id: str,
    actor: Annotated[User, Depends(require_permission("facilities:delete"))],
    db: Session = Depends(get_db),
) -> dict:
    row = db.query(Facility).filter(Facility.facility_id == facility_id).first()
    if not row:
        raise HTTPException(404, detail="Not found")
    row.deleted_at = None
    row.active = True
    row.version = (getattr(row, "version", 1) or 1) + 1
    db.commit()
    write_audit(
        db,
        action="facility_restore",
        actor_id=actor.id,
        actor_username=actor.username,
        resource_type="facilities",
        resource_id=facility_id,
    )
    return {"ok": True}


# ----- Geography -----


@router.get("/admin/districts")
def list_districts(
    user: Annotated[User, Depends(require_permission("districts:read"))],
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    q: str | None = None,
) -> dict:
    query = db.query(District).filter(District.deleted_at.is_(None))
    if not is_national(user.role) and user.district:
        query = query.filter(District.name == user.district)
    if q:
        query = query.filter(District.name.ilike(f"%{q}%"))
    total = query.count()
    rows = query.order_by(District.name).offset((page - 1) * page_size).limit(page_size).all()
    return _page([{"id": r.id, "name": r.name, "active": r.active, "version": r.version} for r in rows], total, page, page_size)


class GeoNameIn(BaseModel):
    name: str
    district_id: str | None = None
    sector_id: str | None = None
    cell_id: str | None = None
    active: bool = True


@router.post("/admin/districts")
def create_district(
    body: GeoNameIn,
    actor: Annotated[User, Depends(require_permission("districts:create"))],
    db: Session = Depends(get_db),
) -> dict:
    if db.query(District).filter(District.name == body.name).first():
        raise HTTPException(422, detail="name_taken")
    row = District(id=str(uuid.uuid4()), name=body.name.strip(), active=body.active)
    db.add(row)
    db.commit()
    write_audit(db, action="district_create", actor_id=actor.id, actor_username=actor.username, resource_type="districts", resource_id=row.id, detail=row.name)
    return {"id": row.id, "name": row.name}


@router.get("/admin/sectors")
def list_sectors(
    user: Annotated[User, Depends(require_permission("sectors:read"))],
    db: Session = Depends(get_db),
    district_id: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
) -> dict:
    query = db.query(Sector).filter(Sector.deleted_at.is_(None))
    if district_id:
        query = query.filter(Sector.district_id == district_id)
    total = query.count()
    rows = query.order_by(Sector.name).offset((page - 1) * page_size).limit(page_size).all()
    return _page(
        [{"id": r.id, "name": r.name, "district_id": r.district_id, "active": r.active, "version": r.version} for r in rows],
        total,
        page,
        page_size,
    )


@router.get("/admin/cells")
def list_cells(
    user: Annotated[User, Depends(require_permission("cells:read"))],
    db: Session = Depends(get_db),
    sector_id: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
) -> dict:
    query = db.query(Cell).filter(Cell.deleted_at.is_(None))
    if sector_id:
        query = query.filter(Cell.sector_id == sector_id)
    total = query.count()
    rows = query.order_by(Cell.name).offset((page - 1) * page_size).limit(page_size).all()
    return _page(
        [{"id": r.id, "name": r.name, "sector_id": r.sector_id, "active": r.active} for r in rows],
        total,
        page,
        page_size,
    )


@router.get("/admin/villages")
def list_villages(
    user: Annotated[User, Depends(require_permission("villages:read"))],
    db: Session = Depends(get_db),
    cell_id: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    q: str | None = None,
) -> dict:
    query = db.query(Village).filter(Village.deleted_at.is_(None))
    if cell_id:
        query = query.filter(Village.cell_id == cell_id)
    if q:
        query = query.filter(Village.name.ilike(f"%{q}%"))
    total = query.count()
    rows = query.order_by(Village.name).offset((page - 1) * page_size).limit(page_size).all()
    return _page(
        [{"id": r.id, "name": r.name, "cell_id": r.cell_id, "active": r.active} for r in rows],
        total,
        page,
        page_size,
    )


# ----- Stock -----


class StockUpdateIn(BaseModel):
    stock_on_hand: int
    reason: str = ""
    version: int | None = None


@router.get("/admin/stock")
def list_stock(
    user: Annotated[User, Depends(require_permission("stock:read"))],
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    facility_id: str | None = None,
    commodity: str | None = None,
    low: bool | None = None,
    stockout: bool | None = None,
) -> dict:
    query = db.query(StockRecord).filter(StockRecord.deleted_at.is_(None))
    role = normalize_role(user.role)
    if not is_national(role) and user.facility_id:
        query = query.filter(StockRecord.facility_id == user.facility_id)
    elif not is_national(role) and user.district:
        query = query.filter(StockRecord.district == user.district)
    if facility_id:
        query = query.filter(StockRecord.facility_id == facility_id)
    if commodity:
        query = query.filter(StockRecord.commodity == commodity)
    if stockout:
        query = query.filter(StockRecord.stockout == 1)
    if low:
        query = query.filter(StockRecord.weeks_of_cover < 2, StockRecord.stockout == 0)
    total = query.count()
    rows = query.offset((page - 1) * page_size).limit(page_size).all()
    items = [
        {
            "id": r.id,
            "facility_id": r.facility_id,
            "facility_name": r.facility_name,
            "district": r.district,
            "commodity": r.commodity,
            "stock_on_hand": r.stock_on_hand,
            "weeks_of_cover": r.weeks_of_cover,
            "stockout": bool(r.stockout),
            "version": getattr(r, "version", 1) or 1,
        }
        for r in rows
    ]
    return _page(items, total, page, page_size)


@router.patch("/admin/stock/{stock_id}")
def update_stock(
    stock_id: int,
    body: StockUpdateIn,
    actor: Annotated[User, Depends(require_permission("stock:update"))],
    db: Session = Depends(get_db),
) -> dict:
    row = db.query(StockRecord).filter(StockRecord.id == stock_id).first()
    if not row:
        raise HTTPException(404, detail="Not found")
    if body.version is not None and body.version != (getattr(row, "version", 1) or 1):
        raise HTTPException(409, detail="conflict_version")
    before = row.stock_on_hand
    delta = body.stock_on_hand - before
    row.stock_on_hand = body.stock_on_hand
    row.stockout = 1 if body.stock_on_hand <= 0 else 0
    row.version = (getattr(row, "version", 1) or 1) + 1
    db.add(
        StockMovement(
            id=str(uuid.uuid4()),
            facility_id=row.facility_id,
            commodity=row.commodity,
            delta=delta,
            reason=body.reason or "manual_update",
            actor_id=actor.id,
            created_at=datetime.utcnow(),
        )
    )
    db.commit()
    write_audit(
        db,
        action="stock_update",
        actor_id=actor.id,
        actor_username=actor.username,
        resource_type="stock",
        resource_id=str(stock_id),
        detail=str({"before": before, "after": body.stock_on_hand, "reason": body.reason}),
    )
    return {"id": row.id, "stock_on_hand": row.stock_on_hand, "version": row.version}


# ----- Audit logs -----


@router.get("/admin/audit-logs")
def list_audit(
    user: Annotated[User, Depends(require_permission("audit_logs:read"))],
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    actor: str | None = None,
    action: str | None = None,
    resource: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
) -> dict:
    query = db.query(AuditLog)
    if actor:
        query = query.filter(AuditLog.actor_username.ilike(f"%{actor}%"))
    if action:
        query = query.filter(AuditLog.action == action)
    if resource:
        query = query.filter(AuditLog.resource_type == resource)
    if date_from:
        query = query.filter(AuditLog.created_at >= datetime.fromisoformat(date_from))
    if date_to:
        query = query.filter(AuditLog.created_at <= datetime.fromisoformat(date_to))
    total = query.count()
    rows = query.order_by(AuditLog.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    items = [
        {
            "id": r.id,
            "action": r.action,
            "actor_id": r.actor_id,
            "actor_username": r.actor_username,
            "resource_type": r.resource_type,
            "resource_id": r.resource_id,
            "detail": r.detail,
            "ip": getattr(r, "ip", "") or "",
            "created_at": r.created_at.isoformat() + "Z" if r.created_at else None,
        }
        for r in rows
    ]
    return _page(items, total, page, page_size)


@router.get("/admin/audit-logs/export")
def export_audit(
    user: Annotated[User, Depends(require_permission("audit_logs:export"))],
    db: Session = Depends(get_db),
    action: str | None = None,
    resource: str | None = None,
) -> Response:
    query = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(5000)
    if action:
        query = query.filter(AuditLog.action == action)
    if resource:
        query = query.filter(AuditLog.resource_type == resource)
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["id", "action", "actor_username", "resource_type", "resource_id", "created_at"])
    for r in query.all():
        w.writerow([r.id, r.action, r.actor_username, r.resource_type, r.resource_id, r.created_at])
    write_audit(
        db,
        action="audit_export",
        actor_id=user.id,
        actor_username=user.username,
        resource_type="audit_logs",
        detail="csv",
    )
    return Response(
        content=buf.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=audit-logs.csv"},
    )


# ----- Config -----


@router.get("/admin/config")
def get_config(
    user: Annotated[User, Depends(require_permission("config:read"))],
    db: Session = Depends(get_db),
) -> list[dict]:
    rows = db.query(AppConfig).all()
    return [{"key": r.key, "value": r.value, "label": r.label} for r in rows]


class ConfigPatch(BaseModel):
    value: str


@router.patch("/admin/config/{key}")
def patch_config(
    key: str,
    body: ConfigPatch,
    actor: Annotated[User, Depends(require_permission("config:update"))],
    db: Session = Depends(get_db),
) -> dict:
    row = db.query(AppConfig).filter(AppConfig.key == key).first()
    if not row:
        raise HTTPException(404, detail="Not found")
    before = row.value
    row.value = body.value
    row.updated_at = datetime.utcnow()
    db.commit()
    write_audit(
        db,
        action="config_update",
        actor_id=actor.id,
        actor_username=actor.username,
        resource_type="config",
        resource_id=key,
        detail=str(mask_sensitive({"before": before, "after": body.value})),
    )
    return {"key": key, "value": row.value, "label": row.label}
