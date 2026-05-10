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
    result = await db.execute(select(Alert).order_by(desc(Alert.created_at)))
    alerts = result.scalars().all()
 
    unread_count = sum(1 for a in alerts if not getattr(a, "acknowledged_at", None))
 
    return {
        "status": "success",
        "unread_count": unread_count,
        "data": [
            {
                "alert_id": getattr(a, "id", ""),
                "type": getattr(a, "type", ""),
                "title": getattr(a, "title", ""),
                "message": getattr(a, "message", ""),
                "severity": getattr(a, "severity", "medium"),
                "related_entity": getattr(a, "related_entity", {}),
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
    try:
        aid = int(alert_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=422, detail="ID inválido")
 
    result = await db.execute(select(Alert).where(Alert.id == aid))
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