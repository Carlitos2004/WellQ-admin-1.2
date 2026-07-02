"""
routers/clinic_health.py — MÓDULO: SALUD DE PACIENTES POR CLÍNICA
Endpoint conectado a Neon (PostgreSQL)
Tabla: patient_health_summaries (tabla #34, sincronizada desde MongoDB)
"""

from fastapi import APIRouter, Depends, HTTPException, Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.models_db import PatientHealthSummary, Clinic
from app.db.neon import get_db

router = APIRouter(prefix="/api/clinics", tags=["Salud de Pacientes"])


# ==============================================================================
# ENDPOINT: #16 - GET /api/clinics/{clinic_id}/patient-health
# Descripción: Resumen de salud de pacientes por clínica
# ==============================================================================
@router.get("/{clinic_id}/patient-health", summary="Resumen de salud de pacientes por clínica")
async def get_patient_health(
    clinic_id: str = Path(...),
    db: AsyncSession = Depends(get_db)
):
    # Verificar que la clínica existe
    clinic_result = await db.execute(
        select(Clinic).where(Clinic.clinic_id == clinic_id)
    )
    clinic = clinic_result.scalar_one_or_none()
    if not clinic:
        raise HTTPException(status_code=404, detail="Clínica no encontrada")

    # Obtener el registro más reciente de patient_health_summaries
    result = await db.execute(
        select(PatientHealthSummary)
        .where(PatientHealthSummary.clinic_id == clinic_id)
        .order_by(desc(PatientHealthSummary.recorded_at))
        .limit(1)
    )
    health = result.scalar_one_or_none()

    if not health:
        # Si no hay datos sincronizados aún, devolver ceros en lugar de 404
        return {
            "clinic_id":      clinic_id,
            "total_patients": clinic.patients_used,
            "at_risk":        0,
            "declining":      0,
            "stable":         0,
            "improving":      0,
            "recorded_at":    None,
        }

    return {
        "clinic_id":      clinic_id,
        "total_patients": health.total_patients,
        "at_risk":        health.at_risk,
        "declining":      health.declining,
        "stable":         health.stable,
        "improving":      health.improving,
        "recorded_at":    health.recorded_at.isoformat() if health.recorded_at else None,
    }
