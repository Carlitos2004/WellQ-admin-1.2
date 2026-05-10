from fastapi import APIRouter, Path, Body, Query, status, Depends, HTTPException
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, asc, or_
from app.db.neon import get_db
from app.models_db import Feature

router = APIRouter(prefix="/api/features", tags=["Catálogo de Funcionalidades (Features)"])

def _serialize_feature(f):
    return {
        "id": f.feature_id,        # ← cambiado
        "featureId": f.feature_id, # ← línea nueva
        "name": f.name,
        "category": getattr(f, "category", None),
        "unit": getattr(f, "unit", None),
        "unitType": getattr(f, "unit_type", None),
        "options": getattr(f, "options", None),
        "defaultLimit": getattr(f, "default_limit", None),
        "description": getattr(f, "description", None),
        "icon": getattr(f, "icon", None),
        "status": getattr(f, "status", None),
        "createdAt": f.created_at.isoformat() + "Z" if getattr(f, "created_at", None) else None,
        "updatedAt": f.updated_at.isoformat() + "Z" if getattr(f, "updated_at", None) else None,
        "archivedAt": f.archived_at.isoformat() + "Z" if getattr(f, "archived_at", None) else None,
    }


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
    db: AsyncSession = Depends(get_db)
):
    query = select(Feature)

    if not includeArchived:
        query = query.where(Feature.status == "active")

    if search:
        term = f"%{search.lower()}%"
        query = query.where(
            or_(
                func.lower(Feature.name).like(term),
                func.lower(Feature.description).like(term)
            )
        )

    if category:
        query = query.where(Feature.category == category)
        
    if unitType:
        query = query.where(Feature.unit_type == unitType)

    # Calcular total para paginación
    total_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = total_result.scalar_one() or 0

    # Ordenamiento
    sort_column_map = {
        "name": Feature.name,
        "category": Feature.category,
        "createdAt": Feature.created_at
    }
    sort_col = sort_column_map.get(sortBy, Feature.name)
    
    if sortOrder == "desc":
        query = query.order_by(desc(sort_col))
    else:
        query = query.order_by(asc(sort_col))

    # Paginación
    start = (page - 1) * pageSize
    query = query.offset(start).limit(pageSize)

    result = await db.execute(query)
    features = result.scalars().all()

    return {
        "data": [_serialize_feature(f) for f in features],
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
async def get_feature(
    featureId: str = Path(..., description="Identificador único del feature"),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Feature).where(Feature.id == featureId))
    feature = result.scalar_one_or_none()
    
    if not feature:
        raise HTTPException(status_code=404, detail="No encontrado")
        
    return _serialize_feature(feature)


# ─── POST /api/features ───────────────────────────────────────────────────────
@router.post(
    "",
    summary="Crear un nuevo feature en el catálogo",
    status_code=status.HTTP_201_CREATED,
)
async def create_feature(
    body: dict = Body(...),
    db: AsyncSession = Depends(get_db)
):
    name = body.get("name", "")
    if not name or len(name) < 3:
        return {"error": {"code": "VALIDATION_ERROR", "message": "El campo 'name' debe tener entre 3 y 80 caracteres"}}

    # Verificar duplicado
    duplicate_result = await db.execute(
        select(Feature)
        .where(func.lower(Feature.name) == name.lower(), Feature.status == "active")
    )
    if duplicate_result.scalar_one_or_none():
        return {"error": {"code": "FEATURE_NAME_DUPLICATE", "message": f"Ya existe un feature activo con el nombre '{name}'"}}

    now = datetime.utcnow()
    new_id = f"feat-{name.lower().replace(' ', '-')}-{int(now.timestamp())}"
    
    new_feature = Feature(
        id=new_id,
        name=name,
        category=body.get("category", "Support & Integrations"),
        unit=body.get("unit", "units"),
        unit_type=body.get("unitType", "number"),
        options=body.get("options", None),
        default_limit=body.get("defaultLimit", 0),
        description=body.get("description", ""),
        icon=body.get("icon", None),
        status="active",
        created_at=now,
        updated_at=now,
        archived_at=None,
    )
    
    db.add(new_feature)
    await db.commit()
    await db.refresh(new_feature)

    return {"status": "success", "data": _serialize_feature(new_feature)}


# ─── PUT /api/features/{featureId} ───────────────────────────────────────────
@router.put(
    "/{featureId}",
    summary="Actualizar un feature existente",
)
async def update_feature(
    featureId: str = Path(...),
    body: dict = Body(...),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Feature).where(Feature.id == featureId))
    feature = result.scalar_one_or_none()
    
    if not feature:
        raise HTTPException(status_code=404, detail="No encontrado")

    if "unitType" in body and body["unitType"] != feature.unit_type:
        return {"error": {"code": "FEATURE_UNITTYPE_IMMUTABLE", "message": "El campo 'unitType' no puede modificarse"}}

    if "name" in body:
        new_name = body["name"]
        collision_result = await db.execute(
            select(Feature)
            .where(
                func.lower(Feature.name) == new_name.lower(),
                Feature.id != featureId,
                Feature.status == "active"
            )
        )
        if collision_result.scalar_one_or_none():
            return {"error": {"code": "FEATURE_NAME_DUPLICATE", "message": f"Ya existe un feature activo con el nombre '{new_name}'"}}

    # Actualizar campos
    for key, value in body.items():
        if key not in ("id", "unitType", "createdAt"):
            # Mapear camelCase a snake_case
            db_key = "unit_type" if key == "unitType" else "default_limit" if key == "defaultLimit" else key
            setattr(feature, db_key, value)

    feature.updated_at = datetime.utcnow()
    
    db.add(feature)
    await db.commit()
    await db.refresh(feature)

    return {"status": "success", "data": _serialize_feature(feature)}


# ─── DELETE /api/features/{featureId} ────────────────────────────────────────
@router.delete(
    "/{featureId}",
    summary="Archivar (soft-delete) un feature",
)
async def archive_feature(
    featureId: str = Path(...),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Feature).where(Feature.id == featureId))
    feature = result.scalar_one_or_none()
    
    if not feature:
        raise HTTPException(status_code=404, detail="No encontrado")
        
    if feature.status == "archived":
        return {"error": {"code": "FEATURE_ALREADY_ARCHIVED", "message": "El feature ya está archivado"}}

    now = datetime.utcnow()
    feature.status = "archived"
    feature.archived_at = now
    feature.updated_at = now
    
    db.add(feature)
    await db.commit()

    return {
        "status": "success",
        "id": featureId,
        "status_field": "archived",
        "archivedAt": now.isoformat() + "Z",
        "inUseByPlans": 2, # TODO: Consultar cantidad real en plan_features si es necesario
    }


# ─── POST /api/features/{featureId}/restore ───────────────────────────────────
@router.post(
    "/{featureId}/restore",
    summary="Restaurar un feature archivado",
)
async def restore_feature(
    featureId: str = Path(...),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Feature).where(Feature.id == featureId))
    feature = result.scalar_one_or_none()
    
    if not feature:
        raise HTTPException(status_code=404, detail="No encontrado")
        
    if feature.status == "active":
        return {"error": {"code": "FEATURE_NOT_ARCHIVED", "message": "El feature ya está activo"}}

    now = datetime.utcnow()
    feature.status = "active"
    feature.archived_at = None
    feature.updated_at = now
    
    db.add(feature)
    await db.commit()

    return {
        "status": "success",
        "id": featureId,
        "status_field": "active",
        "archivedAt": None,
        "restoredAt": now.isoformat() + "Z",
    }