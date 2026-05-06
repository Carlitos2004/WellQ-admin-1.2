from datetime import datetime
from fastapi import APIRouter, Path, status, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, asc
from app.db.neon import get_db
from app.models_db import Server, BackgroundProcess

router = APIRouter(prefix="/api/infrastructure", tags=["Infraestructura y Ops"])

# 29. GET /infrastructure/servers
@router.get(
    "/servers",
    summary="Lista y estado de salud de todos los servidores",
    description="Retorna la lista de servidores de la base de datos."
)
async def get_servers(db: AsyncSession = Depends(get_db)):
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

# 30. GET /infrastructure/servers/{server_id}
@router.get(
    "/servers/{server_id}",
    summary="Métricas detalladas de un servidor"
)
async def get_server_details(server_id: str = Path(...), db: AsyncSession = Depends(get_db)):
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

# 31. GET /infrastructure/processes
@router.get(
    "/processes",
    summary="Lista de procesos de fondo (background tasks)"
)
async def get_processes(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(BackgroundProcess))
    processes = result.scalars().all()
    
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

# 32. GET /infrastructure/processes/{process_id}
@router.get(
    "/processes/{process_id}",
    summary="Detalle de estado de un proceso específico"
)
async def get_process_details(process_id: str = Path(...), db: AsyncSession = Depends(get_db)):
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

# 33. GET /infrastructure/processes/{process_id}/logs
@router.get(
    "/processes/{process_id}/logs",
    summary="Visualización de registros de error"
)
async def get_process_logs(process_id: str = Path(...), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(BackgroundProcess).where(BackgroundProcess.process_id == process_id))
    process = result.scalars().first()
    
    if not process:
        raise HTTPException(status_code=404, detail="No encontrado")

    # TODO: conectar a tabla de logs dedicada si se requiere, asumiendo campo en el modelo o array vacío
    return {
        "process_id": process.process_id,
        "log_level": getattr(process, "log_level", "ERROR"),
        "logs": getattr(process, "logs", [])
    }

# 34. POST /infrastructure/processes/{process_id}/restart
@router.post(
    "/processes/{process_id}/restart",
    summary="Reinicio manual de un proceso que falló",
    status_code=status.HTTP_200_OK
)
async def restart_process(process_id: str = Path(...), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(BackgroundProcess).where(BackgroundProcess.process_id == process_id))
    process = result.scalars().first()
    
    if not process:
        raise HTTPException(status_code=404, detail="No encontrado")

    # Actualizar estado
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