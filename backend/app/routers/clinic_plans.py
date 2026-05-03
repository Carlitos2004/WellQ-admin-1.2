from fastapi import APIRouter, Path, Body, Query, status
from datetime import datetime, timezone

router = APIRouter(prefix="/api/clinics", tags=["Asignación Plan–Clínica"])

# ─── Datos en duro ────────────────────────────────────────────────────────────
CLINIC_ASSIGNMENTS = {
    "CL-001": {
        "assignmentId": "asgn-001",
        "clinicId": "CL-001",
        "planSnapshot": {
            "id": "plan-enterprise",
            "name": "Enterprise",
            "description": "Multi-location and hospital networks",
            "monthlyPrice": 1999.00,
            "currency": "USD",
            "features": [
                {"featureId": "feat-patients",   "limit": 5000,            "featureName": "Active Patients",     "unit": "patients"},
                {"featureId": "feat-clinicians", "limit": 50,              "featureName": "Clinician Seats",      "unit": "seats"},
                {"featureId": "feat-pose",       "limit": 20000,           "featureName": "Pose Analysis",        "unit": "sessions/mo"},
                {"featureId": "feat-soap",       "limit": 10000,           "featureName": "SOAP Note Generation", "unit": "notes/mo"},
                {"featureId": "feat-storage",    "limit": 2000,            "featureName": "Cloud Storage",        "unit": "GB"},
                {"featureId": "feat-support",    "limit": "24/7 Priority", "featureName": "Support Tier",         "unit": "level"},
            ],
        },
        "effectiveFrom": "2026-01-15T00:00:00Z",
        "effectiveTo": None,
        "assignedBy": {"id": "usr-001", "email": "admin@wellq.co", "name": "Admin WellQ"},
        "createdAt": "2026-01-15T00:00:00Z",
    },
    "CL-002": {
        "assignmentId": "asgn-002",
        "clinicId": "CL-002",
        "planSnapshot": {
            "id": "plan-smb",
            "name": "SMB",
            "description": "Small & medium clinics",
            "monthlyPrice": 299.00,
            "currency": "USD",
            "features": [
                {"featureId": "feat-patients",   "limit": 500,               "featureName": "Active Patients",     "unit": "patients"},
                {"featureId": "feat-clinicians", "limit": 5,                 "featureName": "Clinician Seats",      "unit": "seats"},
                {"featureId": "feat-pose",       "limit": 1000,              "featureName": "Pose Analysis",        "unit": "sessions/mo"},
                {"featureId": "feat-storage",    "limit": 100,               "featureName": "Cloud Storage",        "unit": "GB"},
                {"featureId": "feat-support",    "limit": "Business Hours",  "featureName": "Support Tier",         "unit": "level"},
            ],
        },
        "effectiveFrom": "2026-02-01T00:00:00Z",
        "effectiveTo": None,
        "assignedBy": {"id": "usr-001", "email": "admin@wellq.co", "name": "Admin WellQ"},
        "createdAt": "2026-02-01T00:00:00Z",
    },
}

CLINIC_HISTORY = {
    "CL-001": [
        {
            "id": "asgn-001",
            "clinicId": "CL-001",
            "planId": "plan-enterprise",
            "planSnapshot": {"id": "plan-enterprise", "name": "Enterprise", "monthlyPrice": 1999.00, "currency": "USD"},
            "effectiveFrom": "2026-01-15T00:00:00Z",
            "effectiveTo": None,
            "assignedBy": {"id": "usr-001", "email": "admin@wellq.co", "name": "Admin WellQ"},
            "reason": "Upgrade inicial al plan Enterprise",
            "createdAt": "2026-01-15T00:00:00Z",
        },
        {
            "id": "asgn-000",
            "clinicId": "CL-001",
            "planId": "plan-smb",
            "planSnapshot": {"id": "plan-smb", "name": "SMB", "monthlyPrice": 299.00, "currency": "USD"},
            "effectiveFrom": "2025-05-01T00:00:00Z",
            "effectiveTo": "2026-01-14T23:59:59Z",
            "assignedBy": {"id": "usr-001", "email": "admin@wellq.co", "name": "Admin WellQ"},
            "reason": "Onboarding inicial",
            "createdAt": "2025-05-01T00:00:00Z",
        },
    ],
    "CL-002": [
        {
            "id": "asgn-002",
            "clinicId": "CL-002",
            "planId": "plan-smb",
            "planSnapshot": {"id": "plan-smb", "name": "SMB", "monthlyPrice": 299.00, "currency": "USD"},
            "effectiveFrom": "2026-02-01T00:00:00Z",
            "effectiveTo": None,
            "assignedBy": {"id": "usr-001", "email": "admin@wellq.co", "name": "Admin WellQ"},
            "reason": "Onboarding",
            "createdAt": "2026-02-01T00:00:00Z",
        },
    ],
}

SCHEDULED_CHANGES = {
    "CL-001": [
        {
            "id": "sched-001",
            "clinicId": "CL-001",
            "planId": "plan-enterprise",
            "effectiveFrom": "2026-07-01T00:00:00Z",
            "status": "scheduled",
            "scheduledBy": {"id": "usr-001", "email": "admin@wellq.co", "name": "Admin WellQ"},
            "executedAt": None,
            "notifyClinic": True,
        }
    ],
    "CL-002": [],
}

CLINIC_USAGE = {
    "CL-001": {
        "planSnapshotId": "asgn-001",
        "period": "current_month",
        "features": [
            {"featureId": "feat-patients",   "name": "Active Patients",     "unit": "patients",    "limit": 5000,  "used": 4250, "percentage": 85.0, "status": "warning"},
            {"featureId": "feat-clinicians", "name": "Clinician Seats",      "unit": "seats",       "limit": 50,    "used": 45,   "percentage": 90.0, "status": "critical"},
            {"featureId": "feat-pose",       "name": "Pose Analysis",        "unit": "sessions/mo", "limit": 20000, "used": 8400, "percentage": 42.0, "status": "ok"},
            {"featureId": "feat-soap",       "name": "SOAP Note Generation", "unit": "notes/mo",    "limit": 10000, "used": 3200, "percentage": 32.0, "status": "ok"},
            {"featureId": "feat-storage",    "name": "Cloud Storage",        "unit": "GB",          "limit": 2000,  "used": 1650, "percentage": 82.5, "status": "warning"},
            {"featureId": "feat-support",    "name": "Support Tier",         "unit": "level",       "limit": "24/7 Priority", "used": 0, "percentage": None, "status": "ok"},
        ],
        "overageCount": 0,
    },
    "CL-002": {
        "planSnapshotId": "asgn-002",
        "period": "current_month",
        "features": [
            {"featureId": "feat-patients",   "name": "Active Patients",     "unit": "patients",    "limit": 500,  "used": 340,  "percentage": 68.0, "status": "ok"},
            {"featureId": "feat-clinicians", "name": "Clinician Seats",      "unit": "seats",       "limit": 5,    "used": 4,    "percentage": 80.0, "status": "warning"},
            {"featureId": "feat-pose",       "name": "Pose Analysis",        "unit": "sessions/mo", "limit": 1000, "used": 520,  "percentage": 52.0, "status": "ok"},
            {"featureId": "feat-storage",    "name": "Cloud Storage",        "unit": "GB",          "limit": 100,  "used": 38,   "percentage": 38.0, "status": "ok"},
            {"featureId": "feat-support",    "name": "Support Tier",         "unit": "level",       "limit": "Business Hours", "used": 0, "percentage": None, "status": "ok"},
        ],
        "overageCount": 0,
    },
}


# ─── GET /api/clinics/{clinicId}/plan ─────────────────────────────────────────
@router.get(
    "/{clinicId}/plan",
    summary="Obtener el plan actualmente vigente de una clínica",
)
async def get_clinic_plan(clinicId: str = Path(...)):
    assignment = CLINIC_ASSIGNMENTS.get(clinicId)
    if not assignment:
        if clinicId not in ["CL-001", "CL-002"]:
            return {"error": {"code": "CLINIC_NOT_FOUND", "message": f"No se encontró la clínica '{clinicId}'"}}
        return {"error": {"code": "CLINIC_HAS_NO_PLAN", "message": "La clínica nunca ha tenido un plan asignado"}}
    return assignment


# ─── PUT /api/clinics/{clinicId}/plan ─────────────────────────────────────────
@router.put(
    "/{clinicId}/plan",
    summary="Asignar o cambiar el plan de una clínica (efecto inmediato)",
)
async def assign_clinic_plan(
    clinicId: str = Path(...),
    body: dict = Body(...),
):
    plan_id = body.get("planId")
    if not plan_id:
        return {"error": {"code": "VALIDATION_ERROR", "message": "El campo 'planId' es obligatorio"}}

    now = datetime.now(timezone.utc).isoformat()
    return {
        "status": "success",
        "assignmentId": f"asgn-new-{clinicId}",
        "clinicId": clinicId,
        "planId": plan_id,
        "effectiveFrom": body.get("effectiveFrom", now),
        "effectiveTo": None,
        "reason": body.get("reason", None),
        "notifyClinic": body.get("notifyClinic", False),
        "assignedBy": {"id": "usr-001", "email": "admin@wellq.co", "name": "Admin WellQ"},
        "createdAt": now,
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
):
    history = CLINIC_HISTORY.get(clinicId, [])
    if not history and clinicId not in ["CL-001", "CL-002"]:
        return {"error": {"code": "CLINIC_NOT_FOUND", "message": f"No se encontró la clínica '{clinicId}'"}}

    total = len(history)
    start = (page - 1) * pageSize
    return {
        "data": history[start: start + pageSize],
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
):
    plan_id = body.get("planId")
    effective_from = body.get("effectiveFrom")

    if not plan_id or not effective_from:
        return {"error": {"code": "VALIDATION_ERROR", "message": "Los campos 'planId' y 'effectiveFrom' son obligatorios"}}

    now = datetime.now(timezone.utc).isoformat()
    return {
        "status": "success",
        "scheduleId": f"sched-new-{clinicId}",
        "clinicId": clinicId,
        "planId": plan_id,
        "effectiveFrom": effective_from,
        "status_field": "scheduled",
        "scheduledBy": {"id": "usr-001", "email": "admin@wellq.co", "name": "Admin WellQ"},
        "notifyClinic": body.get("notifyClinic", False),
        "createdAt": now,
    }


# ─── GET /api/clinics/{clinicId}/plan/scheduled ───────────────────────────────
@router.get(
    "/{clinicId}/plan/scheduled",
    summary="Listar las programaciones de cambio pendientes de una clínica",
)
async def get_clinic_scheduled_changes(clinicId: str = Path(...)):
    if clinicId not in SCHEDULED_CHANGES and clinicId not in ["CL-001", "CL-002"]:
        return {"error": {"code": "CLINIC_NOT_FOUND", "message": f"No se encontró la clínica '{clinicId}'"}}

    return {
        "data": SCHEDULED_CHANGES.get(clinicId, [])
    }


# ─── DELETE /api/clinics/{clinicId}/plan/schedule/{scheduleId} ────────────────
@router.delete(
    "/{clinicId}/plan/schedule/{scheduleId}",
    summary="Cancelar una programación de cambio de plan",
)
async def cancel_scheduled_change(
    clinicId: str = Path(...),
    scheduleId: str = Path(...),
):
    clinic_schedules = SCHEDULED_CHANGES.get(clinicId, [])
    schedule = next((s for s in clinic_schedules if s["id"] == scheduleId), None)

    if not schedule:
        return {"error": {"code": "SCHEDULE_NOT_FOUND", "message": f"No existe la programación '{scheduleId}' o ya fue ejecutada/cancelada"}}
    if schedule["status"] != "scheduled":
        return {"error": {"code": "SCHEDULE_NOT_PENDING", "message": "La programación no está en estado 'scheduled'"}}

    return {
        "status": "success",
        "scheduleId": scheduleId,
        "clinicId": clinicId,
        "status_field": "cancelled",
        "cancelledAt": datetime.now(timezone.utc).isoformat(),
    }


# ─── GET /api/clinics/{clinicId}/plan/usage ───────────────────────────────────
@router.get(
    "/{clinicId}/plan/usage",
    summary="Consultar uso vs. límites del plan vigente de una clínica",
)
async def get_clinic_plan_usage(
    clinicId: str = Path(...),
    period: str = Query("current_month", description="current_month | last_month | current_year"),
):
    usage = CLINIC_USAGE.get(clinicId)
    if not usage:
        if clinicId not in ["CL-001", "CL-002"]:
            return {"error": {"code": "CLINIC_NOT_FOUND", "message": f"No se encontró la clínica '{clinicId}'"}}
        return {"error": {"code": "CLINIC_HAS_NO_PLAN", "message": "La clínica no tiene plan asignado"}}

    return {**usage, "period": period}
