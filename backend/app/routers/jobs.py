from fastapi import APIRouter

router = APIRouter(prefix="/api/jobs", tags=["Jobs Asíncronos"])

@router.get("/{job_id}", summary="Consultar estado de un job asíncrono")
async def get_job_status(job_id: str):
    # Simulamos que el frontend consulta y el job ya terminó al 100%
    return {
        "id": job_id,
        "jobType": "export_clinics",
        "status": "completed",
        "progress": 100,
        "createdBy": "super-admin-usr",
        "createdAt": "2026-04-25T19:00:00Z",
        "startedAt": "2026-04-25T19:00:05Z",
        "completedAt": "2026-04-25T19:01:10Z",
        "resultUrl": "https://storage.wellq.co/exports/clinics_20260425.csv",
        "error": None
    }

@router.post("/export-clinics", summary="Lanzar exportación de datos de clínicas", status_code=202)
async def export_clinics():
    # Simulamos la respuesta de creación de un job de exportación
    return {
        "id": "job-8d72-4f1a-b3c9",
        "jobType": "export_clinics",
        "status": "queued",
        "progress": 0,
        "createdBy": "super-admin-usr",
        "createdAt": "2026-04-25T20:30:00Z",
        "resultUrl": None,
        "error": None
    }