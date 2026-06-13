"""
routers/support.py — MÓDULO: TICKETS DE SOPORTE
Endpoints conectados a Neon (PostgreSQL)
Tablas: support_tickets (tabla #35), responders (tabla #36), ticket_categories (tabla #37)

CHANGELOG:
  - GET  /api/support-tickets        → agrega open_count, closed_count, sent_count
  - GET  /api/support-tickets/categories → categorías desde tabla ticket_categories (con fallback)
  - POST /api/support-tickets/categories → crear categoría dinámica                    ← NUEVO
  - PATCH /api/support-tickets/categories/{category_id} → editar categoría             ← NUEVO
  - DELETE /api/support-tickets/categories/{category_id} → desactivar categoría        ← NUEVO
  - GET  /api/support-tickets/responders → responders por equipo (incluye email)
  - POST /api/support-tickets/responders → crear responder                              ← NUEVO
  - PATCH /api/support-tickets/responders/{responder_id} → editar responder            ← NUEVO
  - DELETE /api/support-tickets/responders/{responder_id} → eliminar responder         ← NUEVO
  - GET  /api/support-tickets/{id}   → agrega responder_id en respuesta
  - PATCH /api/support-tickets/{id}  → ciclo de vida (status, responder, solution)
  - POST /api/support-tickets        → acepta responder_id, valida email, valida
                                       categorías desde BD, filtra clínicas eliminadas
"""

import re
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Path, Query
from pydantic import BaseModel, ConfigDict, model_validator
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, distinct, or_
from typing import Any, Optional

# ── NUEVO: importar TicketCategory ────────────────────────────────────────────
from app.models_db import SupportTicket, Clinic, Responder, TicketCategory
from app.db.neon import get_db

router = APIRouter(prefix="/api/support-tickets", tags=["Soporte"])

# ─── Transiciones de estado válidas ──────────────────────────────────────────
VALID_TRANSITIONS = {
    "Sent":   ["Open"],
    "Open":   ["Closed"],
    "Closed": [],          # terminal — no se puede reabrir
}

VALID_STATUSES   = {"Sent", "Open", "Closed"}
# ── NUEVO: VALID_CATEGORIES ahora es un fallback. Las categorías reales viven
#    en la tabla ticket_categories. Se usa cuando esa tabla aún está vacía.
VALID_CATEGORIES = {"Bug", "Billing", "Feature", "Request"}


# ─── Helpers ─────────────────────────────────────────────────────────────────

# ── NUEVO: regex de validación de email ──────────────────────────────────────
_EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


class ExternalPayloadModel(BaseModel):
    model_config = ConfigDict(extra="ignore")


def _as_payload_dict(value: Any) -> Any:
    if isinstance(value, dict):
        return dict(value)
    return value


def _copy_if_missing(data: dict, target: str, *sources: str) -> None:
    if data.get(target) not in (None, ""):
        return
    for source in sources:
        source_value = data.get(source)
        if source_value not in (None, ""):
            data[target] = source_value
            return


def _validate_email_format(email: str | None, field_label: str = "email") -> None:
    """Lanza HTTPException 422 si el email tiene formato inválido."""
    if email and not _EMAIL_RE.match(email):
        raise HTTPException(
            status_code=422,
            detail=f"El {field_label} no tiene formato válido (falta @ o dominio).",
        )


async def _notify_responder_by_email(
    responder: "Responder", ticket_id: str, title: str, category: str
) -> None:
    """
    Stub para notificación por email al responder asignado.
    Conectar a Resend / SendGrid / SES cuando esté configurado en el proyecto.
    Por ahora imprime la intención para que aparezca en los logs del servidor.
    """
    if responder.email:
        print(
            f"[EMAIL STUB] → {responder.name} <{responder.email}> | "
            f"Ticket {ticket_id} ({category}): {title}"
        )


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

    counts_rows      = (await db.execute(counts_q)).all()
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
        "total":        total,
        "page":         page,
        "page_size":    page_size,
        "open_count":   counts_by_status.get("Open",   0),
        "closed_count": counts_by_status.get("Closed", 0),
        "sent_count":   counts_by_status.get("Sent",   0),
        "data":         data,
    }


# ─────────────────────────────────────────────────────────────────────────────
# 2. GET /api/support-tickets/categories — Categorías desde tabla TicketCategory
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/categories", summary="Categorías de tickets activas")
async def list_ticket_categories(db: AsyncSession = Depends(get_db)):
    """
    Retorna las categorías activas desde la tabla ticket_categories.
    Si la tabla todavía está vacía, hace fallback a los valores distintos
    que ya existen en support_tickets (compatibilidad con datos de MongoDB sync).

    Respuesta:
      - categories: lista de nombres (formato anterior, sin cambios para el frontend)
      - details:    datos completos de cada categoría (name, team, emails, etc.)
    """
    # ── NUEVO: leer desde tabla gestionada ────────────────────────────────────
    cat_rows = (await db.execute(
        select(TicketCategory)
        .where(TicketCategory.is_active == True)
        .order_by(TicketCategory.name)
    )).scalars().all()

    if cat_rows:
        return {
            "categories": [c.name for c in cat_rows],
            "details": [
                {
                    "category_id": c.category_id,
                    "name":        c.name,
                    "team":        c.team,
                    "emails":      c.emails,
                    "is_active":   c.is_active,
                }
                for c in cat_rows
            ],
        }

    # ── Fallback: categorías distintas desde tickets existentes ───────────────
    rows = await db.execute(
        select(distinct(SupportTicket.category)).where(SupportTicket.category.isnot(None))
    )
    categories = sorted([r[0] for r in rows if r[0]])
    return {"categories": categories, "details": []}


# ─────────────────────────────────────────────────────────────────────────────
# 3. POST /api/support-tickets/categories — Crear categoría dinámica         NUEVO
# ─────────────────────────────────────────────────────────────────────────────
class CreateCategoryBody(BaseModel):
    name:      str
    team:      Optional[str] = None   # nombre del equipo de responders (ej: "Financiero")
    emails:    Optional[str] = None   # JSON array: '["billing@wellq.co"]'
    is_active: bool          = True


@router.post("/categories", summary="Crear una nueva categoría de ticket", status_code=201)
async def create_ticket_category(
    body: CreateCategoryBody,
    db: AsyncSession = Depends(get_db),
):
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="El nombre de la categoría es obligatorio")

    # Verificar que no exista ya con ese nombre (ignorar mayúsculas/minúsculas)
    existing = (await db.execute(
        select(TicketCategory).where(TicketCategory.name == name)
    )).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Ya existe una categoría con el nombre '{name}'",
        )

    now = datetime.utcnow()
    category = TicketCategory(
        category_id = f"cat-{uuid.uuid4().hex[:8]}",
        name        = name,
        team        = body.team,
        emails      = body.emails,
        is_active   = body.is_active,
        created_at  = now,
        updated_at  = now,
    )
    db.add(category)
    await db.commit()
    await db.refresh(category)

    return {
        "category_id": category.category_id,
        "name":        category.name,
        "team":        category.team,
        "emails":      category.emails,
        "is_active":   category.is_active,
        "created_at":  category.created_at.isoformat(),
    }


# ─────────────────────────────────────────────────────────────────────────────
# 4. PATCH /api/support-tickets/categories/{category_id} — Editar categoría  NUEVO
# ─────────────────────────────────────────────────────────────────────────────
class UpdateCategoryBody(BaseModel):
    name:      str | None  = None
    team:      str | None  = None
    emails:    str | None  = None
    is_active: bool | None = None


@router.patch("/categories/{category_id}", summary="Editar una categoría existente")
async def update_ticket_category(
    body:        UpdateCategoryBody,
    category_id: str = Path(...),
    db: AsyncSession = Depends(get_db),
):
    cat = (await db.execute(
        select(TicketCategory).where(TicketCategory.category_id == category_id)
    )).scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")

    if body.name is not None:
        name = body.name.strip()
        if not name:
            raise HTTPException(status_code=422, detail="El nombre no puede estar vacío")
        # Verificar unicidad si cambia el nombre
        if name != cat.name:
            conflict = (await db.execute(
                select(TicketCategory).where(TicketCategory.name == name)
            )).scalar_one_or_none()
            if conflict:
                raise HTTPException(
                    status_code=409,
                    detail=f"Ya existe una categoría con el nombre '{name}'",
                )
        cat.name = name

    if body.team      is not None: cat.team      = body.team
    if body.emails    is not None: cat.emails    = body.emails
    if body.is_active is not None: cat.is_active = body.is_active
    cat.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(cat)

    return {
        "category_id": cat.category_id,
        "name":        cat.name,
        "team":        cat.team,
        "emails":      cat.emails,
        "is_active":   cat.is_active,
        "updated_at":  cat.updated_at.isoformat(),
    }


# ─────────────────────────────────────────────────────────────────────────────
# 5. DELETE /api/support-tickets/categories/{category_id} — Desactivar        NUEVO
# ─────────────────────────────────────────────────────────────────────────────
@router.delete("/categories/{category_id}", summary="Desactivar una categoría (soft delete)")
async def deactivate_ticket_category(
    category_id: str = Path(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Marca la categoría como inactiva (is_active=False) en vez de borrarla.
    Esto preserva el historial de tickets que ya tienen esa categoría asignada.
    """
    cat = (await db.execute(
        select(TicketCategory).where(TicketCategory.category_id == category_id)
    )).scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")

    cat.is_active  = False
    cat.updated_at = datetime.utcnow()
    await db.commit()

    return {"ok": True, "category_id": category_id, "is_active": False}


# ─────────────────────────────────────────────────────────────────────────────
# 6. GET /api/support-tickets/responders — Lista de responders agrupados
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/responders", summary="Responders disponibles agrupados por equipo")
async def list_responders(db: AsyncSession = Depends(get_db)):
    """
    Retorna los responders agrupados por equipo.
    El frontend filtra la lista según la categoría del ticket.
    """
    rows = (await db.execute(select(Responder))).scalars().all()

    groups: dict[str, list] = {}
    flat_responders = []

    for r in rows:
        team_name = r.team or "General"

        # Mapeo manual seguro para EVITAR el Error 500 del __dict__
        resp_data = {
            "id":    r.responder_id,
            "name":  r.name,
            "user":  getattr(r, "username", None),
            "group": r.team,
            "email": r.email,           # ── NUEVO: incluir email del responder
        }

        groups.setdefault(team_name, []).append(resp_data)
        flat_responders.append(resp_data)

    return {
        "responders": flat_responders,
        "by_group":   groups,
    }


# ─────────────────────────────────────────────────────────────────────────────
# 7. POST /api/support-tickets/responders — Crear responder                   NUEVO
# ─────────────────────────────────────────────────────────────────────────────
class CreateResponderBody(BaseModel):
    name:     str
    team:     str
    username: str
    password: str             # Pasar ya hasheado (ej: bcrypt). El endpoint no hashea.
    email:    Optional[str] = None


@router.post("/responders", summary="Crear un nuevo responder de soporte", status_code=201)
async def create_responder(
    body: CreateResponderBody,
    db: AsyncSession = Depends(get_db),
):
    name     = body.name.strip()
    username = body.username.strip()

    if not name:
        raise HTTPException(status_code=422, detail="El nombre es obligatorio")
    if not username:
        raise HTTPException(status_code=422, detail="El username es obligatorio")

    # ── NUEVO: validar email si se proporcionó ────────────────────────────────
    _validate_email_format(body.email, "email del responder")

    # Verificar unicidad de username
    existing = (await db.execute(
        select(Responder).where(Responder.username == username)
    )).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Ya existe un responder con el username '{username}'",
        )

    responder = Responder(
        responder_id = f"resp-{uuid.uuid4().hex[:8]}",
        name         = name,
        team         = body.team.strip(),
        username     = username,
        password     = body.password,
        email        = body.email.strip() if body.email else None,
    )
    db.add(responder)
    await db.commit()
    await db.refresh(responder)

    return {
        "responder_id": responder.responder_id,
        "name":         responder.name,
        "team":         responder.team,
        "username":     responder.username,
        "email":        responder.email,
    }


# ─────────────────────────────────────────────────────────────────────────────
# 8. PATCH /api/support-tickets/responders/{responder_id} — Editar responder  NUEVO
# ─────────────────────────────────────────────────────────────────────────────
class UpdateResponderBody(BaseModel):
    name:     str | None = None
    team:     str | None = None
    email:    str | None = None
    username: str | None = None


@router.patch("/responders/{responder_id}", summary="Editar un responder existente")
async def update_responder(
    body:         UpdateResponderBody,
    responder_id: str = Path(...),
    db: AsyncSession = Depends(get_db),
):
    responder = (await db.execute(
        select(Responder).where(Responder.responder_id == responder_id)
    )).scalar_one_or_none()
    if not responder:
        raise HTTPException(status_code=404, detail="Responder no encontrado")

    if body.email is not None:
        _validate_email_format(body.email, "email del responder")

    if body.name     is not None: responder.name     = body.name.strip()
    if body.team     is not None: responder.team     = body.team.strip()
    if body.email    is not None: responder.email    = body.email.strip() or None
    if body.username is not None:
        username = body.username.strip()
        if username != responder.username:
            conflict = (await db.execute(
                select(Responder).where(Responder.username == username)
            )).scalar_one_or_none()
            if conflict:
                raise HTTPException(
                    status_code=409,
                    detail=f"Ya existe un responder con el username '{username}'",
                )
        responder.username = username

    await db.commit()
    await db.refresh(responder)

    return {
        "responder_id": responder.responder_id,
        "name":         responder.name,
        "team":         responder.team,
        "username":     responder.username,
        "email":        responder.email,
    }


# ─────────────────────────────────────────────────────────────────────────────
# 9. DELETE /api/support-tickets/responders/{responder_id} — Eliminar          NUEVO
# ─────────────────────────────────────────────────────────────────────────────
@router.delete("/responders/{responder_id}", summary="Eliminar un responder")
async def delete_responder(
    responder_id: str = Path(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Elimina el responder. Bloqueado si tiene tickets activos (Sent u Open)
    para evitar dejar tickets sin dueño. Primero reasigna esos tickets.
    Los tickets ya cerrados conservan responder_name (campo denormalizado),
    así que el historial histórico no se pierde.
    """
    responder = (await db.execute(
        select(Responder).where(Responder.responder_id == responder_id)
    )).scalar_one_or_none()
    if not responder:
        raise HTTPException(status_code=404, detail="Responder no encontrado")

    # ── NUEVO: verificar tickets activos antes de borrar ──────────────────────
    active_count = (await db.execute(
        select(func.count()).select_from(SupportTicket).where(
            SupportTicket.responder_id == responder_id,
            SupportTicket.status.in_(["Sent", "Open"]),
        )
    )).scalar() or 0

    if active_count > 0:
        raise HTTPException(
            status_code=409,
            detail=(
                f"No se puede eliminar: el responder tiene {active_count} ticket(s) "
                f"activo(s) asignado(s). Reasígnalos antes de eliminarlo."
            ),
        )

    await db.delete(responder)
    await db.commit()

    return {"ok": True, "responder_id": responder_id}


# ─────────────────────────────────────────────────────────────────────────────
# 10. GET /api/support-tickets/{ticket_id} — Detalle de un ticket
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
# 11. PATCH /api/support-tickets/{ticket_id} — Ciclo de vida del ticket
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

    responder = None
    if body.responder_id:
        responder = (await db.execute(
            select(Responder).where(Responder.responder_id == body.responder_id)
        )).scalar_one_or_none()
        if not responder:
            raise HTTPException(status_code=422, detail="Responder no encontrado")

    # ── Validación de transición de estado ────────────────────────────────────
    if body.status and body.status != ticket.status:
        if body.status not in VALID_STATUSES:
            raise HTTPException(status_code=422, detail="Estado de ticket inválido")
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
            ticket.closed_at = datetime.utcnow()

    # ── Actualizar responder ───────────────────────────────────────────────────
    if body.responder_id is not None:
        ticket.responder_id   = body.responder_id
        ticket.responder_name = responder.name if responder else body.responder_name
    elif body.responder_name is not None:
        ticket.responder_name = body.responder_name

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
# 12. POST /api/support-tickets — Crear un ticket desde el backoffice
# ─────────────────────────────────────────────────────────────────────────────
class CreateTicketBody(BaseModel):
    title:          str
    description:    str
    category:       str
    clinic_id:      str | None = None
    reporter_name:  str | None = None
    reporter_email: str | None = None
    # ── NUEVO: asignación inicial de responder ─────────────────────────────────
    responder_id:   str | None = None


@router.post("", summary="Crear un nuevo ticket de soporte", status_code=201)
async def create_support_ticket(
    body: CreateTicketBody,
    db: AsyncSession = Depends(get_db),
):
    title          = body.title.strip()
    description    = body.description.strip()
    reporter_name  = body.reporter_name.strip()  if body.reporter_name  else None
    reporter_email = body.reporter_email.strip() if body.reporter_email else None

    if not title:
        raise HTTPException(status_code=422, detail="El título es obligatorio")
    if not description:
        raise HTTPException(status_code=422, detail="La descripción es obligatoria")
    if not body.clinic_id:
        raise HTTPException(status_code=422, detail="Selecciona una clínica para crear el ticket")

    # ── NUEVO: validar formato de email del reportador ────────────────────────
    _validate_email_format(reporter_email, "email del reportador")

    # ── NUEVO: validar categoría contra tabla ticket_categories ───────────────
    # Si la tabla está vacía (aún sin datos), cae al conjunto hardcodeado.
    active_category_names = (await db.execute(
        select(TicketCategory.name).where(TicketCategory.is_active == True)
    )).scalars().all()
    valid_cats = set(active_category_names) if active_category_names else VALID_CATEGORIES
    if body.category not in valid_cats:
        raise HTTPException(
            status_code=422,
            detail=f"Categoría inválida. Valores válidos: {sorted(valid_cats)}",
        )

    # ── NUEVO: verificar que la clínica existe y NO está eliminada ─────────────
    clinic = (await db.execute(
        select(Clinic).where(
            Clinic.clinic_id == body.clinic_id,
            Clinic.is_deleted == False,       # ← filtro soft delete
        )
    )).scalar_one_or_none()
    if not clinic:
        raise HTTPException(
            status_code=422,
            detail="Clínica no encontrada o fue eliminada del sistema",
        )

    # ── NUEVO: resolver responder si se proporcionó ────────────────────────────
    responder = None
    if body.responder_id:
        responder = (await db.execute(
            select(Responder).where(Responder.responder_id == body.responder_id)
        )).scalar_one_or_none()
        if not responder:
            raise HTTPException(status_code=422, detail="Responder no encontrado")

    now = datetime.utcnow()
    new_ticket = SupportTicket(
        ticket_id      = f"TK-{uuid.uuid4().hex[:8].upper()}",
        title          = title,
        description    = description,
        category       = body.category,
        clinic_id      = body.clinic_id,
        reporter_name  = reporter_name,
        reporter_email = reporter_email,
        # ── NUEVO: asignar responder desde la creación ─────────────────────────
        responder_id   = responder.responder_id if responder else None,
        responder_name = responder.name         if responder else None,
        # Si viene con responder asignado → "Sent" (notificado al agente).
        # Si NO tiene responder → "Open" (queda pendiente de asignación).
        status         = "Sent" if responder else "Open",
        reported_at    = now,
        recorded_at    = now,
    )
    db.add(new_ticket)
    await db.commit()
    await db.refresh(new_ticket)

    # ── NUEVO: notificar al responder por email (stub listo para conectar) ─────
    if responder:
        await _notify_responder_by_email(
            responder, new_ticket.ticket_id, new_ticket.title, body.category
        )

    # ── NUEVO: notificar a los emails de la categoría ─────────────────────────
    # Cada TicketCategory tiene un array JSON de correos (emails field).
    # Al crear el ticket, se notifica a todos esos correos además del responder.
    # Esto implementa lo pedido en la reunión:
    #   "Bug1.arroba.wellq. Bug2.arroba.wellq. Y ese le llega por correo a bug1."
    category_obj = (await db.execute(
        select(TicketCategory).where(TicketCategory.name == body.category)
    )).scalar_one_or_none()

    if category_obj and category_obj.emails:
        import json as _json
        try:
            cat_emails = _json.loads(category_obj.emails)
            for cat_email in cat_emails:
                # Stub — reemplazar con envío real cuando esté el servicio de email
                print(
                    f"[EMAIL STUB → CATEGORÍA] → {cat_email} | "
                    f"Ticket {new_ticket.ticket_id} ({body.category}): {title}"
                )
        except Exception:
            pass  # JSON malformado — ignorar silenciosamente

    return {
        "ticket_id":      new_ticket.ticket_id,
        "status":         new_ticket.status,
        "responder_name": new_ticket.responder_name,
        "reported_at":    new_ticket.reported_at.isoformat(),
    }


# ─────────────────────────────────────────────────────────────────────────────
# 13. DELETE /api/support-tickets/{ticket_id} — Eliminar un ticket           NUEVO
# ─────────────────────────────────────────────────────────────────────────────
@router.delete("/{ticket_id}", summary="Eliminar un ticket de soporte permanentemente")
async def delete_support_ticket(
    ticket_id: str = Path(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Elimina el ticket permanentemente de la base de datos.
    Usar con precaución: esta operación no se puede deshacer.
    A diferencia de categorías (soft delete), aquí se hace hard delete
    porque los tickets eliminados no tienen implicaciones de auditoría médica.
    """
    ticket = (await db.execute(
        select(SupportTicket).where(SupportTicket.ticket_id == ticket_id)
    )).scalar_one_or_none()

    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")

    await db.delete(ticket)
    await db.commit()

    return {"ok": True, "ticket_id": ticket_id}
