from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, asc
from app.db.neon import get_db
from app.models_db import MrrSnapshot, ChurnRiskRegion

router = APIRouter(
    prefix="/api/financials",
    tags=["Financials"]
)

# 12. GET /financials/mrr/breakdown
@router.get("/mrr/breakdown")
async def get_mrr_breakdown(db: AsyncSession = Depends(get_db)):
    # Obtenemos el registro más reciente ordenando por ID o created_at (asumiendo id autoincremental o UUID secuencial)
    result = await db.execute(select(MrrSnapshot).order_by(desc(MrrSnapshot.id)))
    snapshot = result.scalars().first()

    if not snapshot:
        raise HTTPException(status_code=404, detail="No encontrado")

    # Asumiendo que si total_mrr no está directo en la tabla, lo calculamos de los componentes
    total_mrr = getattr(snapshot, "total_mrr", 
                        snapshot.new_business + snapshot.expansion + snapshot.contraction + snapshot.churn + snapshot.retained)
    currency = getattr(snapshot, "currency", "USD")

    return {
        "status": "success",
        "data": {
            "total_mrr": total_mrr,
            "currency": currency,
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

# 13. GET /financials/churn-risk/by-region
@router.get("/churn-risk/by-region")
async def get_churn_risk_by_region(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ChurnRiskRegion))
    regions = result.scalars().all()

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