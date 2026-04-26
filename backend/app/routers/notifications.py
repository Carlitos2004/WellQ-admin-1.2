from fastapi import APIRouter

router = APIRouter(prefix="/api/notifications", tags=["Notificaciones"])

@router.post("", summary="Enviar notificación a una o varias clínicas", status_code=202)
async def send_notification(body: dict):
    # Simulamos que la notificación se encoló correctamente
    return {
        "message": "Notificación encolada para 1 clínica(s).",
        "notificationIds": ["notif-uuid-5f8a-4b9c"],
        "channel": body.get("channel", "in_app")
    }

@router.get("", summary="Historial de notificaciones")
async def list_notifications():
    # Devolvemos una lista estática con el modelamiento de Firestore/MongoDB
    return {
        "data": [
            {
                "id": "notif-001",
                "title": "Actualización de Términos",
                "message": "Hemos actualizado nuestras políticas de IA. Revise los cambios.",
                "channel": "email",
                "status": "sent",
                "recipientClinicId": "clinic-12345",
                "sentBy": "super-admin-usr",
                "createdAt": "2026-04-20T10:00:00Z",
                "senderName": "Super Admin"
            },
            {
                "id": "notif-002",
                "title": "Mantenimiento Programado",
                "message": "El motor de análisis de posturas estará inactivo a las 03:00 AM.",
                "channel": "in_app",
                "status": "pending",
                "recipientClinicId": "all",
                "sentBy": "system-ops",
                "createdAt": "2026-04-24T15:30:00Z",
                "senderName": "System Ops"
            }
        ],
        "total": 2,
        "page": 1,
        "hasNext": False
    }

@router.get("/{notification_id}", summary="Detalle de una notificación")
async def get_notification(notification_id: str):
    # Simulamos que encuentra la notificación consultada
    return {
        "id": notification_id,
        "title": "Actualización de Términos",
        "message": "Hemos actualizado nuestras políticas de IA. Revise los cambios.",
        "channel": "email",
        "status": "sent",
        "recipientClinicId": "clinic-12345",
        "sentBy": "super-admin-usr",
        "createdAt": "2026-04-20T10:00:00Z",
        "senderName": "Super Admin"
    }