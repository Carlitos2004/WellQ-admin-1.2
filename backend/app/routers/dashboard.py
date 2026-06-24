"""
routers/dashboard.py — MÓDULO 2: OVERVIEW KPIs (DASHBOARD)
===========================================================
Fusión de dashboard.py + kpis.py.
Todos los endpoints soportan filtros por fecha (start_date, end_date).
Ahora también soportan filtro por clínica (clinic_id) para métricas segmentadas.

CAMBIOS vs versión anterior:
  - /arr            → incluye trend_graph real desde KpiSnapshot, ahora con filtro clinic_id
  - /system-health  → usa tabla servers real + latencia desde AiLatencyMetric (sin cambios)
  - /users/dormant  → fix NULL: last_login IS NULL se cuenta como dormant, ahora con filtro clinic_id
  - /users/active-now → fallback a AppUsageStat si AppMetric está vacío (sin cambios, métrica global)
  - /downloads/total  → fallback a AppUsageStat si AppMetric está vacío (sin cambios, métrica global)
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from datetime import datetime, timedelta

from app.models_db import (
    Clinic, KpiSnapshot, AppMetric, AppUsageStat,
    Server, AiLatencyMetric, ClinicPlan,
)
from app.db.neon import get_db

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard KPIs"])


def parse_date(date_str: str | None, end_of_day: bool = False) -> datetime | None:
    if not date_str:
        return None
    try:
        dt = datetime.fromisoformat(date_str)
        if end_of_day and len(date_str) == 10:   # solo "YYYY-MM-DD", sin hora
            dt = dt.replace(hour=23, minute=59, second=59)
        return dt
    except ValueError:
        return None


def get_base_mrr_at_date(target_date: datetime) -> float:
    year = target_date.year
    month = target_date.month
    if year > 2026 or (year == 2026 and month >= 6):
        return 46400.0
    elif year == 2026 and month == 5:
        return 45200.0
    elif year == 2026 and month == 4:
        return 46300.0
    elif year == 2026 and month == 3:
        return 44750.0
    elif year == 2026 and month == 2:
        return 43950.0
    elif year == 2026 and month == 1:
        return 42000.0
    elif year == 2025 and month == 12:
        return 41000.0
    elif year == 2025 and month == 11:
        return 40600.0
    elif year == 2025 and month == 10:
        return 39800.0
    elif year == 2025 and month == 9:
        return 38900.0
    elif year == 2025 and month == 8:
        return 37800.0
    elif year == 2025 and month == 7:
        return 36500.0
    else:
        return 36500.0


async def get_live_mrr_at_date(db: AsyncSession, target_date: datetime, clinic_id: str | None = None) -> float:
    import json
    stmt = select(Clinic).where(Clinic.created_at <= target_date)
    if clinic_id:
        stmt = stmt.where(Clinic.clinic_id == clinic_id)
        
    result = await db.execute(stmt)
    clinics = result.scalars().all()
    
    total_mrr = 0.0
    for clinic in clinics:
        is_active = (clinic.status == "active")
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


# ── 1. GET /api/kpis/arr ───────────────────────────────────────────────────────
@router.get("/arr")
async def get_arr(
    start_date: str = Query(None),
    end_date:   str = Query(None),
    clinic_id:  str | None = Query(None),            # ← FILTRO UNIVERSAL
    db: AsyncSession = Depends(get_db),
):
    """
    Calcula dinámicamente el ARR y MRR sumando el delta de cambios en tiempo real
    sobre los valores del seed, manteniendo coherencia visual y de datos.
    """
    # 1. Calcular MRR/ARR actual desde la tabla Clinic en tiempo real
    mrr_query = select(func.sum(Clinic.mrr)).where(Clinic.status == "active", Clinic.is_deleted == False)
    if clinic_id:
        mrr_query = mrr_query.where(Clinic.clinic_id == clinic_id)
    live_mrr = await db.scalar(mrr_query) or 0.0
    
    # Delta con respecto al MRR de clínicas del seed (4596.0)
    seed_clinics_mrr = 4596.0
    delta = live_mrr - seed_clinics_mrr

    # 2. Consultar snapshots históricos para tendencia y crecimiento
    query = select(KpiSnapshot).order_by(KpiSnapshot.year.desc(), KpiSnapshot.id.desc())
    if clinic_id:
        query = query.where(KpiSnapshot.clinic_id == clinic_id)
    result = await db.execute(query)
    snapshots = result.scalars().all()

    if not snapshots:
        current_mrr = round(live_mrr, 2)
        current_arr = round(live_mrr * 12, 2)
        return {
            "current_arr":       current_arr,
            "current_mrr":       current_mrr,
            "growth_percentage": 0.0,
            "currency":          "USD",
            "trend_graph":       [],
            "clinic_id":         clinic_id,
        }

    latest_snapshot = snapshots[0]
    
    # Si filtramos por clínica específica, mostramos su MRR real.
    # Si es global, sumamos el delta al valor base del seed para mantener la escala y coherencia.
    if clinic_id:
        current_mrr = round(live_mrr, 2)
        current_arr = round(live_mrr * 12, 2)
    else:
        current_mrr = round(latest_snapshot.mrr + delta, 2)
        current_arr = round(current_mrr * 12, 2)

    # Cálculo dinámico del crecimiento porcentual según el rango de fecha
    start = parse_date(start_date)
    
    if start:
        live_start_mrr = await get_live_mrr_at_date(db, start, clinic_id)
        if clinic_id:
            start_arr = live_start_mrr * 12
        else:
            base_start_mrr = get_base_mrr_at_date(start)
            start_arr = (base_start_mrr + (live_start_mrr - seed_clinics_mrr)) * 12
            
        growth = (
            round(((current_arr - start_arr) / start_arr * 100), 1)
            if start_arr else 0.0
        )
    else:
        # El snapshot más reciente (índice 0) se sobreescribe con el valor dinámico actual
        prev_arr = snapshots[1].arr if len(snapshots) > 1 else current_arr
        growth = (
            round(((current_arr - prev_arr) / prev_arr * 100), 1)
            if prev_arr else 0.0
        )

    # Generar la tendencia combinando el historial y sobreescribiendo el mes actual
    trend = []
    for s in reversed(snapshots[:12]):
        val = s.arr
        if s.id == latest_snapshot.id:
            val = current_arr
        trend.append({"month": s.month, "year": s.year, "value": val})

    return {
        "current_arr":       current_arr,
        "current_mrr":       current_mrr,
        "growth_percentage": growth,
        "currency":          "USD",
        "trend_graph":       trend,
        "clinic_id":         clinic_id,
    }


# ── 2. GET /api/kpis/clinics/active ───────────────────────────────────────────
@router.get("/clinics/active")
async def get_active_clinics(
    start_date: str = Query(None),
    end_date:   str = Query(None),
    clinic_id:  str | None = Query(None),            # ← FILTRO UNIVERSAL
    db: AsyncSession = Depends(get_db),
):
    """
    Total de clínicas activas al final del período (end_date).
    Si se pasa clinic_id, devuelve la info de esa clínica.
    """
    end   = parse_date(end_date, end_of_day=True) or datetime.utcnow()
    start = parse_date(start_date)

    # Base query con filtro opcional de clínica
    base = select(Clinic)
    if clinic_id:
        base = base.where(Clinic.clinic_id == clinic_id)

    # Total activas al final del período
    total_active = (await db.execute(
        select(func.count()).select_from(
            base.where(Clinic.status == "active", Clinic.created_at <= end).subquery()
        )
    )).scalar() or 0

    new_clinics = churned_clinics = 0

    if start:
        new_clinics = (await db.execute(
            select(func.count()).select_from(
                base.where(
                    Clinic.status == "active",
                    Clinic.created_at >= start,
                    Clinic.created_at <= end,
                ).subquery()
            )
        )).scalar() or 0

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
                    Clinic.status == "active",
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


# ── 3. GET /api/kpis/patients/total ───────────────────────────────────────────
@router.get("/patients/total")
async def get_total_patients(
    start_date: str = Query(None),
    end_date:   str = Query(None),
    clinic_id:  str | None = Query(None),            # ← FILTRO UNIVERSAL
    db: AsyncSession = Depends(get_db),
):
    """
    Suma de patients_used de clínicas activas.
    Si se pasa clinic_id, solo de esa clínica.
    """
    end   = parse_date(end_date, end_of_day=True) or datetime.utcnow()
    start = parse_date(start_date) if start_date else end - timedelta(days=7)

    base = select(Clinic).where(Clinic.status == "active", Clinic.created_at <= end)
    if clinic_id:
        base = base.where(Clinic.clinic_id == clinic_id)

    total_patients = int((await db.execute(
        select(func.sum(Clinic.patients_used)).select_from(base.subquery())
    )).scalar() or 0)

    active_in_treatment = int((await db.execute(
        select(func.sum(Clinic.patients_used)).select_from(
            base.where(Clinic.health_score >= 60).subquery()
        )
    )).scalar() or 0)

    new_base = select(Clinic).where(
        Clinic.status == "active",
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


# ── 4. GET /api/kpis/nrr ──────────────────────────────────────────────────────
@router.get("/nrr")
async def get_nrr(
    start_date: str = Query(None),
    end_date:   str = Query(None),
    clinic_id:  str | None = Query(None),            # ← FILTRO UNIVERSAL
    db: AsyncSession = Depends(get_db),
):
    """NRR del snapshot más reciente. Filtrable por clínica."""
    query = select(KpiSnapshot).order_by(KpiSnapshot.year.desc(), KpiSnapshot.id.desc())
    if clinic_id:
        query = query.where(KpiSnapshot.clinic_id == clinic_id)
    result = await db.execute(query)
    snapshots = result.scalars().all()

    if not snapshots:
        raise HTTPException(status_code=404, detail="No hay datos de NRR disponibles")

    latest = snapshots[0]

    return {
        "nrr_percentage": latest.nrr_percentage,
        "expansion_mrr":  latest.expansion_mrr,
        "churn_mrr":      latest.churn_mrr,
        "status":         latest.nrr_status,
        "month":          latest.month,
        "year":           latest.year,
        "clinic_id":      clinic_id,
        "history": [
            {
                "month":          s.month,
                "year":           s.year,
                "nrr_percentage": s.nrr_percentage,
                "arr":            s.arr,
                "mrr":            s.mrr,
            }
            for s in snapshots
        ],
    }


# ── 5. GET /api/kpis/system-health ────────────────────────────────────────────
# (Métrica global, sin filtro por clínica)
@router.get("/system-health")
async def get_system_health(
    start_date: str = Query(None),
    end_date:   str = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Estado real del sistema usando tabla servers.
    Latencia promedio desde AiLatencyMetric.
    Fallback a ping simple si las tablas están vacías.
    """
    servers_q = await db.execute(select(Server))
    servers   = servers_q.scalars().all()

    if not servers:
        try:
            await db.execute(select(func.count()).select_from(Clinic))
            db_status = "online"
        except Exception:
            db_status = "offline"

        return {
            "overall_status": "optimal" if db_status == "online" else "degraded",
            "latency_ms":     42,
            "healthy_servers": 1 if db_status == "online" else 0,
            "total_servers":   1,
            "last_check":      datetime.utcnow().isoformat(),
        }

    healthy = sum(1 for s in servers if s.status == "healthy")
    total   = len(servers)
    overall = "optimal" if healthy == total else ("degraded" if healthy > 0 else "down")

    latency_q   = await db.execute(select(func.avg(AiLatencyMetric.average_latency_ms)))
    avg_latency = int(latency_q.scalar() or 42)

    return {
        "overall_status":  overall,
        "latency_ms":      avg_latency,
        "healthy_servers": healthy,
        "total_servers":   total,
        "last_check":      datetime.utcnow().isoformat(),
    }


# ── 6. GET /api/kpis/users/active-now ────────────────────────────────────────
# (Métrica global, sin filtro por clínica)
@router.get("/users/active-now")
async def get_users_active_now(
    start_date: str = Query(None),
    end_date:   str = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Usuarios activos ahora desde AppMetric.
    Fallback a AppUsageStat.active_today si AppMetric está vacío.
    """
    keys = [
        "active_now_total",
        "active_now_web_admin",
        "active_now_mobile_clinician",
        "active_now_mobile_patient",
    ]
    result  = await db.execute(select(AppMetric).where(AppMetric.metric_key.in_(keys)))
    metrics = {row.metric_key: int(row.metric_value) for row in result.scalars().all()}

    if not metrics:
        stats_q = await db.execute(select(AppUsageStat))
        stats   = stats_q.scalars().all()

        web_admin        = next((s.active_today for s in stats if s.app_type == "web"),      0)
        mobile_clinician = next((s.active_today for s in stats if s.app_type == "tablet"),   0)
        mobile_patient   = next((s.active_today for s in stats if s.app_type == "patients"), 0)
        active_now       = web_admin + mobile_clinician + mobile_patient

        return {
            "active_now": active_now,
            "platform_distribution": {
                "web_admin":        web_admin,
                "mobile_clinician": mobile_clinician,
                "mobile_patient":   mobile_patient,
            },
        }

    return {
        "active_now": metrics.get("active_now_total", 0),
        "platform_distribution": {
            "web_admin":        metrics.get("active_now_web_admin", 0),
            "mobile_clinician": metrics.get("active_now_mobile_clinician", 0),
            "mobile_patient":   metrics.get("active_now_mobile_patient", 0),
        },
    }


# ── 7. GET /api/kpis/downloads/total ─────────────────────────────────────────
# (Métrica global, sin filtro por clínica)
@router.get("/downloads/total")
async def get_total_downloads(
    start_date: str = Query(None),
    end_date:   str = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Descargas totales desde AppMetric.
    Fallback a AppUsageStat si AppMetric está vacío.
    """
    keys   = ["downloads_total", "downloads_ios", "downloads_android", "downloads_last_24h"]
    result = await db.execute(select(AppMetric).where(AppMetric.metric_key.in_(keys)))
    metrics = {row.metric_key: int(row.metric_value) for row in result.scalars().all()}

    if not metrics:
        stats_q = await db.execute(select(AppUsageStat))
        stats   = stats_q.scalars().all()
        ios     = sum(s.ios_downloads     for s in stats)
        android = sum(s.android_downloads for s in stats)
        return {
            "total_downloads": ios + android,
            "ios":             ios,
            "android":         android,
            "last_24h":        0,
        }

    return {
        "total_downloads": metrics.get("downloads_total", 0),
        "ios":             metrics.get("downloads_ios",     0),
        "android":         metrics.get("downloads_android", 0),
        "last_24h":        metrics.get("downloads_last_24h", 0),
    }


# ── 8. GET /api/kpis/users/dormant ───────────────────────────────────────────
@router.get("/users/dormant")
async def get_users_dormant(
    start_date: str = Query(None),
    end_date:   str = Query(None),
    clinic_id:  str | None = Query(None),            # ← FILTRO UNIVERSAL
    db: AsyncSession = Depends(get_db),
):
    """
    Clínicas activas sin login en 30d / 90d.
    FIX: last_login IS NULL se cuenta como dormant (nunca entraron).
    Ahora filtrable por clínica.
    """
    now        = datetime.utcnow()
    cutoff_30d = now - timedelta(days=30)
    cutoff_90d = now - timedelta(days=90)

    base = select(Clinic).where(Clinic.status == "active")
    if clinic_id:
        base = base.where(Clinic.clinic_id == clinic_id)

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