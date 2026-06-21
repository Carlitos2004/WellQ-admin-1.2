"""SQLModel table definitions for the WellQ Admin Console."""

from datetime import datetime
from typing import Optional

from sqlalchemy import Column, ForeignKey, Integer, PrimaryKeyConstraint, Text
from sqlmodel import Field, SQLModel

class KpiSnapshot(SQLModel, table=True):
    __tablename__ = "kpi_snapshots"

    id: Optional[int]         = Field(default=None, primary_key=True)
    # ── NUEVO: Filtro Universal Multi-tenant (Problema 5) ─────────────────────
    # null → snapshot global de toda la empresa WellQ
    # str  → snapshot de una clínica específica (referencia a clinics.clinic_id)
    clinic_id: Optional[str]  = Field(default=None, index=True)
    month: str                = Field()
    year: int                 = Field()
    arr: float                = Field(default=0.0)
    mrr: float                = Field(default=0.0)
    nrr_percentage: float     = Field(default=0.0)
    expansion_mrr: float      = Field(default=0.0)
    churn_mrr: float          = Field(default=0.0)
    nrr_status: str           = Field(default="healthy")
    created_at: datetime      = Field(default_factory=datetime.utcnow)

class AppMetric(SQLModel, table=True):
    __tablename__ = "app_metrics"

    id: Optional[int]     = Field(default=None, primary_key=True)
    metric_key: str       = Field(unique=True, index=True)
    metric_value: float   = Field(default=0.0)
    updated_at: datetime  = Field(default_factory=datetime.utcnow)

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
    # ── NUEVOS: métricas con fuente real en MongoDB ────────────────────────────
    # appointments_this_month → COUNT appointments WHERE clinic_id = X
    #   AND start_time >= inicio_mes_actual
    # notes_generated         → COUNT clinical_notes WHERE provider en clinic X
    #   AND created_at >= inicio_mes_actual (join: provider_id → clinicians.clinic_ids[])
    # exercises_assigned      → COUNT patient_programs WHERE patient en clinic X
    #   AND active_until = null (programas activos)
    appointments_this_month: int       = Field(default=0)
    notes_generated: int               = Field(default=0)
    exercises_assigned: int            = Field(default=0)

class MrrSnapshot(SQLModel, table=True):
    __tablename__ = "mrr_snapshots"

    id: Optional[int]                  = Field(default=None, primary_key=True)
    # ── NUEVO: Filtro Universal Multi-tenant (Problema 5) ─────────────────────
    # null → snapshot global de toda la empresa WellQ
    # str  → snapshot de una clínica específica (referencia a clinics.clinic_id)
    clinic_id: Optional[str]           = Field(default=None, index=True)
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

class ChurnRiskRegion(SQLModel, table=True):
    __tablename__ = "churn_risk_regions"

    id: Optional[int]          = Field(default=None, primary_key=True)
    region: str                = Field()
    clinics_at_risk: int       = Field(default=0)
    potential_mrr_loss: float  = Field(default=0.0)
    risk_level: str            = Field(default="Low")
    recorded_at: datetime      = Field(default_factory=datetime.utcnow)

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

class FeatureAdoption(SQLModel, table=True):
    __tablename__ = "feature_adoption"

    id: Optional[int]                  = Field(default=None, primary_key=True)
    feature_name: str                  = Field()
    period: str                        = Field(default="last_30_days")
    adoption_rate_percentage: float    = Field(default=0.0)
    total_uses: int                    = Field(default=0)
    user_feedback_score: float         = Field(default=0.0)
    recorded_at: datetime              = Field(default_factory=datetime.utcnow)

class AdherenceSnapshot(SQLModel, table=True):
    __tablename__ = "adherence_snapshots"

    id: Optional[int]                      = Field(default=None, primary_key=True)
    period: str                            = Field(default="current_month")
    overall_adherence_percentage: float    = Field(default=0.0)
    breakdown_by_week: Optional[str]       = Field(default=None)
    top_dropping_point: Optional[str]      = Field(default=None)
    recorded_at: datetime                  = Field(default_factory=datetime.utcnow)

class CohortRetention(SQLModel, table=True):
    __tablename__ = "cohort_retention"

    id: Optional[int]          = Field(default=None, primary_key=True)
    cohort_label: str          = Field()
    cohort_month: int          = Field()
    cohort_year: int           = Field()
    users_count: int           = Field(default=0)
    retention_by_month: str    = Field(sa_column=Column(Text))
    recorded_at: datetime      = Field(default_factory=datetime.utcnow)

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

class AiCostSnapshot(SQLModel, table=True):
    __tablename__ = "ai_cost_snapshots"

    id: Optional[int]              = Field(default=None, primary_key=True)
    period: str                    = Field(default="current_month")
    currency: str                  = Field(default="USD")
    total_cost: float              = Field(default=0.0)
    breakdown: Optional[str]       = Field(default=None, sa_column=Column(Text))
    projected_eom_cost: float      = Field(default=0.0)
    recorded_at: datetime          = Field(default_factory=datetime.utcnow)

class AiLatencyMetric(SQLModel, table=True):
    __tablename__ = "ai_latency_metrics"

    id: Optional[int]          = Field(default=None, primary_key=True)
    service: str               = Field(index=True)
    period: str                = Field(default="last_24_hours")
    average_latency_ms: int    = Field(default=0)
    p95_latency_ms: int        = Field(default=0)
    status: str                = Field(default="healthy")
    recorded_at: datetime      = Field(default_factory=datetime.utcnow)

class PoseAnalysisSnapshot(SQLModel, table=True):
    __tablename__ = "pose_analysis_snapshots"

    id: Optional[int]                          = Field(default=None, primary_key=True)
    period: str                                = Field(default="last_7_days")
    total_sessions_analyzed: int               = Field(default=0)
    overall_success_rate_percentage: float     = Field(default=0.0)
    failure_reasons: Optional[str]             = Field(default=None, sa_column=Column(Text))
    recorded_at: datetime                      = Field(default_factory=datetime.utcnow)

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
