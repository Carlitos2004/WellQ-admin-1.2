import uuid
from datetime import datetime
from fastapi import APIRouter, Path, Body, Query, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, asc
from app.db.neon import get_db
from app.models_db import ClinicPlan, ScheduledChange, ClinicUsageMetric

router = APIRouter(prefix="/api/clinics", tags=["Asignación Plan–Clínica"])

# ─── GET /api/clinics/{clinicId}/plan ─────────────────────────────────────────
@router.get(
    "/{clinicId}/plan",
    summary="Obtener el plan actualmente vigente de una clínica",
)
async def get_clinic_plan(clinicId: str = Path(...), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ClinicPlan)
        .where(ClinicPlan.clinic_id == clinicId)
        .where(ClinicPlan.effective_to == None)
        .order_by(desc(ClinicPlan.created_at))
    )
    assignment = result.scalars().first()

    if not assignment:
        raise HTTPException(status_code=404, detail="No encontrado")

    return {
        "assignmentId": assignment.id,
        "clinicId": assignment.clinic_id,
        "planSnapshot": getattr(assignment, "plan_snapshot", {}),
        "effectiveFrom": assignment.effective_from.isoformat() + "Z" if getattr(assignment, "effective_from", None) else None,
        "effectiveTo": assignment.effective_to.isoformat() + "Z" if getattr(assignment, "effective_to", None) else None,
        "assignedBy": getattr(assignment, "assigned_by", {"id": "usr-001", "email": "admin@wellq.co", "name": "Admin WellQ"}),
        "createdAt": assignment.created_at.isoformat() + "Z" if getattr(assignment, "created_at", None) else None
    }


# ─── PUT /api/clinics/{clinicId}/plan ─────────────────────────────────────────
@router.put(
    "/{clinicId}/plan",
    summary="Asignar o cambiar el plan de una clínica (efecto inmediato)",
)
async def assign_clinic_plan(
    clinicId: str = Path(...),
    body: dict = Body(...),
    db: AsyncSession = Depends(get_db)
):
    plan_id = body.get("planId")
    if not plan_id:
        raise HTTPException(status_code=400, detail="El campo 'planId' es obligatorio")

    now = datetime.utcnow()

    # Cerrar el plan actual (si existe)
    current_plan_result = await db.execute(
        select(ClinicPlan)
        .where(ClinicPlan.clinic_id == clinicId)
        .where(ClinicPlan.effective_to == None)
    )
    current_plan = current_plan_result.scalars().first()
    if current_plan:
        current_plan.effective_to = now
        db.add(current_plan)

    # Crear nueva asignación
    new_assignment_id = f"asgn-{uuid.uuid4().hex[:8]}"
    effective_from_str = body.get("effectiveFrom")
    effective_from = datetime.fromisoformat(effective_from_str.replace("Z", "")) if effective_from_str else now

    new_plan = ClinicPlan(
        id=new_assignment_id,
        clinic_id=clinicId,
        plan_id=plan_id,
        effective_from=effective_from,
        effective_to=None,
        reason=body.get("reason", None),
        created_at=now
        # plan_snapshot y assigned_by deberían setearse según tu auth y tabla de planes
    )
    db.add(new_plan)
    await db.commit()

    return {
        "status": "success",
        "assignmentId": new_assignment_id,
        "clinicId": clinicId,
        "planId": plan_id,
        "effectiveFrom": new_plan.effective_from.isoformat() + "Z",
        "effectiveTo": None,
        "reason": new_plan.reason,
        "notifyClinic": body.get("notifyClinic", False),
        "assignedBy": {"id": "usr-001", "email": "admin@wellq.co", "name": "Admin WellQ"},
        "createdAt": new_plan.created_at.isoformat() + "Z",
    }


# ─── GET /api/clinics/{clinicId}/plan/history ─────────────────────────────────
@router.get(
    "/{clinicId}/plan/history",
    summary="Obtener historial completo de planes asignados a una clínica",
)
async def get_clinic_plan_history(
    clinicId: str = Path(...),
    from_date: str | None = Query(None, alias="from"),
    to_date: str | None = Query(None, alias="to"),
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    # Total de registros para la clínica
    count_result = await db.execute(select(func.count(ClinicPlan.id)).where(ClinicPlan.clinic_id == clinicId))
    total = count_result.scalar() or 0

    if total == 0:
        raise HTTPException(status_code=404, detail="No encontrado")

    start = (page - 1) * pageSize
    
    query = select(ClinicPlan).where(ClinicPlan.clinic_id == clinicId).order_by(desc(ClinicPlan.effective_from)).offset(start).limit(pageSize)
    result = await db.execute(query)
    history = result.scalars().all()

    return {
        "data": [
            {
                "id": h.id,
                "clinicId": h.clinic_id,
                "planId": getattr(h, "plan_id", None),
                "planSnapshot": getattr(h, "plan_snapshot", {}),
                "effectiveFrom": h.effective_from.isoformat() + "Z" if getattr(h, "effective_from", None) else None,
                "effectiveTo": h.effective_to.isoformat() + "Z" if getattr(h, "effective_to", None) else None,
                "assignedBy": getattr(h, "assigned_by", {"id": "usr-001", "email": "admin@wellq.co", "name": "Admin WellQ"}),
                "reason": getattr(h, "reason", ""),
                "createdAt": h.created_at.isoformat() + "Z" if getattr(h, "created_at", None) else None,
            }
            for h in history
        ],
        "pagination": {
            "total": total,
            "page": page,
            "pageSize": pageSize,
            "totalPages": max(1, -(-total // pageSize)),
        },
    }


# ─── POST /api/clinics/{clinicId}/plan/schedule ───────────────────────────────
@router.post(
    "/{clinicId}/plan/schedule",
    summary="Programar un cambio de plan a fecha futura",
    status_code=status.HTTP_201_CREATED,
)
async def schedule_clinic_plan(
    clinicId: str = Path(...),
    body: dict = Body(...),
    db: AsyncSession = Depends(get_db)
):
    plan_id = body.get("planId")
    effective_from_str = body.get("effectiveFrom")

    if not plan_id or not effective_from_str:
        raise HTTPException(status_code=400, detail="Los campos 'planId' y 'effectiveFrom' son obligatorios")

    now = datetime.utcnow()
    effective_from = datetime.fromisoformat(effective_from_str.replace("Z", ""))
    new_schedule_id = f"sched-{uuid.uuid4().hex[:8]}"

    new_schedule = ScheduledChange(
        id=new_schedule_id,
        clinic_id=clinicId,
        plan_id=plan_id,
        effective_from=effective_from,
        status="scheduled",
        notify_clinic=body.get("notifyClinic", False),
        created_at=now
    )
    db.add(new_schedule)
    await db.commit()

    return {
        "status": "success",
        "scheduleId": new_schedule.id,
        "clinicId": new_schedule.clinic_id,
        "planId": new_schedule.plan_id,
        "effectiveFrom": new_schedule.effective_from.isoformat() + "Z",
        "status_field": new_schedule.status,
        "scheduledBy": {"id": "usr-001", "email": "admin@wellq.co", "name": "Admin WellQ"},
        "notifyClinic": new_schedule.notify_clinic,
        "createdAt": new_schedule.created_at.isoformat() + "Z",
    }


# ─── GET /api/clinics/{clinicId}/plan/scheduled ───────────────────────────────
@router.get(
    "/{clinicId}/plan/scheduled",
    summary="Listar las programaciones de cambio pendientes de una clínica",
)
async def get_clinic_scheduled_changes(clinicId: str = Path(...), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ScheduledChange)
        .where(ScheduledChange.clinic_id == clinicId)
        .where(ScheduledChange.status == "scheduled")
        .order_by(asc(ScheduledChange.effective_from))
    )
    scheduled_changes = result.scalars().all()

    # Si quisieras levantar error al no tener resultados pero asegurando que la clínica exista, 
    # asumo que con devolver la lista vacía o llena es lo correcto según el estándar REST
    return {
        "data": [
            {
                "id": s.id,
                "clinicId": s.clinic_id,
                "planId": s.plan_id,
                "effectiveFrom": s.effective_from.isoformat() + "Z" if getattr(s, "effective_from", None) else None,
                "status": s.status,
                "scheduledBy": getattr(s, "scheduled_by", {"id": "usr-001", "email": "admin@wellq.co", "name": "Admin WellQ"}),
                "executedAt": s.executed_at.isoformat() + "Z" if getattr(s, "executed_at", None) else None,
                "notifyClinic": getattr(s, "notify_clinic", False),
            }
            for s in scheduled_changes
        ]
    }


# ─── DELETE /api/clinics/{clinicId}/plan/schedule/{scheduleId} ────────────────
@router.delete(
    "/{clinicId}/plan/schedule/{scheduleId}",
    summary="Cancelar una programación de cambio de plan",
)
async def cancel_scheduled_change(
    clinicId: str = Path(...),
    scheduleId: str = Path(...),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(ScheduledChange)
        .where(ScheduledChange.id == scheduleId)
        .where(ScheduledChange.clinic_id == clinicId)
    )
    schedule = result.scalars().first()

    if not schedule:
        raise HTTPException(status_code=404, detail="No encontrado")
        
    if schedule.status != "scheduled":
        raise HTTPException(status_code=400, detail="La programación no está en estado 'scheduled'")

    schedule.status = "cancelled"
    cancelled_at = datetime.utcnow()
    # Si existe una columna cancelled_at o updated_at, actívala:
    if hasattr(schedule, "updated_at"):
        schedule.updated_at = cancelled_at

    await db.commit()

    return {
        "status": "success",
        "scheduleId": schedule.id,
        "clinicId": schedule.clinic_id,
        "status_field": schedule.status,
        "cancelledAt": cancelled_at.isoformat() + "Z",
    }


# ─── GET /api/clinics/{clinicId}/plan/usage ───────────────────────────────────
@router.get(
    "/{clinicId}/plan/usage",
    summary="Consultar uso vs. límites del plan vigente de una clínica",
)
async def get_clinic_plan_usage(
    clinicId: str = Path(...),
    period: str = Query("current_month", description="current_month | last_month | current_year"),
    db: AsyncSession = Depends(get_db)
):
    # Obtenemos el uso actual de la clínica
    result = await db.execute(select(ClinicUsageMetric).where(ClinicUsageMetric.clinic_id == clinicId))
    usage = result.scalars().first()

    if not usage:
        raise HTTPException(status_code=404, detail="No encontrado")

    # Mapeo a formato del Frontend (presuponiendo que usage tiene un array o JSON dict features y attributes)
    return {
        "planSnapshotId": getattr(usage, "plan_snapshot_id", f"asgn-current-{clinicId}"),
        "period": period,
        "features": getattr(usage, "features", []),
        "overageCount": getattr(usage, "overage_count", 0)
    }