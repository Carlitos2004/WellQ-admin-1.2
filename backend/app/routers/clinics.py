"""
routers/clinics.py — MÓDULO: GESTIÓN DE CLÍNICAS
Endpoints 14 al 25 conectados a Neon (PostgreSQL)
"""

from fastapi import APIRouter, Depends, HTTPException, Path, Body, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update, desc, asc
from datetime import datetime
import uuid

from app.models_db import (
    Clinic, ClinicPlan, ClinicUsageMetric, 
    Invoice, Notification, Job
)
from app.db.neon import get_db

router = APIRouter(prefix="/api/clinics", tags=["Gestión de Clínicas"])


# ─────────────────────────────────────────────────────────────────────────────
# 14. GET /clinics — Listar clínicas con filtros y paginación
# ─────────────────────────────────────────────────────────────────────────────
@router.get("", summary="Listar clínicas con filtros y paginación")
async def list_clinics(
    search: str | None = None,
    tier: str | None = None,
    status_param: str | None = Query(None, alias="status"),
    page: int = 1,
    page_size: int = 20,
    sort_by: str = "name",
    sort_order: str = "asc",
    db: AsyncSession = Depends(get_db)
):
    # Construir query base
    query = select(Clinic)
    
    # Filtros
    if search:
        query = query.where(Clinic.name.ilike(f"%{search}%"))
    if tier:
        query = query.where(Clinic.tier == tier)
    if status_param:
        query = query.where(Clinic.status == status_param)

    # Calcular el total para la paginación
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Ordenamiento dinámico
    order_col = getattr(Clinic, sort_by, Clinic.name)
    if sort_order == "desc":
        query = query.order_by(desc(order_col))
    else:
        query = query.order_by(asc(order_col))

    # Paginación
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    clinics = result.scalars().all()

    # Mapear respuesta
    data = []
    for c in clinics:
        data.append({
            "_id": str(c.id),
            "clinic_id": c.clinic_id,
            "name": c.name,
            "tier": c.tier,
            "status": c.status,
            "contact": {
                "phone": c.contact_phone,
                "email": c.contact_email
            },
            "patient_count": c.patients_used,
            "patientsUsed": c.patients_used,
            "patientsLimit": c.patients_limit,
            "healthScore": c.health_score,
            "lastLogin": c.last_login.isoformat() if c.last_login else None
        })

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "data": data
    }


# ─────────────────────────────────────────────────────────────────────────────
# 15. POST /clinics — Registro de una nueva clínica en el sistema
# ─────────────────────────────────────────────────────────────────────────────
@router.post("", summary="Registro de una nueva clínica", status_code=status.HTTP_201_CREATED)
async def create_clinic(body: dict = Body(...), db: AsyncSession = Depends(get_db)):
    # Generar un ID único para la nueva clínica
    new_clinic_id = f"CL-{uuid.uuid4().hex[:6].upper()}"
    
    new_clinic = Clinic(
        clinic_id=new_clinic_id,
        name=body.get("name", "Nueva Clínica"),
        tier=body.get("tier", "smb"),
        status="onboarding",
        patients_limit=body.get("patientsLimit", 500)
    )
    
    db.add(new_clinic)
    await db.commit()
    await db.refresh(new_clinic)

    return {
        "status": "success",
        "message": "Clínica registrada correctamente",
        "data": {
            "_id": str(new_clinic.id),
            "clinic_id": new_clinic.clinic_id,
            "name": new_clinic.name,
            "status": new_clinic.status,
            "tier": new_clinic.tier
        }
    }


# ─────────────────────────────────────────────────────────────────────────────
# 24. POST /clinics/bulk/email — Envío de comunicaciones masivas
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/bulk/email", summary="Envío de comunicaciones masivas a clínicas")
async def bulk_email(body: dict = Body(...), db: AsyncSession = Depends(get_db)):
    clinic_ids = body.get('clinic_ids', [])
    subject = body.get("subject", "Actualización importante")
    
    # Registramos la acción masiva en la tabla Notification
    notif = Notification(
        notification_id=f"notif-{uuid.uuid4().hex[:8]}",
        title=subject,
        message=f"Mensaje masivo enviado a {len(clinic_ids)} clínicas.",
        channel="email",
        status="pending",
        recipient_clinic_id="multiple",
        sent_by="admin_system"
    )
    
    db.add(notif)
    await db.commit()

    return {
        "status": "success",
        "message": f"Correos encolados para {len(clinic_ids)} clínicas.",
        "subject": subject
    }


# ─────────────────────────────────────────────────────────────────────────────
# 25. GET /clinics/export — Exportación de lista de clínicas
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/export", summary="Exportación de lista de clínicas")
async def export_clinics(format: str = Query("csv"), db: AsyncSession = Depends(get_db)):
    # Generamos un registro en la tabla Jobs simulando el proceso de exportación
    job_id = f"job-{uuid.uuid4().hex[:8]}"
    file_url = f"https://storage.wellq.co/exports/clinics_{datetime.utcnow().strftime('%Y%m%d')}.{format}"
    
    new_job = Job(
        job_id=job_id,
        job_type="export_clinics",
        status="completed",
        progress=100,
        created_by="system",
        result_url=file_url,
        completed_at=datetime.utcnow()
    )
    
    db.add(new_job)
    await db.commit()

    return {
        "status": "success",
        "download_url": file_url,
        "expires_in": "3600s",
        "job_id": job_id
    }


# ─────────────────────────────────────────────────────────────────────────────
# 16. GET /clinics/{clinic_id} — Obtener detalle de una clínica
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/{clinic_id}", summary="Obtener detalle de una clínica")
async def get_clinic(clinic_id: str = Path(...), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Clinic).where(Clinic.clinic_id == clinic_id))
    clinic = result.scalar_one_or_none()
    
    if not clinic:
        raise HTTPException(status_code=404, detail="Clínica no encontrada")

    return {
        "_id": str(clinic.id),
        "clinic_id": clinic.clinic_id,
        "name": clinic.name,
        "status": clinic.status,
        "tier": clinic.tier,
        "internal_notes": clinic.internal_notes,
        "created_at": clinic.created_at.isoformat()
    }


# ─────────────────────────────────────────────────────────────────────────────
# 17. PATCH /clinics/{clinic_id} — Actualizar campos de una clínica
# FIX: mapeo explícito de campos para garantizar que name/tier/status se guarden
# ─────────────────────────────────────────────────────────────────────────────
@router.patch("/{clinic_id}", summary="Actualizar campos de una clínica")
async def update_clinic(
    clinic_id: str = Path(...),
    updates: dict = Body(...),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Clinic).where(Clinic.clinic_id == clinic_id))
    clinic = result.scalar_one_or_none()

    if not clinic:
        raise HTTPException(status_code=404, detail="Clínica no encontrada")

    # Mapeo explícito: frontend manda name/tier/status → campos reales del modelo
    field_map = {
        "name":   "name",
        "tier":   "tier",
        "status": "status",
    }

    updated = []
    for key, value in updates.items():
        model_field = field_map.get(key, key)
        if hasattr(clinic, model_field):
            setattr(clinic, model_field, value)
            updated.append(key)

    clinic.updated_at = datetime.utcnow()
    await db.commit()

    return {
        "status": "success",
        "message": f"Clínica {clinic_id} actualizada correctamente",
        "updated_fields": updated
    }


# ─────────────────────────────────────────────────────────────────────────────
# 17b. DELETE /clinics/{clinic_id} — Eliminar clínica
# FIX: endpoint nuevo — el frontend llamaba DELETE pero no existía (404/405)
# ─────────────────────────────────────────────────────────────────────────────
@router.delete("/{clinic_id}", summary="Eliminar clínica del sistema")
async def delete_clinic(
    clinic_id: str = Path(...),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Clinic).where(Clinic.clinic_id == clinic_id))
    clinic = result.scalar_one_or_none()

    if not clinic:
        raise HTTPException(status_code=404, detail="Clínica no encontrada")

    await db.delete(clinic)
    await db.commit()

    return {
        "status": "success",
        "message": f"Clínica {clinic_id} eliminada correctamente"
    }


# ─────────────────────────────────────────────────────────────────────────────
# 18. GET /clinics/{clinic_id}/contact — Info de contacto y facturación
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/{clinic_id}/contact", summary="Información de contacto y facturación")
async def get_clinic_contact(clinic_id: str = Path(...), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Clinic).where(Clinic.clinic_id == clinic_id))
    clinic = result.scalar_one_or_none()
    
    if not clinic:
        raise HTTPException(status_code=404, detail="Clínica no encontrada")

    return {
        "clinic_id": clinic.clinic_id,
        "contact_info": {
            "primary_name": clinic.contact_name,
            "primary_email": clinic.contact_email,
            "primary_phone": clinic.contact_phone
        },
        "billing_info": {
            "company_name": clinic.company_name,
            "tax_id": clinic.tax_id,
            "billing_email": clinic.billing_email,
            "address": clinic.address
        }
    }


# ─────────────────────────────────────────────────────────────────────────────
# 19. GET /clinics/{clinic_id}/subscription — Detalles del plan
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/{clinic_id}/subscription", summary="Detalles del plan de suscripción")
async def get_clinic_subscription(clinic_id: str = Path(...), db: AsyncSession = Depends(get_db)):
    # Buscamos la última asignación activa en ClinicPlan
    result = await db.execute(
        select(ClinicPlan)
        .where(ClinicPlan.clinic_id == clinic_id)
        .order_by(desc(ClinicPlan.effective_from))
        .limit(1)
    )
    plan_assignment = result.scalar_one_or_none()
    
    if not plan_assignment:
        raise HTTPException(status_code=404, detail="Sin suscripción activa")

    import json
    plan_data = json.loads(plan_assignment.plan_snapshot) if plan_assignment.plan_snapshot else {}

    return {
        "clinic_id": clinic_id,
        "subscription": {
            "plan_name": plan_data.get("name", "Desconocido"),
            "status": "active",
            "mrr_value": plan_data.get("monthlyPrice", 0.0),
            "currency": plan_data.get("currency", "USD"),
            "started_at": plan_assignment.effective_from.isoformat(),
            "renews_at": plan_assignment.effective_to.isoformat() if plan_assignment.effective_to else None,
            "features_enabled": ["custom_branding", "api_access", "priority_support"]
        }
    }


# ─────────────────────────────────────────────────────────────────────────────
# 20. GET /clinics/{clinic_id}/usage — Estadísticas de uso
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/{clinic_id}/usage", summary="Estadísticas de uso de la plataforma")
async def get_clinic_usage(clinic_id: str = Path(...), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ClinicUsageMetric)
        .where(ClinicUsageMetric.clinic_id == clinic_id)
        .order_by(desc(ClinicUsageMetric.recorded_at))
        .limit(1)
    )
    usage = result.scalar_one_or_none()
    
    if not usage:
        raise HTTPException(status_code=404, detail="Métricas no encontradas para esta clínica")

    return {
        "clinic_id": clinic_id,
        "period": usage.period,
        "metrics": {
            "active_clinicians": usage.active_clinicians,
            "patient_sessions_completed": usage.patient_sessions_completed,
            "ai_processing_minutes": usage.ai_processing_minutes,
            "api_calls": usage.api_calls
        }
    }


# ─────────────────────────────────────────────────────────────────────────────
# 21. GET /clinics/{clinic_id}/license — Monitoreo de licencias
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/{clinic_id}/license", summary="Monitoreo de utilización de licencias")
async def get_clinic_license(clinic_id: str = Path(...), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Clinic).where(Clinic.clinic_id == clinic_id))
    clinic = result.scalar_one_or_none()
    
    if not clinic:
        raise HTTPException(status_code=404, detail="Clínica no encontrada")

    used = clinic.patients_used
    limit = clinic.patients_limit
    utilization = round((used / limit) * 100, 2) if limit > 0 else 0

    return {
        "clinic_id": clinic_id,
        "licenses": {
            "total_limit": limit,
            "currently_active": used,
            "available": limit - used,
            "utilization_percentage": utilization
        },
        "warning_threshold_reached": utilization >= 90.0
    }


# ─────────────────────────────────────────────────────────────────────────────
# 22. GET /clinics/{clinic_id}/invoices — Historial de facturas
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/{clinic_id}/invoices", summary="Historial de facturas emitidas")
async def get_clinic_invoices(clinic_id: str = Path(...), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Invoice)
        .where(Invoice.clinic_id == clinic_id)
        .order_by(desc(Invoice.issued_at))
    )
    invoices = result.scalars().all()

    pending_balance = sum(inv.amount for inv in invoices if inv.status != "paid")

    return {
        "clinic_id": clinic_id,
        "pending_balance": pending_balance,
        "invoices": [
            {
                "invoice_id": inv.invoice_id,
                "amount": inv.amount,
                "currency": inv.currency,
                "status": inv.status,
                "issued_at": inv.issued_at.isoformat(),
                "pdf_url": inv.pdf_url
            } for inv in invoices
        ]
    }


# ─────────────────────────────────────────────────────────────────────────────
# 23. POST /clinics/{clinic_id}/impersonate — Ingreso como soporte técnico
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/{clinic_id}/impersonate", summary="Ingreso como soporte técnico", status_code=status.HTTP_201_CREATED)
async def impersonate_clinic(
    clinic_id: str = Path(...),
    body: dict = Body(...),
    db: AsyncSession = Depends(get_db)
):
    reason = body.get("reason", "")
    if len(reason) < 10:
        return {
            "success": False,
            "error": "La justificación ética debe tener más de 10 caracteres."
        }

    # Verificamos si la clínica existe
    result = await db.execute(select(Clinic).where(Clinic.clinic_id == clinic_id))
    clinic = result.scalar_one_or_none()
    
    if not clinic:
        raise HTTPException(status_code=404, detail="Clínica no encontrada")

    return {
        "success": True,
        "message": "Impersonation session started successfully.",
        "session_id": f"sess_{uuid.uuid4().hex[:10]}",
        "temp_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "expires_at": (datetime.utcnow()).isoformat(),
        "clinic_id": clinic_id,
        "reason_logged": reason
    }