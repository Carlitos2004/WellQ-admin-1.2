from datetime import datetime
from fastapi import APIRouter, Path, status, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, asc
from app.db.neon import get_db
from app.models_db import Server, BackgroundProcess

router = APIRouter(prefix="/api/infrastructure", tags=["Infraestructura y Ops"])

# ==============================================================================
# ENDPOINT: #55 - GET /api/infrastructure/processes
# Descripción: Lista de procesos de fondo (background tasks)
# ==============================================================================
@router.get(
    "/processes",
    summary="Lista de procesos de fondo (background tasks)"
)
async def get_processes(db: AsyncSession = Depends(get_db)):
    # Operación: Seleccionar todos los procesos en segundo plano
    result = await db.execute(select(BackgroundProcess))
    processes = result.scalars().all()
    
    # Operación: Contar procesos que se encuentran activos
    active_count = sum(1 for p in processes if p.status == "running")
    
    return {
        "status": "success",
        "active_processes": active_count,
        "data": [
            {
                "process_id": p.process_id,
                "name": p.name,
                "status": p.status,
                "queued_items": p.queued_items,
                "memory_consumption": p.memory_consumption
            }
            for p in processes
        ]
    }

# ==============================================================================
# ENDPOINT: #56 - GET /api/infrastructure/processes/{process_id}
# Descripción: Detalle de estado de un proceso específico
# ==============================================================================
@router.get(
    "/processes/{process_id}",
    summary="Detalle de estado de un proceso específico"
)
async def get_process_details(process_id: str = Path(...), db: AsyncSession = Depends(get_db)):
    # Operación: Seleccionar detalle de un proceso de fondo específico
    result = await db.execute(select(BackgroundProcess).where(BackgroundProcess.process_id == process_id))
    process = result.scalars().first()
    
    if not process:
        raise HTTPException(status_code=404, detail="No encontrado")

    return {
        "process_id": process.process_id,
        "name": process.name,
        "status": process.status,
        "description": getattr(process, "description", ""),
        "started_at": getattr(process, "started_at", None),
        "failed_at": getattr(process, "failed_at", None),
        "restart_count": getattr(process, "restart_count", 0)
    }

# ==============================================================================
# ENDPOINT: #57 - GET /api/infrastructure/processes/{process_id}/logs
# Descripción: Visualización de registros de error
# ==============================================================================
@router.get(
    "/processes/{process_id}/logs",
    summary="Visualización de registros de error"
)
async def get_process_logs(process_id: str = Path(...), db: AsyncSession = Depends(get_db)):
    # Operación: Obtener registros de logs para un proceso específico
    result = await db.execute(select(BackgroundProcess).where(BackgroundProcess.process_id == process_id))
    process = result.scalars().first()
    
    if not process:
        raise HTTPException(status_code=404, detail="No encontrado")

    return {
        "process_id": process.process_id,
        "log_level": getattr(process, "log_level", "ERROR"),
        "logs": getattr(process, "logs", [])
    }

# ==============================================================================
# ENDPOINT: #58 - POST /api/infrastructure/processes/{process_id}/restart
# Descripción: Reinicio manual de un proceso que falló
# ==============================================================================
@router.post(
    "/processes/{process_id}/restart",
    summary="Reinicio manual de un proceso que falló",
    status_code=status.HTTP_200_OK
)
async def restart_process(process_id: str = Path(...), db: AsyncSession = Depends(get_db)):
    # Operación: Reiniciar proceso y actualizar su contador de reinicios en base de datos
    result = await db.execute(select(BackgroundProcess).where(BackgroundProcess.process_id == process_id))
    process = result.scalars().first()
    
    if not process:
        raise HTTPException(status_code=404, detail="No encontrado")

    process.status = "starting"
    
    if hasattr(process, "restart_count"):
        process.restart_count += 1
        
    if hasattr(process, "updated_at"):
        process.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(process)

    return {
        "status": "success",
        "message": f"Señal de reinicio enviada al proceso {process_id} correctamente.",
        "expected_downtime_ms": 1500,
        "new_status": process.status
    }

# ==============================================================================
# ENDPOINT: #59 - GET /api/infrastructure/servers
# Descripción: Lista y estado de salud de todos los servidores
# ==============================================================================
@router.get(
    "/servers",
    summary="Lista y estado de salud de todos los servidores",
    description="Retorna la lista de servidores de la base de datos."
)
async def get_servers(db: AsyncSession = Depends(get_db)):
    # Operación: Seleccionar todos los servidores registrados en la base de datos
    result = await db.execute(select(Server))
    servers = result.scalars().all()
    
    return {
        "status": "success",
        "total_servers": len(servers),
        "data": [
            {
                "server_id": s.server_id,
                "name": s.name,
                "region": s.region,
                "status": s.status,
                "uptime": getattr(s, "uptime", "99.99%"),
                "cpu_usage": s.cpu_usage,
                "ram_usage": s.ram_usage
            }
            for s in servers
        ]
    }

# ==============================================================================
# ENDPOINT: #60 - GET /api/infrastructure/servers/{server_id}
# Descripción: Métricas detalladas de un servidor
# ==============================================================================
@router.get(
    "/servers/{server_id}",
    summary="Métricas detalladas de un servidor"
)
async def get_server_details(server_id: str = Path(...), db: AsyncSession = Depends(get_db)):
    # Operación: Seleccionar métricas detalladas de un servidor específico
    result = await db.execute(select(Server).where(Server.server_id == server_id))
    server = result.scalars().first()
    
    if not server:
        raise HTTPException(status_code=404, detail="No encontrado")

    return {
        "server_id": server.server_id,
        "name": server.name,
        "status": server.status,
        "specs": {
            "vCPUs": getattr(server, "vcpus", 8),
            "memory_gb": getattr(server, "memory_gb", 32),
            "os": getattr(server, "os", "Ubuntu 22.04 LTS")
        },
        "current_metrics": {
            "cpu_usage": server.cpu_usage,
            "ram_usage": server.ram_usage,
            "disk_usage": getattr(server, "disk_usage", "40%"),
            "network_latency_ms": getattr(server, "network_latency_ms", 12)
        },
        "last_updated": getattr(server, "updated_at", datetime.utcnow())
    }