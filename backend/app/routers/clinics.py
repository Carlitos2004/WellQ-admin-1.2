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
# 25. GET /clinics/export — Exportación real de clínicas como XLSX con estilos
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/export", summary="Exportación de lista de clínicas en XLSX con colores")
async def export_clinics(
    status_param: str | None = Query(None, alias="status"),
    tier: str | None = Query(None),
    db: AsyncSession = Depends(get_db)
):
    from io import BytesIO
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from openpyxl.utils import get_column_letter
    from fastapi.responses import StreamingResponse

    # — Colores del frontend WellQ —
    C_DARK    = "1A1A2E"
    C_WHITE   = "FFFFFF"
    C_TEAL    = "0D9488"
    C_ALT_ROW = "E6FAFA"

    STATUS_COLORS = {
        "active":    ("D1FAE5", "065F46"),
        "warning":   ("FEF3C7", "92400E"),
        "critical":  ("FEE2E2", "991B1B"),
        "churned":   ("F3F4F6", "374151"),
        "trial":     ("EDE9FE", "5B21B6"),
        "onboarding":("DBEAFE", "1E40AF"),
    }
    TIER_COLORS = {
        "enterprise": ("1A1A2E", "FFFFFF"),
        "smb":        ("E0F2FE", "075985"),
        "trial":      ("F3E8FF", "6B21A8"),
    }

    def fill(hex_color):
        return PatternFill("solid", fgColor=hex_color)

    def border():
        s = Side(style='thin', color='E5E7EB')
        return Border(left=s, right=s, top=s, bottom=s)

    # — Traer datos reales de la DB —
    query = select(Clinic)
    if status_param:
        query = query.where(Clinic.status == status_param)
    if tier:
        query = query.where(Clinic.tier == tier)
    query = query.order_by(asc(Clinic.name))
    result = await db.execute(query)
    clinics = result.scalars().all()

    data = [{
        "clinic_id": c.clinic_id,
        "name": c.name,
        "tier": c.tier,
        "status": c.status,
        "patientsUsed": c.patients_used,
        "patientsLimit": c.patients_limit,
        "healthScore": c.health_score,
        "mrr": c.mrr,
        "lastLogin": c.last_login.isoformat() if c.last_login else "",
        "location": c.location or "",
    } for c in clinics]

    wb = Workbook()

    # ══ HOJA 1 — Todas las clínicas ══
    ws = wb.active
    ws.title = "Clínicas"
    ws.sheet_view.showGridLines = False
    ws.freeze_panes = "A3"

    ws.merge_cells("A1:K1")
    t = ws["A1"]
    t.value = f"WellQ — Reporte de Clínicas   |   {datetime.utcnow().strftime('%d/%m/%Y %H:%M')} UTC"
    t.font = Font(name="Arial", bold=True, size=13, color=C_WHITE)
    t.fill = fill(C_DARK)
    t.alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws.row_dimensions[1].height = 32

    headers    = ["ID", "Nombre Clínica", "Tier", "Estado", "Pacientes", "Límite", "Uso %", "Health", "MRR (USD)", "Último Login", "Ciudad"]
    col_widths = [12,   28,               13,     12,       11,          10,       9,       10,      13,          22,             16]

    for ci, (h, w) in enumerate(zip(headers, col_widths), 1):
        cell = ws.cell(row=2, column=ci, value=h)
        cell.font      = Font(name="Arial", bold=True, size=10, color=C_WHITE)
        cell.fill      = fill(C_TEAL)
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border    = border()
        ws.column_dimensions[get_column_letter(ci)].width = w
    ws.row_dimensions[2].height = 22

    for ri, c in enumerate(data, 3):
        bg   = C_ALT_ROW if ri % 2 == 0 else C_WHITE
        uso  = round((c["patientsUsed"] / c["patientsLimit"]) * 100, 1) if c["patientsLimit"] > 0 else 0
        login_str = ""
        if c["lastLogin"]:
            try: login_str = datetime.fromisoformat(c["lastLogin"].replace("Z","")).strftime("%d/%m/%Y %H:%M")
            except: login_str = c["lastLogin"]

        vals = [c["clinic_id"], c["name"], c["tier"].upper(), c["status"].capitalize(),
                c["patientsUsed"], c["patientsLimit"], uso / 100, c["healthScore"],
                c["mrr"], login_str, c["location"]]

        for ci, val in enumerate(vals, 1):
            cell = ws.cell(row=ri, column=ci, value=val)
            cell.font      = Font(name="Arial", size=10, color="1F2937")
            cell.fill      = fill(bg)
            cell.border    = border()
            cell.alignment = Alignment(vertical="center")

        # Tier badge (col 3)
        tbg, tfg = TIER_COLORS.get(c["tier"].lower(), ("E5E7EB", "374151"))
        tc = ws.cell(row=ri, column=3)
        tc.fill = fill(tbg); tc.font = Font(name="Arial", size=10, bold=True, color=tfg)
        tc.alignment = Alignment(horizontal="center", vertical="center")

        # Status badge (col 4)
        sbg, sfg = STATUS_COLORS.get(c["status"].lower(), ("F3F4F6", "374151"))
        sc = ws.cell(row=ri, column=4)
        sc.fill = fill(sbg); sc.font = Font(name="Arial", size=10, bold=True, color=sfg)
        sc.alignment = Alignment(horizontal="center", vertical="center")

        # Uso % con color semáforo (col 7)
        pc = ws.cell(row=ri, column=7)
        pc.number_format = "0.0%"
        pc.alignment = Alignment(horizontal="center", vertical="center")
        if uso >= 90:   pc.fill = fill("FEE2E2"); pc.font = Font(name="Arial", size=10, bold=True, color="991B1B")
        elif uso >= 70: pc.fill = fill("FEF3C7"); pc.font = Font(name="Arial", size=10, bold=True, color="92400E")
        else:           pc.fill = fill("D1FAE5"); pc.font = Font(name="Arial", size=10, color="065F46")

        # Health Score con color (col 8)
        hs = c["healthScore"]
        hc = ws.cell(row=ri, column=8)
        hbg, hfg = ("F0FDF4","065F46") if hs>=80 else ("FFFBEB","92400E") if hs>=60 else ("FFF1F2","991B1B") if hs>0 else ("F9FAFB","9CA3AF")
        hc.fill = fill(hbg); hc.font = Font(name="Arial", size=10, bold=True, color=hfg)
        hc.alignment = Alignment(horizontal="center", vertical="center")

        # MRR formato moneda (col 9)
        ws.cell(row=ri, column=9).number_format = '"$"#,##0.00'
        ws.cell(row=ri, column=9).alignment = Alignment(horizontal="right", vertical="center")
        ws.cell(row=ri, column=10).alignment = Alignment(horizontal="center", vertical="center")
        ws.row_dimensions[ri].height = 20

    last_row = 2 + len(data)

    # Fila totales
    tr = last_row + 1
    ws.merge_cells(f"A{tr}:B{tr}")
    for ci in range(1, 12):
        ws.cell(row=tr, column=ci).fill = fill(C_TEAL)
    tot = ws.cell(row=tr, column=1, value="TOTALES / PROMEDIOS")
    tot.font = Font(name="Arial", bold=True, size=10, color=C_WHITE)
    tot.alignment = Alignment(horizontal="center", vertical="center")
    for ci, formula, fmt in [
        (5,  f"=SUM(E3:E{last_row})",       "General"),
        (6,  f"=SUM(F3:F{last_row})",       "General"),
        (8,  f"=AVERAGE(H3:H{last_row})",   "0.0"),
        (9,  f"=SUM(I3:I{last_row})",       '"$"#,##0.00'),
    ]:
        cell = ws.cell(row=tr, column=ci, value=formula)
        cell.font = Font(name="Arial", bold=True, color=C_WHITE)
        cell.fill = fill(C_TEAL)
        cell.number_format = fmt
        cell.alignment = Alignment(horizontal="center" if ci != 9 else "right", vertical="center")
    ws.row_dimensions[tr].height = 22

    # ══ HOJA 2 — Por Estado ══
    ws2 = wb.create_sheet("Por Estado")
    ws2.sheet_view.showGridLines = False
    mini_headers = ["ID", "Nombre", "Tier", "Pacientes", "Límite", "Health", "MRR (USD)", "Ciudad"]
    mini_widths  = [12, 28, 13, 11, 10, 10, 14, 16]
    for ci, w in enumerate(mini_widths, 1):
        ws2.column_dimensions[get_column_letter(ci)].width = w

    cr = 1
    for status_key in ["active", "warning", "critical", "trial", "churned", "onboarding"]:
        group = [c for c in data if c["status"].lower() == status_key]
        if not group: continue
        sbg, sfg = STATUS_COLORS.get(status_key, ("F3F4F6", "374151"))
        ws2.merge_cells(f"A{cr}:H{cr}")
        gh = ws2.cell(row=cr, column=1, value=f"  {status_key.upper()}  ({len(group)} clínica{'s' if len(group)!=1 else ''})")
        gh.font = Font(name="Arial", bold=True, size=11, color=sfg)
        gh.fill = fill(sbg); gh.alignment = Alignment(vertical="center", indent=1)
        ws2.row_dimensions[cr].height = 24; cr += 1
        for ci, h in enumerate(mini_headers, 1):
            cell = ws2.cell(row=cr, column=ci, value=h)
            cell.font = Font(name="Arial", bold=True, size=9, color=C_WHITE)
            cell.fill = fill("374151"); cell.alignment = Alignment(horizontal="center", vertical="center")
            cell.border = border()
        ws2.row_dimensions[cr].height = 18; cr += 1
        for ri2, c in enumerate(group):
            bg = "F9FAFB" if ri2 % 2 == 0 else C_WHITE
            for ci, val in enumerate([c["clinic_id"], c["name"], c["tier"].upper(),
                                       c["patientsUsed"], c["patientsLimit"],
                                       c["healthScore"], c["mrr"], c["location"]], 1):
                cell = ws2.cell(row=cr, column=ci, value=val)
                cell.font = Font(name="Arial", size=9, color="1F2937")
                cell.fill = fill(bg); cell.border = border()
                cell.alignment = Alignment(vertical="center")
            ws2.cell(row=cr, column=7).number_format = '"$"#,##0.00'
            ws2.cell(row=cr, column=7).alignment = Alignment(horizontal="right", vertical="center")
            ws2.row_dimensions[cr].height = 18; cr += 1
        cr += 1

    # ══ HOJA 3 — Por Tier ══
    ws3 = wb.create_sheet("Por Tier")
    ws3.sheet_view.showGridLines = False
    for ci, w in enumerate(mini_widths, 1):
        ws3.column_dimensions[get_column_letter(ci)].width = w

    cr = 1
    for tier_key in ["enterprise", "smb", "trial"]:
        group = [c for c in data if c["tier"].lower() == tier_key]
        if not group: continue
        tbg, tfg = TIER_COLORS.get(tier_key, ("E5E7EB", "374151"))
        ws3.merge_cells(f"A{cr}:H{cr}")
        gh = ws3.cell(row=cr, column=1, value=f"  {tier_key.upper()}  ({len(group)} clínica{'s' if len(group)!=1 else ''})")
        gh.font = Font(name="Arial", bold=True, size=11, color=tfg)
        gh.fill = fill(tbg); gh.alignment = Alignment(vertical="center", indent=1)
        ws3.row_dimensions[cr].height = 24; cr += 1
        for ci, h in enumerate(mini_headers, 1):
            cell = ws3.cell(row=cr, column=ci, value=h)
            cell.font = Font(name="Arial", bold=True, size=9, color=C_WHITE)
            cell.fill = fill("374151"); cell.alignment = Alignment(horizontal="center", vertical="center")
            cell.border = border()
        ws3.row_dimensions[cr].height = 18; cr += 1
        for ri3, c in enumerate(group):
            bg = "F9FAFB" if ri3 % 2 == 0 else C_WHITE
            sbg2, sfg2 = STATUS_COLORS.get(c["status"].lower(), ("F3F4F6","374151"))
            for ci, val in enumerate([c["clinic_id"], c["name"], c["status"].capitalize(),
                                       c["patientsUsed"], c["patientsLimit"],
                                       c["healthScore"], c["mrr"], c["location"]], 1):
                cell = ws3.cell(row=cr, column=ci, value=val)
                cell.font = Font(name="Arial", size=9, color="1F2937")
                cell.fill = fill(bg); cell.border = border()
                cell.alignment = Alignment(vertical="center")
            sc2 = ws3.cell(row=cr, column=3)
            sc2.fill = fill(sbg2); sc2.font = Font(name="Arial", size=9, bold=True, color=sfg2)
            sc2.alignment = Alignment(horizontal="center", vertical="center")
            ws3.cell(row=cr, column=7).number_format = '"$"#,##0.00'
            ws3.cell(row=cr, column=7).alignment = Alignment(horizontal="right", vertical="center")
            ws3.row_dimensions[cr].height = 18; cr += 1
        cr += 1

    # — Serializar y devolver como descarga —
    buffer = BytesIO()
    wb.save(buffer)
    buffer.seek(0)

    filename = f"clinicas_{datetime.utcnow().strftime('%Y%m%d_%H%M')}.xlsx"
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


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