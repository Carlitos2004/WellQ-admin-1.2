"""
models.py — Modelos SQLModel para WellQ Admin Console
======================================================
Ejecutar UNA VEZ para crear las tablas en Neon:
    python -c "from models import create_all_tables; import asyncio; asyncio.run(create_all_tables())"

O simplemente arrancar el backend (main.py ya llama a create_db_tables()).
"""

from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, JSON, Text
from typing import Optional, List
from datetime import datetime, date


# ── 1. CLINICS ─────────────────────────────────────────────────────────────────
class Clinic(SQLModel, table=True):
    __tablename__ = "clinics"

    id: Optional[int]         = Field(default=None, primary_key=True)
    clinic_id: str            = Field(unique=True, index=True)          # "CL-001"
    name: str                 = Field(index=True)
    tier: str                 = Field(default="smb")                    # trial | smb | enterprise
    status: str               = Field(default="active")                 # active | warning | critical | churned
    patients_used: int        = Field(default=0)
    patients_limit: int       = Field(default=500)
    health_score: int         = Field(default=100)
    last_login: Optional[datetime] = Field(default=None)
    mrr: float                = Field(default=0.0)
    location: Optional[str]   = Field(default=None)

    # Contacto
    contact_name: Optional[str]  = Field(default=None)
    contact_email: Optional[str] = Field(default=None)
    contact_phone: Optional[str] = Field(default=None)

    # Billing
    company_name: Optional[str]   = Field(default=None)
    tax_id: Optional[str]         = Field(default=None)
    billing_email: Optional[str]  = Field(default=None)
    address: Optional[str]        = Field(default=None)

    # Metadata
    internal_notes: Optional[str] = Field(default=None, sa_column=Column(Text))
    created_at: datetime          = Field(default_factory=datetime.utcnow)
    updated_at: datetime          = Field(default_factory=datetime.utcnow)


# ── 2. FEATURES ────────────────────────────────────────────────────────────────
class Feature(SQLModel, table=True):
    __tablename__ = "features"

    id: Optional[int]          = Field(default=None, primary_key=True)
    feature_id: str            = Field(unique=True, index=True)         # "feat-patients"
    name: str                  = Field(unique=True)
    category: str              = Field(index=True)
    unit: str                  = Field()                                # "patients", "GB", etc.
    unit_type: str             = Field()                                # "number" | "toggle" | "select"
    options: Optional[str]     = Field(default=None)                    # JSON array como string
    default_limit: str         = Field(default="0")                     # guardado como string, flexible
    description: str           = Field(sa_column=Column(Text))
    icon: Optional[str]        = Field(default=None)
    status: str                = Field(default="active")                # "active" | "archived"
    created_at: datetime       = Field(default_factory=datetime.utcnow)
    updated_at: datetime       = Field(default_factory=datetime.utcnow)
    archived_at: Optional[datetime] = Field(default=None)


# ── 3. PLANS ───────────────────────────────────────────────────────────────────
class Plan(SQLModel, table=True):
    __tablename__ = "plans"

    id: Optional[int]         = Field(default=None, primary_key=True)
    plan_id: str              = Field(unique=True, index=True)          # "plan-smb"
    name: str                 = Field(unique=True)
    description: Optional[str] = Field(default=None, sa_column=Column(Text))
    tag_color: str            = Field(default="slate")                  # "purple" | "blue" | "indigo" | "slate"
    status: str               = Field(default="active")                 # "draft" | "active" | "archived"
    setup_price: float        = Field(default=0.0)
    monthly_price: float      = Field(default=0.0)
    currency: str             = Field(default="USD")
    effective_date: str       = Field(default="")                       # "2026-01-01"
    active_clinics: int       = Field(default=0)                        # métrica calculada
    arr: float                = Field(default=0.0)                      # métrica calculada
    created_by_email: str     = Field(default="admin@wellq.co")
    created_by_name: str      = Field(default="Admin WellQ")
    updated_by_email: str     = Field(default="admin@wellq.co")
    updated_by_name: str      = Field(default="Admin WellQ")
    created_at: datetime      = Field(default_factory=datetime.utcnow)
    updated_at: datetime      = Field(default_factory=datetime.utcnow)
    archived_at: Optional[datetime] = Field(default=None)


# ── 4. PLAN_FEATURES (tabla pivot Plan ↔ Feature) ──────────────────────────────
class PlanFeature(SQLModel, table=True):
    __tablename__ = "plan_features"

    id: Optional[int]    = Field(default=None, primary_key=True)
    plan_id: str         = Field(index=True)                            # FK lógico → plans.plan_id
    feature_id: str      = Field(index=True)                            # FK lógico → features.feature_id
    limit_value: str     = Field(default="0")                           # guardado como string (flexible)


# ── 5. CLINIC_PLANS (asignaciones + historial) ─────────────────────────────────
class ClinicPlan(SQLModel, table=True):
    __tablename__ = "clinic_plans"

    id: Optional[int]         = Field(default=None, primary_key=True)
    assignment_id: str        = Field(unique=True, index=True)          # "asgn-001"
    clinic_id: str            = Field(index=True)                       # FK lógico → clinics.clinic_id
    plan_id: str              = Field(index=True)                       # FK lógico → plans.plan_id
    plan_snapshot: str        = Field(sa_column=Column(Text))           # JSON completo del plan al momento de asignar
    effective_from: datetime  = Field()
    effective_to: Optional[datetime] = Field(default=None)
    assigned_by_id: str       = Field(default="usr-001")
    assigned_by_email: str    = Field(default="admin@wellq.co")
    assigned_by_name: str     = Field(default="Admin WellQ")
    reason: Optional[str]     = Field(default=None)
    notify_clinic: bool       = Field(default=False)
    created_at: datetime      = Field(default_factory=datetime.utcnow)


# ── 6. SCHEDULED_CHANGES ───────────────────────────────────────────────────────
class ScheduledChange(SQLModel, table=True):
    __tablename__ = "scheduled_changes"

    id: Optional[int]         = Field(default=None, primary_key=True)
    schedule_id: str          = Field(unique=True, index=True)          # "sched-001"
    clinic_id: str            = Field(index=True)
    plan_id: str              = Field(index=True)
    effective_from: datetime  = Field()
    status: str               = Field(default="scheduled")             # "scheduled" | "executed" | "cancelled"
    scheduled_by_id: str      = Field(default="usr-001")
    scheduled_by_email: str   = Field(default="admin@wellq.co")
    scheduled_by_name: str    = Field(default="Admin WellQ")
    notify_clinic: bool       = Field(default=False)
    executed_at: Optional[datetime] = Field(default=None)
    created_at: datetime      = Field(default_factory=datetime.utcnow)


# ── 7. ALERTS ──────────────────────────────────────────────────────────────────
class Alert(SQLModel, table=True):
    __tablename__ = "alerts"

    id: Optional[int]         = Field(default=None, primary_key=True)
    alert_id: str             = Field(unique=True, index=True)          # "ALT-001"
    type: str                 = Field()                                 # "billing_warning" | "license_usage"
    title: str                = Field()
    message: str              = Field(sa_column=Column(Text))
    severity: str             = Field()                                 # "high" | "medium" | "low"
    related_type: Optional[str]  = Field(default=None)                  # "clinic"
    related_id: Optional[str]    = Field(default=None)                  # "CL-001"
    is_read: bool             = Field(default=False)
    acknowledged_at: Optional[datetime] = Field(default=None)
    created_at: datetime      = Field(default_factory=datetime.utcnow)


# ── 8. NOTIFICATIONS ───────────────────────────────────────────────────────────
class Notification(SQLModel, table=True):
    __tablename__ = "notifications"

    id: Optional[int]             = Field(default=None, primary_key=True)
    notification_id: str          = Field(unique=True, index=True)      # "notif-001"
    title: str                    = Field()
    message: str                  = Field(sa_column=Column(Text))
    channel: str                  = Field()                             # "email" | "in_app"
    status: str                   = Field(default="pending")            # "pending" | "sent" | "failed"
    recipient_clinic_id: str      = Field()                             # "clinic-12345" o "all"
    sent_by: str                  = Field()
    sender_name: Optional[str]    = Field(default=None)
    created_at: datetime          = Field(default_factory=datetime.utcnow)
    sent_at: Optional[datetime]   = Field(default=None)


# ── 9. JOBS ────────────────────────────────────────────────────────────────────
class Job(SQLModel, table=True):
    __tablename__ = "jobs"

    id: Optional[int]            = Field(default=None, primary_key=True)
    job_id: str                  = Field(unique=True, index=True)       # "job-8d72-4f1a-b3c9"
    job_type: str                = Field()                              # "export_clinics"
    status: str                  = Field(default="queued")             # "queued" | "running" | "completed" | "failed"
    progress: int                = Field(default=0)
    created_by: str              = Field()
    result_url: Optional[str]    = Field(default=None)
    error: Optional[str]         = Field(default=None)
    created_at: datetime         = Field(default_factory=datetime.utcnow)
    started_at: Optional[datetime]   = Field(default=None)
    completed_at: Optional[datetime] = Field(default=None)


# ── 10. ADMIN_USERS ────────────────────────────────────────────────────────────
class AdminUser(SQLModel, table=True):
    __tablename__ = "admin_users"

    id: Optional[int]       = Field(default=None, primary_key=True)
    user_id: str            = Field(unique=True, index=True)            # "USR-SUPER-001"
    full_name: str          = Field()
    email: str              = Field(unique=True, index=True)
    role: str               = Field()                                   # "super_admin" | "admin" | "viewer"
    status: str             = Field(default="active")                   # "active" | "inactive"
    last_login: Optional[datetime] = Field(default=None)
    created_at: datetime    = Field(default_factory=datetime.utcnow)
