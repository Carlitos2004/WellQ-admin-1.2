import uuid
from datetime import datetime
from fastapi import APIRouter, Path, Body, Query, status, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, asc, or_
from app.db.neon import get_db
from app.models_db import Plan, ClinicPlan

router = APIRouter(prefix="/api/plans", tags=["Constructor de Planes"])


async def _get_active_clinics_count(db: AsyncSession, plan_id: str) -> int:
    count_stmt = select(func.count(ClinicPlan.id)).where(
        ClinicPlan.plan_id == plan_id,
        ClinicPlan.effective_to.is_(None)
    )
    result = await db.execute(count_stmt)
    return result.scalar() or 0


async def _serialize_plan(db: AsyncSession, p: Plan) -> dict:
    active_clinics = await _get_active_clinics_count(db, str(p.id))
    monthly_price = getattr(p, "monthly_price", 0.0)
    arr = active_clinics * monthly_price * 12

    # Parseamos effective_date a string formato YYYY-MM-DD
    eff_date_str = None
    if getattr(p, "effective_date", None):
        eff_date_str = p.effective_date.isoformat()[:10]

    return {
        "id": str(p.id),
        "name": p.name,
        "description": getattr(p, "description", ""),
        "tagColor": getattr(p, "tag_color", "slate"),
        "status": getattr(p, "status", "active"),
        "setupPrice": getattr(p, "setup_price", 0.0),
        "monthlyPrice": monthly_price,
        "currency": getattr(p, "currency", "USD"),
        "effectiveDate": eff_date_str,
        "features": getattr(p, "features", []),
        "metrics": {"activeClinics": active_clinics, "arr": arr},
        "createdAt": p.created_at.isoformat() + "Z" if getattr(p, "created_at", None) else None,
        "updatedAt": p.updated_at.isoformat() + "Z" if getattr(p, "updated_at", None) else None,
        "archivedAt": p.archived_at.isoformat() + "Z" if getattr(p, "archived_at", None) else None,
        "createdBy": getattr(p, "created_by", {"id": "usr-001", "email": "admin@wellq.co", "name": "Admin WellQ"}),
        "updatedBy": getattr(p, "updated_by", {"id": "usr-001", "email": "admin@wellq.co", "name": "Admin WellQ"}),
    }


# ─── GET /api/plans ───────────────────────────────────────────────────────────
@router.get(
    "",
    summary="Listar planes con filtros y paginación",
)
async def list_plans(
    search: str | None = Query(None),
    plan_status: str | None = Query(None, alias="status", description="draft | active | archived (multi-valor)"),
    currency: str | None = Query(None),
    includeArchived: bool = Query(False),
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    sortBy: str = Query("name", description="name | monthlyPrice | effectiveDate | createdAt"),
    sortOrder: str = Query("asc"),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Plan)
    count_stmt = select(func.count(Plan.id))

    filters = []
    if not includeArchived:
        filters.append(Plan.status != "archived")
    if plan_status:
        allowed = [s.strip() for s in plan_status.split(",")]
        filters.append(Plan.status.in_(allowed))
    if currency:
        filters.append(Plan.currency == currency)
    if search:
        term = f"%{search.lower()}%"
        filters.append(or_(
            func.lower(Plan.name).like(term),
            func.lower(Plan.description).like(term)
        ))

    if filters:
        stmt = stmt.where(*filters)
        count_stmt = count_stmt.where(*filters)

    total = (await db.execute(count_stmt)).scalar() or 0

    # Paginación y Ordenamiento
    sort_column = Plan.name
    if sortBy == "monthlyPrice": sort_column = Plan.monthly_price
    elif sortBy == "effectiveDate": sort_column = Plan.effective_date
    elif sortBy == "createdAt": sort_column = Plan.created_at

    if sortOrder == "desc":
        stmt = stmt.order_by(desc(sort_column))
    else:
        stmt = stmt.order_by(asc(sort_column))

    start = (page - 1) * pageSize
    stmt = stmt.offset(start).limit(pageSize)

    result = await db.execute(stmt)
    plans = result.scalars().all()

    data = [await _serialize_plan(db, p) for p in plans]

    return {
        "data": data,
        "pagination": {
            "total": total,
            "page": page,
            "pageSize": pageSize,
            "totalPages": max(1, -(-total // pageSize)),
        },
    }


# ─── GET /api/plans/{planId} ──────────────────────────────────────────────────
@router.get(
    "/{planId}",
    summary="Obtener detalle completo de un plan",
)
async def get_plan(planId: str = Path(...), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Plan).where(Plan.id == planId))
    plan = result.scalars().first()

    if not plan:
        raise HTTPException(status_code=404, detail="No encontrado")

    return await _serialize_plan(db, plan)


# ─── POST /api/plans ──────────────────────────────────────────────────────────
@router.post(
    "",
    summary="Crear un nuevo plan en estado draft",
    status_code=status.HTTP_201_CREATED,
)
async def create_plan(body: dict = Body(...), db: AsyncSession = Depends(get_db)):
    name = body.get("name", "")
    if not name or len(name) < 3:
        return {"error": {"code": "VALIDATION_ERROR", "message": "El campo 'name' debe tener entre 3 y 60 caracteres"}}

    # Verificar duplicado
    duplicate_stmt = select(Plan).where(
        func.lower(Plan.name) == name.lower(),
        Plan.status != "archived"
    )
    duplicate = (await db.execute(duplicate_stmt)).scalars().first()
    
    if duplicate:
        return {"error": {"code": "PLAN_NAME_DUPLICATE", "message": f"Ya existe un plan no archivado con el nombre '{name}'"}}

    if not body.get("features"):
        return {"error": {"code": "VALIDATION_ERROR", "message": "El plan debe incluir al menos un feature"}}

    now = datetime.utcnow()
    
    effective_date_val = now
    if body.get("effectiveDate"):
        try:
            effective_date_val = datetime.strptime(body["effectiveDate"][:10], "%Y-%m-%d")
        except ValueError:
            pass

    new_plan_id = f"plan-{name.lower().replace(' ', '-')}-{uuid.uuid4().hex[:6]}"
    
    new_plan = Plan(
        id=new_plan_id,
        name=name,
        description=body.get("description", ""),
        tag_color=body.get("tagColor", "slate"),
        status="draft",
        setup_price=body.get("setupPrice", 0.00),
        monthly_price=body.get("monthlyPrice", 0.00),
        currency=body.get("currency", "USD"),
        effective_date=effective_date_val,
        features=body.get("features", []),
        created_at=now,
        updated_at=now
    )

    db.add(new_plan)
    await db.commit()
    await db.refresh(new_plan)

    return {"status": "success", "data": await _serialize_plan(db, new_plan)}


# ─── PUT /api/plans/{planId} ──────────────────────────────────────────────────
@router.put(
    "/{planId}",
    summary="Actualizar un plan existente",
)
async def update_plan(
    planId: str = Path(...),
    body: dict = Body(...),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Plan).where(Plan.id == planId))
    plan = result.scalars().first()

    if not plan:
        raise HTTPException(status_code=404, detail="No encontrado")

    if plan.status == "archived":
        return {"error": {"code": "PLAN_ARCHIVED", "message": "No se puede editar un plan archivado. Use restore primero."}}

    if "name" in body:
        collision_stmt = select(Plan).where(
            func.lower(Plan.name) == body["name"].lower(),
            Plan.id != planId,
            Plan.status != "archived"
        )
        collision = (await db.execute(collision_stmt)).scalars().first()
        if collision:
            return {"error": {"code": "PLAN_NAME_DUPLICATE", "message": f"El nombre '{body['name']}' ya está en uso"}}

    active_clinics = await _get_active_clinics_count(db, plan.id)
    if "currency" in body and body["currency"] != getattr(plan, "currency", "") and active_clinics > 0:
        return {"error": {"code": "PLAN_CURRENCY_LOCKED", "message": "El plan tiene asignaciones activas y la moneda es inmutable"}}

    # Mapeo de campos
    if "name" in body: plan.name = body["name"]
    if "description" in body: plan.description = body["description"]
    if "tagColor" in body: plan.tag_color = body["tagColor"]
    if "status" in body: plan.status = body["status"]
    if "setupPrice" in body: plan.setup_price = body["setupPrice"]
    if "monthlyPrice" in body: plan.monthly_price = body["monthlyPrice"]
    if "currency" in body: plan.currency = body["currency"]
    if "features" in body: plan.features = body["features"]
    if "effectiveDate" in body and body["effectiveDate"]:
        try:
            plan.effective_date = datetime.strptime(body["effectiveDate"][:10], "%Y-%m-%d")
        except ValueError:
            pass

    plan.updated_at = datetime.utcnow()
    
    db.add(plan)
    await db.commit()
    await db.refresh(plan)

    return {"status": "success", "data": await _serialize_plan(db, plan)}


# ─── POST /api/plans/{planId}/duplicate ───────────────────────────────────────
@router.post(
    "/{planId}/duplicate",
    summary="Duplicar un plan existente",
    status_code=status.HTTP_201_CREATED,
)
async def duplicate_plan(
    planId: str = Path(...),
    body: dict = Body(default={}),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Plan).where(Plan.id == planId))
    plan = result.scalars().first()

    if not plan:
        raise HTTPException(status_code=404, detail="No encontrado")

    new_name = body.get("name", f"{plan.name} (Copy)")

    collision_stmt = select(Plan).where(
        func.lower(Plan.name) == new_name.lower(),
        Plan.status != "archived"
    )
    collision = (await db.execute(collision_stmt)).scalars().first()
    
    if collision:
        return {"error": {"code": "PLAN_NAME_DUPLICATE", "message": f"El nombre '{new_name}' ya está en uso"}}

    now = datetime.utcnow()
    new_plan_id = f"plan-copy-{uuid.uuid4().hex[:8]}"

    effective_date_val = plan.effective_date
    if body.get("effectiveDate"):
        try:
            effective_date_val = datetime.strptime(body["effectiveDate"][:10], "%Y-%m-%d")
        except ValueError:
            pass

    duplicated = Plan(
        id=new_plan_id,
        name=new_name,
        description=getattr(plan, "description", ""),
        tag_color=getattr(plan, "tag_color", "slate"),
        status="draft",
        setup_price=getattr(plan, "setup_price", 0.00),
        monthly_price=getattr(plan, "monthly_price", 0.00),
        currency=getattr(plan, "currency", "USD"),
        effective_date=effective_date_val,
        features=getattr(plan, "features", []),
        created_at=now,
        updated_at=now
    )

    db.add(duplicated)
    await db.commit()
    await db.refresh(duplicated)

    return {"status": "success", "data": await _serialize_plan(db, duplicated)}


# ─── POST /api/plans/{planId}/archive ─────────────────────────────────────────
@router.post(
    "/{planId}/archive",
    summary="Archivar un plan (soft-delete)",
)
async def archive_plan(planId: str = Path(...), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Plan).where(Plan.id == planId))
    plan = result.scalars().first()

    if not plan:
        raise HTTPException(status_code=404, detail="No encontrado")

    if getattr(plan, "status", "") == "archived":
        return {"error": {"code": "PLAN_ALREADY_ARCHIVED", "message": "El plan ya está archivado"}}

    now = datetime.utcnow()
    plan.status = "archived"
    plan.archived_at = now
    plan.updated_at = now
    
    db.add(plan)
    await db.commit()
    
    active_clinics = await _get_active_clinics_count(db, plan.id)

    return {
        "status": "success",
        "id": plan.id,
        "status_field": plan.status,
        "archivedAt": plan.archived_at.isoformat() + "Z",
        "affectedClinics": active_clinics,
    }


# ─── POST /api/plans/{planId}/restore ─────────────────────────────────────────
@router.post(
    "/{planId}/restore",
    summary="Restaurar un plan archivado",
)
async def restore_plan(planId: str = Path(...), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Plan).where(Plan.id == planId))
    plan = result.scalars().first()

    if not plan:
        raise HTTPException(status_code=404, detail="No encontrado")

    if getattr(plan, "status", "") != "archived":
        return {"error": {"code": "PLAN_NOT_ARCHIVED", "message": "El plan ya está activo"}}

    now = datetime.utcnow()
    plan.status = "active" # o 'draft' dependiendo la regla de negocio
    plan.archived_at = None
    plan.updated_at = now

    db.add(plan)
    await db.commit()

    return {
        "status": "success",
        "id": plan.id,
        "status_field": plan.status,
        "archivedAt": None,
        "restoredAt": now.isoformat() + "Z",
    }