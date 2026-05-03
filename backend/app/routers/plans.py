from fastapi import APIRouter, Path, Body, Query, status
from datetime import datetime, timezone

router = APIRouter(prefix="/api/plans", tags=["Constructor de Planes"])

# ─── Datos en duro ────────────────────────────────────────────────────────────
PLANS_DB = [
    {
        "id": "plan-trial",
        "name": "Trial",
        "description": "14-day free evaluation tier",
        "tagColor": "purple",
        "status": "active",
        "setupPrice": 0.00,
        "monthlyPrice": 0.00,
        "currency": "USD",
        "effectiveDate": "2026-01-01",
        "features": [
            {"featureId": "feat-patients",   "limit": 50,      "featureName": "Active Patients",      "category": "Patients & Licenses",    "unit": "patients"},
            {"featureId": "feat-clinicians", "limit": 2,       "featureName": "Clinician Seats",       "category": "Patients & Licenses",    "unit": "seats"},
            {"featureId": "feat-pose",       "limit": 100,     "featureName": "Pose Analysis",         "category": "AI Capabilities",        "unit": "sessions/mo"},
            {"featureId": "feat-storage",    "limit": 5,       "featureName": "Cloud Storage",         "category": "Storage & Data",         "unit": "GB"},
            {"featureId": "feat-support",    "limit": "Email", "featureName": "Support Tier",          "category": "Support & Integrations", "unit": "level"},
        ],
        "metrics": {"activeClinics": 8, "arr": 0.00},
        "createdAt": "2026-01-01T00:00:00Z",
        "updatedAt": "2026-01-01T00:00:00Z",
        "archivedAt": None,
        "createdBy": {"id": "usr-001", "email": "admin@wellq.co", "name": "Admin WellQ"},
        "updatedBy": {"id": "usr-001", "email": "admin@wellq.co", "name": "Admin WellQ"},
    },
    {
        "id": "plan-smb",
        "name": "SMB",
        "description": "Small & medium clinics",
        "tagColor": "blue",
        "status": "active",
        "setupPrice": 500.00,
        "monthlyPrice": 299.00,
        "currency": "USD",
        "effectiveDate": "2026-01-01",
        "features": [
            {"featureId": "feat-patients",   "limit": 500,                "featureName": "Active Patients",      "category": "Patients & Licenses",    "unit": "patients"},
            {"featureId": "feat-clinicians", "limit": 5,                  "featureName": "Clinician Seats",       "category": "Patients & Licenses",    "unit": "seats"},
            {"featureId": "feat-tablets",    "limit": 3,                  "featureName": "Tablet Devices",        "category": "Patients & Licenses",    "unit": "devices"},
            {"featureId": "feat-pose",       "limit": 1000,               "featureName": "Pose Analysis",         "category": "AI Capabilities",        "unit": "sessions/mo"},
            {"featureId": "feat-soap",       "limit": 500,                "featureName": "SOAP Note Generation",  "category": "AI Capabilities",        "unit": "notes/mo"},
            {"featureId": "feat-storage",    "limit": 100,                "featureName": "Cloud Storage",         "category": "Storage & Data",         "unit": "GB"},
            {"featureId": "feat-retention",  "limit": 24,                 "featureName": "Data Retention",        "category": "Storage & Data",         "unit": "months"},
            {"featureId": "feat-support",    "limit": "Business Hours",   "featureName": "Support Tier",          "category": "Support & Integrations", "unit": "level"},
            {"featureId": "feat-api",        "limit": 60,                 "featureName": "API Rate Limit",        "category": "Support & Integrations", "unit": "req/min"},
        ],
        "metrics": {"activeClinics": 74, "arr": 264_924.00},
        "createdAt": "2026-01-01T00:00:00Z",
        "updatedAt": "2026-03-15T10:00:00Z",
        "archivedAt": None,
        "createdBy": {"id": "usr-001", "email": "admin@wellq.co", "name": "Admin WellQ"},
        "updatedBy": {"id": "usr-001", "email": "admin@wellq.co", "name": "Admin WellQ"},
    },
    {
        "id": "plan-enterprise",
        "name": "Enterprise",
        "description": "Multi-location and hospital networks",
        "tagColor": "indigo",
        "status": "active",
        "setupPrice": 5000.00,
        "monthlyPrice": 1999.00,
        "currency": "USD",
        "effectiveDate": "2026-01-01",
        "features": [
            {"featureId": "feat-patients",   "limit": 5000,               "featureName": "Active Patients",      "category": "Patients & Licenses",    "unit": "patients"},
            {"featureId": "feat-clinicians", "limit": 50,                 "featureName": "Clinician Seats",       "category": "Patients & Licenses",    "unit": "seats"},
            {"featureId": "feat-tablets",    "limit": 30,                 "featureName": "Tablet Devices",        "category": "Patients & Licenses",    "unit": "devices"},
            {"featureId": "feat-locations",  "limit": 10,                 "featureName": "Clinic Locations",      "category": "Patients & Licenses",    "unit": "locations"},
            {"featureId": "feat-pose",       "limit": 20000,              "featureName": "Pose Analysis",         "category": "AI Capabilities",        "unit": "sessions/mo"},
            {"featureId": "feat-soap",       "limit": 10000,              "featureName": "SOAP Note Generation",  "category": "AI Capabilities",        "unit": "notes/mo"},
            {"featureId": "feat-churn",      "limit": 1,                  "featureName": "Churn Prediction",      "category": "AI Capabilities",        "unit": "enabled"},
            {"featureId": "feat-video",      "limit": 12000,              "featureName": "Video Processing",      "category": "AI Capabilities",        "unit": "minutes/mo"},
            {"featureId": "feat-storage",    "limit": 2000,               "featureName": "Cloud Storage",         "category": "Storage & Data",         "unit": "GB"},
            {"featureId": "feat-retention",  "limit": 84,                 "featureName": "Data Retention",        "category": "Storage & Data",         "unit": "months"},
            {"featureId": "feat-exports",    "limit": 200,                "featureName": "Data Exports",          "category": "Storage & Data",         "unit": "exports/mo"},
            {"featureId": "feat-backup",     "limit": 1,                  "featureName": "Daily Backups",         "category": "Storage & Data",         "unit": "enabled"},
            {"featureId": "feat-support",    "limit": "24/7 Priority",    "featureName": "Support Tier",          "category": "Support & Integrations", "unit": "level"},
            {"featureId": "feat-ehr",        "limit": 5,                  "featureName": "EHR Integration",       "category": "Support & Integrations", "unit": "integrations"},
            {"featureId": "feat-api",        "limit": 600,                "featureName": "API Rate Limit",        "category": "Support & Integrations", "unit": "req/min"},
            {"featureId": "feat-webhooks",   "limit": 1,                  "featureName": "Webhooks",              "category": "Support & Integrations", "unit": "enabled"},
        ],
        "metrics": {"activeClinics": 42, "arr": 1_007_496.00},
        "createdAt": "2026-01-01T00:00:00Z",
        "updatedAt": "2026-04-01T09:00:00Z",
        "archivedAt": None,
        "createdBy": {"id": "usr-001", "email": "admin@wellq.co", "name": "Admin WellQ"},
        "updatedBy": {"id": "usr-001", "email": "admin@wellq.co", "name": "Admin WellQ"},
    },
]


def _paginate(items: list, page: int, page_size: int) -> dict:
    total = len(items)
    start = (page - 1) * page_size
    return {
        "data": items[start: start + page_size],
        "pagination": {
            "total": total,
            "page": page,
            "pageSize": page_size,
            "totalPages": max(1, -(-total // page_size)),
        },
    }


# ─── GET /api/plans ───────────────────────────────────────────────────────────
@router.get(
    "",
    summary="Listar planes con filtros y paginación",
)
async def list_plans(
    search: str | None = Query(None),
    status: str | None = Query(None, description="draft | active | archived (multi-valor separado por coma)"),
    currency: str | None = Query(None),
    includeArchived: bool = Query(False),
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    sortBy: str = Query("name", description="name | monthlyPrice | effectiveDate | createdAt"),
    sortOrder: str = Query("asc"),
):
    results = list(PLANS_DB)

    if not includeArchived:
        results = [p for p in results if p["status"] != "archived"]
    if status:
        allowed = [s.strip() for s in status.split(",")]
        results = [p for p in results if p["status"] in allowed]
    if search:
        term = search.lower()
        results = [p for p in results if term in p["name"].lower() or term in p["description"].lower()]
    if currency:
        results = [p for p in results if p["currency"] == currency]

    reverse = sortOrder == "desc"
    results.sort(key=lambda p: p.get(sortBy, p["name"]) or "", reverse=reverse)

    return _paginate(results, page, pageSize)


# ─── GET /api/plans/{planId} ──────────────────────────────────────────────────
@router.get(
    "/{planId}",
    summary="Obtener detalle completo de un plan",
)
async def get_plan(planId: str = Path(...)):
    plan = next((p for p in PLANS_DB if p["id"] == planId), None)
    if not plan:
        return {"error": {"code": "PLAN_NOT_FOUND", "message": f"No se encontró el plan '{planId}'"}}
    return plan


# ─── POST /api/plans ──────────────────────────────────────────────────────────
@router.post(
    "",
    summary="Crear un nuevo plan en estado draft",
    status_code=status.HTTP_201_CREATED,
)
async def create_plan(body: dict = Body(...)):
    name = body.get("name", "")
    if not name or len(name) < 3:
        return {"error": {"code": "VALIDATION_ERROR", "message": "El campo 'name' debe tener entre 3 y 60 caracteres"}}

    duplicate = next((p for p in PLANS_DB if p["name"].lower() == name.lower() and p["status"] != "archived"), None)
    if duplicate:
        return {"error": {"code": "PLAN_NAME_DUPLICATE", "message": f"Ya existe un plan no archivado con el nombre '{name}'"}}

    if not body.get("features"):
        return {"error": {"code": "VALIDATION_ERROR", "message": "El plan debe incluir al menos un feature"}}

    now = datetime.now(timezone.utc).isoformat()
    new_plan = {
        "id": f"plan-{name.lower().replace(' ', '-')}-{len(PLANS_DB) + 1}",
        "name": name,
        "description": body.get("description", ""),
        "tagColor": body.get("tagColor", "slate"),
        "status": "draft",
        "setupPrice": body.get("setupPrice", 0.00),
        "monthlyPrice": body.get("monthlyPrice", 0.00),
        "currency": body.get("currency", "USD"),
        "effectiveDate": body.get("effectiveDate", now[:10]),
        "features": body.get("features", []),
        "metrics": {"activeClinics": 0, "arr": 0.00},
        "createdAt": now,
        "updatedAt": now,
        "archivedAt": None,
        "createdBy": {"id": "usr-001", "email": "admin@wellq.co", "name": "Admin WellQ"},
        "updatedBy": {"id": "usr-001", "email": "admin@wellq.co", "name": "Admin WellQ"},
    }
    return {"status": "success", "data": new_plan}


# ─── PUT /api/plans/{planId} ──────────────────────────────────────────────────
@router.put(
    "/{planId}",
    summary="Actualizar un plan existente",
)
async def update_plan(
    planId: str = Path(...),
    body: dict = Body(...),
):
    plan = next((p for p in PLANS_DB if p["id"] == planId), None)
    if not plan:
        return {"error": {"code": "PLAN_NOT_FOUND", "message": f"No se encontró el plan '{planId}'"}}
    if plan["status"] == "archived":
        return {"error": {"code": "PLAN_ARCHIVED", "message": "No se puede editar un plan archivado. Use restore primero."}}

    if "name" in body:
        collision = next(
            (p for p in PLANS_DB if p["name"].lower() == body["name"].lower() and p["id"] != planId and p["status"] != "archived"),
            None,
        )
        if collision:
            return {"error": {"code": "PLAN_NAME_DUPLICATE", "message": f"El nombre '{body['name']}' ya está en uso"}}

    if "currency" in body and body["currency"] != plan["currency"] and plan["metrics"]["activeClinics"] > 0:
        return {"error": {"code": "PLAN_CURRENCY_LOCKED", "message": "El plan tiene asignaciones activas y la moneda es inmutable"}}

    updated = {**plan, **{k: v for k, v in body.items() if k not in ("id", "createdAt", "createdBy", "metrics")}}
    updated["updatedAt"] = datetime.now(timezone.utc).isoformat()

    return {"status": "success", "data": updated}


# ─── POST /api/plans/{planId}/duplicate ───────────────────────────────────────
@router.post(
    "/{planId}/duplicate",
    summary="Duplicar un plan existente",
    status_code=status.HTTP_201_CREATED,
)
async def duplicate_plan(
    planId: str = Path(...),
    body: dict = Body(default={}),
):
    plan = next((p for p in PLANS_DB if p["id"] == planId), None)
    if not plan:
        return {"error": {"code": "PLAN_NOT_FOUND", "message": f"No se encontró el plan '{planId}'"}}

    now = datetime.now(timezone.utc).isoformat()
    new_name = body.get("name", f"{plan['name']} (Copy)")

    collision = next((p for p in PLANS_DB if p["name"].lower() == new_name.lower() and p["status"] != "archived"), None)
    if collision:
        return {"error": {"code": "PLAN_NAME_DUPLICATE", "message": f"El nombre '{new_name}' ya está en uso"}}

    duplicated = {
        **plan,
        "id": f"plan-copy-{len(PLANS_DB) + 1}",
        "name": new_name,
        "status": "draft",
        "effectiveDate": body.get("effectiveDate", plan["effectiveDate"]),
        "metrics": {"activeClinics": 0, "arr": 0.00},
        "createdAt": now,
        "updatedAt": now,
        "archivedAt": None,
    }
    return {"status": "success", "data": duplicated}


# ─── POST /api/plans/{planId}/archive ─────────────────────────────────────────
@router.post(
    "/{planId}/archive",
    summary="Archivar un plan (soft-delete)",
)
async def archive_plan(planId: str = Path(...)):
    plan = next((p for p in PLANS_DB if p["id"] == planId), None)
    if not plan:
        return {"error": {"code": "PLAN_NOT_FOUND", "message": f"No se encontró el plan '{planId}'"}}
    if plan["status"] == "archived":
        return {"error": {"code": "PLAN_ALREADY_ARCHIVED", "message": "El plan ya está archivado"}}

    now = datetime.now(timezone.utc).isoformat()
    return {
        "status": "success",
        "id": planId,
        "status_field": "archived",
        "archivedAt": now,
        "affectedClinics": plan["metrics"]["activeClinics"],
    }


# ─── POST /api/plans/{planId}/restore ─────────────────────────────────────────
@router.post(
    "/{planId}/restore",
    summary="Restaurar un plan archivado",
)
async def restore_plan(planId: str = Path(...)):
    plan = next((p for p in PLANS_DB if p["id"] == planId), None)
    if not plan:
        return {"error": {"code": "PLAN_NOT_FOUND", "message": f"No se encontró el plan '{planId}'"}}
    if plan["status"] != "archived":
        return {"error": {"code": "PLAN_NOT_ARCHIVED", "message": "El plan ya está activo"}}

    return {
        "status": "success",
        "id": planId,
        "status_field": "active",
        "archivedAt": None,
        "restoredAt": datetime.now(timezone.utc).isoformat(),
    }
