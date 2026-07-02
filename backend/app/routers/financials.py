from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func, or_, and_
from datetime import datetime, timedelta
import json
from app.db.neon import get_db
from app.models_db import Clinic, ClinicPlan, MrrSnapshot

router = APIRouter(prefix="/api/financials", tags=["Financials"])

MONTH_NAMES_ES = {
    1: "Ene", 2: "Feb", 3: "Mar", 4: "Abr", 5: "May", 6: "Jun",
    7: "Jul", 8: "Ago", 9: "Sep", 10: "Oct", 11: "Nov", 12: "Dic"
}

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
# OPERACIÓN: calculate_mrr_breakdown_for_period
# Fórmulas:
#   1. Sumar MRR de clínicas activas en el período
#   2. Sumar MRR de nuevas clínicas creadas en el período
#   3. Sumar MRR de clínicas canceladas en el período
#   4. Calcular MRR retenido = Total MRR - New Business MRR
#   5. Calcular Expansión y Contracción comparando MRR actual con plan inicial
# ==============================================================================
async def calculate_mrr_breakdown_for_period(db: AsyncSession, start_dt: datetime, end_dt: datetime):
    # Operación: Seleccionar clínicas que estaban activas antes de la fecha final del período
    active_stmt = select(Clinic).where(
        Clinic.created_at <= end_dt,
        or_(
            and_(Clinic.is_deleted == False, Clinic.status != "churned"),
            and_(
                or_(Clinic.is_deleted == True, Clinic.status == "churned"),
                or_(
                    and_(Clinic.deleted_at != None, Clinic.deleted_at > end_dt),
                    and_(Clinic.updated_at != None, Clinic.updated_at > end_dt)
                )
            )
        )
    )
    result = await db.execute(active_stmt)
    active_clinics = result.scalars().all()
    
    # Operación: Sumar MRR total de clínicas activas
    total_mrr = sum(c.mrr for c in active_clinics)

    # Operación: Sumar MRR de nuevos negocios creados en el rango
    new_clinics = [c for c in active_clinics if c.created_at >= start_dt and c.created_at <= end_dt]
    new_business = sum(c.mrr for c in new_clinics)

    # Operación: Seleccionar clínicas eliminadas o churned en el rango
    churn_stmt = select(Clinic).where(
        or_(
            and_(Clinic.is_deleted == True, Clinic.deleted_at >= start_dt, Clinic.deleted_at <= end_dt),
            and_(Clinic.status == "churned", Clinic.updated_at >= start_dt, Clinic.updated_at <= end_dt)
        )
    )
    result_churn = await db.execute(churn_stmt)
    churn_clinics = result_churn.scalars().all()

    # Operación: Sumar MRR de pérdidas (churn)
    churn = 0.0
    for c in churn_clinics:
        if c.mrr > 0:
            churn += c.mrr
        else:
            plan_res = await db.execute(select(ClinicPlan).where(ClinicPlan.clinic_id == c.clinic_id))
            plan = plan_res.scalars().first()
            if plan:
                try:
                    snap = json.loads(plan.plan_snapshot)
                    churn += float(snap.get("monthlyPrice", 0.0))
                except:
                    pass

    # Operación: Calcular Expansión y Contracción para clínicas previas
    old_active_clinics = [c for c in active_clinics if c.created_at < start_dt]
    
    expansion = 0.0
    contraction = 0.0
    retained = 0.0

    for c in old_active_clinics:
        plan_res = await db.execute(
            select(ClinicPlan)
            .where(ClinicPlan.clinic_id == c.clinic_id)
            .order_by(ClinicPlan.created_at.asc())
        )
        plans = plan_res.scalars().all()
        
        base_price = c.mrr
        if plans:
            try:
                snap = json.loads(plans[0].plan_snapshot)
                base_price = float(snap.get("monthlyPrice", c.mrr))
            except:
                pass
        
        diff = c.mrr - base_price
        if diff > 0:
            expansion += diff
        elif diff < 0:
            contraction += abs(diff)
            
        retained += min(c.mrr, base_price)

    return {
        "total_mrr": round(total_mrr, 2),
        "new_business": round(new_business, 2),
        "expansion": round(expansion, 2),
        "contraction": round(contraction, 2),
        "churn": round(churn, 2),
        "retained": round(retained + new_business, 2)
    }

# ==============================================================================
# ENDPOINT: #52 - GET /api/financials/churn-risk/by-region
# Descripción: Riesgo de churn por región
# Operación: Agrupar riesgo y calcular pérdida de ingresos MRR potencial
# Fórmula: Pérdida = sum(mrr * (riesgo_score / 100)) (para health_score < 70)
# ==============================================================================
@router.get("/churn-risk/by-region")
async def get_churn_risk_by_region(
    start_date: str = Query(None),
    end_date: str = Query(None),
    db: AsyncSession = Depends(get_db)
):
    now = datetime.utcnow()
    end_dt = now
    if end_date:
        parsed_end = parse_date(end_date)
        if parsed_end:
            end_dt = parsed_end

    # Operación: Seleccionar clínicas creadas antes del fin del período y no eliminadas
    clinic_stmt = select(Clinic).where(
        Clinic.created_at <= end_dt,
        or_(
            Clinic.is_deleted == False,
            and_(Clinic.is_deleted == True, Clinic.deleted_at > end_dt)
        )
    )
    clinics = (await db.execute(clinic_stmt)).scalars().all()

    computed_at = datetime.utcnow()
    grouped: dict[str, dict] = {
        region: {
            "region": region,
            "clinic_count": 0,
            "evaluated_clinic_count": 0,
            "clinics_at_risk": 0,
            "potential_mrr_loss": 0.0,
            "risk_score_total": 0,
            "confidence_total": 0.0,
        }
        for region in CANONICAL_CHURN_REGIONS
    }

    # Operación: Calcular indicadores de riesgo y pérdida potencial de ingresos
    for clinic in clinics:
        health_score = getattr(clinic, "health_score", 100) or 100
        risk_score = 100 - health_score
        region = _canonical_churn_region(clinic.location)
        
        bucket = grouped[region]
        bucket["clinic_count"] += 1
        bucket["evaluated_clinic_count"] += 1
        bucket["risk_score_total"] += risk_score
        bucket["confidence_total"] += 0.90

        # Operación: Multiplicación de pérdida de ingresos potencial si salud < 70
        if health_score < 70:
            bucket["clinics_at_risk"] += 1
            bucket["potential_mrr_loss"] += (clinic.mrr or 0.0) * (risk_score / 100)

    data = []
    for region in CANONICAL_CHURN_REGIONS:
        bucket = grouped[region]
        if bucket["evaluated_clinic_count"] > 0:
            clinic_count = bucket["clinic_count"]
            evaluated_count = bucket["evaluated_clinic_count"]
            # Operación: Promedio de riesgo en la región
            avg_score = round(bucket["risk_score_total"] / evaluated_count)
            risk_level = "high" if avg_score >= 70 else "medium" if avg_score >= 45 else "low"
            data.append({
                "region": region,
                "clinic_count": clinic_count,
                "evaluated_clinic_count": evaluated_count,
                "clinics_at_risk": bucket["clinics_at_risk"],
                "potential_mrr_loss": round(bucket["potential_mrr_loss"], 2),
                "risk_level": risk_level,
                "risk_score": avg_score,
                "confidence": round(bucket["confidence_total"] / evaluated_count, 2),
                "model_version": "health-score-based",
                "computed_at": computed_at.isoformat() + "Z",
            })
        else:
            data.append({
                "region": region,
                "clinic_count": 0,
                "evaluated_clinic_count": 0,
                "clinics_at_risk": 0,
                "potential_mrr_loss": 0.0,
                "risk_level": "low",
                "risk_score": 0,
                "confidence": 0.0,
                "model_version": "health-score-based",
                "computed_at": computed_at.isoformat() + "Z",
            })

    return {
        "status": "success",
        "data": data,
    }

# ==============================================================================
# ENDPOINT: #53 - GET /api/financials/mrr/breakdown
# Descripción: Desglose del MRR más reciente
# Operación: Calcular desglose mensual y porcentaje de crecimiento respecto al mes anterior
# Fórmula: Growth % = ((actual_mrr - prev_mrr) / prev_mrr) * 100
# ==============================================================================
@router.get("/mrr/breakdown")
async def get_mrr_breakdown(
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
            if len(end_date) == 10:
                end_dt = parsed_end.replace(hour=23, minute=59, second=59)
            else:
                end_dt = parsed_end

    # Operación: Calcular desglose para el período
    breakdown = await calculate_mrr_breakdown_for_period(db, start_dt, end_dt)

    # Operación: Comparar con período anterior para tasa de crecimiento
    if start_date:
        start_mrr_breakdown = await calculate_mrr_breakdown_for_period(
            db, start_dt - timedelta(days=(end_dt - start_dt).days), start_dt
        )
        prev_mrr = start_mrr_breakdown["total_mrr"]
    else:
        prev_month_start = (start_dt - timedelta(days=1)).replace(day=1)
        prev_month_end = start_dt - timedelta(seconds=1)
        prev_mrr_breakdown = await calculate_mrr_breakdown_for_period(db, prev_month_start, prev_month_end)
        prev_mrr = prev_mrr_breakdown["total_mrr"]

    # Operación: Porcentaje de crecimiento = ((actual - anterior) / anterior) * 100
    if prev_mrr > 0:
        monthly_growth_percentage = round(((breakdown["total_mrr"] - prev_mrr) / prev_mrr) * 100, 1)
    else:
        monthly_growth_percentage = 0.0

    return {
        "status": "success",
        "data": {
            "total_mrr": breakdown["total_mrr"],
            "currency": "USD",
            "breakdown": {
                "new_business": breakdown["new_business"],
                "expansion": breakdown["expansion"],
                "contraction": breakdown["contraction"],
                "churn": breakdown["churn"],
                "retained": breakdown["retained"]
            },
            "monthly_growth_percentage": monthly_growth_percentage
        }
    }

# ==============================================================================
# ENDPOINT: #54 - GET /api/financials/mrr/snapshots
# Descripción: Historial completo de snapshots MRR
# Operación: Iteración mensual para construir línea de tiempo histórica MoM
# ==============================================================================
@router.get("/mrr/snapshots")
async def get_mrr_snapshots(
    start_date: str = Query(None),
    end_date: str = Query(None),
    db: AsyncSession = Depends(get_db)
):
    clinic_stmt = select(Clinic).order_by(Clinic.created_at.asc())
    result = await db.execute(clinic_stmt)
    clinics = result.scalars().all()

    if not clinics:
        return {"status": "success", "data": []}

    first_clinic = clinics[0]
    start_year = first_clinic.created_at.year
    start_month = first_clinic.created_at.month

    now = datetime.utcnow()
    current_year = now.year
    current_month = now.month

    data = []
    temp_year = start_year
    temp_month = start_month

    # Operación: Generar snapshots agregados mensualmente
    while (temp_year < current_year) or (temp_year == current_year and temp_month <= current_month):
        period_start = datetime(temp_year, temp_month, 1)
        if temp_month == 12:
            period_end = datetime(temp_year + 1, 1, 1) - timedelta(seconds=1)
        else:
            period_end = datetime(temp_year, temp_month + 1, 1) - timedelta(seconds=1)

        breakdown = await calculate_mrr_breakdown_for_period(db, period_start, period_end)

        # Operación: Crecimiento respecto al mes anterior del bucle
        if len(data) > 0:
            prev_total = data[-1]["total_mrr"]
            if prev_total > 0:
                growth = round(((breakdown["total_mrr"] - prev_total) / prev_total) * 100, 1)
            else:
                growth = 0.0
        else:
            growth = 0.0

        data.append({
            "period_month": MONTH_NAMES_ES.get(temp_month, "Ene"),
            "period_year": temp_year,
            "total_mrr": breakdown["total_mrr"],
            "new_business": breakdown["new_business"],
            "expansion": breakdown["expansion"],
            "contraction": breakdown["contraction"],
            "churn": breakdown["churn"],
            "retained": breakdown["retained"],
            "monthly_growth_percentage": growth
        })

        if temp_month == 12:
            temp_month = 1
            temp_year += 1
        else:
            temp_month += 1

    return {
        "status": "success",
        "data": data
    }

CANONICAL_CHURN_REGIONS = ["North America", "LATAM", "Europe", "Asia Pacific"]

def _canonical_churn_region(location: str | None) -> str:
    raw = (location or "").strip().lower()
    if any(token in raw for token in ["north america", "usa", "united states", "canada", "mexico"]):
        return "North America"
    if any(token in raw for token in ["latam", "latin", "chile", "argentina", "peru", "colombia", "brazil", "brasil", "santiago"]):
        return "LATAM"
    if any(token in raw for token in ["europe", "europa", "spain", "france", "germany", "italy", "uk", "united kingdom"]):
        return "Europe"
    if any(token in raw for token in ["asia", "pacific", "apac", "australia", "japan", "singapore"]):
        return "Asia Pacific"
    return "LATAM"
