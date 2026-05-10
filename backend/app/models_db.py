"""
models_db.py — Modelos SQLModel para WellQ Admin Console
=========================================================
Tablas en Neon (PostgreSQL). El backend las crea automáticamente al arrancar.
Para poblar con datos mock: python seed.py
"""

from sqlmodel import SQLModel, Field
from sqlalchemy import Column, Text
from typing import Optional
from datetime import datetime


# ── 1. CLINICS ─────────────────────────────────────────────────────────────────
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


# ── 2. FEATURES ────────────────────────────────────────────────────────────────
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


# ── 3. PLANS ───────────────────────────────────────────────────────────────────
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


# ── 4. PLAN_FEATURES ───────────────────────────────────────────────────────────
class PlanFeature(SQLModel, table=True):
    __tablename__ = "plan_features"

    id: Optional[int] = Field(default=None, primary_key=True)
    plan_id: str      = Field(index=True)     # referencia a Plan.plan_id
    feature_id: str   = Field(index=True)     # referencia a Feature.feature_id
    limit_value: str  = Field(default="0")    # guardado como string para soportar "Email", "1", etc.


# ── 5. CLINIC_PLANS ────────────────────────────────────────────────────────────
class ClinicPlan(SQLModel, table=True):
    __tablename__ = "clinic_plans"

    id: Optional[int]               = Field(default=None, primary_key=True)
    assignment_id: str              = Field(unique=True, index=True)
    clinic_id: str                  = Field(index=True)
    plan_id: str                    = Field(index=True)
    plan_snapshot: str              = Field(sa_column=Column(Text))
    effective_from: datetime        = Field()
    effective_to: Optional[datetime]= Field(default=None)
    assigned_by_id: str             = Field(default="usr-001")
    assigned_by_email: str          = Field(default="admin@wellq.co")
    assigned_by_name: str           = Field(default="Admin WellQ")
    reason: Optional[str]           = Field(default=None)
    notify_clinic: bool             = Field(default=False)
    created_at: datetime            = Field(default_factory=datetime.utcnow)


# ── 6. SCHEDULED_CHANGES ───────────────────────────────────────────────────────
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


# ── 7. ALERTS ──────────────────────────────────────────────────────────────────
class Alert(SQLModel, table=True):
    __tablename__ = "alerts"

    id: Optional[int]                   = Field(default=None, primary_key=True)
    alert_id: str                       = Field(unique=True, index=True)
    type: str                           = Field()
    title: str                          = Field()
    message: str                        = Field(sa_column=Column(Text))
    severity: str                       = Field()                  # "high" | "medium" | "low"
    related_type: Optional[str]         = Field(default=None)
    related_id: Optional[str]           = Field(default=None)
    is_read: bool                       = Field(default=False)
    acknowledged_at: Optional[datetime] = Field(default=None)
    created_at: datetime                = Field(default_factory=datetime.utcnow)


# ── 8. NOTIFICATIONS ───────────────────────────────────────────────────────────
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


# ── 9. JOBS ────────────────────────────────────────────────────────────────────
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


# ── 10. ADMIN_USERS ────────────────────────────────────────────────────────────
class AdminUser(SQLModel, table=True):
    __tablename__ = "admin_users"

    id: Optional[int]              = Field(default=None, primary_key=True)
    user_id: str                   = Field(unique=True, index=True)
    full_name: str                 = Field()
    email: str                     = Field(unique=True, index=True)
    role: str                      = Field()                       # "super_admin" | "admin" | "viewer"
    status: str                    = Field(default="active")       # "active" | "inactive"
    last_login: Optional[datetime] = Field(default=None)
    created_at: datetime           = Field(default_factory=datetime.utcnow)


# ── 11. KPI_SNAPSHOTS ──────────────────────────────────────────────────────────
class KpiSnapshot(SQLModel, table=True):
    __tablename__ = "kpi_snapshots"

    id: Optional[int]     = Field(default=None, primary_key=True)
    month: str            = Field()
    year: int             = Field()
    arr: float            = Field(default=0.0)
    mrr: float            = Field(default=0.0)
    nrr_percentage: float = Field(default=0.0)
    expansion_mrr: float  = Field(default=0.0)
    churn_mrr: float      = Field(default=0.0)
    nrr_status: str       = Field(default="healthy")
    created_at: datetime  = Field(default_factory=datetime.utcnow)


# ── 12. APP_METRICS ────────────────────────────────────────────────────────────
class AppMetric(SQLModel, table=True):
    __tablename__ = "app_metrics"

    id: Optional[int]     = Field(default=None, primary_key=True)
    metric_key: str       = Field(unique=True, index=True)
    metric_value: float   = Field(default=0.0)
    updated_at: datetime  = Field(default_factory=datetime.utcnow)


# ── 13. INVOICES ───────────────────────────────────────────────────────────────
class Invoice(SQLModel, table=True):
    __tablename__ = "invoices"

    id: Optional[int]             = Field(default=None, primary_key=True)
    invoice_id: str               = Field(unique=True, index=True)
    clinic_id: str                = Field(index=True)
    amount: float                 = Field(default=0.0)
    currency: str                 = Field(default="USD")
    status: str                   = Field(default="pending")
    issued_at: datetime           = Field()
    pdf_url: Optional[str]        = Field(default=None)
    created_at: datetime          = Field(default_factory=datetime.utcnow)


# ── 14. CLINIC_USAGE_METRICS ───────────────────────────────────────────────────
class ClinicUsageMetric(SQLModel, table=True):
    __tablename__ = "clinic_usage_metrics"

    id: Optional[int]                  = Field(default=None, primary_key=True)
    clinic_id: str                     = Field(index=True)
    period: str                        = Field(default="last_30_days")
    active_clinicians: int             = Field(default=0)
    patient_sessions_completed: int    = Field(default=0)
    ai_processing_minutes: int         = Field(default=0)
    api_calls: int                     = Field(default=0)
    recorded_at: datetime              = Field(default_factory=datetime.utcnow)


# ── 15. SERVERS ────────────────────────────────────────────────────────────────
class Server(SQLModel, table=True):
    __tablename__ = "servers"

    id: Optional[int]     = Field(default=None, primary_key=True)
    server_id: str        = Field(unique=True, index=True)
    name: str             = Field()
    region: str           = Field()
    status: str           = Field(default="healthy")
    uptime: str           = Field(default="99.9%")
    cpu_usage: str        = Field(default="0%")
    ram_usage: str        = Field(default="0%")
    updated_at: datetime  = Field(default_factory=datetime.utcnow)


# ── 16. BACKGROUND_PROCESSES ───────────────────────────────────────────────────
class BackgroundProcess(SQLModel, table=True):
    __tablename__ = "background_processes"

    id: Optional[int]               = Field(default=None, primary_key=True)
    process_id: str                 = Field(unique=True, index=True)
    name: str                       = Field()
    status: str                     = Field(default="running")
    queued_items: int               = Field(default=0)
    memory_consumption: str         = Field(default="0MB")
    description: Optional[str]      = Field(default=None, sa_column=Column(Text))
    started_at: Optional[datetime]  = Field(default=None)
    failed_at: Optional[datetime]   = Field(default=None)
    restart_count: int              = Field(default=0)
    updated_at: datetime            = Field(default_factory=datetime.utcnow)


# ── 17. MRR_SNAPSHOTS ──────────────────────────────────────────────────────────
class MrrSnapshot(SQLModel, table=True):
    __tablename__ = "mrr_snapshots"

    id: Optional[int]                  = Field(default=None, primary_key=True)
    period_month: str                  = Field()
    period_year: int                   = Field()
    total_mrr: float                   = Field(default=0.0)
    currency: str                      = Field(default="USD")
    new_business: float                = Field(default=0.0)
    expansion: float                   = Field(default=0.0)
    contraction: float                 = Field(default=0.0)
    churn: float                       = Field(default=0.0)
    retained: float                    = Field(default=0.0)
    monthly_growth_percentage: float   = Field(default=0.0)
    created_at: datetime               = Field(default_factory=datetime.utcnow)


# ── 18. CHURN_RISK_REGIONS ─────────────────────────────────────────────────────
class ChurnRiskRegion(SQLModel, table=True):
    __tablename__ = "churn_risk_regions"

    id: Optional[int]          = Field(default=None, primary_key=True)
    region: str                = Field()
    clinics_at_risk: int       = Field(default=0)
    potential_mrr_loss: float  = Field(default=0.0)
    risk_level: str            = Field(default="Low")
    recorded_at: datetime      = Field(default_factory=datetime.utcnow)


# ── 19. APP_USAGE_STATS ────────────────────────────────────────────────────────
class AppUsageStat(SQLModel, table=True):
    __tablename__ = "app_usage_stats"

    id: Optional[int]                          = Field(default=None, primary_key=True)
    app_type: str                              = Field(index=True)
    period: str                                = Field(default="current_month")
    monthly_active_users: int                  = Field(default=0)
    average_session_length_minutes: float      = Field(default=0.0)
    crash_free_sessions_percentage: float      = Field(default=0.0)
    top_screens: Optional[str]                 = Field(default=None)
    recorded_at: datetime                      = Field(default_factory=datetime.utcnow)
    # ── NUEVOS ────────────────────────────────────────────────────────────────
    total_downloads: int                       = Field(default=0)
    active_today: int                          = Field(default=0)
    active_30d: int                            = Field(default=0)
    inactive_users: int                        = Field(default=0)
    ios_downloads: int                         = Field(default=0)
    android_downloads: int                     = Field(default=0)
    registered_users: int                      = Field(default=0)


# ── 20. FEATURE_ADOPTION ───────────────────────────────────────────────────────
class FeatureAdoption(SQLModel, table=True):
    __tablename__ = "feature_adoption"

    id: Optional[int]                  = Field(default=None, primary_key=True)
    feature_name: str                  = Field()
    period: str                        = Field(default="last_30_days")
    adoption_rate_percentage: float    = Field(default=0.0)
    total_uses: int                    = Field(default=0)
    user_feedback_score: float         = Field(default=0.0)
    recorded_at: datetime              = Field(default_factory=datetime.utcnow)


# ── 21. ADHERENCE_SNAPSHOTS ────────────────────────────────────────────────────
class AdherenceSnapshot(SQLModel, table=True):
    __tablename__ = "adherence_snapshots"

    id: Optional[int]                      = Field(default=None, primary_key=True)
    period: str                            = Field(default="current_month")
    overall_adherence_percentage: float    = Field(default=0.0)
    breakdown_by_week: Optional[str]       = Field(default=None)
    top_dropping_point: Optional[str]      = Field(default=None)
    recorded_at: datetime                  = Field(default_factory=datetime.utcnow)


# ── 22. COHORT_RETENTION ───────────────────────────────────────────────────────
class CohortRetention(SQLModel, table=True):
    __tablename__ = "cohort_retention"

    id: Optional[int]          = Field(default=None, primary_key=True)
    cohort_label: str          = Field()
    cohort_month: int          = Field()
    cohort_year: int           = Field()
    users_count: int           = Field(default=0)
    retention_by_month: str    = Field(sa_column=Column(Text))
    recorded_at: datetime      = Field(default_factory=datetime.utcnow)


# ── 23. SOAP_QUALITY_METRICS ───────────────────────────────────────────────────
class SoapQualityMetric(SQLModel, table=True):
    __tablename__ = "soap_quality_metrics"

    id: Optional[int]                              = Field(default=None, primary_key=True)
    period: str                                    = Field(default="current_month")
    total_notes_generated: int                     = Field(default=0)
    acceptance_rate_percentage: float              = Field(default=0.0)
    edits_required_percentage: float               = Field(default=0.0)
    average_time_saved_minutes_per_note: float     = Field(default=0.0)
    common_corrections: Optional[str]              = Field(default=None)
    recorded_at: datetime                          = Field(default_factory=datetime.utcnow)


# ── 24. AI_COST_SNAPSHOTS ──────────────────────────────────────────────────────
class AiCostSnapshot(SQLModel, table=True):
    __tablename__ = "ai_cost_snapshots"

    id: Optional[int]              = Field(default=None, primary_key=True)
    period: str                    = Field(default="current_month")
    currency: str                  = Field(default="USD")
    total_cost: float              = Field(default=0.0)
    breakdown: Optional[str]       = Field(default=None, sa_column=Column(Text))
    projected_eom_cost: float      = Field(default=0.0)
    recorded_at: datetime          = Field(default_factory=datetime.utcnow)


# ── 25. AI_LATENCY_METRICS ─────────────────────────────────────────────────────
class AiLatencyMetric(SQLModel, table=True):
    __tablename__ = "ai_latency_metrics"

    id: Optional[int]          = Field(default=None, primary_key=True)
    service: str               = Field(index=True)
    period: str                = Field(default="last_24_hours")
    average_latency_ms: int    = Field(default=0)
    p95_latency_ms: int        = Field(default=0)
    status: str                = Field(default="healthy")
    recorded_at: datetime      = Field(default_factory=datetime.utcnow)


# ── 26. POSE_ANALYSIS_SNAPSHOTS ────────────────────────────────────────────────
class PoseAnalysisSnapshot(SQLModel, table=True):
    __tablename__ = "pose_analysis_snapshots"

    id: Optional[int]                          = Field(default=None, primary_key=True)
    period: str                                = Field(default="last_7_days")
    total_sessions_analyzed: int               = Field(default=0)
    overall_success_rate_percentage: float     = Field(default=0.0)
    failure_reasons: Optional[str]             = Field(default=None, sa_column=Column(Text))
    recorded_at: datetime                      = Field(default_factory=datetime.utcnow)


# ── 27. APP_VERSIONS ───────────────────────────────────────────────────────────
class AppVersion(SQLModel, table=True):
    __tablename__ = "app_versions"

    id: Optional[int]     = Field(default=None, primary_key=True)
    app_type: str         = Field(index=True)
    version: str          = Field()
    user_count: int       = Field(default=0)
    percentage: float     = Field(default=0.0)
    recorded_at: datetime = Field(default_factory=datetime.utcnow)


# ── 28. PLATFORM_SETTINGS ──────────────────────────────────────────────────────
class PlatformSetting(SQLModel, table=True):
    __tablename__ = "platform_settings"

    id: Optional[int]      = Field(default=None, primary_key=True)
    setting_key: str       = Field(unique=True, index=True)
    setting_value: str     = Field()
    updated_at: datetime   = Field(default_factory=datetime.utcnow)
    updated_by: str        = Field(default="admin@wellq.co")


# ── 29. IMPERSONATE_AUDIT_LOG ──────────────────────────────────────────────────
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


# ── 30. NEEDS_ATTENTION_ITEMS ──────────────────────────────────────────────────
class NeedsAttentionItem(SQLModel, table=True):
    __tablename__ = "needs_attention_items"

    id: Optional[int]               = Field(default=None, primary_key=True)
    item_id: str                    = Field(unique=True, index=True)   # "attn-001"
    clinic_id: str                  = Field(index=True)
    clinic_name: str                = Field()
    issue_type: str                 = Field(index=True)                # "overdue_invoice" | "no_login" | "low_health"
    severity: str                   = Field()                          # "critical" | "warning" | "info"
    description: str                = Field(sa_column=Column(Text))
    action_url: Optional[str]       = Field(default=None)
    is_resolved: bool               = Field(default=False)
    resolved_at: Optional[datetime] = Field(default=None)
    created_at: datetime            = Field(default_factory=datetime.utcnow)


# ── 31. INFRASTRUCTURE_COST_SNAPSHOTS ─────────────────────────────────────────
class InfrastructureCostSnapshot(SQLModel, table=True):
    __tablename__ = "infrastructure_cost_snapshots"

    id: Optional[int]          = Field(default=None, primary_key=True)
    period: str                = Field(index=True)                     # "Marzo 2026"
    period_year: int           = Field()
    period_month: int          = Field()
    total_usd: float           = Field(default=0.0)
    budget_usd: float          = Field(default=0.0)
    budget_used_percent: float = Field(default=0.0)
    breakdown: Optional[str]   = Field(default=None, sa_column=Column(Text))  # JSON array de CostBreakdown
    last_updated: datetime     = Field(default_factory=datetime.utcnow)
    created_at: datetime       = Field(default_factory=datetime.utcnow)


# ── 32. INFRA_NODES ────────────────────────────────────────────────────────────
class InfraNode(SQLModel, table=True):
    __tablename__ = "infra_nodes"

    id: Optional[int]          = Field(default=None, primary_key=True)
    node_id: str               = Field(unique=True, index=True)        # "node-api-us-east"
    name: str                  = Field()
    type: str                  = Field(index=True)                     # "api" | "worker" | "database" | "cache" | "cdn" | "queue"
    status: str                = Field(default="healthy")              # "healthy" | "degraded" | "down"
    region: Optional[str]      = Field(default=None)
    metrics: Optional[str]     = Field(default=None, sa_column=Column(Text))  # JSON libre
    updated_at: datetime       = Field(default_factory=datetime.utcnow)