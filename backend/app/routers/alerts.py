from fastapi import APIRouter, Path

router = APIRouter(prefix="/api/alerts", tags=["Alertas"])

# 26. GET /alerts
@router.get(
    "",
    summary="Notificaciones activas del sistema",
    description="Retorna JSON en duro con las alertas globales para el administrador."
)
async def get_alerts():
    return {
        "status": "success",
        "unread_count": 2,
        "data": [
            {
                "alert_id": "ALT-001",
                "type": "billing_warning",
                "title": "Factura Vencida",
                "message": "La Clínica San José tiene una factura pendiente de hace 30 días.",
                "severity": "high",
                "related_entity": {"type": "clinic", "id": "CL-001"},
                "created_at": "2026-04-20T10:00:00Z"
            },
            {
                "alert_id": "ALT-002",
                "type": "license_usage",
                "title": "Límite de licencias próximo",
                "message": "Centro Médico Integral ha consumido el 90% de sus licencias de pacientes.",
                "severity": "medium",
                "related_entity": {"type": "clinic", "id": "CL-002"},
                "created_at": "2026-04-24T15:30:00Z"
            }
        ]
    }

# 27. POST /alerts/{alert_id}/acknowledge
@router.post(
    "/{alert_id}/acknowledge",
    summary="Marcar alerta como gestionada/leída"
)
async def acknowledge_alert(alert_id: str = Path(...)):
    return {
        "status": "success",
        "message": f"Alerta {alert_id} marcada como leída.",
        "acknowledged_at": "2026-04-25T15:30:00Z"
    }
