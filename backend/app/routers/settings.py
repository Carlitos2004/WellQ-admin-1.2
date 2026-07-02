import json
import time
from datetime import datetime
from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from app.db.neon import get_db
from app.models_db import PlatformSetting, AdminUser

router = APIRouter(prefix="/api/settings", tags=["Configuración Global"])


def _load(setting):
    if not setting:
        return {}
    try:
        return json.loads(setting.setting_value)
    except Exception:
        return {}

async def _get_or_create(db, key):
    result = await db.execute(
        select(PlatformSetting).where(PlatformSetting.setting_key == key)
    )
    setting = result.scalars().first()
    if not setting:
        setting = PlatformSetting(
            setting_key=key,
            setting_value="{}",
            updated_at=datetime.utcnow(),
            updated_by="admin@wellq.co"
        )
        db.add(setting)
    return setting


# ==============================================================================
# ENDPOINT: #93 - GET /api/settings
# Descripción: Obtener configuración global
# ==============================================================================
@router.get("", summary="Obtener configuración global")
async def get_global_settings(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(PlatformSetting).where(PlatformSetting.setting_key == "global_config")
    )
    setting = result.scalars().first()
    data = _load(setting)
    return {
        "maintenance_mode": data.get("maintenance_mode", False),
        "api_version":      data.get("api_version", "1.0.0"),
        "allowed_hosts":    data.get("allowed_hosts", ["*.wellq.co"]),
        "enforce_2fa":      data.get("enforce_2fa", True),
        "support_email":    data.get("support_email", "ops@wellq.co")
    }


# ==============================================================================
# ENDPOINT: #94 - PATCH /api/settings
# Descripción: Actualizar configuración global
# ==============================================================================
@router.patch("", summary="Actualizar configuración global")
async def update_global_settings(updates: dict = Body(...), db: AsyncSession = Depends(get_db)):
    setting = await _get_or_create(db, "global_config")
    data = _load(setting)
    data.update(updates)
    setting.setting_value = json.dumps(data)
    setting.updated_at = datetime.utcnow()
    await db.commit()
    return {"status": "success", "updated_fields": list(updates.keys())}


# ==============================================================================
# ENDPOINT: #101 - GET /api/settings/preferences
# Descripción: Obtener preferencias visuales
# ==============================================================================
@router.get("/preferences", summary="Obtener preferencias visuales")
async def get_preferences(db: AsyncSession = Depends(get_db)):
    return {"language": "es", "theme": "dark", "sidebar_collapsed": False}


# ==============================================================================
# ENDPOINT: #102 - PUT /api/settings/preferences
# Descripción: Guardar preferencias visuales
# ==============================================================================
@router.put("/preferences", summary="Guardar preferencias visuales")
async def update_preferences(prefs: dict = Body(...), db: AsyncSession = Depends(get_db)):
    setting = await _get_or_create(db, "user_preferences")
    data = _load(setting)
    data.update(prefs)
    setting.setting_value = json.dumps(data)
    setting.updated_at = datetime.utcnow()
    await db.commit()
    return {"status": "success"}


# ==============================================================================
# ENDPOINT: #97 - GET /api/settings/azure
# Descripción: Estado de conexión con Azure
# ==============================================================================
@router.get("/azure", summary="Estado de conexión con Azure")
async def get_azure_status(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(PlatformSetting).where(PlatformSetting.setting_key == "azure_config")
    )
    setting = result.scalars().first()
    data = _load(setting)
    return {
        "provider": data.get("provider", "Microsoft Azure"),
        "status":   data.get("status", "connected"),
        "region":   data.get("region", "East US"),
        "services": data.get("services", {
            "key_vault":    "healthy",
            "blob_storage": "healthy",
            "app_service":  "healthy"
        })
    }


# ==============================================================================
# ENDPOINT: #98 - POST /api/settings/azure
# Descripción: Configurar credenciales Azure
# ==============================================================================
@router.post("/azure", summary="Configurar credenciales Azure")
async def setup_azure(config: dict = Body(...), db: AsyncSession = Depends(get_db)):
    setting = await _get_or_create(db, "azure_config")
    data = _load(setting)
    data.update(config)
    setting.setting_value = json.dumps(data)
    setting.updated_at = datetime.utcnow()
    await db.commit()
    return {"status": "success"}


# ==============================================================================
# ENDPOINT: #99 - GET /api/settings/database
# Descripción: Estado real de la base de datos
# ==============================================================================
@router.get("/database", summary="Estado real de la base de datos")
async def get_db_status(db: AsyncSession = Depends(get_db)):
    # ── Latencia real ────────────────────────────────────────────────────────
    t0 = time.monotonic()
    await db.execute(text("SELECT 1"))
    latency_ms = round((time.monotonic() - t0) * 1000, 1)

    # ── Conteo real de tablas en el schema public ────────────────────────────
    result = await db.execute(text(
        "SELECT count(*) FROM information_schema.tables "
        "WHERE table_schema = 'public' AND table_type = 'BASE TABLE'"
    ))
    table_count = result.scalar() or 0

    return {
        "database":          "Neon PostgreSQL",
        "status":            "connected",
        "latency_ms":        latency_ms,
        "collections_count": table_count,
    }


# ==============================================================================
# ENDPOINT: #100 - POST /api/settings/database
# Descripción: Configuración de base de datos
# ==============================================================================
@router.post("/database", summary="Configuración de base de datos")
async def setup_database(config: dict = Body(...), db: AsyncSession = Depends(get_db)):
    setting = await _get_or_create(db, "db_config")
    data = _load(setting)
    data.update(config)
    setting.setting_value = json.dumps(data)
    setting.updated_at = datetime.utcnow()
    await db.commit()
    return {"status": "success"}


# ==============================================================================
# ENDPOINT: #95 - GET /api/settings/api-keys/gcp
# Descripción: Obtener API Key GCP
# ==============================================================================
@router.get("/api-keys/gcp", summary="Obtener API Key GCP")
async def get_gcp_key(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(PlatformSetting).where(PlatformSetting.setting_key == "gcp_api_key")
    )
    setting = result.scalars().first()
    data = _load(setting)
    return {"gcp_api_key": data.get("api_key", "")}


# ==============================================================================
# ENDPOINT: #96 - POST /api/settings/api-keys/gcp
# Descripción: Guardar API Key GCP
# ==============================================================================
@router.post("/api-keys/gcp", summary="Guardar API Key GCP")
async def set_gcp_key(payload: dict = Body(...), db: AsyncSession = Depends(get_db)):
    api_key = payload.get("api_key", "")
    setting = await _get_or_create(db, "gcp_api_key")
    data = _load(setting)
    data["api_key"] = api_key
    setting.setting_value = json.dumps(data)
    setting.updated_at = datetime.utcnow()
    await db.commit()
    return {"status": "success", "message": "GCP API Key actualizada"}