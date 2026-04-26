from fastapi import APIRouter, Body

router = APIRouter(prefix="/api/settings", tags=["Configuración Global"])

# 48. GET /settings
@router.get("", summary="Obtener configuración global de la plataforma")
async def get_global_settings():
    return {
        "maintenance_mode": False,
        "api_version": "1.0.0",
        "allowed_hosts": ["*.wellq.co"],
        "enforce_2fa": True,
        "support_email": "ops@wellq.co"
    }

# 49. PATCH /settings
@router.patch("", summary="Actualizar configuración global del sistema")
async def update_global_settings(updates: dict = Body(...)):
    return {
        "status": "success",
        "updated_fields": list(updates.keys())
    }

# 50. GET /settings/preferences
@router.get("/preferences", summary="Obtener preferencias visuales")
async def get_preferences():
    return {
        "language": "es",
        "theme": "dark",
        "sidebar_collapsed": False
    }

# 51. PUT /settings/preferences
@router.put("/preferences", summary="Guardar cambios de interfaz")
async def update_preferences(prefs: dict = Body(...)):
    return {
        "status": "success",
        "message": "Preferencias visuales actualizadas."
    }

# 52. GET /settings/azure
@router.get("/azure", summary="Estado de conexión con Azure")
async def get_azure_status():
    return {
        "provider": "Microsoft Azure",
        "status": "connected",
        "region": "East US",
        "services": {
            "key_vault": "healthy",
            "blob_storage": "healthy",
            "app_service": "healthy"
        }
    }

# 53. POST /settings/azure
@router.post("/azure", summary="Configurar credenciales de Azure")
async def setup_azure(config: dict = Body(...)):
    return {
        "status": "success",
        "message": "Conexión con Azure establecida correctamente."
    }

# 54. GET /settings/database
@router.get("/database", summary="Verificación de conexión con DB")
async def get_db_status():
    return {
        "database": "MongoDB Atlas",
        "status": "connected",
        "latency_ms": 15,
        "collections_count": 28
    }

# 55. POST /settings/database
@router.post("/database", summary="Configuración de acceso a base de datos")
async def setup_database(config: dict = Body(...)):
    return {
        "status": "success",
        "message": "Parámetros de base de datos actualizados exitosamente."
    }
