import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.neon import get_db
from app.models_db import Job

router = APIRouter(prefix="/api/jobs", tags=["Jobs Asíncronos"])

# ==============================================================================
# ENDPOINT: #62 - GET /api/jobs/{job_id}
# Descripción: Consultar estado de un job asíncrono
# ==============================================================================
@router.get("/{job_id}", summary="Consultar estado de un job asíncrono")
async def get_job_status(job_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalars().first()

    if not job:
        raise HTTPException(status_code=404, detail="No encontrado")

    # Mapear los nombres de base de datos a camelCase para el Frontend
    return {
        "id": job.id,
        "jobType": getattr(job, "job_type", "export_clinics"),
        "status": getattr(job, "status", "completed"),
        "progress": getattr(job, "progress", 100),
        "createdBy": getattr(job, "created_by", "super-admin-usr"),
        "createdAt": job.created_at.isoformat() + "Z" if getattr(job, "created_at", None) else None,
        "startedAt": job.started_at.isoformat() + "Z" if getattr(job, "started_at", None) else None,
        "completedAt": job.completed_at.isoformat() + "Z" if getattr(job, "completed_at", None) else None,
        "resultUrl": getattr(job, "result_url", None),
        "error": getattr(job, "error", None)
    }

# ==============================================================================
# ENDPOINT: #61 - POST /api/jobs/export-clinics
# Descripción: Lanzar exportación de datos de clínicas
# ==============================================================================
@router.post("/export-clinics", summary="Lanzar exportación de datos de clínicas", status_code=status.HTTP_202_ACCEPTED)
async def export_clinics(db: AsyncSession = Depends(get_db)):
    # Crear un nuevo registro en la tabla Job
    new_job_id = f"job-{uuid.uuid4().hex[:12]}"
    
    new_job = Job(
        id=new_job_id,
        job_type="export_clinics",
        status="queued",
        progress=0,
        created_by="super-admin-usr", # Hardcodeado temporalmente hasta agregar Auth
        created_at=datetime.utcnow()
    )
    
    db.add(new_job)
    await db.commit()
    await db.refresh(new_job)

    # Retornar estructura idéntica a lo que espera el frontend
    return {
        "id": new_job.id,
        "jobType": new_job.job_type,
        "status": new_job.status,
        "progress": new_job.progress,
        "createdBy": new_job.created_by,
        "createdAt": new_job.created_at.isoformat() + "Z" if new_job.created_at else None,
        "resultUrl": getattr(new_job, "result_url", None),
        "error": getattr(new_job, "error", None)
    }