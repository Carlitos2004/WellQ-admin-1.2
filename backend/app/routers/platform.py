from fastapi import APIRouter

router = APIRouter(prefix="/api/platform", tags=["Operaciones de Plataforma e IA"])

@router.get("/ai/costs", summary="Costo económico detallado del procesamiento de IA")
async def get_ai_costs():
    return {
        "status": "success",
        "period": "current_month",
        "currency": "USD",
        "total_cost": 1250.75,
        "breakdown": [
            {"model": "Pose Estimation (Video)", "cost": 850.25, "percentage_of_total": 68.0},
            {"model": "SOAP Note Generation (LLM)", "cost": 300.50, "percentage_of_total": 24.0},
            {"model": "Audio Transcription", "cost": 100.00, "percentage_of_total": 8.0}
        ],
        "projected_end_of_month_cost": 1800.00
    }

@router.get("/ai/latency", summary="Tiempos de respuesta de los modelos de IA")
async def get_ai_latency():
    return {
        "status": "success",
        "period": "last_24_hours",
        "metrics": [
            {"service": "pose_estimation_realtime", "average_latency_ms": 45, "p95_latency_ms": 65, "status": "healthy"},
            {"service": "soap_generation_async", "average_latency_ms": 1200, "p95_latency_ms": 1850, "status": "warning"},
            {"service": "exercise_recommendation_engine", "average_latency_ms": 150, "p95_latency_ms": 210, "status": "healthy"}
        ]
    }

@router.get("/ai/pose-analysis/success-rate", summary="Eficacia y precisión del análisis de posturas")
async def get_pose_analysis_success_rate():
    return {
        "status": "success",
        "period": "last_7_days",
        "total_sessions_analyzed": 4520,
        "overall_success_rate_percentage": 94.8,
        "failure_reasons": [
            {"reason": "Low lighting / Poor visibility", "count": 120, "percentage": 51.0},
            {"reason": "Patient out of frame", "count": 85, "percentage": 36.2},
            {"reason": "Camera angle too high/low", "count": 30, "percentage": 12.8}
        ]
    }

@router.get("/errors/summary", summary="Resumen de los errores más frecuentes del sistema")
async def get_errors_summary():
    return {
        "status": "success",
        "timeframe": "last_24_hours",
        "total_critical_errors": 12,
        "total_warnings": 84,
        "top_errors": [
            {"error_code": "ERR_AI_TIMEOUT", "module": "SOAP Generator", "occurrences": 45, "severity": "medium", "last_seen": "2026-04-25T14:02:00Z"},
            {"error_code": "ERR_DB_CONNECTION", "module": "Database (MongoDB)", "occurrences": 12, "severity": "critical", "last_seen": "2026-04-25T08:15:00Z"},
            {"error_code": "ERR_WEBHOOK_FAILED", "module": "TM3 Integration", "occurrences": 8, "severity": "high", "last_seen": "2026-04-25T11:45:00Z"}
        ]
    }
