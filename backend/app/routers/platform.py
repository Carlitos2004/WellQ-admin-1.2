import json
import random
import calendar
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func
from app.db.neon import get_db
from app.models_db import AiCostSnapshot, AiLatencyMetric, PoseAnalysisSnapshot, Alert, Server, BackgroundProcess, Clinic, ClinicUsageMetric

router = APIRouter(prefix="/api/platform", tags=["Operaciones de Plataforma e IA"])

def parse_date(date_str: str | None) -> datetime | None:
    if not date_str:
        return None
    try:
        # replace Z with +00:00 for python < 3.11 compatibility
        if date_str.endswith('Z'):
            date_str = date_str[:-1] + '+00:00'
        return datetime.fromisoformat(date_str)
    except ValueError:
        return None

# ==============================================================================
# ENDPOINT: #79 - GET /api/platform/ai/costs
# Descripción: Costo económico detallado del procesamiento de IA
# Operación: Sumar notas y sesiones en el rango y multiplicar por costo de API
# Fórmula: Costo = (notes * 0.05) + (sessions * 0.15)
# ==============================================================================
@router.get("/ai/costs", summary="Costo económico detallado del procesamiento de IA")
async def get_ai_costs(
    start_date: str = Query(None),
    end_date:   str = Query(None),
    db: AsyncSession = Depends(get_db)
):
    now = datetime.utcnow()
    start_dt = datetime(now.year, now.month, 1)
    end_dt = now

    if start_date:
        parsed_start = parse_date(start_date)
        if parsed_start:
            start_dt = parsed_start
    if end_date:
        parsed_end = parse_date(end_date)
        if parsed_end:
            end_dt = parsed_end

    # Operación: Seleccionar IDs de clínicas activas
    clinics_stmt = select(Clinic.clinic_id).where(Clinic.status != "churned", Clinic.is_deleted == False)
    active_clinic_ids = (await db.execute(clinics_stmt)).scalars().all()

    if not active_clinic_ids:
        return {
            "status": "success",
            "period": "current_month",
            "currency": "USD",
            "totalCost": 0.0,
            "breakdown": [],
            "projectedEndOfMonthCost": 0.0
        }

    # Operación: Sumar notas y sesiones de clínicas activas en el rango de fechas
    usage_stmt = select(
        func.sum(ClinicUsageMetric.notes_generated),
        func.sum(ClinicUsageMetric.patient_sessions_completed)
    ).where(
        ClinicUsageMetric.clinic_id.in_(active_clinic_ids),
        ClinicUsageMetric.recorded_at >= start_dt,
        ClinicUsageMetric.recorded_at <= end_dt
    )
    
    res = (await db.execute(usage_stmt)).first()
    total_notes = float(res[0] or 0)
    total_sessions = float(res[1] or 0)

    # Operación: Multiplicación de uso por costos unitarios de servicios
    openai_cost = round(total_notes * 0.05, 2)
    gcp_cost = round(total_sessions * 0.15, 2)
    total_cost = round(openai_cost + gcp_cost, 2)

    # Operación: Calcular proyección a fin de mes
    days_in_month = calendar.monthrange(now.year, now.month)[1]
    current_day = now.day
    projected_cost = round(total_cost * (days_in_month / max(1, current_day)), 2)

    breakdown_data = [
        {"model": "OpenAI (SOAP)", "cost": openai_cost},
        {"model": "GCP Vertex (Pose)", "cost": gcp_cost}
    ]

    return {
        "status": "success",
        "period": "current_month",
        "currency": "USD",
        "totalCost": total_cost,
        "breakdown": breakdown_data,
        "projectedEndOfMonthCost": projected_cost
    }

# ==============================================================================
# ENDPOINT: #80 - GET /api/platform/ai/latency
# Descripción: Tiempos de respuesta de los modelos de IA
# Operación: Simular variación de latencias en un rango de +/- 5%
# ==============================================================================
@router.get("/ai/latency", summary="Tiempos de respuesta de los modelos de IA")
async def get_ai_latency(
    start_date: str = Query(None),
    end_date:   str = Query(None),
    db: AsyncSession = Depends(get_db)
):
    now = datetime.utcnow()
    start_dt = now - timedelta(days=1)
    end_dt = now

    if start_date:
        parsed_start = parse_date(start_date)
        if parsed_start:
            start_dt = parsed_start
    if end_date:
        parsed_end = parse_date(end_date)
        if parsed_end:
            end_dt = parsed_end

    # Operación: Seleccionar latencias registradas en el período
    stmt = select(AiLatencyMetric).where(
        AiLatencyMetric.recorded_at >= start_dt,
        AiLatencyMetric.recorded_at <= end_dt
    )
    result = await db.execute(stmt)
    metrics = result.scalars().all()

    data = []
    for m in metrics:
        # Operación: Simulación de fluctuación aleatoria (+/- 5%) sobre latencia real
        variation = random.uniform(0.95, 1.05)
        avg_ms = int(m.average_latency_ms * variation)
        p95_ms = int(m.p95_latency_ms * variation)
        
        data.append({
            "service": m.service,
            "averageLatencyMs": avg_ms,
            "p95LatencyMs": p95_ms,
            "status": m.status
        })

    return {
        "status": "success",
        "period": "last_24_hours",
        "metrics": data
    }

# ==============================================================================
# ENDPOINT: #81 - GET /api/platform/ai/pose-analysis/success-rate
# Descripción: Eficacia y precisión del análisis de posturas
# Operación: Ponderar tasa de éxito según salud clínica y distribuir fallas
# Fórmula: Éxito % = 95.0 + (avg_health / 100) * 4
# ==============================================================================
@router.get("/ai/pose-analysis/success-rate", summary="Eficacia y precisión del análisis de posturas")
async def get_pose_analysis_success_rate(
    start_date: str = Query(None),
    end_date:   str = Query(None),
    db: AsyncSession = Depends(get_db)
):
    now = datetime.utcnow()
    start_dt = now - timedelta(days=7)
    end_dt = now

    if start_date:
        parsed_start = parse_date(start_date)
        if parsed_start:
            start_dt = parsed_start
    if end_date:
        parsed_end = parse_date(end_date)
        if parsed_end:
            end_dt = parsed_end

    # Operación: Seleccionar salud de clínicas activas
    clinics_stmt = select(Clinic.clinic_id, Clinic.health_score).where(Clinic.status != "churned", Clinic.is_deleted == False)
    active_clinics = (await db.execute(clinics_stmt)).all()

    if not active_clinics:
        return {
            "status": "success",
            "period": "current_month",
            "totalSessionsAnalyzed": 0,
            "overallSuccessRatePercentage": 0.0,
            "failureReasons": []
        }

    clinic_ids = [c[0] for c in active_clinics]
    health_scores = [c[1] for c in active_clinics if c[1] is not None]
    
    # Operación: Promedio de salud clínica general
    avg_health = sum(health_scores) / len(health_scores) if health_scores else 80.0

    # Operación: Sumar sesiones ejecutadas en el período
    usage_stmt = select(func.sum(ClinicUsageMetric.patient_sessions_completed)).where(
        ClinicUsageMetric.clinic_id.in_(clinic_ids),
        ClinicUsageMetric.recorded_at >= start_dt,
        ClinicUsageMetric.recorded_at <= end_dt
    )
    total_sessions = int((await db.execute(usage_stmt)).scalar() or 0)

    # Operación: Ponderación matemática de tasa de éxito basada en salud
    success_rate = round(95.0 + (avg_health / 100.0) * 4.0, 1) if total_sessions > 0 else 0.0
    
    # Operación: Distribuir porcentajes de fallas
    fail_rate = round(100.0 - success_rate, 1) if success_rate > 0 else 0.0
    poor_lighting = round(fail_rate * 0.45, 1)
    out_of_frame = round(fail_rate * 0.40, 1)
    unknown = round(fail_rate - poor_lighting - out_of_frame, 1)

    failure_reasons = []
    if total_sessions > 0:
        failure_reasons = [
            {"reason": "Poor Lighting", "percentage": poor_lighting},
            {"reason": "Subject out of frame", "percentage": out_of_frame},
            {"reason": "Unknown Error", "percentage": unknown}
        ]

    return {
        "status": "success",
        "period": "current_month",
        "totalSessionsAnalyzed": total_sessions,
        "overallSuccessRatePercentage": success_rate,
        "failureReasons": failure_reasons
    }

# ==============================================================================
# ENDPOINT: #82 - GET /api/platform/background-processes
# Descripción: Estado de los procesos en segundo plano
# Operación: Simular variación de ítems en cola y memoria de procesos
# ==============================================================================
@router.get("/background-processes", summary="Estado de los procesos en segundo plano")
async def get_background_processes(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(BackgroundProcess))
    processes = result.scalars().all()

    data = []
    for p in processes:
        # Operación: Variar cantidad de items en cola para procesos corriendo
        queued = p.queued_items
        if p.status == "running":
            queued = max(0, p.queued_items + random.randint(-3, 3))
        elif p.status == "sleeping":
            queued = 0

        # Operación: Variar memoria consumida de procesos
        mem_num = int(p.memory_consumption.replace("MB", ""))
        mem_val = max(10, mem_num + random.randint(-15, 15))

        data.append({
            "processId": p.process_id,
            "name": p.name,
            "status": p.status,
            "queued_items": queued,
            "memory_consumption": f"{mem_val}MB",
            "description": p.description,
            "startedAt": p.started_at.isoformat() + "Z" if p.started_at else None
        })

    return {
        "status": "success",
        "data": data
    }

# ==============================================================================
# ENDPOINT: #83 - GET /api/platform/errors/summary
# Descripción: Resumen de los errores más frecuentes del sistema
# Operación: Sumar y ordenar alertas de sistema no solucionadas
# ==============================================================================
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

# ==============================================================================
# ENDPOINT: #84 - GET /api/platform/servers
# Descripción: Estado de los servidores
# Operación: Simular variación de consumo de CPU/RAM sobre el base de la BD
# ==============================================================================
@router.get("/servers", summary="Estado de los servidores")
async def get_servers(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Server))
    servers = result.scalars().all()

    data = []
    for s in servers:
        # Operación: Fluctuación aleatoria en consumo de CPU/RAM sobre el base de la BD
        base_cpu = int(s.cpu_usage.replace("%", ""))
        base_ram = int(s.ram_usage.replace("%", ""))

        cpu_val = max(5, min(99, base_cpu + random.randint(-6, 6)))
        ram_val = max(10, min(99, base_ram + random.randint(-2, 2)))

        status = s.status
        if cpu_val > 92:
            status = "warning"
        elif cpu_val > 97:
            status = "degraded"

        data.append({
            "serverId": s.server_id,
            "name": s.name,
            "region": s.region,
            "status": status,
            "uptime": s.uptime,
            "cpu_usage": f"{cpu_val}%",
            "ram_usage": f"{ram_val}%"
        })

    return {
        "status": "success",
        "data": data
    }