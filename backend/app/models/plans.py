"""SQLModel table definitions for the WellQ Admin Console."""

from datetime import datetime
from typing import Optional

from sqlalchemy import Column, ForeignKey, Integer, PrimaryKeyConstraint, Text
from sqlmodel import Field, SQLModel

class Feature(SQLModel, table=True):
    __tablename__ = "features"

    id: Optional[int]                   = Field(default=None, primary_key=True)
    feature_id: str                     = Field(unique=True, index=True)
    name: str                           = Field(unique=True)
    category: str                       = Field(index=True)
    unit: str                           = Field()
    unit_type: str                      = Field()                  # "number" | "toggle" | "select"
    options: Optional[str]              = Field(default=None)      # JSON array como string
    default_limit: str                  = Field(default="0")
    description: str                    = Field(sa_column=Column(Text))
    icon: Optional[str]                 = Field(default=None)
    status: str                         = Field(default="active")  # "active" | "archived"
    created_at: datetime                = Field(default_factory=datetime.utcnow)
    updated_at: datetime                = Field(default_factory=datetime.utcnow)
    archived_at: Optional[datetime]     = Field(default=None)

class Plan(SQLModel, table=True):
    __tablename__ = "plans"

    id: Optional[int]               = Field(default=None, primary_key=True)
    plan_id: str                    = Field(unique=True, index=True)   # ← string ID canónico
    name: str                       = Field(unique=True)
    description: Optional[str]      = Field(default=None, sa_column=Column(Text))
    tag_color: str                  = Field(default="slate")
    status: str                     = Field(default="active")          # "draft" | "active" | "archived"
    setup_price: float              = Field(default=0.0)
    monthly_price: float            = Field(default=0.0)
    currency: str                   = Field(default="USD")
    effective_date: Optional[datetime] = Field(default=None)           # ← datetime, no str
    active_clinics: int             = Field(default=0)
    arr: float                      = Field(default=0.0)
    created_by_email: str           = Field(default="admin@wellq.co")
    created_by_name: str            = Field(default="Admin WellQ")
    updated_by_email: str           = Field(default="admin@wellq.co")
    updated_by_name: str            = Field(default="Admin WellQ")
    created_at: datetime            = Field(default_factory=datetime.utcnow)
    updated_at: datetime            = Field(default_factory=datetime.utcnow)
    archived_at: Optional[datetime] = Field(default=None)

class PlanFeature(SQLModel, table=True):
    __tablename__ = "plan_features"

    id: Optional[int] = Field(default=None, primary_key=True)
    plan_id: str      = Field(index=True)     # referencia a Plan.plan_id
    feature_id: str   = Field(index=True)     # referencia a Feature.feature_id
    limit_value: str  = Field(default="0")    # guardado como string para soportar "Email", "1", etc.

class ClinicPlan(SQLModel, table=True):
    __tablename__ = "clinic_plans"

    id: Optional[int]                = Field(default=None, primary_key=True)
    assignment_id: str               = Field(unique=True, index=True)
    clinic_id: str                   = Field(index=True)
    plan_id: str                     = Field(index=True)
    plan_snapshot: str               = Field(sa_column=Column(Text))
    effective_from: datetime         = Field()
    effective_to: Optional[datetime] = Field(default=None)
    assigned_by_id: str              = Field(default="usr-001")
    assigned_by_email: str           = Field(default="admin@wellq.co")
    assigned_by_name: str            = Field(default="Admin WellQ")
    reason: Optional[str]            = Field(default=None)
    notify_clinic: bool              = Field(default=False)
    created_at: datetime             = Field(default_factory=datetime.utcnow)

class ScheduledChange(SQLModel, table=True):
    __tablename__ = "scheduled_changes"

    id: Optional[int]               = Field(default=None, primary_key=True)
    schedule_id: str                = Field(unique=True, index=True)
    clinic_id: str                  = Field(index=True)
    plan_id: str                    = Field(index=True)
    effective_from: datetime        = Field()
    status: str                     = Field(default="scheduled")   # "scheduled" | "executed" | "cancelled"
    scheduled_by_id: str            = Field(default="usr-001")
    scheduled_by_email: str         = Field(default="admin@wellq.co")
    scheduled_by_name: str          = Field(default="Admin WellQ")
    notify_clinic: bool             = Field(default=False)
    executed_at: Optional[datetime] = Field(default=None)
    created_at: datetime            = Field(default_factory=datetime.utcnow)
