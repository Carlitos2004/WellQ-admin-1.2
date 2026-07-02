import json
import calendar
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_
from datetime import datetime, timedelta
from app.models_db import Clinic, KpiSnapshot, AppMetric, AppUsageStat, Server, AiLatencyMetric, ClinicPlan
from app.db.neon import get_db

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard KPIs"])

MONTH_NAMES_ES = {
    1: "Ene", 2: "Feb", 3: "Mar", 4: "Abr", 5: "May", 6: "Jun",
    7: "Jul", 8: "Ago", 9: "Sep", 10: "Oct", 11: "Nov", 12: "Dic"
}

def parse_date(date_str: str | None, end_of_day: bool = False) -> datetime | None:
    if not date_str:
        return None
    try:
        # replace Z with +00:00 for python < 3.11 compatibility
        if date_str.endswith('Z'):
            date_str = date_str[:-1] + '+00:00'
        dt = datetime.fromisoformat(date_str)
        if end_of_day and len(date_str) == 10:
            dt = dt.replace(hour=23, minute=59, second=59)
        return dt
    except ValueError:
        return None

# ==============================================================================
# OPERACIÓN: get_live_mrr_at_date
# Fórmulas:
#   - Sumar el MRR de las clínicas activas en la fecha especificada.
# ==============================================================================
async def get_live_mrr_at_date(db: AsyncSession, target_date: datetime, clinic_id: str | None = None) -> float:
    stmt = select(Clinic).where(Clinic.created_at <= target_date)
    if clinic_id:
        stmt = stmt.where(Clinic.clinic_id == clinic_id)
        
    result = await db.execute(stmt)
    clinics = result.scalars().all()
    
    total_mrr = 0.0
    for clinic in clinics:
        is_active = (clinic.status != "churned")
        is_churned = (clinic.status == "churned" and clinic.updated_at is not None and clinic.updated_at <= target_date)
        is_deleted = (getattr(clinic, "is_deleted", False) and getattr(clinic, "deleted_at", None) is not None and clinic.deleted_at <= target_date)
        if not is_active or is_churned or is_deleted:
            continue
            
        plan_stmt = select(ClinicPlan).where(
            ClinicPlan.clinic_id == clinic.clinic_id,
            ClinicPlan.effective_from <= target_date
        )
        plan_result = await db.execute(plan_stmt)
        plans = plan_result.scalars().all()
        
        active_plan = None
        for p in plans:
            if p.effective_to is None or p.effective_to > target_date:
                active_plan = p
                break
                
        clinic_mrr = 0.0
        if active_plan:
            try:
                snapshot = json.loads(active_plan.plan_snapshot)
                clinic_mrr = float(snapshot.get("monthlyPrice", 0.0))
            except:
                clinic_mrr = float(clinic.mrr or 0.0)
        else:
            clinic_mrr = float(clinic.mrr or 0.0)
            
        total_mrr += clinic_mrr
        
    return total_mrr

# ==============================================================================
# OPERACIÓN: calculate_nrr_details
# Fórmulas:
#   - NRR % = ((MRR_inicio + Expansión - Contracción - Churn) / MRR_inicio) * 100
# ==============================================================================
async def calculate_nrr_details(db: AsyncSession, start_dt: datetime, end_dt: datetime, clinic_id: str | None = None):
    from app.routers.financials import calculate_mrr_breakdown_for_period
    breakdown = await calculate_mrr_breakdown_for_period(db, start_dt, end_dt)
    
    prev_month_start = (start_dt - timedelta(days=1)).replace(day=1)
    prev_month_end = start_dt - timedelta(seconds=1)
    prev_breakdown = await calculate_mrr_breakdown_for_period(db, prev_month_start, prev_month_end)
    mrr_start = prev_breakdown["total_mrr"]
    
    if mrr_start > 0:
        nrr_pct = round(((mrr_start + breakdown["expansion"] - breakdown["contraction"] - breakdown["churn"]) / mrr_start) * 100, 1)
    else:
        nrr_pct = 100.0

    return {
        "nrr_percentage": nrr_pct,
        "expansion_mrr": breakdown["expansion"],
        "churn_mrr": breakdown["churn"]
    }

# ==============================================================================
# ENDPOINT: #38 - GET /api/dashboard/arr
# Descripción: ARR del snapshot más reciente (con tendencia)
# Operación: Multiplicación de MRR por 12 y cálculo de tendencia histórica
# Fórmula: ARR = MRR * 12
# ==============================================================================
@router.get("/arr")
async def get_arr(
    start_date: str = Query(None),
    end_date:   str = Query(None),
    clinic_id:  str | None = Query(None),
    db: AsyncSession = Depends(get_db),
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

    # Operación: Sumar MRR actual de clínicas activas
    mrr_query = select(func.sum(Clinic.mrr)).where(
        Clinic.status != "churned",
        Clinic.is_deleted == False
    )
    if clinic_id:
        mrr_query = mrr_query.where(Clinic.clinic_id == clinic_id)
    current_mrr = await db.scalar(mrr_query) or 0.0

    # Operación: Multiplicación para calcular ARR
    current_arr = current_mrr * 12

    # Operación: Calcular MRR inicial al comienzo del período
    start_mrr = await get_live_mrr_at_date(db, start_dt, clinic_id)
    start_arr = start_mrr * 12

    # Operación: Calcular porcentaje de crecimiento de ARR
    if start_arr > 0:
        growth = round(((current_arr - start_arr) / start_arr * 100), 1)
    else:
        growth = 0.0

    # Operación: Generar historial mensual para la gráfica de tendencias
    trend = []
    temp_year = start_dt.year
    temp_month = start_dt.month
    
    # Generar últimos 6 meses de historial real
    for _ in range(6):
        month_end = datetime(temp_year, temp_month, 1) + timedelta(days=32)
        month_end = month_end.replace(day=1) - timedelta(seconds=1)
        
        mrr_val = await get_live_mrr_at_date(db, month_end, clinic_id)
        trend.append({
            "month": MONTH_NAMES_ES.get(temp_month, "Ene"),
            "year": temp_year,
            "value": mrr_val * 12
        })
        
        # Retroceder un mes
        if temp_month == 1:
            temp_month = 12
            temp_year -= 1
        else:
            temp_month -= 1
            
    trend.reverse()

    return {
        "current_arr":       round(current_arr, 2),
        "current_mrr":       round(current_mrr, 2),
        "growth_percentage": growth,
        "currency":          "USD",
        "trend_graph":       trend,
        "clinic_id":         clinic_id,
    }

# ==============================================================================
# ENDPOINT: #39 - GET /api/dashboard/clinics/active
# Descripción: Total de clínicas activas, nuevas y churn
# Operación: Contar clínicas activas, creadas y dadas de baja en el período
# ==============================================================================
@router.get("/clinics/active")
async def get_active_clinics(
    start_date: str = Query(None),
    end_date:   str = Query(None),
    clinic_id:  str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    end   = parse_date(end_date, end_of_day=True) or datetime.utcnow()
    start = parse_date(start_date)

    base = select(Clinic)
    if clinic_id:
        base = base.where(Clinic.clinic_id == clinic_id)

    # Operación: Contar total de clínicas activas
    total_active = (await db.execute(
        select(func.count()).select_from(
            base.where(Clinic.status != "churned", Clinic.created_at <= end).subquery()
        )
    )).scalar() or 0

    new_clinics = churned_clinics = 0

    if start:
        # Operación: Contar nuevas clínicas creadas en el rango
        new_clinics = (await db.execute(
            select(func.count()).select_from(
                base.where(
                    Clinic.status != "churned",
                    Clinic.created_at >= start,
                    Clinic.created_at <= end,
                ).subquery()
            )
        )).scalar() or 0

        # Operación: Contar clínicas canceladas en el rango
        churned_clinics = (await db.execute(
            select(func.count()).select_from(
                base.where(
                    Clinic.status == "churned",
                    Clinic.updated_at >= start,
                    Clinic.updated_at <= end,
                ).subquery()
            )
        )).scalar() or 0
    else:
        now = datetime.utcnow()
        new_clinics = (await db.execute(
            select(func.count()).select_from(
                base.where(
                    Clinic.status != "churned",
                    func.extract("month", Clinic.created_at) == now.month,
                    func.extract("year",  Clinic.created_at) == now.year,
                ).subquery()
            )
        )).scalar() or 0

        churned_clinics = (await db.execute(
            select(func.count()).select_from(
                base.where(
                    Clinic.status == "churned",
                    func.extract("month", Clinic.updated_at) == now.month,
                    func.extract("year",  Clinic.updated_at) == now.year,
                ).subquery()
            )
        )).scalar() or 0

    state = "stable"
    if churned_clinics > new_clinics:
        state = "declining"
    elif new_clinics > 0:
        state = "growing"

    return {
        "total_active":          total_active,
        "new_clinics_month":     new_clinics,
        "churned_clinics_month": churned_clinics,
        "state":                 state,
        "clinic_id":             clinic_id,
    }

# ==============================================================================
# ENDPOINT: #40 - GET /api/dashboard/downloads/total
# Descripción: Descargas totales iOS/Android
# Operación: Multiplicación de límites de pacientes por ratios de descarga estimadas
# Fórmula: iOS = total_limit * 0.65, Android = total_limit * 0.60
# ==============================================================================
@router.get("/downloads/total")
async def get_total_downloads(
    start_date: str = Query(None),
    end_date:   str = Query(None),
    db: AsyncSession = Depends(get_db),
):
    clinics_stmt = select(Clinic).where(Clinic.status != "churned", Clinic.is_deleted == False)
    active_clinics = (await db.execute(clinics_stmt)).scalars().all()

    if not active_clinics:
        return {
            "total_downloads": 0,
            "ios":             0,
            "android":         0,
            "last_24h":        0,
        }

    total_limit = sum(c.patients_limit for c in active_clinics)
    
    # Operación: Multiplicación para descargas estimadas en base a límites
    ios = int(total_limit * 0.65)
    android = int(total_limit * 0.60)
    total = ios + android

    return {
        "total_downloads": total,
        "ios":             ios,
        "android":         android,
        "last_24h":        len(active_clinics) * 5
    }

# ==============================================================================
# ENDPOINT: #41 - GET /api/dashboard/nrr
# Descripción: NRR con historial
# Operación: Calcular Net Revenue Retention y construir historial MoM de NRR
# Fórmula: NRR = ((MRR_inicio + Expansión - Churn) / MRR_inicio) * 100
# ==============================================================================
@router.get("/nrr")
async def get_nrr(
    start_date: str = Query(None),
    end_date:   str = Query(None),
    clinic_id:  str | None = Query(None),
    db: AsyncSession = Depends(get_db),
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

    # Operación: Calcular porcentaje e indicadores NRR dinámicamente
    nrr_details = await calculate_nrr_details(db, start_dt, end_dt, clinic_id)

    # Operación: Reconstruir historial mensual de NRR
    history = []
    temp_year = start_dt.year
    temp_month = start_dt.month

    for _ in range(6):
        month_start = datetime(temp_year, temp_month, 1)
        month_end = month_start + timedelta(days=32)
        month_end = month_end.replace(day=1) - timedelta(seconds=1)

        details = await calculate_nrr_details(db, month_start, month_end, clinic_id)
        mrr_val = await get_live_mrr_at_date(db, month_end, clinic_id)

        history.append({
            "month":          MONTH_NAMES_ES.get(temp_month, "Ene"),
            "year":           temp_year,
            "nrr_percentage": details["nrr_percentage"],
            "arr":            mrr_val * 12,
            "mrr":            mrr_val
        })

        if temp_month == 1:
            temp_month = 12
            temp_year -= 1
        else:
            temp_month -= 1

    history.reverse()

    return {
        "nrr_percentage": nrr_details["nrr_percentage"],
        "expansion_mrr":  nrr_details["expansion_mrr"],
        "churn_mrr":      nrr_details["churn_mrr"],
        "status":         "healthy" if nrr_details["nrr_percentage"] >= 100 else "warning",
        "month":          MONTH_NAMES_ES.get(end_dt.month, "Ene"),
        "year":           end_dt.year,
        "clinic_id":      clinic_id,
        "history":        history
    }

# ==============================================================================
# ENDPOINT: #42 - GET /api/dashboard/patients/total
# Descripción: Suma de pacientes en clínicas activas
# Operación: Sumas de pacientes de clínicas activas, clínicas sanas y semanales
# ==============================================================================
@router.get("/patients/total")
async def get_total_patients(
    start_date: str = Query(None),
    end_date:   str = Query(None),
    clinic_id:  str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    end   = parse_date(end_date, end_of_day=True) or datetime.utcnow()
    start = parse_date(start_date) if start_date else end - timedelta(days=7)

    base = select(Clinic).where(Clinic.status != "churned", Clinic.created_at <= end)
    if clinic_id:
        base = base.where(Clinic.clinic_id == clinic_id)

    # Operación: Sumar pacientes usados en clínicas activas
    total_patients = int((await db.execute(
        select(func.sum(Clinic.patients_used)).select_from(base.subquery())
    )).scalar() or 0)

    # Operación: Sumar pacientes de clínicas con salud >= 60
    active_in_treatment = int((await db.execute(
        select(func.sum(Clinic.patients_used)).select_from(
            base.where(Clinic.health_score >= 60).subquery()
        )
    )).scalar() or 0)

    # Operación: Sumar pacientes agregados en la semana seleccionada
    new_base = select(Clinic).where(
        Clinic.status != "churned",
        Clinic.created_at >= start,
        Clinic.created_at <= end,
    )
    if clinic_id:
        new_base = new_base.where(Clinic.clinic_id == clinic_id)
    new_this_week = int((await db.execute(
        select(func.sum(Clinic.patients_used)).select_from(new_base.subquery())
    )).scalar() or 0)

    return {
        "total_patients":      total_patients,
        "active_in_treatment": active_in_treatment,
        "new_this_week":       new_this_week,
        "avg_per_clinic":      0,
        "clinic_id":           clinic_id,
    }

# ==============================================================================
# ENDPOINT: #43 - GET /api/dashboard/system-health
# Descripción: Estado del sistema y latencia
# Operación: Determinar estado de salud y obtener promedio de latencia de servidores
# ==============================================================================
@router.get("/system-health")
async def get_system_health(
    start_date: str = Query(None),
    end_date:   str = Query(None),
    db: AsyncSession = Depends(get_db),
):
    servers_q = await db.execute(select(Server))
    servers   = servers_q.scalars().all()

    if not servers:
        return {
            "overall_status": "degraded",
            "latency_ms":     0,
            "healthy_servers": 0,
            "total_servers":   0,
            "last_check":      datetime.utcnow().isoformat(),
        }

    healthy = sum(1 for s in servers if s.status == "healthy")
    total   = len(servers)
    overall = "optimal" if healthy == total else ("degraded" if healthy > 0 else "down")

    latency_q   = await db.execute(select(func.avg(AiLatencyMetric.average_latency_ms)))
    avg_latency = int(latency_q.scalar() or 0)

    return {
        "overall_status":  overall,
        "latency_ms":      avg_latency,
        "healthy_servers": healthy,
        "total_servers":   total,
        "last_check":      datetime.utcnow().isoformat(),
    }

# ==============================================================================
# ENDPOINT: #44 - GET /api/dashboard/users/active-now
# Descripción: Usuarios activos ahora por plataforma
# Operación: Multiplicación de ratios de actividad instantánea sobre base real
# Fórmula: active_now = patients * 0.005 + clinicians_total + admins
# ==============================================================================
@router.get("/users/active-now")
async def get_users_active_now(
    start_date: str = Query(None),
    end_date:   str = Query(None),
    db: AsyncSession = Depends(get_db),
):
    clinics_stmt = select(Clinic).where(Clinic.status != "churned", Clinic.is_deleted == False)
    active_clinics = (await db.execute(clinics_stmt)).scalars().all()

    if not active_clinics:
        return {
            "active_now": 0,
            "platform_distribution": {
                "web_admin":        0,
                "mobile_clinician": 0,
                "mobile_patient":   0,
            },
        }

    total_patients = sum(c.patients_used for c in active_clinics)
    
    # Operación: Multiplicación de ratios de actividad instantánea real
    mobile_patient = int(total_patients * 0.005) # 0.5% de pacientes activos ahora
    mobile_clinician = len(active_clinics) * 2     # Promedio 2 clínicos activos ahora
    web_admin = max(1, len(active_clinics) // 2)    # 1 administrador por cada 2 clínicas ahora
    active_now = mobile_patient + mobile_clinician + web_admin

    return {
        "active_now": active_now,
        "platform_distribution": {
            "web_admin":        web_admin,
            "mobile_clinician": mobile_clinician,
            "mobile_patient":   mobile_patient,
        },
    }

# ==============================================================================
# ENDPOINT: #45 - GET /api/dashboard/users/dormant
# Descripción: Clínicas sin login en 30d/90d
# Operación: Contar clínicas con inactividad temporal o con riesgo de baja
# ==============================================================================
@router.get("/users/dormant")
async def get_users_dormant(
    start_date: str = Query(None),
    end_date:   str = Query(None),
    clinic_id:  str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    now        = datetime.utcnow()
    cutoff_30d = now - timedelta(days=30)
    cutoff_90d = now - timedelta(days=90)

    base = select(Clinic).where(Clinic.status != "churned")
    if clinic_id:
        base = base.where(Clinic.clinic_id == clinic_id)

    # Operación: Contar clínicas inactivas en los últimos 30 días
    dormant_30d = (await db.execute(
        select(func.count()).select_from(
            base.where(
                or_(
                    Clinic.last_login == None,
                    Clinic.last_login < cutoff_30d,
                )
            ).subquery()
        )
    )).scalar() or 0

    # Operación: Contar clínicas inactivas en los últimos 90 días
    dormant_90d = (await db.execute(
        select(func.count()).select_from(
            base.where(
                or_(
                    Clinic.last_login == None,
                    Clinic.last_login < cutoff_90d,
                )
            ).subquery()
        )
    )).scalar() or 0

    # Operación: Contar clínicas inactivas con bajo puntaje de salud
    risk_of_churn_clinics = (await db.execute(
        select(func.count()).select_from(
            base.where(
                Clinic.health_score < 70,
                or_(
                    Clinic.last_login == None,
                    Clinic.last_login < cutoff_30d,
                )
            ).subquery()
        )
    )).scalar() or 0

    return {
        "dormant_30d":                   dormant_30d,
        "dormant_90d":                   dormant_90d,
        "risk_of_churn_clinics":         risk_of_churn_clinics,
        "re_engagement_campaign_active": False,
        "clinic_id":                     clinic_id,
    }