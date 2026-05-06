import json
from fastapi import APIRouter, Path, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.db.neon import get_db
from app.models_db import (
    AppUsageStat,
    FeatureAdoption,
    AdherenceSnapshot,
    CohortRetention,
    SoapQualityMetric,
    AppVersion
)

router = APIRouter(prefix="/api/analytics", tags=["Analítica de Producto y App"])

def parse_json_safely(value, default_empty):
    if not value or value == "null" or value == "undefined":
        return default_empty
    try:
        if isinstance(value, (dict, list)):
            return value
        parsed = json.loads(value)
        return parsed if parsed is not None else default_empty
    except Exception:
        return default_empty

# 🔥 CONVERTIDORES INTELIGENTES PARA EVITAR CRASHES EN REACT 🔥
def force_list(value):
    raw = parse_json_safely(value, [])
    if isinstance(raw, list):
        return raw
    elif raw:
        return [raw]
    return []

def force_dict(value):
    raw = parse_json_safely(value, {})
    if isinstance(raw, dict):
        return raw
    return {}

def format_breakdown(value):
    raw = parse_json_safely(value, [])
    # Si la BD lo guardó como diccionario {"Week 1": 90}, lo pasamos a la lista que React pide
    if isinstance(raw, dict):
        return [{"week": str(k), "adherence": v} for k, v in raw.items()]
    # Si ya es lista, lo devolvemos tal cual
    if isinstance(raw, list):
        return raw
    return []


# 35. GET /analytics/apps/{app_type}
@router.get("/apps/{app_type}", summary="Estadísticas de uso por tipo de aplicación")
async def get_app_usage(app_type: str = Path(...), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AppUsageStat).where(AppUsageStat.app_type == app_type).order_by(desc(AppUsageStat.recorded_at)))
    stat = result.scalars().first()

    if not stat:
        return {
            "status": "success", "app_type": app_type, "appType": app_type,
            "metrics": {
                "monthly_active_users": 0, "monthlyActiveUsers": 0,
                "average_session_length_minutes": 0, "averageSessionLengthMinutes": 0,
                "crash_free_sessions_percentage": 0, "crashFreeSessionsPercentage": 0,
                "top_screens": [], "topScreens": []
            }
        }

    # Forzamos que top_screens sea un array para evitar otro .map error
    top_screens = force_list(stat.top_screens)

    return {
        "status": "success",
        "app_type": stat.app_type, "appType": stat.app_type,
        "metrics": {
            "monthly_active_users": stat.monthly_active_users,
            "monthlyActiveUsers": stat.monthly_active_users,
            "average_session_length_minutes": stat.average_session_length_minutes,
            "averageSessionLengthMinutes": stat.average_session_length_minutes,
            "crash_free_sessions_percentage": stat.crash_free_sessions_percentage,
            "crashFreeSessionsPercentage": stat.crash_free_sessions_percentage,
            "top_screens": top_screens,
            "topScreens": top_screens
        }
    }

# 36. GET /analytics/features/adoption
@router.get("/features/adoption", summary="Métricas de uso de nuevas funcionalidades")
async def get_feature_adoption(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(FeatureAdoption))
    features = result.scalars().all()

    return {
        "status": "success",
        "period": "last_30_days",
        "data": [
            {
                "feature_name": f.feature_name, "featureName": f.feature_name,
                "adoption_rate_percentage": f.adoption_rate_percentage, "adoptionRatePercentage": f.adoption_rate_percentage,
                "total_uses": f.total_uses, "totalUses": f.total_uses,
                "user_feedback_score": f.user_feedback_score, "userFeedbackScore": f.user_feedback_score
            }
            for f in features
        ]
    }

# 37. GET /analytics/adherence/global
@router.get("/adherence/global", summary="Tasa de constancia de los pacientes")
async def get_global_adherence(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AdherenceSnapshot).order_by(desc(AdherenceSnapshot.recorded_at)))
    snapshot = result.scalars().first()

    if not snapshot:
        return {
            "status": "success",
            "overall_adherence_percentage": 0, "overallAdherencePercentage": 0,
            "breakdown_by_week": [], "breakdownByWeek": [],
            "top_dropping_point": "", "topDroppingPoint": ""
        }

    # 🔥 LA CURA: Detecta si es dict {"Week 1": 90} y lo convierte a la lista que React necesita
    breakdown = format_breakdown(snapshot.breakdown_by_week)

    return {
        "status": "success",
        "overall_adherence_percentage": snapshot.overall_adherence_percentage,
        "overallAdherencePercentage": snapshot.overall_adherence_percentage,
        "breakdown_by_week": breakdown,
        "breakdownByWeek": breakdown,
        "top_dropping_point": snapshot.top_dropping_point or "",
        "topDroppingPoint": snapshot.top_dropping_point or ""
    }

# 38. GET /analytics/retention/cohorts
@router.get("/retention/cohorts", summary="Análisis de retención de usuarios por grupos")
async def get_retention_cohorts(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CohortRetention))
    cohorts = result.scalars().all()

    return {
        "status": "success",
        "cohort_period": "monthly",
        "cohortPeriod": "monthly",
        "data": [
            {
                "cohort": c.cohort_label,
                "users": c.users_count,
                # Forzamos que retención sea sí o sí un diccionario para Object.entries
                "retention_by_month": force_dict(c.retention_by_month),
                "retentionByMonth": force_dict(c.retention_by_month)
            }
            for c in cohorts
        ]
    }

# 39. GET /analytics/ai/soap-quality
@router.get("/ai/soap-quality", summary="Métricas de aceptación de notas médicas por IA")
async def get_ai_soap_quality(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SoapQualityMetric).order_by(desc(SoapQualityMetric.recorded_at)))
    metric = result.scalars().first()

    if not metric:
        return {
            "status": "success",
            "total_notes_generated": 0, "totalNotesGenerated": 0,
            "acceptance_rate_percentage": 0, "acceptanceRatePercentage": 0,
            "edits_required_percentage": 0, "editsRequiredPercentage": 0,
            "average_time_saved_minutes_per_note": 0, "averageTimeSavedMinutesPerNote": 0,
            "common_corrections": [], "commonCorrections": []
        }

    # Forzamos array
    corrections = force_list(metric.common_corrections)

    return {
        "status": "success",
        "total_notes_generated": metric.total_notes_generated,
        "totalNotesGenerated": metric.total_notes_generated,
        "acceptance_rate_percentage": metric.acceptance_rate_percentage,
        "acceptanceRatePercentage": metric.acceptance_rate_percentage,
        "edits_required_percentage": metric.edits_required_percentage,
        "editsRequiredPercentage": metric.edits_required_percentage,
        "average_time_saved_minutes_per_note": metric.average_time_saved_minutes_per_note,
        "averageTimeSavedMinutesPerNote": metric.average_time_saved_minutes_per_note,
        "common_corrections": corrections,
        "commonCorrections": corrections
    }

# ✨ GET /api/analytics/versions
@router.get("/versions", summary="Uso de versiones de las aplicaciones")
async def get_app_versions(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AppVersion).order_by(desc(AppVersion.percentage)))
    versions = result.scalars().all()

    return {
        "status": "success",
        "data": [
            {
                "app_type": v.app_type, "appType": v.app_type,
                "version": v.version,
                "user_count": v.user_count, "userCount": v.user_count,
                "percentage": v.percentage
            }
            for v in versions
        ]
    }