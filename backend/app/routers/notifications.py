import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from app.db.neon import get_db
from app.models_db import Notification
 
router = APIRouter(prefix="/api/notifications", tags=["Notificaciones"])
 
# ==============================================================================
# ENDPOINT: #64 - POST /api/notifications
# Descripción: Enviar notificación a una o varias clínicas
# ==============================================================================
@router.post("", summary="Enviar notificación a una o varias clínicas", status_code=status.HTTP_202_ACCEPTED)
async def send_notification(body: dict, db: AsyncSession = Depends(get_db)):
    new_id = f"notif-{uuid.uuid4().hex[:8]}"
    channel = body.get("channel", "in_app")
    
    new_notification = Notification(
        notification_id=new_id,
        title=body.get("title", "Sin título"),
        message=body.get("message", ""),
        channel=channel,
        status="pending",
        recipient_clinic_id=body.get("recipientClinicId", "all"),
        sent_by="super-admin-usr",
        sender_name="Super Admin",
        created_at=datetime.utcnow()
    )
    
    db.add(new_notification)
    await db.commit()
    await db.refresh(new_notification)
    
    return {
        "message": "Notificación encolada para 1 clínica(s).",
        "notificationIds": [new_notification.notification_id],
        "channel": channel
    }
 
# ==============================================================================
# ENDPOINT: #65 - GET /api/notifications
# Descripción: Historial de notificaciones
# ==============================================================================
@router.get("", summary="Historial de notificaciones")
async def list_notifications(page: int = 1, limit: int = 20, db: AsyncSession = Depends(get_db)):
    offset = (page - 1) * limit
    
    result_total = await db.execute(select(func.count(Notification.id)))
    total = result_total.scalar() or 0
    
    result = await db.execute(
        select(Notification)
        .order_by(desc(Notification.created_at))
        .offset(offset)
        .limit(limit)
    )
    notifications = result.scalars().all()
    
    return {
        "data": [
            {
                "id": n.id,
                "notificationId": getattr(n, "notification_id", None),
                "title": n.title,
                "message": n.message,
                "channel": getattr(n, "channel", "in_app"),
                "status": getattr(n, "status", "pending"),
                "recipientClinicId": getattr(n, "recipient_clinic_id", ""),
                "sentBy": getattr(n, "sent_by", ""),
                "createdAt": n.created_at.isoformat() + "Z" if getattr(n, "created_at", None) else None,
                "senderName": getattr(n, "sender_name", "")
            }
            for n in notifications
        ],
        "total": total,
        "page": page,
        "hasNext": (offset + limit) < total
    }
 
# ==============================================================================
# ENDPOINT: #66 - GET /api/notifications/{notification_id}
# Descripción: Detalle de una notificación
# ==============================================================================
@router.get("/{notification_id}", summary="Detalle de una notificación")
async def get_notification(notification_id: str, db: AsyncSession = Depends(get_db)):
    try:
        nid = int(notification_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=422, detail="ID inválido")
 
    result = await db.execute(select(Notification).where(Notification.id == nid))
    notification = result.scalars().first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="No encontrado")
        
    return {
        "id": notification.id,
        "notificationId": getattr(notification, "notification_id", None),
        "title": notification.title,
        "message": notification.message,
        "channel": getattr(notification, "channel", "in_app"),
        "status": getattr(notification, "status", "pending"),
        "recipientClinicId": getattr(notification, "recipient_clinic_id", ""),
        "sentBy": getattr(notification, "sent_by", ""),
        "createdAt": notification.created_at.isoformat() + "Z" if getattr(notification, "created_at", None) else None,
        "senderName": getattr(notification, "sender_name", "")
    }
 
 
# ==============================================================================
# ENDPOINT: #67 - DELETE /api/notifications/{notification_id}
# Descripción: Eliminar una notificación
# ==============================================================================
@router.delete("/{notification_id}", summary="Eliminar una notificación", status_code=status.HTTP_200_OK)
async def delete_notification(notification_id: str, db: AsyncSession = Depends(get_db)):
    try:
        nid = int(notification_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=422, detail="ID inválido")
 
    result = await db.execute(select(Notification).where(Notification.id == nid))
    notification = result.scalars().first()
 
    if not notification:
        raise HTTPException(status_code=404, detail="No encontrado")
 
    await db.delete(notification)
    await db.commit()
 
    return {
        "status": "success",
        "message": f"Notificación {notification_id} eliminada correctamente.",
        "deleted_id": notification_id
    }

