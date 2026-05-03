from fastapi import APIRouter, Path, Body, Query, status
from datetime import datetime, timezone

router = APIRouter(prefix="/api/features", tags=["Catálogo de Funcionalidades (Features)"])

# ─── Datos en duro ────────────────────────────────────────────────────────────
FEATURES_DB = [
    {
        "id": "feat-patients",
        "name": "Active Patients",
        "category": "Patients & Licenses",
        "unit": "patients",
        "unitType": "number",
        "options": None,
        "defaultLimit": 500,
        "description": "Maximum number of concurrent active patients",
        "icon": "users",
        "status": "active",
        "createdAt": "2026-01-01T00:00:00Z",
        "updatedAt": "2026-01-01T00:00:00Z",
        "archivedAt": None,
    },
    {
        "id": "feat-clinicians",
        "name": "Clinician Seats",
        "category": "Patients & Licenses",
        "unit": "seats",
        "unitType": "number",
        "options": None,
        "defaultLimit": 5,
        "description": "Number of clinician licenses included",
        "icon": "users",
        "status": "active",
        "createdAt": "2026-01-01T00:00:00Z",
        "updatedAt": "2026-01-01T00:00:00Z",
        "archivedAt": None,
    },
    {
        "id": "feat-tablets",
        "name": "Tablet Devices",
        "category": "Patients & Licenses",
        "unit": "devices",
        "unitType": "number",
        "options": None,
        "defaultLimit": 3,
        "description": "Connected clinician tablet devices",
        "icon": "smartphone",
        "status": "active",
        "createdAt": "2026-01-01T00:00:00Z",
        "updatedAt": "2026-01-01T00:00:00Z",
        "archivedAt": None,
    },
    {
        "id": "feat-locations",
        "name": "Clinic Locations",
        "category": "Patients & Licenses",
        "unit": "locations",
        "unitType": "number",
        "options": None,
        "defaultLimit": 1,
        "description": "Number of physical locations under one account",
        "icon": "building2",
        "status": "active",
        "createdAt": "2026-01-01T00:00:00Z",
        "updatedAt": "2026-01-01T00:00:00Z",
        "archivedAt": None,
    },
    {
        "id": "feat-pose",
        "name": "Pose Analysis",
        "category": "AI Capabilities",
        "unit": "sessions/mo",
        "unitType": "number",
        "options": None,
        "defaultLimit": 1000,
        "description": "AI-powered movement & pose analysis sessions",
        "icon": "activity",
        "status": "active",
        "createdAt": "2026-01-01T00:00:00Z",
        "updatedAt": "2026-01-01T00:00:00Z",
        "archivedAt": None,
    },
    {
        "id": "feat-soap",
        "name": "SOAP Note Generation",
        "category": "AI Capabilities",
        "unit": "notes/mo",
        "unitType": "number",
        "options": None,
        "defaultLimit": 500,
        "description": "Auto-generated clinical SOAP notes",
        "icon": "fileText",
        "status": "active",
        "createdAt": "2026-01-01T00:00:00Z",
        "updatedAt": "2026-01-01T00:00:00Z",
        "archivedAt": None,
    },
    {
        "id": "feat-churn",
        "name": "Churn Prediction",
        "category": "AI Capabilities",
        "unit": "enabled",
        "unitType": "toggle",
        "options": None,
        "defaultLimit": 1,
        "description": "AI-driven patient/clinic churn risk insights",
        "icon": "trendingUp",
        "status": "active",
        "createdAt": "2026-01-01T00:00:00Z",
        "updatedAt": "2026-01-01T00:00:00Z",
        "archivedAt": None,
    },
    {
        "id": "feat-video",
        "name": "Video Processing",
        "category": "AI Capabilities",
        "unit": "minutes/mo",
        "unitType": "number",
        "options": None,
        "defaultLimit": 600,
        "description": "Cloud video session processing minutes",
        "icon": "zap",
        "status": "active",
        "createdAt": "2026-01-01T00:00:00Z",
        "updatedAt": "2026-01-01T00:00:00Z",
        "archivedAt": None,
    },
    {
        "id": "feat-storage",
        "name": "Cloud Storage",
        "category": "Storage & Data",
        "unit": "GB",
        "unitType": "number",
        "options": None,
        "defaultLimit": 100,
        "description": "Patient records and media storage",
        "icon": "hardDrive",
        "status": "active",
        "createdAt": "2026-01-01T00:00:00Z",
        "updatedAt": "2026-01-01T00:00:00Z",
        "archivedAt": None,
    },
    {
        "id": "feat-retention",
        "name": "Data Retention",
        "category": "Storage & Data",
        "unit": "months",
        "unitType": "number",
        "options": None,
        "defaultLimit": 24,
        "description": "How long historical records are kept",
        "icon": "calendar",
        "status": "active",
        "createdAt": "2026-01-01T00:00:00Z",
        "updatedAt": "2026-01-01T00:00:00Z",
        "archivedAt": None,
    },
    {
        "id": "feat-exports",
        "name": "Data Exports",
        "category": "Storage & Data",
        "unit": "exports/mo",
        "unitType": "number",
        "options": None,
        "defaultLimit": 10,
        "description": "Bulk data export operations per month",
        "icon": "download",
        "status": "active",
        "createdAt": "2026-01-01T00:00:00Z",
        "updatedAt": "2026-01-01T00:00:00Z",
        "archivedAt": None,
    },
    {
        "id": "feat-backup",
        "name": "Daily Backups",
        "category": "Storage & Data",
        "unit": "enabled",
        "unitType": "toggle",
        "options": None,
        "defaultLimit": 1,
        "description": "Automated encrypted daily backups",
        "icon": "database",
        "status": "active",
        "createdAt": "2026-01-01T00:00:00Z",
        "updatedAt": "2026-01-01T00:00:00Z",
        "archivedAt": None,
    },
    {
        "id": "feat-support",
        "name": "Support Tier",
        "category": "Support & Integrations",
        "unit": "level",
        "unitType": "select",
        "options": ["Email", "Business Hours", "24/7 Priority"],
        "defaultLimit": "Email",
        "description": "Customer support response level",
        "icon": "headphones",
        "status": "active",
        "createdAt": "2026-01-01T00:00:00Z",
        "updatedAt": "2026-01-01T00:00:00Z",
        "archivedAt": None,
    },
    {
        "id": "feat-ehr",
        "name": "EHR Integration",
        "category": "Support & Integrations",
        "unit": "integrations",
        "unitType": "number",
        "options": None,
        "defaultLimit": 1,
        "description": "Connections to external EHR systems",
        "icon": "globe",
        "status": "active",
        "createdAt": "2026-01-01T00:00:00Z",
        "updatedAt": "2026-01-01T00:00:00Z",
        "archivedAt": None,
    },
    {
        "id": "feat-api",
        "name": "API Rate Limit",
        "category": "Support & Integrations",
        "unit": "req/min",
        "unitType": "number",
        "options": None,
        "defaultLimit": 60,
        "description": "Public API requests per minute",
        "icon": "zap",
        "status": "active",
        "createdAt": "2026-01-01T00:00:00Z",
        "updatedAt": "2026-01-01T00:00:00Z",
        "archivedAt": None,
    },
    {
        "id": "feat-webhooks",
        "name": "Webhooks",
        "category": "Support & Integrations",
        "unit": "enabled",
        "unitType": "toggle",
        "options": None,
        "defaultLimit": 0,
        "description": "Real-time event webhooks",
        "icon": "globe",
        "status": "active",
        "createdAt": "2026-01-01T00:00:00Z",
        "updatedAt": "2026-01-01T00:00:00Z",
        "archivedAt": None,
    },
]


# ─── GET /api/features ────────────────────────────────────────────────────────
@router.get(
    "",
    summary="Listar features con filtros y paginación",
    description="Devuelve la lista paginada de features del catálogo. Por defecto excluye los archivados.",
)
async def list_features(
    search: str | None = Query(None, description="Búsqueda libre por nombre o descripción"),
    category: str | None = Query(None, description="Filtra por categoría exacta"),
    unitType: str | None = Query(None, description="Filtra por tipo: number, toggle, select"),
    includeArchived: bool = Query(False, description="Si es true incluye features archivados"),
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    sortBy: str = Query("name", description="name | category | createdAt"),
    sortOrder: str = Query("asc", description="asc | desc"),
):
    results = [f for f in FEATURES_DB if includeArchived or f["status"] == "active"]

    if search:
        term = search.lower()
        results = [f for f in results if term in f["name"].lower() or term in f["description"].lower()]
    if category:
        results = [f for f in results if f["category"] == category]
    if unitType:
        results = [f for f in results if f["unitType"] == unitType]

    reverse = sortOrder == "desc"
    results.sort(key=lambda f: f.get(sortBy, f["name"]) or "", reverse=reverse)

    total = len(results)
    start = (page - 1) * pageSize
    page_data = results[start: start + pageSize]

    return {
        "data": page_data,
        "pagination": {
            "total": total,
            "page": page,
            "pageSize": pageSize,
            "totalPages": max(1, -(-total // pageSize)),
        },
    }


# ─── GET /api/features/{featureId} ───────────────────────────────────────────
@router.get(
    "/{featureId}",
    summary="Obtener detalle de un feature",
)
async def get_feature(featureId: str = Path(..., description="Identificador único del feature")):
    feature = next((f for f in FEATURES_DB if f["id"] == featureId), None)
    if not feature:
        return {"error": {"code": "FEATURE_NOT_FOUND", "message": f"No se encontró el feature '{featureId}'"}}
    return feature


# ─── POST /api/features ───────────────────────────────────────────────────────
@router.post(
    "",
    summary="Crear un nuevo feature en el catálogo",
    status_code=status.HTTP_201_CREATED,
)
async def create_feature(body: dict = Body(...)):
    name = body.get("name", "")
    if not name or len(name) < 3:
        return {"error": {"code": "VALIDATION_ERROR", "message": "El campo 'name' debe tener entre 3 y 80 caracteres"}}

    duplicate = next((f for f in FEATURES_DB if f["name"].lower() == name.lower() and f["status"] == "active"), None)
    if duplicate:
        return {"error": {"code": "FEATURE_NAME_DUPLICATE", "message": f"Ya existe un feature activo con el nombre '{name}'"}}

    now = datetime.now(timezone.utc).isoformat()
    new_feature = {
        "id": f"feat-{name.lower().replace(' ', '-')}-{len(FEATURES_DB) + 1}",
        "name": name,
        "category": body.get("category", "Support & Integrations"),
        "unit": body.get("unit", "units"),
        "unitType": body.get("unitType", "number"),
        "options": body.get("options", None),
        "defaultLimit": body.get("defaultLimit", 0),
        "description": body.get("description", ""),
        "icon": body.get("icon", None),
        "status": "active",
        "createdAt": now,
        "updatedAt": now,
        "archivedAt": None,
    }
    return {"status": "success", "data": new_feature}


# ─── PUT /api/features/{featureId} ───────────────────────────────────────────
@router.put(
    "/{featureId}",
    summary="Actualizar un feature existente",
)
async def update_feature(
    featureId: str = Path(...),
    body: dict = Body(...),
):
    feature = next((f for f in FEATURES_DB if f["id"] == featureId), None)
    if not feature:
        return {"error": {"code": "FEATURE_NOT_FOUND", "message": f"No se encontró el feature '{featureId}'"}}

    if "unitType" in body and body["unitType"] != feature["unitType"]:
        return {"error": {"code": "FEATURE_UNITTYPE_IMMUTABLE", "message": "El campo 'unitType' no puede modificarse"}}

    if "name" in body:
        new_name = body["name"]
        collision = next(
            (f for f in FEATURES_DB if f["name"].lower() == new_name.lower() and f["id"] != featureId and f["status"] == "active"),
            None,
        )
        if collision:
            return {"error": {"code": "FEATURE_NAME_DUPLICATE", "message": f"Ya existe un feature activo con el nombre '{new_name}'"}}

    updated = {**feature, **{k: v for k, v in body.items() if k not in ("id", "unitType", "createdAt")}}
    updated["updatedAt"] = datetime.now(timezone.utc).isoformat()

    return {"status": "success", "data": updated}


# ─── DELETE /api/features/{featureId} ────────────────────────────────────────
@router.delete(
    "/{featureId}",
    summary="Archivar (soft-delete) un feature",
)
async def archive_feature(featureId: str = Path(...)):
    feature = next((f for f in FEATURES_DB if f["id"] == featureId), None)
    if not feature:
        return {"error": {"code": "FEATURE_NOT_FOUND", "message": f"No se encontró el feature '{featureId}'"}}
    if feature["status"] == "archived":
        return {"error": {"code": "FEATURE_ALREADY_ARCHIVED", "message": "El feature ya está archivado"}}

    now = datetime.now(timezone.utc).isoformat()
    return {
        "status": "success",
        "id": featureId,
        "status_field": "archived",
        "archivedAt": now,
        "inUseByPlans": 2,
    }


# ─── POST /api/features/{featureId}/restore ───────────────────────────────────
@router.post(
    "/{featureId}/restore",
    summary="Restaurar un feature archivado",
)
async def restore_feature(featureId: str = Path(...)):
    feature = next((f for f in FEATURES_DB if f["id"] == featureId), None)
    if not feature:
        return {"error": {"code": "FEATURE_NOT_FOUND", "message": f"No se encontró el feature '{featureId}'"}}
    if feature["status"] == "active":
        return {"error": {"code": "FEATURE_NOT_ARCHIVED", "message": "El feature ya está activo"}}

    return {
        "status": "success",
        "id": featureId,
        "status_field": "active",
        "archivedAt": None,
        "restoredAt": datetime.now(timezone.utc).isoformat(),
    }
