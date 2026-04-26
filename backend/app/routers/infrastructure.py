from fastapi import APIRouter, Path, status

router = APIRouter(prefix="/api/infrastructure", tags=["Infraestructura y Ops"])

# 29. GET /infrastructure/servers
@router.get(
    "/servers",
    summary="Lista y estado de salud de todos los servidores",
    description="Retorna JSON en duro con los servidores simulando un entorno en Azure."
)
async def get_servers():
    return {
        "status": "success",
        "total_servers": 2,
        "data": [
            {
                "server_id": "SRV-AZ-001",
                "name": "azure-vm-prod-app-01",
                "region": "East US",
                "status": "healthy",
                "uptime": "99.98%",
                "cpu_usage": "45%",
                "ram_usage": "60%"
            },
            {
                "server_id": "SRV-AZ-002",
                "name": "azure-vm-prod-ai-01",
                "region": "East US",
                "status": "warning",
                "uptime": "99.95%",
                "cpu_usage": "85%",
                "ram_usage": "90%"
            }
        ]
    }

# 30. GET /infrastructure/servers/{server_id}
@router.get(
    "/servers/{server_id}",
    summary="Métricas detalladas de un servidor"
)
async def get_server_details(server_id: str = Path(...)):
    return {
        "server_id": server_id,
        "name": f"azure-vm-{server_id.lower()}",
        "status": "healthy",
        "specs": {
            "vCPUs": 8,
            "memory_gb": 32,
            "os": "Ubuntu 22.04 LTS"
        },
        "current_metrics": {
            "cpu_usage": "45%",
            "ram_usage": "19.2GB",
            "disk_usage": "40%",
            "network_latency_ms": 12
        },
        "last_updated": "2026-04-25T15:30:00Z"
    }

# 31. GET /infrastructure/processes
@router.get(
    "/processes",
    summary="Lista de procesos de fondo (background tasks)"
)
async def get_processes():
    return {
        "status": "success",
        "active_processes": 3,
        "data": [
            {
                "process_id": "PROC-001",
                "name": "ai_video_processing_queue",
                "status": "running",
                "queued_items": 15,
                "memory_consumption": "2.4GB"
            },
            {
                "process_id": "PROC-002",
                "name": "daily_invoice_generator",
                "status": "sleeping",
                "queued_items": 0,
                "memory_consumption": "150MB"
            },
            {
                "process_id": "PROC-003",
                "name": "email_notification_dispatcher",
                "status": "failed",
                "queued_items": 42,
                "memory_consumption": "0MB"
            }
        ]
    }

# 32. GET /infrastructure/processes/{process_id}
@router.get(
    "/processes/{process_id}",
    summary="Detalle de estado de un proceso específico"
)
async def get_process_details(process_id: str = Path(...)):
    return {
        "process_id": process_id,
        "name": "email_notification_dispatcher",
        "status": "failed",
        "description": "Servicio encargado de enviar emails masivos y alertas a clínicas.",
        "started_at": "2026-04-20T08:00:00Z",
        "failed_at": "2026-04-25T14:15:00Z",
        "restart_count": 3
    }

# 33. GET /infrastructure/processes/{process_id}/logs
@router.get(
    "/processes/{process_id}/logs",
    summary="Visualización de registros de error"
)
async def get_process_logs(process_id: str = Path(...)):
    return {
        "process_id": process_id,
        "log_level": "ERROR",
        "logs": [
            "[2026-04-25 14:14:58] INFO: Checking email queue...",
            "[2026-04-25 14:14:59] WARN: SMTP connection timeout. Retrying...",
            "[2026-04-25 14:15:00] ERROR: Connection refused by SendGrid API. Process terminated."
        ]
    }

# 34. POST /infrastructure/processes/{process_id}/restart
@router.post(
    "/processes/{process_id}/restart",
    summary="Reinicio manual de un proceso que falló",
    status_code=status.HTTP_200_OK
)
async def restart_process(process_id: str = Path(...)):
    return {
        "status": "success",
        "message": f"Señal de reinicio enviada al proceso {process_id} correctamente.",
        "expected_downtime_ms": 1500,
        "new_status": "starting"
    }
