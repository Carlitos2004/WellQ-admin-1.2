import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.db.neon import get_db
from app.models_db import AiCostSnapshot, AiLatencyMetric, PoseAnalysisSnapshot, Alert, Server, BackgroundProcess

router = APIRouter(prefix="/api/platform", tags=["Operaciones de Plataforma e IA"])

# GET /api/platform/ai/costs
@router.get("/ai/costs", summary="Costo económico detallado del procesamiento de IA")
async def get_ai_costs(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(AiCostSnapshot).order_by(desc(AiCostSnapshot.recorded_at))
    )
    snapshot = result.scalars().first()

    if not snapshot:
        raise HTTPException(status_code=404, detail="No encontrado")

    breakdown_data = []
    if snapshot.breakdown:
        try:
            parsed = json.loads(snapshot.breakdown)
            breakdown_data = parsed if isinstance(parsed, list) else [parsed]
        except:
            breakdown_data = []

    return {
        "status": "success",
        "period": snapshot.period,
        "currency": snapshot.currency,
        "totalCost": snapshot.total_cost,
        "breakdown": breakdown_data,
        "projectedEndOfMonthCost": snapshot.projected_eom_cost
    }

# GET /api/platform/ai/latency
@router.get("/ai/latency", summary="Tiempos de respuesta de los modelos de IA")
async def get_ai_latency(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AiLatencyMetric))
    metrics = result.scalars().all()

    return {
        "status": "success",
        "period": "last_24_hours",
        "metrics": [
            {
                "service": m.service,
                "averageLatencyMs": m.average_latency_ms,
                "p95LatencyMs": m.p95_latency_ms,
                "status": m.status
            }
            for m in metrics
        ]
    }

# GET /api/platform/ai/pose-analysis/success-rate
@router.get("/ai/pose-analysis/success-rate", summary="Eficacia y precisión del análisis de posturas")
async def get_pose_analysis_success_rate(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(PoseAnalysisSnapshot).order_by(desc(PoseAnalysisSnapshot.recorded_at))
    )
    snapshot = result.scalars().first()

    if not snapshot:
        raise HTTPException(status_code=404, detail="No encontrado")

    failure_reasons = []
    if snapshot.failure_reasons:
        try:
            parsed = json.loads(snapshot.failure_reasons)
            failure_reasons = parsed if isinstance(parsed, list) else [parsed]
        except:
            pass

    return {
        "status": "success",
        "period": snapshot.period,
        "totalSessionsAnalyzed": snapshot.total_sessions_analyzed,
        "overallSuccessRatePercentage": snapshot.overall_success_rate_percentage,
        "failureReasons": failure_reasons
    }

# GET /api/platform/errors/summary
@router.get("/errors/summary", summary="Resumen de los errores más frecuentes del sistema")
async def get_errors_summary(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Alert).order_by(desc(Alert.created_at)))
    alerts = result.scalars().all()

    system_errors = [a for a in alerts if a.type in ["system_error", "error", "timeout", "db_error"]]

    total_critical = sum(1 for e in system_errors if e.severity == "critical")
    total_warnings = sum(1 for e in system_errors if e.severity == "warning")

    return {
        "status": "success",
        "timeframe": "last_24_hours",
        "totalCriticalErrors": total_critical,
        "totalWarnings": total_warnings,
        "topErrors": [
            {
                "errorCode": "ERR_UNKNOWN", 
                "module": "System", 
                "occurrences": 1, 
                "severity": e.severity,
                "lastSeen": e.created_at.isoformat() + "Z" if e.created_at else None
            }
            for e in system_errors[:10]
        ]
    }

# ✨ NUEVO ENDPOINT AGREGADO ✨ GET /api/platform/servers
@router.get("/servers", summary="Estado de los servidores")
async def get_servers(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Server))
    servers = result.scalars().all()

    return {
        "status": "success",
        "data": [
            {
                "serverId": s.server_id,
                "name": s.name,
                "region": s.region,
                "status": s.status,
                "uptime": s.uptime,
                "cpuUsage": s.cpu_usage,
                "ramUsage": s.ram_usage
            }
            for s in servers
        ]
    }

# ✨ NUEVO ENDPOINT AGREGADO ✨ GET /api/platform/background-processes
@router.get("/background-processes", summary="Estado de los procesos en segundo plano")
async def get_background_processes(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(BackgroundProcess))
    processes = result.scalars().all()

    return {
        "status": "success",
        "data": [
            {
                "processId": p.process_id,
                "name": p.name,
                "status": p.status,
                "queuedItems": p.queued_items,
                "memoryConsumption": p.memory_consumption,
                "description": p.description,
                "startedAt": p.started_at.isoformat() + "Z" if p.started_at else None
            }
            for p in processes
        ]
    }