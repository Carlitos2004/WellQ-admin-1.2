"""SQLModel table definitions for the WellQ Admin Console."""

from datetime import datetime
from typing import Optional

from sqlalchemy import Column, ForeignKey, Integer, PrimaryKeyConstraint, Text
from sqlmodel import Field, SQLModel

class ImpersonateAuditLog(SQLModel, table=True):
    __tablename__ = "impersonate_audit_log"

    id: Optional[int]              = Field(default=None, primary_key=True)
    audit_log_id: str              = Field(unique=True, index=True)    # "audit-uuid"
    clinic_id: str                 = Field(index=True)
    clinic_name: str               = Field()
    admin_user_id: str             = Field(index=True)
    admin_email: str               = Field()
    reason: str                    = Field(sa_column=Column(Text))     # Motivo declarado (min 10 chars)
    session_token_hash: str        = Field()                           # Hash del token (nunca el token plano)
    expires_at: datetime           = Field()
    revoked_at: Optional[datetime] = Field(default=None)
    created_at: datetime           = Field(default_factory=datetime.utcnow)

class ActionLog(SQLModel, table=True):
    """
    Registro de auditoría de acciones administrativas. Tabla append-only.
    Los registros nunca se editan ni eliminan: son el historial legal de cambios.

    Cubre cualquier operación crítica sobre entidades del sistema
    (clinics, plans, features, etc.) realizada desde el Admin Console.

    Estructura del campo changes (JSON string):
      CREATE      → { "after":  { campo: valor_nuevo } }
      UPDATE      → { "before": { campo: valor_original }, "after": { campo: valor_nuevo } }
      SOFT_DELETE → { "before": { campo: valor_original } }
      HARD_DELETE → { "before": { campo: valor_original } }
    """
    __tablename__ = "action_logs"

    id: Optional[int]          = Field(default=None, primary_key=True)
    log_id: str                = Field(unique=True, index=True)           # "log-{uuid}"
    admin_user_id: str         = Field(index=True)                         # AdminUser.user_id
    admin_email: str           = Field(index=True)                         # para búsquedas rápidas
    action: str                = Field(index=True)                         # "CREATE" | "UPDATE" | "SOFT_DELETE" | "HARD_DELETE"
    entity_type: str           = Field(index=True)                         # "clinic" | "plan" | "feature" | etc.
    entity_id: str             = Field(index=True)                         # clinic_id, plan_id, etc.
    entity_name: Optional[str] = Field(default=None)                      # nombre legible ("Clínica San José")
    changes: Optional[str]     = Field(default=None, sa_column=Column(Text))  # JSON {"before":{}, "after":{}}
    created_at: datetime       = Field(default_factory=datetime.utcnow)
