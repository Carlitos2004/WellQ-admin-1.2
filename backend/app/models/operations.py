"""SQLModel table definitions for the WellQ Admin Console."""

from datetime import datetime
from typing import Optional

from sqlalchemy import Column, ForeignKey, Integer, PrimaryKeyConstraint, Text
from sqlmodel import Field, SQLModel

class Alert(SQLModel, table=True):
    __tablename__ = "alerts"

    id: Optional[int]                   = Field(default=None, primary_key=True)
    alert_id: str                       = Field(unique=True, index=True)
    type: str                           = Field()
    title: str                          = Field()
    message: str                        = Field(sa_column=Column(Text))
    # i18n: el frontend usa estas keys para traducir título y mensaje
    # message_params es JSON string con valores dinámicos, ej: {"clinic":"X","days":30}
    title_key: Optional[str]            = Field(default=None)
    message_key: Optional[str]          = Field(default=None)
    message_params: Optional[str]       = Field(default=None, sa_column=Column(Text))
    severity: str                       = Field()                  # "high" | "medium" | "low"
    related_type: Optional[str]         = Field(default=None)
    related_id: Optional[str]           = Field(default=None)
    is_read: bool                       = Field(default=False)
    acknowledged_at: Optional[datetime] = Field(default=None)
    created_at: datetime                = Field(default_factory=datetime.utcnow)

class Notification(SQLModel, table=True):
    __tablename__ = "notifications"

    id: Optional[int]             = Field(default=None, primary_key=True)
    notification_id: str          = Field(unique=True, index=True)
    title: str                    = Field()
    message: str                  = Field(sa_column=Column(Text))
    channel: str                  = Field()                        # "email" | "in_app"
    status: str                   = Field(default="pending")       # "pending" | "sent" | "failed"
    recipient_clinic_id: str      = Field()
    sent_by: str                  = Field()
    sender_name: Optional[str]    = Field(default=None)
    created_at: datetime          = Field(default_factory=datetime.utcnow)
    sent_at: Optional[datetime]   = Field(default=None)

class Job(SQLModel, table=True):
    __tablename__ = "jobs"

    id: Optional[int]                = Field(default=None, primary_key=True)
    job_id: str                      = Field(unique=True, index=True)
    job_type: str                    = Field()
    status: str                      = Field(default="queued")     # "queued" | "running" | "completed" | "failed"
    progress: int                    = Field(default=0)
    created_by: str                  = Field()
    result_url: Optional[str]        = Field(default=None)
    error: Optional[str]             = Field(default=None)
    created_at: datetime             = Field(default_factory=datetime.utcnow)
    started_at: Optional[datetime]   = Field(default=None)
    completed_at: Optional[datetime] = Field(default=None)

class AppVersion(SQLModel, table=True):
    __tablename__ = "app_versions"

    id: Optional[int]     = Field(default=None, primary_key=True)
    app_type: str         = Field(index=True)
    version: str          = Field()
    user_count: int       = Field(default=0)
    percentage: float     = Field(default=0.0)
    recorded_at: datetime = Field(default_factory=datetime.utcnow)

class PlatformSetting(SQLModel, table=True):
    __tablename__ = "platform_settings"

    id: Optional[int]      = Field(default=None, primary_key=True)
    setting_key: str       = Field(unique=True, index=True)
    setting_value: str     = Field()
    updated_at: datetime   = Field(default_factory=datetime.utcnow)
    updated_by: str        = Field(default="admin@wellq.co")

class ForceUpdateConfig(SQLModel, table=True):
    """
    Configuración de versión mínima obligatoria por tipo de app.
    Un registro por app_type (patients, tablet, web).
    Si min_version está definida, los usuarios con versiones anteriores
    son forzados a actualizar antes de poder continuar usando la app.
    """
    __tablename__ = "force_update_config"

    id: Optional[int]         = Field(default=None, primary_key=True)
    app_type: str             = Field(unique=True, index=True)   # "patients" | "tablet" | "web"
    min_version: str          = Field()                          # e.g. "2.1.0"
    updated_at: datetime      = Field(default_factory=datetime.utcnow)
    updated_by: Optional[str] = Field(default=None)             # email del admin que lo configuró
