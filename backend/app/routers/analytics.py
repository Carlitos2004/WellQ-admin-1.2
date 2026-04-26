from fastapi import APIRouter, Path

router = APIRouter(prefix="/api/analytics", tags=["Analítica de Producto y App"])

# 35. GET /analytics/apps/{app_type}
@router.get(
    "/apps/{app_type}",
    summary="Estadísticas de uso por tipo de aplicación",
    description="Retorna JSON en duro para estadísticas de app de pacientes o tablet clínica."
)
async def get_app_usage(app_type: str = Path(..., description="Tipo de app: 'patients' o 'tablet'")):
    return {
        "status": "success",
        "app_type": app_type,
        "metrics": {
            "monthly_active_users": 12500 if app_type == "patients" else 450,
            "average_session_length_minutes": 14.5 if app_type == "patients" else 45.2,
            "crash_free_sessions_percentage": 99.8,
            "top_screens": ["home", "exercise_player", "progress"] if app_type == "patients" else ["patient_queue", "body_chart", "ai_soap"]
        }
    }

# 36. GET /analytics/features/adoption
@router.get(
    "/features/adoption",
    summary="Métricas de uso de nuevas funcionalidades"
)
async def get_feature_adoption():
    return {
        "status": "success",
        "period": "last_30_days",
        "data": [
            {
                "feature_name": "AI Motion Tracking",
                "adoption_rate_percentage": 65.4,
                "total_uses": 45000,
                "user_feedback_score": 4.8
            },
            {
                "feature_name": "In-app Chat",
                "adoption_rate_percentage": 32.1,
                "total_uses": 12000,
                "user_feedback_score": 4.2
            }
        ]
    }

# 37. GET /analytics/adherence/global
@router.get(
    "/adherence/global",
    summary="Tasa de constancia de los pacientes con sus ejercicios"
)
async def get_global_adherence():
    return {
        "status": "success",
        "overall_adherence_percentage": 78.5,
        "breakdown_by_week": [
            {"week": "Week 1", "adherence": 85.0},
            {"week": "Week 2", "adherence": 80.2},
            {"week": "Week 3", "adherence": 75.4},
            {"week": "Week 4", "adherence": 73.4}
        ],
        "top_dropping_point": "Day 14"
    }

# 38. GET /analytics/retention/cohorts
@router.get(
    "/retention/cohorts",
    summary="Análisis de retención de usuarios por grupos"
)
async def get_retention_cohorts():
    return {
        "status": "success",
        "cohort_period": "monthly",
        "data": [
            {
                "cohort": "Jan 2026",
                "users": 1000,
                "retention_by_month": {"M1": 100, "M2": 85, "M3": 70, "M4": 65}
            },
            {
                "cohort": "Feb 2026",
                "users": 1200,
                "retention_by_month": {"M1": 100, "M2": 88, "M3": 72}
            }
        ]
    }

# 39. GET /analytics/ai/soap-quality
@router.get(
    "/ai/soap-quality",
    summary="Métricas de aceptación de notas médicas generadas por IA"
)
async def get_ai_soap_quality():
    return {
        "status": "success",
        "total_notes_generated": 15400,
        "acceptance_rate_percentage": 92.5,
        "edits_required_percentage": 7.5,
        "average_time_saved_minutes_per_note": 4.5,
        "common_corrections": [
            "Adjusted pain scale value",
            "Added specific manual therapy technique",
            "Modified subjective complaint phrasing"
        ]
    }
