"""
routers/sync.py — MÓDULO: ESTADO DE SINCRONIZACIÓN
Endpoint conectado a Neon (PostgreSQL)
Tablas: clinician_summaries, patient_health_summaries, support_tickets

Lógica: para cada tabla se obtiene el MAX(recorded_at).
  - Si recorded_at existe y es reciente (< 24h): status = "ok"
  - Si recorded_at es antiguo (>= 24h):          status = "warning"
  - Si no hay ningún registro:                   status = "error"
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timedelta

from app.models_db import ClinicianSummary, PatientHealthSummary, SupportTicket
from app.db.neon import get_db

router = APIRouter(prefix="/api", tags=["Sincronización"])

WARNING_THRESHOLD_HOURS = 24  # más de 24h sin sync → warning


def _resolve_status(last_sync: datetime | None) -> str:
    if last_sync is None:
        return "error"
    age = datetime.utcnow() - last_sync
    if age > timedelta(hours=WARNING_THRESHOLD_HOURS):
        return "warning"
    return "ok"


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/sync-status
# Devuelve la última sincronización y estado de las 3 tablas sincronizadas
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/sync-status", summary="Estado de sincronización de tablas desde MongoDB")
async def get_sync_status(db: AsyncSession = Depends(get_db)):

    # MAX(recorded_at) por tabla
    cs_result  = await db.execute(select(func.max(ClinicianSummary.recorded_at)))
    phs_result = await db.execute(select(func.max(PatientHealthSummary.recorded_at)))
    st_result  = await db.execute(select(func.max(SupportTicket.recorded_at)))

    cs_last  = cs_result.scalar_one_or_none()
    phs_last = phs_result.scalar_one_or_none()
    st_last  = st_result.scalar_one_or_none()

    sources = [
        {
            "name":      "Clinician Summaries",
            "last_sync": cs_last.isoformat()  if cs_last  else None,
            "status":    _resolve_status(cs_last),
        },
        {
            "name":      "Patient Health Summaries",
            "last_sync": phs_last.isoformat() if phs_last else None,
            "status":    _resolve_status(phs_last),
        },
        {
            "name":      "Support Tickets",
            "last_sync": st_last.isoformat()  if st_last  else None,
            "status":    _resolve_status(st_last),
        },
    ]

    return {"sources": sources}
