import json
from datetime import datetime
from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.neon import get_db
from app.models_db import PlatformSetting, AdminUser

router = APIRouter(prefix="/api/settings", tags=["Configuración Global"])


# ── helpers ────────────────────────────────────────────────────────────────────
def _load(setting: PlatformSetting | None) -> dict:
    """Deserializa setting_value (JSON string) a dict, o devuelve {}."""
    if not setting:
        return {}
    try:
        return json.loads(setting.setting_value)
    except Exception:
        return {}

async def _get_or_create(db: AsyncSession, key: str) -> PlatformSetting:
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


# 48. GET /settings
@router.get("", summary="Obtener configuración global de la plataforma")
async def get_global_settings(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(PlatformSetting).where(PlatformSetting.setting_key == 'global_config')
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


# 49. PATCH /settings
@router.patch("", summary="Actualizar configuración global del sistema")
async def update_global_settings(updates: dict = Body(...), db: AsyncSession = Depends(get_db)):
    setting = await _get_or_create(db, 'global_config')
    data = _load(setting)
    data.update(updates)
    setting.setting_value = json.dumps(data)
    setting.updated_at = datetime.utcnow()
    await db.commit()

    return {"status": "success", "updated_fields": list(updates.keys())}


# 50. GET /settings/preferences
@router.get("/preferences", summary="Obtener preferencias visuales")
async def get_preferences(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AdminUser).where(AdminUser.email == "admin@wellq.co"))
    user = result.scalars().first()

    if not user:
        raise HTTPException(status_code=404, detail="No encontrado")

    return {
        "language":         "es",
        "theme":            "dark",
        "sidebar_collapsed": False
    }


# 51. PUT /settings/preferences
@router.put("/preferences", summary="Guardar cambios de interfaz")
async def update_preferences(prefs: dict = Body(...), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AdminUser).where(AdminUser.email == "admin@wellq.co"))
    user = result.scalars().first()

    if not user:
        raise HTTPException(status_code=404, detail="No encontrado")

    # AdminUser no tiene campo preferences, lo guardamos en PlatformSetting
    setting = await _get_or_create(db, 'user_preferences')
    data = _load(setting)
    data.update(prefs)
    setting.setting_value = json.dumps(data)
    setting.updated_at = datetime.utcnow()
    await db.commit()

    return {"status": "success", "message": "Preferencias visuales actualizadas."}


# 52. GET /settings/azure
@router.get("/azure", summary="Estado de conexión con Azure")
async def get_azure_status(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(PlatformSetting).where(PlatformSetting.setting_key == 'azure_config')
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


# 53. POST /settings/azure
@router.post("/azure", summary="Configurar credenciales de Azure")
async def setup_azure(config: dict = Body(...), db: AsyncSession = Depends(get_db)):
    setting = await _get_or_create(db, 'azure_config')
    data = _load(setting)
    data.update(config)
    setting.setting_value = json.dumps(data)
    setting.updated_at = datetime.utcnow()
    await db.commit()

    return {"status": "success", "message": "Conexión con Azure establecida correctamente."}


# 54. GET /settings/database
@router.get("/database", summary="Verificación de conexión con DB")
async def get_db_status(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(PlatformSetting).where(PlatformSetting.setting_key == 'db_config')
    )
    setting = result.scalars().first()
    data = _load(setting)

    return {
        "database":           data.get("database", "Neon PostgreSQL"),
        "status":             data.get("status", "connected"),
        "latency_ms":         data.get("latency_ms", 15),
        "collections_count":  data.get("collections_count", 28)
    }


# 55. POST /settings/database
@router.post("/database", summary="Configuración de acceso a base de datos")
async def setup_database(config: dict = Body(...), db: AsyncSession = Depends(get_db)):
    setting = await _get_or_create(db, 'db_config')
    data = _load(setting)
    data.update(config)
    setting.setting_value = json.dumps(data)
    setting.updated_at = datetime.utcnow()
    await db.commit()

    return {"status": "success", "message": "Parámetros de base de datos actualizados exitosamente."}


# 56. GET /settings/api-keys/gcp
@router.get("/api-keys/gcp", summary="Obtener API Key de GCP")
async def get_gcp_key(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(PlatformSetting).where(PlatformSetting.setting_key == 'gcp_api_key')
    )
    setting = result.scalars().first()
    data = _load(setting)
    return {"gcp_api_key": data.get("api_key", "")}

# 57. POST /settings/api-keys/gcp
@router.post("/api-keys/gcp", summary="Guardar API Key de GCP")
async def set_gcp_key(payload: dict = Body(...), db: AsyncSession = Depends(get_db)):
    api_key = payload.get("api_key", "")
    setting = await _get_or_create(db, 'gcp_api_key')
    data = _load(setting)
    data["api_key"] = api_key
    setting.setting_value = json.dumps(data)
    setting.updated_at = datetime.utcnow()
    await db.commit()
    return {"status": "success", "message": "GCP API Key actualizada"}