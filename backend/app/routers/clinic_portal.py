"""
Portal read-only for clinic impersonation sessions.

This endpoint validates the temporary impersonation token stored in
ImpersonateAuditLog and returns real clinic data from Neon. It is intentionally
separate from /api/clinics/{clinic_id}, because the portal token is not a JWT.
"""

from datetime import datetime
import json

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.neon import get_db
from app.models_db import (
    Clinic,
    ClinicUsageMetric,
    ClinicianSummary,
    ImpersonateAuditLog,
    PatientHealthSummary,
)

router = APIRouter(prefix="/api/clinic-portal", tags=["Portal de Clinica"])


def _json_list(value: str | None) -> list[str]:
    if not value:
        return ["Kinesiologia"]
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError:
        return ["Kinesiologia"]
    if isinstance(parsed, list):
        return [str(item) for item in parsed if item]
    return ["Kinesiologia"]


# ==============================================================================
# ENDPOINT: #24 - GET /api/clinic-portal/data
# Descripción: Datos reales para el portal de impersonacion
# ==============================================================================
@router.get("/data", summary="Datos reales para el portal de impersonacion")
async def get_clinic_portal_data(
    token: str = Query(..., min_length=8),
    clinic_id: str = Query(..., min_length=1),
    db: AsyncSession = Depends(get_db),
):
    audit_result = await db.execute(
        select(ImpersonateAuditLog)
        .where(ImpersonateAuditLog.session_token_hash == token)
        .where(ImpersonateAuditLog.clinic_id == clinic_id)
        .order_by(desc(ImpersonateAuditLog.created_at))
        .limit(1)
    )
    audit = audit_result.scalar_one_or_none()

    if not audit or audit.revoked_at:
        raise HTTPException(status_code=401, detail="Token de acceso invalido o expirado")

    now = datetime.now(audit.expires_at.tzinfo) if audit.expires_at.tzinfo else datetime.utcnow()
    if audit.expires_at <= now:
        raise HTTPException(status_code=401, detail="Token de acceso invalido o expirado")

    clinic_result = await db.execute(select(Clinic).where(Clinic.clinic_id == clinic_id))
    clinic = clinic_result.scalar_one_or_none()
    if not clinic or clinic.is_deleted:
        raise HTTPException(status_code=404, detail="Clinica no encontrada")

    clinician_result = await db.execute(
        select(ClinicianSummary)
        .where(ClinicianSummary.clinic_id == clinic_id)
        .order_by(desc(ClinicianSummary.recorded_at))
        .limit(1)
    )
    clinicians = clinician_result.scalar_one_or_none()

    health_result = await db.execute(
        select(PatientHealthSummary)
        .where(PatientHealthSummary.clinic_id == clinic_id)
        .order_by(desc(PatientHealthSummary.recorded_at))
        .limit(1)
    )
    health = health_result.scalar_one_or_none()

    usage_result = await db.execute(
        select(ClinicUsageMetric)
        .where(ClinicUsageMetric.clinic_id == clinic_id)
        .order_by(desc(ClinicUsageMetric.recorded_at))
        .limit(1)
    )
    usage = usage_result.scalar_one_or_none()

    total_patients = health.total_patients if health else clinic.patients_used

    return {
        "_id": str(clinic.id),
        "clinic_id": clinic.clinic_id,
        "name": clinic.name,
        "tier": clinic.tier,
        "status": clinic.status,
        "patients_used": clinic.patients_used,
        "patients_limit": clinic.patients_limit,
        "health_score": clinic.health_score,
        "last_login": clinic.last_login.isoformat() if clinic.last_login else None,
        "mrr": clinic.mrr,
        "location": clinic.location,
        "contact_name": clinic.contact_name,
        "contact_email": clinic.contact_email,
        "contact_phone": clinic.contact_phone,
        "company_name": clinic.company_name,
        "tax_id": clinic.tax_id,
        "billing_email": clinic.billing_email,
        "address": clinic.address,
        "created_at": clinic.created_at.isoformat() if clinic.created_at else None,
        "updated_at": clinic.updated_at.isoformat() if clinic.updated_at else None,
        "clinicians": {
            "total": clinicians.total_clinicians if clinicians else 0,
            "active": clinicians.active_clinicians if clinicians else 0,
            "specialties": _json_list(clinicians.specialties if clinicians else None),
        },
        "patients_health": {
            "total": total_patients,
            "at_risk": health.at_risk if health else 0,
            "declining": health.declining if health else 0,
            "stable": health.stable if health else total_patients,
            "improving": health.improving if health else 0,
        },
        "usage": {
            "appointments_this_month": usage.appointments_this_month if usage else 0,
            "notes_generated": usage.notes_generated if usage else 0,
            "exercises_assigned": usage.exercises_assigned if usage else 0,
            "ai_processing_minutes": usage.ai_processing_minutes if usage else 0,
            "api_calls": usage.api_calls if usage else 0,
        },
        "session": {
            "audit_log_id": audit.audit_log_id,
            "admin_email": audit.admin_email,
            "expires_at": audit.expires_at.isoformat(),
            "read_only": True,
        },
    }
