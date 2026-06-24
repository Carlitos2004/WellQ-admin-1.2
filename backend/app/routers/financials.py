from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func
from datetime import datetime
from app.db.neon import get_db
from app.models_db import MrrSnapshot, Clinic, ClinicUsageMetric

router = APIRouter(prefix="/api/financials", tags=["Financials"])


def parse_date(date_str: str | None) -> datetime | None:
    if not date_str:
        return None
    try:
        return datetime.fromisoformat(date_str)
    except ValueError:
        return None

@router.get("/mrr/breakdown")
async def get_mrr_breakdown(
    start_date: str = Query(None),
    end_date:   str = Query(None),
    db: AsyncSession = Depends(get_db)
):
    # 1. Calcular el MRR total actual desde la tabla Clinic en tiempo real
    mrr_query = select(func.sum(Clinic.mrr)).where(Clinic.status == "active", Clinic.is_deleted == False)
    live_mrr = await db.scalar(mrr_query) or 0.0
    
    # Delta con respecto al MRR de clínicas del seed (4596.0)
    seed_clinics_mrr = 4596.0
    delta = live_mrr - seed_clinics_mrr

    # 2. Obtener el snapshot más reciente para el resto del desglose
    stmt = select(MrrSnapshot).order_by(MrrSnapshot.period_year.desc(), MrrSnapshot.id.desc())
    snapshot = (await db.execute(stmt)).scalars().first()
    
    if not snapshot:
        return {
            "status": "success",
            "data": {
                "total_mrr": round(live_mrr, 2),
                "currency": "USD",
                "breakdown": {
                    "new_business": 0.0,
                    "expansion": 0.0,
                    "contraction": 0.0,
                    "churn": 0.0,
                    "retained": round(live_mrr, 2)
                },
                "monthly_growth_percentage": 0.0
            }
        }
    
    # Sumar el delta al valor del seed para mantener coherencia en escala
    total_mrr = round(snapshot.total_mrr + delta, 2)
    new_business = snapshot.new_business or 0.0
    expansion = snapshot.expansion or 0.0
    retained = max(0.0, round(snapshot.retained + delta, 2))

    # Cálculo dinámico del crecimiento porcentual según el rango de fecha
    start = parse_date(start_date)
    
    if start:
        from app.routers.dashboard import get_live_mrr_at_date, get_base_mrr_at_date
        live_start_mrr = await get_live_mrr_at_date(db, start)
        base_start_mrr = get_base_mrr_at_date(start)
        start_mrr = base_start_mrr + (live_start_mrr - seed_clinics_mrr)
        
        monthly_growth_percentage = (
            round(((total_mrr - start_mrr) / start_mrr * 100), 1)
            if start_mrr else 0.0
        )
    else:
        # Crecimiento MoM comparando con el snapshot anterior
        stmt2 = select(MrrSnapshot).order_by(MrrSnapshot.period_year.desc(), MrrSnapshot.id.desc()).limit(2)
        snapshots = (await db.execute(stmt2)).scalars().all()
        if len(snapshots) > 1:
            prev_mrr = snapshots[1].total_mrr
            monthly_growth_percentage = round(((total_mrr - prev_mrr) / prev_mrr * 100), 1)
        else:
            monthly_growth_percentage = snapshot.monthly_growth_percentage or 0.0

    return {
        "status": "success",
        "data": {
            "total_mrr": total_mrr,
            "currency": snapshot.currency or "USD",
            "breakdown": {
                "new_business": new_business,
                "expansion": expansion,
                "contraction": snapshot.contraction or 0.0,
                "churn": snapshot.churn or 0.0,
                "retained": retained
            },
            "monthly_growth_percentage": monthly_growth_percentage
        }
    }

@router.get("/mrr/snapshots")
async def get_mrr_snapshots(
    start_date: str = Query(None),
    end_date: str = Query(None),
    db: AsyncSession = Depends(get_db)
):
    # Calcular delta en vivo
    mrr_query = select(func.sum(Clinic.mrr)).where(Clinic.status == "active", Clinic.is_deleted == False)
    live_mrr = await db.scalar(mrr_query) or 0.0
    seed_clinics_mrr = 4596.0
    delta = live_mrr - seed_clinics_mrr

    stmt = select(MrrSnapshot).order_by(MrrSnapshot.period_year.asc(), MrrSnapshot.id.asc())
    snapshots = (await db.execute(stmt)).scalars().all()
    
    data = []
    for i, s in enumerate(snapshots):
        total_mrr = s.total_mrr
        retained = s.retained
        new_business = s.new_business
        expansion = s.expansion
        monthly_growth_percentage = s.monthly_growth_percentage
        
        # Aplicar delta al último snapshot del historial
        if i == len(snapshots) - 1:
            total_mrr = round(total_mrr + delta, 2)
            retained = max(0.0, round(retained + delta, 2))
            if len(snapshots) > 1:
                prev_total = snapshots[i - 1].total_mrr
                monthly_growth_percentage = round(((total_mrr - prev_total) / prev_total) * 100, 1)
                
        data.append({
            "period_month": s.period_month,
            "period_year": s.period_year,
            "total_mrr": total_mrr,
            "new_business": new_business,
            "expansion": expansion,
            "contraction": s.contraction,
            "churn": s.churn,
            "retained": retained,
            "monthly_growth_percentage": monthly_growth_percentage,
        })
        
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


@router.get("/churn-risk/by-region")
async def get_churn_risk_by_region(
    start_date: str = Query(None),
    end_date: str = Query(None),
    db: AsyncSession = Depends(get_db)
):
    clinic_stmt = select(Clinic).where(Clinic.is_deleted == False)
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

    for clinic in clinics:
        health_score = getattr(clinic, "health_score", 100) or 100
        risk_score = 100 - health_score
        region = _canonical_churn_region(clinic.location)
        
        bucket = grouped[region]
        bucket["clinic_count"] += 1
        bucket["evaluated_clinic_count"] += 1
        bucket["risk_score_total"] += risk_score
        bucket["confidence_total"] += 0.90

        if health_score < 70:
            bucket["clinics_at_risk"] += 1
            bucket["potential_mrr_loss"] += (clinic.mrr or 0.0) * (risk_score / 100)

    static_seeds = {
        "North America": {"clinics_at_risk": 2, "potential_mrr_loss": 598.0,  "risk_level": "low",    "risk_score": 25, "confidence": 0.58, "model_version": "seeded-fallback"},
        "LATAM":         {"clinics_at_risk": 5, "potential_mrr_loss": 1495.0, "risk_level": "medium", "risk_score": 50, "confidence": 0.58, "model_version": "seeded-fallback"},
        "Europe":        {"clinics_at_risk": 1, "potential_mrr_loss": 299.0,  "risk_level": "low",    "risk_score": 25, "confidence": 0.58, "model_version": "seeded-fallback"},
        "Asia Pacific":  {"clinics_at_risk": 3, "potential_mrr_loss": 897.0,  "risk_level": "medium", "risk_score": 50, "confidence": 0.58, "model_version": "seeded-fallback"},
    }

    data = []
    for region in CANONICAL_CHURN_REGIONS:
        bucket = grouped[region]
        if bucket["evaluated_clinic_count"] > 0:
            clinic_count = bucket["clinic_count"]
            evaluated_count = bucket["evaluated_clinic_count"]
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
            seed = static_seeds.get(region)
            data.append({
                "region": region,
                "clinic_count": 0,
                "evaluated_clinic_count": 0,
                "clinics_at_risk": seed["clinics_at_risk"],
                "potential_mrr_loss": seed["potential_mrr_loss"],
                "risk_level": seed["risk_level"],
                "risk_score": seed["risk_score"],
                "confidence": seed["confidence"],
                "model_version": seed["model_version"],
                "computed_at": computed_at.isoformat() + "Z",
            })

    return {
        "status": "success",
        "data": data,
    }

