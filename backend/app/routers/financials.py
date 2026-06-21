from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from datetime import datetime
from app.db.neon import get_db
from app.models_db import MrrSnapshot, ChurnRiskRegion, Clinic, ClinicUsageMetric
from app.services.churn_prediction_service import MODEL_VERSION, compute_churn_prediction

router = APIRouter(prefix="/api/financials", tags=["Financials"])

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
    end_date: str = Query(None),
    db: AsyncSession = Depends(get_db)
):
    # Obtener el snapshot más reciente
    stmt = select(MrrSnapshot).order_by(MrrSnapshot.period_year.desc(), MrrSnapshot.id.desc())
    snapshot = (await db.execute(stmt)).scalars().first()
    
    # ✨ FIX: Fallback seguro con ceros en lugar de Error 404 ✨
    if not snapshot:
        return {
            "status": "success",
            "data": {
                "total_mrr": 0,
                "currency": "USD",
                "breakdown": {
                    "new_business": 0,
                    "expansion": 0,
                    "contraction": 0,
                    "churn": 0,
                    "retained": 0
                },
                "monthly_growth_percentage": 0
            }
        }
        
    return {
        "status": "success",
        "data": {
            "total_mrr": snapshot.total_mrr,
            "currency": snapshot.currency,
            "breakdown": {
                "new_business": snapshot.new_business,
                "expansion": snapshot.expansion,
                "contraction": snapshot.contraction,
                "churn": snapshot.churn,
                "retained": snapshot.retained
            },
            "monthly_growth_percentage": snapshot.monthly_growth_percentage
        }
    }

@router.get("/mrr/snapshots")
async def get_mrr_snapshots(
    start_date: str = Query(None),
    end_date: str = Query(None),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(MrrSnapshot).order_by(MrrSnapshot.period_year.asc(), MrrSnapshot.id.asc())
    snapshots = (await db.execute(stmt)).scalars().all()
    return {
        "status": "success",
        "data": [
            {
                "period_month": s.period_month,
                "period_year": s.period_year,
                "total_mrr": s.total_mrr,
                "new_business": s.new_business,
                "expansion": s.expansion,
                "contraction": s.contraction,
                "churn": s.churn,
                "retained": s.retained,
                "monthly_growth_percentage": s.monthly_growth_percentage,
            }
            for s in snapshots
        ]
    }

@router.get("/churn-risk/by-region")
async def get_churn_risk_by_region(
    start_date: str = Query(None),
    end_date: str = Query(None),
    db: AsyncSession = Depends(get_db)
):
    seed_stmt = select(ChurnRiskRegion)
    seed_regions = (await db.execute(seed_stmt)).scalars().all()
    seed_by_region = {r.region: r for r in seed_regions}
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
        usage_stmt = (
            select(ClinicUsageMetric)
            .where(ClinicUsageMetric.clinic_id == clinic.clinic_id)
            .order_by(desc(ClinicUsageMetric.recorded_at))
            .limit(1)
        )
        usage = (await db.execute(usage_stmt)).scalar_one_or_none()
        prediction = compute_churn_prediction(clinic, usage, now=computed_at)

        region = _canonical_churn_region(clinic.location)
        bucket = grouped[region]
        bucket["clinic_count"] += 1

        if prediction.risk_level == "insufficient_data":
            continue

        bucket["evaluated_clinic_count"] += 1
        bucket["risk_score_total"] += prediction.risk_score
        bucket["confidence_total"] += prediction.confidence

        if prediction.risk_score >= 45:
            bucket["clinics_at_risk"] += 1
            bucket["potential_mrr_loss"] += (clinic.mrr or 0.0) * (prediction.risk_score / 100)

    data = []
    for region in CANONICAL_CHURN_REGIONS:
        bucket = grouped[region]
        seed = seed_by_region.get(region)
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
                "model_version": MODEL_VERSION,
                "computed_at": computed_at.isoformat() + "Z",
            })
        elif bucket["clinic_count"] > 0:
            data.append({
                "region": region,
                "clinic_count": bucket["clinic_count"],
                "evaluated_clinic_count": 0,
                "clinics_at_risk": 0,
                "potential_mrr_loss": 0.0,
                "risk_level": "insufficient_data",
                "risk_score": None,
                "confidence": None,
                "prediction_status": "insufficient_data",
                "model_version": MODEL_VERSION,
                "computed_at": computed_at.isoformat() + "Z",
            })
        elif seed:
            seed_level = str(seed.risk_level).lower()
            data.append({
                "region": region,
                "clinic_count": 0,
                "evaluated_clinic_count": 0,
                "clinics_at_risk": seed.clinics_at_risk,
                "potential_mrr_loss": seed.potential_mrr_loss,
                "risk_level": seed_level,
                "risk_score": 70 if seed_level == "high" else 50 if seed_level == "medium" else 25,
                "confidence": 0.58,
                "model_version": "seeded-fallback",
                "computed_at": seed.recorded_at.isoformat() + "Z" if seed.recorded_at else None,
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
                "model_version": MODEL_VERSION,
                "computed_at": computed_at.isoformat() + "Z",
            })

    return {
        "status": "success",
        "data": data,
    }
