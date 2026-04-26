"""
models/clinic.py — Modelos Pydantic para Clínicas
==================================================
Define los esquemas de entrada y salida para todas las operaciones
relacionadas con la gestión de clínicas: listado, detalle, filtros,
creación, actualización e impersonación.
"""

from pydantic import BaseModel, Field, EmailStr
from typing import Literal, Optional
from datetime import datetime
from enum import Enum


# ── Enumeraciones ──────────────────────────────────────────────────────────────

class ClinicTier(str, Enum):
    """Nivel de plan contratado por la clínica."""
    STARTER = "Starter"
    GROWTH = "Growth"
    ENTERPRISE = "Enterprise"


class ClinicStatus(str, Enum):
    """Estado operativo de la clínica en la plataforma."""
    ACTIVE = "active"         # Funcionando con normalidad
    WARNING = "warning"       # Alguna métrica fuera de rango (ej. alto churn)
    CRITICAL = "critical"     # Requiere atención inmediata (sin login, impagos, etc.)
    CHURNED = "churned"       # Ha cancelado la suscripción


class SortOrder(str, Enum):
    """Orden de clasificación para listas paginadas."""
    ASC = "asc"
    DESC = "desc"


# ── Modelos de respuesta ───────────────────────────────────────────────────────

class ClinicContactResponse(BaseModel):
    """Información de contacto de la persona responsable de la clínica."""
    name: str
    email: EmailStr
    phone: Optional[str] = None
    role: str = "Admin"  # Rol del contacto dentro de la clínica


class ClinicSummary(BaseModel):
    """
    Representación resumida de una clínica para la tabla de listado.
    Contiene solo los campos necesarios para mostrar en la vista de Clinic Management.
    """
    id: str
    name: str
    tier: ClinicTier
    status: ClinicStatus
    patients_used: int = Field(..., alias="patientsUsed")
    patients_limit: int = Field(..., alias="patientsLimit")
    health_score: int = Field(..., alias="healthScore", ge=0, le=100)
    last_login: Optional[datetime] = Field(None, alias="lastLogin")
    mrr: float = Field(0.0, description="Monthly Recurring Revenue en USD")
    location: Optional[str] = None

    class Config:
        populate_by_name = True  # Acepta tanto snake_case como camelCase


class ClinicDetail(ClinicSummary):
    """
    Detalle completo de una clínica, mostrado en el drawer lateral.
    Extiende ClinicSummary con información adicional de suscripción y contacto.
    """
    contact: Optional[ClinicContactResponse] = None
    subscription_start: Optional[datetime] = Field(None, alias="subscriptionStart")
    next_billing_date: Optional[datetime] = Field(None, alias="nextBillingDate")
    outstanding_invoices: int = Field(0, alias="outstandingInvoices")
    total_revenue: float = Field(0.0, alias="totalRevenue")
    notes: Optional[str] = None    # Notas internas del equipo de soporte

    class Config:
        populate_by_name = True


class ClinicListResponse(BaseModel):
    """Respuesta paginada de la lista de clínicas."""
    data: list[ClinicSummary]
    total: int                     # Total de clínicas que coinciden con el filtro
    page: int                      # Página actual
    page_size: int = Field(..., alias="pageSize")
    has_next: bool = Field(..., alias="hasNext")

    class Config:
        populate_by_name = True


# ── Modelos de request ─────────────────────────────────────────────────────────

class ClinicFilters(BaseModel):
    """Parámetros de filtrado y paginación para el listado de clínicas."""
    search: Optional[str] = None          # Búsqueda por nombre o email
    tier: Optional[ClinicTier] = None     # Filtrar por plan
    status: Optional[ClinicStatus] = None # Filtrar por estado
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100, alias="pageSize")
    sort_by: str = Field("name", alias="sortBy")
    sort_order: SortOrder = Field(SortOrder.ASC, alias="sortOrder")

    class Config:
        populate_by_name = True


class UpdateClinicRequest(BaseModel):
    """
    Campos actualizables de una clínica (PATCH parcial).
    Todos los campos son opcionales; solo se actualizan los que se envíen.
    """
    tier: Optional[ClinicTier] = None
    status: Optional[ClinicStatus] = None
    patients_limit: Optional[int] = Field(None, alias="patientsLimit", ge=1)
    notes: Optional[str] = None

    class Config:
        populate_by_name = True


class ImpersonateRequest(BaseModel):
    """Request para iniciar una sesión de impersonación."""
    reason: str = Field(
        ...,
        min_length=10,
        description="Motivo de la impersonación (requerido para auditoría)"
    )


class ImpersonateResponse(BaseModel):
    """Token de sesión temporal para acceder a la clínica como si fuera un usuario de esa clínica."""
    session_token: str = Field(..., alias="sessionToken")
    expires_at: datetime = Field(..., alias="expiresAt")
    clinic_id: str = Field(..., alias="clinicId")
    clinic_name: str = Field(..., alias="clinicName")
    audit_log_id: str = Field(..., alias="auditLogId")

    class Config:
        populate_by_name = True
