"""
routers/dashboard.py — MÓDULO 2: OVERVIEW KPIs (DASHBOARD)
Mapeo exacto de los endpoints 4 al 11 entregados a la empresa.
"""

from fastapi import APIRouter
from datetime import datetime, timezone

# Prefijo ajustado para coincidir con la lista oficial: GET /api/kpis/...
router = APIRouter(prefix="/api/kpis", tags=["Dashboard KPIs"])


@router.get("/arr", summary="Ingreso Anual Recurrente")
async def get_arr():
    # 4. GET /kpis/arr - Ingreso Anual Recurrente y gráfica de tendencia histórica.
    return {
        "current_arr": 542400.00, # (MRR 45,200 * 12)
        "currency": "USD",
        "trend_graph": [
            {"month": "Nov", "value": 492000},
            {"month": "Dic", "value": 504000},
            {"month": "Ene", "value": 527400},
            {"month": "Feb", "value": 537000},
            {"month": "Mar", "value": 555600},
            {"month": "Abr", "value": 542400}
        ]
    }


@router.get("/clinics/active", summary="Conteo de clínicas activas")
async def get_active_clinics():
    # 5. GET /kpis/clinics/active - Conteo total de clínicas activas, altas y bajas.
    return {
        "total_active": 124,
        "new_clinics_month": 5,
        "churned_clinics_month": 2,
        "state": "stable"
    }


@router.get("/patients/total", summary="Total de pacientes registrados")
async def get_total_patients():
    # 6. GET /kpis/patients/total - Total de pacientes registrados en la plataforma.
    return {
        "total_patients": 3450,
        "active_in_treatment": 2800,
        "new_this_week": 145
    }


@router.get("/nrr", summary="Porcentaje de Retención de Ingresos Netos")
async def get_nrr():
    # 7. GET /kpis/nrr - Porcentaje de Retención de Ingresos Netos (Net Revenue Retention).
    return {
        "nrr_percentage": 104.5,
        "expansion_mrr": 15000.00,
        "churn_mrr": 1600.00,
        "status": "healthy"
    }


@router.get("/system-health", summary="Estado general del servidor")
async def get_system_health():
    # 8. GET /kpis/system-health - Estado general del servidor y servicios críticos (Azure).
    return {
        "overall_status": "optimal",
        "last_check": datetime.now(timezone.utc).isoformat(),
        "services": {
            "azure_app_service": "online",
            "azure_functions_ia": "online",
            "mongodb_atlas": "online",
            "redis_cache": "online"
        },
        "latency_ms": 42
    }


@router.get("/users/active-now", summary="Usuarios navegando en tiempo real")
async def get_users_active_now():
    # 9. GET /kpis/users/active-now - Cantidad de usuarios navegando en tiempo real.
    return {
        "active_now": 42,
        "platform_distribution": {
            "web_admin": 5,
            "mobile_clinician": 12,
            "mobile_patient": 25
        }
    }


@router.get("/downloads/total", summary="Acumulado de descargas de la app")
async def get_total_downloads():
    # 10. GET /kpis/downloads/total - Acumulado de descargas de las aplicaciones móviles.
    return {
        "total_downloads": 8540,
        "ios": 4200,
        "android": 4340,
        "last_24h": 56
    }


@router.get("/users/dormant", summary="Usuarios inactivos")
async def get_users_dormant():
    # 11. GET /kpis/users/dormant - Cantidad de usuarios inactivos o sin actividad reciente.
    return {
        "dormant_30d": 120,
        "dormant_90d": 45,
        "risk_of_churn_clinics": 3,
        "re_engagement_campaign_active": False
    }