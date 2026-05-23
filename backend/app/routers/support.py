"""
routers/support.py — MÓDULO: TICKETS DE SOPORTE
Endpoints conectados a Neon (PostgreSQL)
Tablas: support_tickets (tabla #35, sincronizada desde MongoDB)
"""

from fastapi import APIRouter, Depends, HTTPException, Path, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from app.models_db import SupportTicket, Clinic
from app.db.neon import get_db

router = APIRouter(prefix="/api/support-tickets", tags=["Soporte"])


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/support-tickets — Listar tickets con filtros y paginación
# ─────────────────────────────────────────────────────────────────────────────
@router.get("", summary="Listar tickets de soporte con filtros")
async def list_support_tickets(
    status_param: str | None  = Query(None, alias="status"),   # Open | Closed | Sent
    clinic_id:   str | None  = Query(None),
    category:    str | None  = Query(None),                    # Bug | Billing | Feature | Request
    page:        int         = Query(1, ge=1),
    page_size:   int         = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    query = select(SupportTicket)

    if status_param:
        query = query.where(SupportTicket.status == status_param)
    if clinic_id:
        query = query.where(SupportTicket.clinic_id == clinic_id)
    if category:
        query = query.where(SupportTicket.category == category)

    # Total para paginación
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Orden: más recientes primero
    query = query.order_by(desc(SupportTicket.reported_at))
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    tickets = result.scalars().all()

    # Enriquecer con nombre de clínica cuando esté disponible
    clinic_ids = list({t.clinic_id for t in tickets if t.clinic_id})
    clinic_names: dict[str, str] = {}
    if clinic_ids:
        clinics_result = await db.execute(
            select(Clinic.clinic_id, Clinic.name).where(Clinic.clinic_id.in_(clinic_ids))
        )
        clinic_names = {row.clinic_id: row.name for row in clinics_result}

    data = []
    for t in tickets:
        data.append({
            "ticket_id":     t.ticket_id,
            "clinic_id":     t.clinic_id,
            "clinic_name":   clinic_names.get(t.clinic_id, t.clinic_id),
            "title":         t.title,
            "status":        t.status,
            "category":      t.category,
            "reporter_name": t.reporter_name,
            "reported_at":   t.reported_at.isoformat() if t.reported_at else None,
            "closed_at":     t.closed_at.isoformat()   if t.closed_at   else None,
        })

    return {
        "total":     total,
        "page":      page,
        "page_size": page_size,
        "data":      data,
    }


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/support-tickets/{ticket_id} — Detalle de un ticket
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/{ticket_id}", summary="Detalle completo de un ticket de soporte")
async def get_support_ticket(
    ticket_id: str = Path(...),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(SupportTicket).where(SupportTicket.ticket_id == ticket_id)
    )
    ticket = result.scalar_one_or_none()

    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")

    # Buscar nombre de clínica
    clinic_name = ticket.clinic_id
    clinic_result = await db.execute(
        select(Clinic.name).where(Clinic.clinic_id == ticket.clinic_id)
    )
    clinic_row = clinic_result.scalar_one_or_none()
    if clinic_row:
        clinic_name = clinic_row

    return {
        "ticket_id":      ticket.ticket_id,
        "clinic_id":      ticket.clinic_id,
        "clinic_name":    clinic_name,
        "title":          ticket.title,
        "description":    ticket.description,
        "status":         ticket.status,
        "category":       ticket.category,
        "solution":       ticket.solution,
        "reporter_name":  ticket.reporter_name,
        "reporter_email": ticket.reporter_email,
        "responder_name": ticket.responder_name,
        "reported_at":    ticket.reported_at.isoformat() if ticket.reported_at else None,
        "closed_at":      ticket.closed_at.isoformat()   if ticket.closed_at   else None,
        "recorded_at":    ticket.recorded_at.isoformat() if ticket.recorded_at else None,
    }
