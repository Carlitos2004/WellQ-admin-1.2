"""SQLModel table definitions for the WellQ Admin Console."""

from datetime import datetime
from typing import Optional

from sqlalchemy import Column, ForeignKey, Integer, PrimaryKeyConstraint, Text
from sqlmodel import Field, SQLModel

class Clinic(SQLModel, table=True):
    __tablename__ = "clinics"

    id: Optional[int]              = Field(default=None, primary_key=True)
    clinic_id: str                 = Field(unique=True, index=True)
    name: str                      = Field(index=True)
    tier: str                      = Field(default="smb")          # trial | smb | enterprise
    status: str                    = Field(default="active")       # active | warning | critical | churned
    patients_used: int             = Field(default=0)
    patients_limit: int            = Field(default=500)
    health_score: int              = Field(default=100)
    last_login: Optional[datetime] = Field(default=None)
    mrr: float                     = Field(default=0.0)
    location: Optional[str]        = Field(default=None)
    # Contacto
    contact_name: Optional[str]    = Field(default=None)
    contact_email: Optional[str]   = Field(default=None)
    contact_phone: Optional[str]   = Field(default=None)
    # Billing
    company_name: Optional[str]    = Field(default=None)
    tax_id: Optional[str]          = Field(default=None)
    billing_email: Optional[str]   = Field(default=None)
    address: Optional[str]         = Field(default=None)
    # Metadata
    internal_notes: Optional[str]  = Field(default=None, sa_column=Column(Text))
    created_at: datetime           = Field(default_factory=datetime.utcnow)
    updated_at: datetime           = Field(default_factory=datetime.utcnow)
    # ── NUEVO: ID de MongoDB para joins en sync ────────────────────────────────
    # Referencia a clinics._id en MongoDB Atlas. Permite hacer lookup directo
    # al sincronizar clinician_summaries y patient_health_summaries.
    mongo_clinic_id: Optional[str] = Field(default=None, index=True)
    # ── NUEVO: Soft delete — la empresa pidió nunca borrar registros ──────────
    # Razones: (1) evita borrar en cascada todos los registros asociados,
    # (2) la información médica debe conservarse por temas legales y de auditoría.
    # Al "eliminar" una clínica, se marca is_deleted=True y se guarda deleted_at.
    # Todos los SELECTs deben filtrar WHERE is_deleted = FALSE.
    is_deleted: bool               = Field(default=False, index=True)
    deleted_at: Optional[datetime] = Field(default=None)
