from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.db.neon import get_db
from app.models_db import KpiSnapshot

router = APIRouter(prefix="/api/kpis", tags=["KPIs"])


@router.get("/nrr")
async def get_nrr(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(KpiSnapshot).order_by(desc(KpiSnapshot.year), desc(KpiSnapshot.id))
    )
    snapshots = result.scalars().all()

    if not snapshots:
        raise HTTPException(status_code=404, detail="No encontrado")

    latest = snapshots[0]

    return {
        "status": "success",
        "data": {
            "current": {
                "month": latest.month,
                "year": latest.year,
                "nrrPercentage": latest.nrr_percentage,
                "nrrStatus": latest.nrr_status,
                "arr": latest.arr,
                "mrr": latest.mrr,
                "expansionMrr": latest.expansion_mrr,
                "churnMrr": latest.churn_mrr,
            },
            "history": [
                {
                    "month": s.month,
                    "year": s.year,
                    "nrrPercentage": s.nrr_percentage,
                    "arr": s.arr,
                    "mrr": s.mrr,
                }
                for s in snapshots
            ],
        },
    }