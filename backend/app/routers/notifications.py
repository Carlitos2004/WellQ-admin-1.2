import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from app.db.neon import get_db
from app.models_db import Notification

router = APIRouter(prefix="/api/notifications", tags=["Notificaciones"])

@router.post("", summary="Enviar notificación a una o varias clínicas", status_code=status.HTTP_202_ACCEPTED)
async def send_notification(body: dict, db: AsyncSession = Depends(get_db)):
    new_id = f"notif-{uuid.uuid4().hex[:8]}"
    channel = body.get("channel", "in_app")
    
    # Registramos la notificación en estado pendiente (simulando encolado)
    new_notification = Notification(
        id=new_id,
        title=body.get("title", "Sin título"),
        message=body.get("message", ""),
        channel=channel,
        status="pending",
        recipient_clinic_id=body.get("recipientClinicId", "all"),
        sent_by="super-admin-usr", # TODO: Actualizar con auth cuando esté disponible
        sender_name="Super Admin", # TODO: Actualizar con auth cuando esté disponible
        created_at=datetime.utcnow()
    )
    
    db.add(new_notification)
    await db.commit()
    
    return {
        "message": "Notificación encolada para 1 clínica(s).",
        "notificationIds": [new_id],
        "channel": channel
    }

@router.get("", summary="Historial de notificaciones")
async def list_notifications(page: int = 1, limit: int = 20, db: AsyncSession = Depends(get_db)):
    offset = (page - 1) * limit
    
    # Total de registros para la paginación
    result_total = await db.execute(select(func.count(Notification.id)))
    total = result_total.scalar() or 0
    
    # Consultar notificaciones
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

@router.get("/{notification_id}", summary="Detalle de una notificación")
async def get_notification(notification_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Notification).where(Notification.id == notification_id))
    notification = result.scalars().first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="No encontrado")
        
    return {
        "id": notification.id,
        "title": notification.title,
        "message": notification.message,
        "channel": getattr(notification, "channel", "in_app"),
        "status": getattr(notification, "status", "pending"),
        "recipientClinicId": getattr(notification, "recipient_clinic_id", ""),
        "sentBy": getattr(notification, "sent_by", ""),
        "createdAt": notification.created_at.isoformat() + "Z" if getattr(notification, "created_at", None) else None,
        "senderName": getattr(notification, "sender_name", "")
    }