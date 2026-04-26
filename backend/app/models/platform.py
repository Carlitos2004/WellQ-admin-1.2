"""
models/platform.py — Modelos Pydantic para Platform Ops
=========================================================
Esquemas de respuesta para la sección de operaciones de plataforma:
costos de infraestructura, latencia de modelos IA, análisis de poses
y distribución de versiones de la app móvil.
"""

from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime


class CostBreakdown(BaseModel):
    """Desglose de costos de infraestructura por categoría."""
    category: str          # "Compute", "Storage", "AI Models", "Network", "Database"
    amount_usd: float = Field(..., alias="amountUsd")
    percent_of_total: float = Field(..., alias="percentOfTotal", ge=0, le=100)
    vs_last_month: float = Field(..., alias="vsLastMonth")  # Diferencia en USD vs mes anterior

    class Config:
        populate_by_name = True


class InfrastructureCostResponse(BaseModel):
    """Resumen de costos de infraestructura del mes actual."""
    total_usd: float = Field(..., alias="totalUsd")
    budget_usd: float = Field(..., alias="budgetUsd")
    budget_used_percent: float = Field(..., alias="budgetUsedPercent")
    breakdown: list[CostBreakdown]
    period: str               # Ej. "Marzo 2026"
    last_updated: datetime = Field(..., alias="lastUpdated")

    class Config:
        populate_by_name = True


class LatencyPercentiles(BaseModel):
    """Percentiles de latencia para un endpoint o modelo."""
    p50: float    # Mediana
    p90: float    # 90° percentil
    p95: float    # 95° percentil
    p99: float    # 99° percentil — muestra el peor caso frecuente


class ModelLatencyMetric(BaseModel):
    """Métricas de latencia de un modelo de IA (análisis de poses, NLP, etc.)."""
    model_name: str = Field(..., alias="modelName")
    version: str
    endpoint: str
    latency_ms: LatencyPercentiles = Field(..., alias="latencyMs")
    requests_per_min: float = Field(..., alias="requestsPerMin")
    error_rate: float = Field(..., alias="errorRate", ge=0.0, le=1.0)
    status: Literal["optimal", "degraded", "overloaded"]

    class Config:
        populate_by_name = True


class PoseAnalysisStat(BaseModel):
    """
    Estadísticas del motor de análisis de poses.
    Muestra rendimiento, precisión y volumen de análisis.
    """
    analyses_today: int = Field(..., alias="analysesToday")
    analyses_this_week: int = Field(..., alias="analysesThisWeek")
    avg_processing_time_ms: float = Field(..., alias="avgProcessingTimeMs")
    accuracy_percent: float = Field(..., alias="accuracyPercent", ge=0, le=100)
    models_in_use: list[str] = Field(..., alias="modelsInUse")
    gpu_utilization_percent: float = Field(..., alias="gpuUtilizationPercent", ge=0, le=100)

    class Config:
        populate_by_name = True


class AppVersionBucket(BaseModel):
    """Un segmento de la distribución de versiones de la app móvil."""
    version: str             # Número de versión (ej. "3.2.1")
    platform: Literal["iOS", "Android"]
    clinic_count: int = Field(..., alias="clinicCount")  # Clínicas usando esta versión
    user_count: int = Field(..., alias="userCount")
    percent: float           # Porcentaje del total
    is_latest: bool = Field(..., alias="isLatest")  # Si es la versión más reciente
    is_supported: bool = Field(..., alias="isSupported")  # Si aún recibe soporte

    class Config:
        populate_by_name = True


class InfraNode(BaseModel):
    """Nodo de infraestructura en el diagrama de estado."""
    id: str
    name: str
    type: Literal["api", "worker", "database", "cache", "cdn", "queue"]
    status: Literal["healthy", "degraded", "down"]
    region: Optional[str] = None
    metrics: dict = Field(default_factory=dict)  # Métricas adicionales (libre formato)
