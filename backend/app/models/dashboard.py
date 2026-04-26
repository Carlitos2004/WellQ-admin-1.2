"""
models/dashboard.py — Modelos Pydantic para el Dashboard
=========================================================
Esquemas de respuesta para las dos pestañas del Overview:
- Business Health: KPIs financieros, MRR, churn, alertas
- Operational Status: estado de servidores, procesos y uso de la app
"""

from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime


# ── Business Health ────────────────────────────────────────────────────────────

class KPICard(BaseModel):
    """
    Tarjeta de indicador clave de negocio.
    Se muestra en la fila superior del dashboard de Business Health.
    """
    label: str                          # Nombre del KPI (ej. "MRR Total")
    value: str                          # Valor formateado (ej. "$42,300")
    change_percent: float = Field(..., alias="changePercent")  # % de cambio vs período anterior
    trend: Literal["up", "down", "flat"]  # Dirección del cambio
    positive_trend_is_up: bool = Field(True, alias="positiveTrendIsUp")
    # Para churn, el trend positivo es "down" (menos churn = mejor)

    class Config:
        populate_by_name = True


class BusinessHealthKPIs(BaseModel):
    """Conjunto completo de KPIs de salud del negocio."""
    mrr_total: KPICard = Field(..., alias="mrrTotal")
    active_clinics: KPICard = Field(..., alias="activeClinics")
    churn_rate: KPICard = Field(..., alias="churnRate")
    avg_health_score: KPICard = Field(..., alias="avgHealthScore")
    outstanding_invoices: KPICard = Field(..., alias="outstandingInvoices")
    new_signups: KPICard = Field(..., alias="newSignups")

    class Config:
        populate_by_name = True


class MRRDataPoint(BaseModel):
    """Un punto en la serie temporal del gráfico de MRR."""
    month: str          # Mes en formato "Jan 25", "Feb 25", etc.
    mrr: float          # MRR en USD para ese mes
    new_mrr: float = Field(0.0, alias="newMrr")         # MRR generado por nuevas clínicas
    expansion_mrr: float = Field(0.0, alias="expansionMrr")  # MRR de upgrades
    churned_mrr: float = Field(0.0, alias="churnedMrr") # MRR perdido por cancelaciones

    class Config:
        populate_by_name = True


class MRRChartResponse(BaseModel):
    """Respuesta del endpoint del gráfico de MRR con los últimos 12 meses."""
    data: list[MRRDataPoint]
    period_start: datetime = Field(..., alias="periodStart")
    period_end: datetime = Field(..., alias="periodEnd")

    class Config:
        populate_by_name = True


class ChurnCell(BaseModel):
    """Una celda del heatmap de churn (clínica × semana)."""
    clinic_id: str = Field(..., alias="clinicId")
    clinic_name: str = Field(..., alias="clinicName")
    week: str                     # Semana en formato "W1", "W2", etc.
    churn_score: float = Field(..., alias="churnScore", ge=0.0, le=1.0)
    # 0 = sin riesgo, 1 = cancelación inminente

    class Config:
        populate_by_name = True


class NeedsAttentionItem(BaseModel):
    """Una clínica o evento que requiere atención del administrador."""
    clinic_id: str = Field(..., alias="clinicId")
    clinic_name: str = Field(..., alias="clinicName")
    issue_type: str = Field(..., alias="issueType")   # "overdue_invoice", "no_login", "low_health", etc.
    severity: Literal["critical", "warning", "info"]
    description: str
    created_at: datetime = Field(..., alias="createdAt")
    action_url: Optional[str] = Field(None, alias="actionUrl")  # Enlace directo a la acción

    class Config:
        populate_by_name = True


# ── Operational Status ─────────────────────────────────────────────────────────

class ServerStatus(BaseModel):
    """Estado de un servidor o nodo de infraestructura."""
    name: str
    region: str                            # Región AWS/GCP (ej. "us-east-1")
    status: Literal["healthy", "degraded", "down"]
    cpu_percent: float = Field(..., alias="cpuPercent", ge=0, le=100)
    memory_percent: float = Field(..., alias="memoryPercent", ge=0, le=100)
    uptime_hours: float = Field(..., alias="uptimeHours")
    last_checked: datetime = Field(..., alias="lastChecked")

    class Config:
        populate_by_name = True


class ProcessStatus(BaseModel):
    """Estado de un proceso o servicio (worker, scheduler, API gateway, etc.)."""
    name: str
    status: Literal["running", "stopped", "error"]
    instances: int = 1           # Número de réplicas activas
    error_rate: float = Field(0.0, alias="errorRate", ge=0.0, le=1.0)
    avg_latency_ms: float = Field(..., alias="avgLatencyMs")
    last_restart: Optional[datetime] = Field(None, alias="lastRestart")

    class Config:
        populate_by_name = True


class AppUsageMetric(BaseModel):
    """Métricas de uso de la app de clínica para la pestaña Operational Status."""
    active_sessions: int = Field(..., alias="activeSessions")
    daily_active_users: int = Field(..., alias="dailyActiveUsers")
    avg_session_duration_min: float = Field(..., alias="avgSessionDurationMin")
    api_requests_per_min: float = Field(..., alias="apiRequestsPerMin")

    class Config:
        populate_by_name = True


class OperationalStatusResponse(BaseModel):
    """Respuesta completa de la pestaña Operational Status del dashboard."""
    servers: list[ServerStatus]
    processes: list[ProcessStatus]
    app_usage: AppUsageMetric = Field(..., alias="appUsage")
    generated_at: datetime = Field(..., alias="generatedAt")

    class Config:
        populate_by_name = True
