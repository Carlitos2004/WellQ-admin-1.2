import uuid
from datetime import datetime
from fastapi import APIRouter, Path, Body, Query, status, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, asc, or_, delete
from app.db.neon import get_db
from app.models_db import Plan, PlanFeature, ClinicPlan

router = APIRouter(prefix="/api/plans", tags=["Constructor de Planes"])


async def _get_active_clinics_count(db: AsyncSession, plan_id: str) -> int:
    count_stmt = select(func.count(ClinicPlan.id)).where(
        ClinicPlan.plan_id == plan_id,
        ClinicPlan.effective_to.is_(None)
    )
    result = await db.execute(count_stmt)
    return result.scalar() or 0


async def _get_plan_features(db: AsyncSession, plan_id: str) -> list:
    """Retorna features del plan desde la tabla plan_features."""
    stmt = select(PlanFeature).where(PlanFeature.plan_id == plan_id)
    result = await db.execute(stmt)
    rows = result.scalars().all()
    return [{"featureId": row.feature_id, "limit": row.limit_value} for row in rows]


async def _save_plan_features(db: AsyncSession, plan_id: str, features: list):
    """Reemplaza todas las features del plan. features = [{ featureId, limit }]"""
    await db.execute(delete(PlanFeature).where(PlanFeature.plan_id == plan_id))
    for f in features:
        db.add(PlanFeature(
            plan_id=plan_id,
            feature_id=f.get("featureId", ""),
            limit_value=str(f.get("limit", "0")),
        ))


async def _serialize_plan(db: AsyncSession, p: Plan) -> dict:
    active_clinics = await _get_active_clinics_count(db, p.plan_id)
    monthly_price = p.monthly_price or 0.0
    arr = active_clinics * monthly_price * 12
    features = await _get_plan_features(db, p.plan_id)

    eff_date_str = None
    if p.effective_date:
        if isinstance(p.effective_date, str):
            eff_date_str = p.effective_date[:10]
        else:
            eff_date_str = p.effective_date.isoformat()[:10]

    return {
        "id": p.plan_id,
        "name": p.name,
        "description": p.description or "",
        "tagColor": p.tag_color or "slate",
        "status": p.status or "active",
        "setupPrice": p.setup_price or 0.0,
        "monthlyPrice": monthly_price,
        "currency": p.currency or "USD",
        "effectiveDate": eff_date_str,
        "features": features,
        "metrics": {"activeClinics": active_clinics, "arr": arr},
        "createdAt": p.created_at.isoformat() + "Z" if p.created_at else None,
        "updatedAt": p.updated_at.isoformat() + "Z" if p.updated_at else None,
        "archivedAt": p.archived_at.isoformat() + "Z" if p.archived_at else None,
        "createdBy": {"email": p.created_by_email, "name": p.created_by_name},
        "updatedBy": {"email": p.updated_by_email, "name": p.updated_by_name},
    }


# ─── GET /api/plans ───────────────────────────────────────────────────────────
@router.get("", summary="Listar planes con filtros y paginación")
async def list_plans(
    search: str | None = Query(None),
    plan_status: str | None = Query(None, alias="status"),
    currency: str | None = Query(None),
    includeArchived: bool = Query(False),
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    sortBy: str = Query("name"),
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

    sort_column = Plan.name
    if sortBy == "monthlyPrice":   sort_column = Plan.monthly_price
    elif sortBy == "effectiveDate": sort_column = Plan.effective_date
    elif sortBy == "createdAt":     sort_column = Plan.created_at

    stmt = stmt.order_by(desc(sort_column) if sortOrder == "desc" else asc(sort_column))
    stmt = stmt.offset((page - 1) * pageSize).limit(pageSize)

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
@router.get("/{planId}", summary="Obtener detalle completo de un plan")
async def get_plan(planId: str = Path(...), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Plan).where(Plan.plan_id == planId))
    plan = result.scalars().first()
    if not plan:
        raise HTTPException(status_code=404, detail="No encontrado")
    return await _serialize_plan(db, plan)


# ─── POST /api/plans ──────────────────────────────────────────────────────────
@router.post("", summary="Crear un nuevo plan", status_code=status.HTTP_201_CREATED)
async def create_plan(body: dict = Body(...), db: AsyncSession = Depends(get_db)):
    name = body.get("name", "").strip()
    if not name or len(name) < 3:
        return {"error": {"code": "VALIDATION_ERROR", "message": "El campo 'name' debe tener entre 3 y 60 caracteres"}}

    duplicate = (await db.execute(
        select(Plan).where(func.lower(Plan.name) == name.lower(), Plan.status != "archived")
    )).scalars().first()
    if duplicate:
        return {"error": {"code": "PLAN_NAME_DUPLICATE", "message": f"Ya existe un plan con el nombre '{name}'"}}

    features = body.get("features", [])
    if not features:
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
        plan_id=new_plan_id,
        name=name,
        description=body.get("description", ""),
        tag_color=body.get("tagColor", "slate"),
        status="draft",
        setup_price=body.get("setupPrice", 0.0),
        monthly_price=body.get("monthlyPrice", 0.0),
        currency=body.get("currency", "USD"),
        effective_date=effective_date_val,
        created_at=now,
        updated_at=now,
    )
    db.add(new_plan)
    await db.flush()  # para que exista antes de guardar features

    await _save_plan_features(db, new_plan_id, features)
    await db.commit()
    await db.refresh(new_plan)

    return {"status": "success", "data": await _serialize_plan(db, new_plan)}


# ─── PUT /api/plans/{planId} ──────────────────────────────────────────────────
@router.put("/{planId}", summary="Actualizar un plan existente")
async def update_plan(
    planId: str = Path(...),
    body: dict = Body(...),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Plan).where(Plan.plan_id == planId))
    plan = result.scalars().first()
    if not plan:
        raise HTTPException(status_code=404, detail="No encontrado")

    if plan.status == "archived":
        return {"error": {"code": "PLAN_ARCHIVED", "message": "No se puede editar un plan archivado. Use restore primero."}}

    if "name" in body:
        collision = (await db.execute(
            select(Plan).where(
                func.lower(Plan.name) == body["name"].lower(),
                Plan.plan_id != planId,
                Plan.status != "archived"
            )
        )).scalars().first()
        if collision:
            return {"error": {"code": "PLAN_NAME_DUPLICATE", "message": f"El nombre '{body['name']}' ya está en uso"}}

    active_clinics = await _get_active_clinics_count(db, planId)
    if "currency" in body and body["currency"] != plan.currency and active_clinics > 0:
        return {"error": {"code": "PLAN_CURRENCY_LOCKED", "message": "El plan tiene asignaciones activas y la moneda es inmutable"}}

    if "name" in body:        plan.name = body["name"]
    if "description" in body: plan.description = body["description"]
    if "tagColor" in body:    plan.tag_color = body["tagColor"]
    if "status" in body:      plan.status = body["status"]
    if "setupPrice" in body:  plan.setup_price = body["setupPrice"]
    if "monthlyPrice" in body: plan.monthly_price = body["monthlyPrice"]
    if "currency" in body:    plan.currency = body["currency"]
    if "effectiveDate" in body and body["effectiveDate"]:
        try:
            plan.effective_date = datetime.strptime(body["effectiveDate"][:10], "%Y-%m-%d")
        except ValueError:
            pass
    if "features" in body:
        await _save_plan_features(db, planId, body["features"])

    plan.updated_at = datetime.utcnow()
    db.add(plan)
    await db.commit()
    await db.refresh(plan)

    return {"status": "success", "data": await _serialize_plan(db, plan)}


# ─── POST /api/plans/{planId}/duplicate ───────────────────────────────────────
@router.post("/{planId}/duplicate", summary="Duplicar un plan", status_code=status.HTTP_201_CREATED)
async def duplicate_plan(
    planId: str = Path(...),
    body: dict = Body(default={}),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Plan).where(Plan.plan_id == planId))
    plan = result.scalars().first()
    if not plan:
        raise HTTPException(status_code=404, detail="No encontrado")

    new_name = body.get("name", f"{plan.name} (Copy)")
    collision = (await db.execute(
        select(Plan).where(func.lower(Plan.name) == new_name.lower(), Plan.status != "archived")
    )).scalars().first()
    if collision:
        return {"error": {"code": "PLAN_NAME_DUPLICATE", "message": f"El nombre '{new_name}' ya está en uso"}}

    now = datetime.utcnow()
    new_plan_id = f"plan-copy-{uuid.uuid4().hex[:8]}"

    effective_date_val = plan.effective_date
    if isinstance(effective_date_val, str):
        try:
            effective_date_val = datetime.fromisoformat(effective_date_val)  # ← agrega esto
        except ValueError:
            effective_date_val = datetime.utcnow() # ← agrega esto
    if body.get("effectiveDate"):
        try:
            effective_date_val = datetime.strptime(body["effectiveDate"][:10], "%Y-%m-%d")
        except ValueError:
            pass  




    duplicated = Plan(
        plan_id=new_plan_id,
        name=new_name,
        description=plan.description or "",
        tag_color=plan.tag_color or "slate",
        status="draft",
        setup_price=plan.setup_price or 0.0,
        monthly_price=plan.monthly_price or 0.0,
        currency=plan.currency or "USD",
        effective_date=effective_date_val,
        created_at=now,
        updated_at=now,
    )
    db.add(duplicated)
    await db.flush()

    # Copiar features del plan original
    original_features = await _get_plan_features(db, planId)
    await _save_plan_features(db, new_plan_id, original_features)

    await db.commit()
    await db.refresh(duplicated)

    return {"status": "success", "data": await _serialize_plan(db, duplicated)}


# ─── POST /api/plans/{planId}/archive ─────────────────────────────────────────
@router.post("/{planId}/archive", summary="Archivar un plan")
async def archive_plan(planId: str = Path(...), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Plan).where(Plan.plan_id == planId))
    plan = result.scalars().first()
    if not plan:
        raise HTTPException(status_code=404, detail="No encontrado")
    if plan.status == "archived":
        return {"error": {"code": "PLAN_ALREADY_ARCHIVED", "message": "El plan ya está archivado"}}

    now = datetime.utcnow()
    plan.status = "archived"
    plan.archived_at = now
    plan.updated_at = now
    db.add(plan)
    await db.commit()

    active_clinics = await _get_active_clinics_count(db, planId)
    return {
        "status": "success",
        "id": planId,
        "archivedAt": plan.archived_at.isoformat() + "Z",
        "affectedClinics": active_clinics,
    }


# ─── POST /api/plans/{planId}/restore ─────────────────────────────────────────
@router.post("/{planId}/restore", summary="Restaurar un plan archivado")
async def restore_plan(planId: str = Path(...), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Plan).where(Plan.plan_id == planId))
    plan = result.scalars().first()
    if not plan:
        raise HTTPException(status_code=404, detail="No encontrado")
    if plan.status != "archived":
        return {"error": {"code": "PLAN_NOT_ARCHIVED", "message": "El plan ya está activo"}}

    now = datetime.utcnow()
    plan.status = "active"
    plan.archived_at = None
    plan.updated_at = now
    db.add(plan)
    await db.commit()

    return {
        "status": "success",
        "id": planId,
        "restoredAt": now.isoformat() + "Z",
    }


# ─── DELETE /api/plans/{planId} ───────────────────────────────────────────────
@router.delete("/{planId}", summary="Eliminar un plan permanentemente")
async def delete_plan(planId: str = Path(...), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Plan).where(Plan.plan_id == planId))
    plan = result.scalars().first()
    if not plan:
        raise HTTPException(status_code=404, detail="No encontrado")

    # Bloquear si tiene clínicas activas
    active_clinics = await _get_active_clinics_count(db, planId)
    if active_clinics > 0:
        return {
            "error": {
                "code": "PLAN_HAS_ACTIVE_CLINICS",
                "message": f"No se puede eliminar: el plan tiene {active_clinics} clínica(s) activa(s). Archívalo primero."
            }
        }

    # Eliminar features primero (FK), luego el plan
    await db.execute(delete(PlanFeature).where(PlanFeature.plan_id == planId))
    await db.execute(delete(Plan).where(Plan.plan_id == planId))
    await db.commit()

    return {"status": "success", "id": planId, "deletedAt": datetime.utcnow().isoformat() + "Z"}