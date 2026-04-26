"""
models/notification.py — Modelos para Notificaciones y Jobs Asíncronos
=======================================================================
Esquemas para enviar comunicaciones a clínicas y para rastrear
el estado de operaciones de larga duración (jobs en segundo plano).
"""

from pydantic import BaseModel, Field, EmailStr
from typing import Optional, Literal
from datetime import datetime
from enum import Enum


class NotificationChannel(str, Enum):
    """Canales por los que se puede enviar una notificación."""
    IN_APP = "in_app"    # Dentro de la plataforma WellQ
    EMAIL = "email"      # Correo electrónico


class NotificationStatus(str, Enum):
    """Estado de envío de la notificación."""
    PENDING = "pending"      # En cola, aún no enviada
    SENT = "sent"            # Enviada correctamente
    FAILED = "failed"        # Falló el envío
    READ = "read"            # El destinatario la ha leído (solo in_app)


class JobStatus(str, Enum):
    """Estado de un job asíncrono."""
    QUEUED = "queued"        # En cola esperando ser procesado
    RUNNING = "running"      # En ejecución actualmente
    COMPLETED = "completed"  # Terminado con éxito
    FAILED = "failed"        # Terminado con error


# ── Notificaciones ─────────────────────────────────────────────────────────────

class SendNotificationRequest(BaseModel):
    """
    Request para enviar una notificación a una o varias clínicas.
    Se puede dirigir a clínicas específicas o a todos los de un tier/status.
    """
    title: str = Field(..., min_length=3, max_length=150)
    message: str = Field(..., min_length=10, max_length=2000)
    channel: NotificationChannel
    # Destinatarios: lista de IDs de clínica o "all" para todas
    recipient_clinic_ids: list[str] = Field(..., alias="recipientClinicIds")
    # Si se envía email, se puede personalizar el "from"
    sender_name: Optional[str] = Field(None, alias="senderName")
    # Programar para enviar en el futuro (opcional)
    scheduled_for: Optional[datetime] = Field(None, alias="scheduledFor")

    class Config:
        populate_by_name = True


class NotificationRecord(BaseModel):
    """Registro de una notificación enviada, almacenado en Firestore."""
    id: str
    title: str
    message: str
    channel: NotificationChannel
    status: NotificationStatus
    recipient_clinic_id: str = Field(..., alias="recipientClinicId")
    sent_by: str = Field(..., alias="sentBy")   # Sub (UUID) del admin que la envió
    created_at: datetime = Field(..., alias="createdAt")
    sent_at: Optional[datetime] = Field(None, alias="sentAt")
    read_at: Optional[datetime] = Field(None, alias="readAt")
    error_message: Optional[str] = Field(None, alias="errorMessage")

    class Config:
        populate_by_name = True


class NotificationListResponse(BaseModel):
    """Lista paginada de notificaciones."""
    data: list[NotificationRecord]
    total: int
    page: int
    has_next: bool = Field(..., alias="hasNext")

    class Config:
        populate_by_name = True


# ── Jobs Asíncronos ────────────────────────────────────────────────────────────

class JobRecord(BaseModel):
    """
    Registro de un job asíncrono en la plataforma.
    Los jobs son operaciones pesadas que se ejecutan en segundo plano
    (exportaciones, migraciones de datos, cálculos de reportes, etc.).
    """
    id: str
    job_type: str = Field(..., alias="jobType")       # "export_clinics", "recalc_mrr", etc.
    status: JobStatus
    progress: int = Field(0, ge=0, le=100)            # Progreso del 0 al 100%
    created_by: str = Field(..., alias="createdBy")   # Sub del admin que lo lanzó
    created_at: datetime = Field(..., alias="createdAt")
    started_at: Optional[datetime] = Field(None, alias="startedAt")
    completed_at: Optional[datetime] = Field(None, alias="completedAt")
    result_url: Optional[str] = Field(None, alias="resultUrl")  # URL del archivo resultado
    error: Optional[str] = None

    class Config:
        populate_by_name = True
