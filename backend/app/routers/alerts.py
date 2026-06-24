from datetime import datetime
from fastapi import APIRouter, Path, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.db.neon import get_db
from app.models_db import Alert
 
router = APIRouter(prefix="/api/alerts", tags=["Alertas"])
 
# 26. GET /alerts
@router.get(
    "",
    summary="Notificaciones activas del sistema",
    description="Retorna las alertas globales para el administrador."
)
async def get_alerts(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Alert)
        .where(Alert.acknowledged_at.is_(None))
        .order_by(desc(Alert.created_at))
    )
    alerts = result.scalars().all()
 
    unread_count = sum(1 for a in alerts if not getattr(a, "acknowledged_at", None))
 
    return {
        "status": "success",
        "unread_count": unread_count,
        "data": [
            {
                "alert_id": getattr(a, "alert_id", ""),
                "type": getattr(a, "type", ""),
                "title": getattr(a, "title", ""),
                "message": getattr(a, "message", ""),
                "title_key": getattr(a, "title_key", None),
                "message_key": getattr(a, "message_key", None),
                "message_params": getattr(a, "message_params", None),
                "severity": getattr(a, "severity", "medium"),
                "related_type": getattr(a, "related_type", None),
                "related_id": getattr(a, "related_id", None),
                "created_at": a.created_at.isoformat() + "Z" if getattr(a, "created_at", None) else None
            }
            for a in alerts
        ]
    }
 
# 27. POST /alerts/{alert_id}/acknowledge
@router.post(
    "/{alert_id}/acknowledge",
    summary="Marcar alerta como gestionada/leída"
)
async def acknowledge_alert(alert_id: str = Path(...), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Alert).where(Alert.alert_id == alert_id))
    alert = result.scalars().first()
 
    if not alert:
        raise HTTPException(status_code=404, detail="No encontrado")
 
    now = datetime.utcnow()
 
    if hasattr(alert, "acknowledged_at"):
        alert.acknowledged_at = now
 
    if hasattr(alert, "status"):
        alert.status = "acknowledged"
 
    db.add(alert)
    await db.commit()
 
    return {
        "status": "success",
        "message": f"Alerta {alert_id} marcada como leída.",
        "acknowledged_at": now.isoformat() + "Z"
    }