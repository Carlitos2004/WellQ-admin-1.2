"""
routers/support.py — MÓDULO: TICKETS DE SOPORTE
Endpoints conectados a Neon (PostgreSQL)
Tablas: support_tickets (tabla #35, sincronizada desde MongoDB)

CHANGELOG:
  - GET  /api/support-tickets        → agrega open_count, closed_count, sent_count
  - GET  /api/support-tickets/categories → categorías dinámicas desde BD
  - GET  /api/support-tickets/responders → responders agrupados por equipo (Corregido 404 y 500)
  - GET  /api/support-tickets/{id}   → agrega responder_id en respuesta
  - PATCH /api/support-tickets/{id}  → ciclo de vida (status, responder, solution)
  - POST /api/support-tickets        → crear ticket desde el backoffice
"""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Path, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, distinct

from app.models_db import SupportTicket, Clinic, Responder  # asegúrate de que Responder exista en models_db
from app.db.neon import get_db

router = APIRouter(prefix="/api/support-tickets", tags=["Soporte"])

# ─── Transiciones de estado válidas ──────────────────────────────────────────
VALID_TRANSITIONS = {
    "Sent":   ["Open"],
    "Open":   ["Closed"],
    "Closed": [],          # terminal — no se puede reabrir
}


# ─────────────────────────────────────────────────────────────────────────────
# 1. GET /api/support-tickets — Listar tickets con filtros, paginación y conteos
# ─────────────────────────────────────────────────────────────────────────────
@router.get("", summary="Listar tickets de soporte con filtros")
async def list_support_tickets(
    status_param: str | None = Query(None, alias="status"),
    clinic_id:   str | None = Query(None),
    category:    str | None = Query(None),
    page:        int        = Query(1, ge=1),
    page_size:   int        = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    base = select(SupportTicket)
    if status_param:
        base = base.where(SupportTicket.status == status_param)
    if clinic_id:
        base = base.where(SupportTicket.clinic_id == clinic_id)
    if category:
        base = base.where(SupportTicket.category == category)

    # ── Total filtrado ────────────────────────────────────────────────────────
    count_q = select(func.count()).select_from(base.subquery())
    total   = (await db.execute(count_q)).scalar() or 0

    # ── Conteos por status (sobre TODOS los tickets, sin filtro de status) ───
    counts_q = (
        select(SupportTicket.status, func.count().label("n"))
        .group_by(SupportTicket.status)
    )
    if clinic_id:
        counts_q = counts_q.where(SupportTicket.clinic_id == clinic_id)
    if category:
        counts_q = counts_q.where(SupportTicket.category == category)

    counts_rows  = (await db.execute(counts_q)).all()
    counts_by_status = {row.status: row.n for row in counts_rows}

    # ── Página actual ─────────────────────────────────────────────────────────
    paged = base.order_by(desc(SupportTicket.reported_at))
    paged = paged.offset((page - 1) * page_size).limit(page_size)
    tickets = (await db.execute(paged)).scalars().all()

    # ── Enriquecer con nombre de clínica ──────────────────────────────────────
    clinic_ids = list({t.clinic_id for t in tickets if t.clinic_id})
    clinic_names: dict[str, str] = {}
    if clinic_ids:
        rows = await db.execute(
            select(Clinic.clinic_id, Clinic.name).where(Clinic.clinic_id.in_(clinic_ids))
        )
        clinic_names = {r.clinic_id: r.name for r in rows}

    data = [
        {
            "ticket_id":     t.ticket_id,
            "clinic_id":     t.clinic_id,
            "clinic_name":   clinic_names.get(t.clinic_id, t.clinic_id),
            "title":         t.title,
            "status":        t.status,
            "category":      t.category,
            "reporter_name": t.reporter_name,
            "responder_name": t.responder_name,
            "reported_at":   t.reported_at.isoformat() if t.reported_at else None,
            "closed_at":     t.closed_at.isoformat()   if t.closed_at   else None,
        }
        for t in tickets
    ]

    return {
        "total":       total,
        "page":        page,
        "page_size":   page_size,
        "open_count":  counts_by_status.get("Open",   0),
        "closed_count": counts_by_status.get("Closed", 0),
        "sent_count":  counts_by_status.get("Sent",   0),
        "data":        data,
    }


# ─────────────────────────────────────────────────────────────────────────────
# 2. GET /api/support-tickets/categories — Categorías dinámicas desde la BD
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/categories", summary="Categorías de tickets disponibles en la BD")
async def list_ticket_categories(db: AsyncSession = Depends(get_db)):
    """
    Retorna las categorías distintas que existen en support_tickets.
    """
    rows = await db.execute(
        select(distinct(SupportTicket.category)).where(SupportTicket.category.isnot(None))
    )
    categories = sorted([r[0] for r in rows if r[0]])
    return {"categories": categories}


# ─────────────────────────────────────────────────────────────────────────────
# 3. GET /api/support-tickets/responders — Lista de responders agrupados
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/responders", summary="Responders disponibles agrupados por equipo")
async def list_responders(db: AsyncSession = Depends(get_db)):
    """
    Retorna los responders agrupados por su campo 'group'.
    El frontend filtra la lista según la categoría del ticket.
    """
    rows = (await db.execute(select(Responder))).scalars().all()

    # Agrupar por equipo y crear lista plana simultáneamente
    groups: dict[str, list] = {}
    flat_responders = []

    for r in rows:
        group_name = r.group or "General"
        
        # Mapeo manual seguro para EVITAR el Error 500 del __dict__
        resp_data = {
            "id": r.responder_id,  # Usa el responder_id del modelo
            "name": r.name,
            "user": getattr(r, "user", None),
            "group": r.group,
        }
        
        groups.setdefault(group_name, []).append(resp_data)
        flat_responders.append(resp_data)

    return {
        "responders": flat_responders,
        "by_group":   groups,
    }


# ─────────────────────────────────────────────────────────────────────────────
# 4. GET /api/support-tickets/{ticket_id} — Detalle de un ticket
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/{ticket_id}", summary="Detalle completo de un ticket de soporte")
async def get_support_ticket(
    ticket_id: str = Path(...),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SupportTicket).where(SupportTicket.ticket_id == ticket_id)
    )
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")

    clinic_name = ticket.clinic_id
    clinic_row  = (await db.execute(
        select(Clinic.name).where(Clinic.clinic_id == ticket.clinic_id)
    )).scalar_one_or_none()
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
        "responder_id":   getattr(ticket, "responder_id", None),
        "responder_name": ticket.responder_name,
        "reported_at":    ticket.reported_at.isoformat() if ticket.reported_at else None,
        "closed_at":      ticket.closed_at.isoformat()   if ticket.closed_at   else None,
        "recorded_at":    ticket.recorded_at.isoformat() if ticket.recorded_at else None,
    }


# ─────────────────────────────────────────────────────────────────────────────
# 5. PATCH /api/support-tickets/{ticket_id} — Ciclo de vida del ticket
# ─────────────────────────────────────────────────────────────────────────────
class UpdateTicketBody(BaseModel):
    status:         str | None = None   # 'Open' | 'Closed'
    responder_id:   str | None = None   # FK al responder
    responder_name: str | None = None   # nombre del responder
    solution:       str | None = None   # texto de resolución


@router.patch("/{ticket_id}", summary="Actualizar estado, responder o solución")
async def update_support_ticket(
    body:      UpdateTicketBody,
    ticket_id: str = Path(...),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SupportTicket).where(SupportTicket.ticket_id == ticket_id)
    )
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")

    # ── Validación de transición de estado ────────────────────────────────────
    if body.status and body.status != ticket.status:
        allowed = VALID_TRANSITIONS.get(ticket.status, [])
        if body.status not in allowed:
            raise HTTPException(
                status_code=422,
                detail=f"Transición inválida: '{ticket.status}' → '{body.status}'. "
                       f"Permitido: {allowed or 'ninguno (estado terminal)'}",
            )
        # Cerrar ticket requiere una solución escrita
        if body.status == "Closed" and not (body.solution or ticket.solution):
            raise HTTPException(
                status_code=422,
                detail="Para cerrar el ticket debes escribir una solución.",
            )
        ticket.status = body.status
        if body.status == "Closed":
            ticket.closed_at = datetime.now(timezone.utc)

    # ── Actualizar responder ───────────────────────────────────────────────────
    if body.responder_name is not None:
        ticket.responder_name = body.responder_name
    if body.responder_id is not None and hasattr(ticket, "responder_id"):
        ticket.responder_id = body.responder_id

    # ── Actualizar solución ───────────────────────────────────────────────────
    if body.solution is not None:
        ticket.solution = body.solution

    await db.commit()
    await db.refresh(ticket)

    return {
        "ticket_id":      ticket.ticket_id,
        "status":         ticket.status,
        "responder_name": ticket.responder_name,
        "responder_id":   getattr(ticket, "responder_id", None),
        "solution":       ticket.solution,
        "closed_at":      ticket.closed_at.isoformat() if ticket.closed_at else None,
    }


# ─────────────────────────────────────────────────────────────────────────────
# 6. POST /api/support-tickets — Crear un ticket desde el backoffice
# ─────────────────────────────────────────────────────────────────────────────
class CreateTicketBody(BaseModel):
    title:          str
    description:    str
    category:       str              # 'Bug' | 'Billing' | 'Feature' | 'Request'
    clinic_id:      str | None = None
    reporter_name:  str | None = None
    reporter_email: str | None = None


@router.post("", summary="Crear un nuevo ticket de soporte", status_code=201)
async def create_support_ticket(
    body: CreateTicketBody,
    db: AsyncSession = Depends(get_db),
):
    import uuid
    new_ticket = SupportTicket(
        ticket_id     = str(uuid.uuid4()),
        title         = body.title,
        description   = body.description,
        category      = body.category,
        clinic_id     = body.clinic_id,
        reporter_name = body.reporter_name,
        reporter_email= body.reporter_email,
        status        = "Sent",                        # siempre empieza en Sent
        reported_at   = datetime.now(timezone.utc),
        recorded_at   = datetime.now(timezone.utc),
    )
    db.add(new_ticket)
    await db.commit()
    await db.refresh(new_ticket)

    return {
        "ticket_id":  new_ticket.ticket_id,
        "status":     new_ticket.status,
        "reported_at": new_ticket.reported_at.isoformat(),
    }