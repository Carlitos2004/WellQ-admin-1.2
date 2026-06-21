"""SQLModel table definitions for the WellQ Admin Console."""

from datetime import datetime
from typing import Optional

from sqlalchemy import Column, ForeignKey, Integer, PrimaryKeyConstraint, Text
from sqlmodel import Field, SQLModel

class SupportTicket(SQLModel, table=True):
    """
    Tickets de soporte. Mapeo casi 1:1 desde la colección `ticket` de MongoDB.

    Fuente MongoDB: colección `ticket`
    Campos mapeados directamente: title, description, status, reported_at,
      closed_at, category, solution
    Campos aplanados: reporter (dict) → reporter_name, reporter_email
    Campos resueltos: responder_id → responder.name → responder_name
    Campo inferido: clinic_id — NO existe en la colección `ticket`.
      Estrategia de inferencia preferida (en orden):
        1. Pedirle a la empresa que lo incluyan en el payload de sync (ideal)
        2. reporter.email → users.email → users.clinician_id
           → clinicians.clinic_id
        3. Tabla de mapeo manual reporter_email → clinic_id como fallback
    Campos ignorados: incident_type, images, metadata, communication_channel
    """
    __tablename__ = "support_tickets"

    id: Optional[int]                  = Field(default=None, primary_key=True)
    ticket_id: str                     = Field(unique=True, index=True)  # ObjectId de Mongo como string
    clinic_id: str                     = Field(index=True)               # inferido (ver docstring)
    title: str                         = Field()
    description: Optional[str]         = Field(default=None, sa_column=Column(Text))
    status: str                        = Field(index=True)               # "Open" | "Closed" | "Sent"
    reported_at: datetime              = Field()
    closed_at: Optional[datetime]      = Field(default=None)
    category: Optional[str]            = Field(default=None, index=True) # "Bug" | "Billing" | "Feature" | "Request"
    solution: Optional[str]            = Field(default=None, sa_column=Column(Text))
    reporter_name: Optional[str]       = Field(default=None)             # aplanado de reporter.name
    reporter_email: Optional[str]      = Field(default=None, index=True) # aplanado de reporter.email (útil para inferir clinic_id)
    responder_id: Optional[str]        = Field(default=None, index=True) # ID del agente/equipo asignado
    responder_name: Optional[str]      = Field(default=None)             # resuelto desde responder_id → responder.name
    recorded_at: datetime              = Field(default_factory=datetime.utcnow)  # timestamp de sync

class Responder(SQLModel, table=True):
    """
    Agentes de soporte para asignar tickets.
    Sincronizado desde la colección `responder` de MongoDB.
    """
    __tablename__ = "responders"

    id: Optional[int] = Field(default=None, primary_key=True)
    responder_id: str = Field(unique=True, index=True)  # Mapea el _id (ObjectId) de Mongo
    name: str = Field()
    team: str = Field(index=True)                       # Ej: "Financiero", "Técnico"
    username: str = Field(unique=True)
    password: str = Field()                             # Hashed password
    # ── NUEVO: email para notificaciones de asignación ────────────────────────
    # Cuando se asigna un ticket a este responder, se le envía un correo a esta
    # dirección. Puede ser distinto al username (que era solo para login interno).
    email: Optional[str] = Field(default=None, index=True)

class TicketCategory(SQLModel, table=True):
    """
    Categorías dinámicas de tickets de soporte.

    Reemplaza la lista hardcodeada ['Bug', 'Billing', 'Feature', 'Request']
    del frontend. Permite crear, editar y eliminar categorías desde el panel
    de configuración de soporte, sin necesidad de tocar código.

    Campos clave:
      - name   → nombre visible en el formulario y los filtros (único)
      - team   → nombre del equipo de responders por defecto para esta categoría.
                 Debe coincidir con Responder.team para que el dropdown del
                 drawer/modal filtre correctamente.
                 Ej: category "Billing" → team "Financiero"
      - emails → JSON array de correos que reciben notificación al crear un
                 ticket de esta categoría.
                 Ej: '["billing@wellq.co", "contabilidad@wellq.co"]'
                 Permite que, además del responder asignado, llegue copia
                 automática al equipo dueño de esa categoría.
      - is_active → False oculta la categoría del formulario sin borrarla.
                    Útil para desactivar temporalmente sin perder el historial
                    de tickets asociados a esa categoría.
    """
    __tablename__ = "ticket_categories"

    id: Optional[int]         = Field(default=None, primary_key=True)
    category_id: str          = Field(unique=True, index=True)   # "cat-uuid"
    name: str                 = Field(unique=True)               # "Billing" | "Social Media" | etc.
    team: Optional[str]       = Field(default=None, index=True)  # → join con Responder.team
    emails: Optional[str]     = Field(default=None, sa_column=Column(Text))  # JSON: '["a@b.co"]'
    is_active: bool           = Field(default=True)              # False → oculto en formularios
    created_at: datetime      = Field(default_factory=datetime.utcnow)
    updated_at: datetime      = Field(default_factory=datetime.utcnow)
