from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from datetime import datetime
from app.db.neon import get_db
from app.models_db import MrrSnapshot, ChurnRiskRegion

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
    end_date: str = Query(None),
    db: AsyncSession = Depends(get_db)
):
    # Obtener el snapshot más reciente (podría filtrarse por fecha si tuvieras recorded_at)
    stmt = select(MrrSnapshot).order_by(MrrSnapshot.period_year.desc(), MrrSnapshot.id.desc())
    snapshot = (await db.execute(stmt)).scalars().first()
    if not snapshot:
        raise HTTPException(status_code=404, detail="No encontrado")
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
    stmt = select(ChurnRiskRegion)
    regions = (await db.execute(stmt)).scalars().all()
    return {
        "status": "success",
        "data": [
            {
                "region": r.region,
                "clinics_at_risk": r.clinics_at_risk,
                "potential_mrr_loss": r.potential_mrr_loss,
                "risk_level": r.risk_level
            }
            for r in regions
        ]
    }