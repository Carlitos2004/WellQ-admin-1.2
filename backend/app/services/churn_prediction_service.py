from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from app.models_db import Clinic, ClinicUsageMetric

MODEL_VERSION = "churn-v1.0-rule-based"
ONBOARDING_GRACE_DAYS = 14


@dataclass(frozen=True)
class ChurnPrediction:
    clinic_id: str
    risk_level: str
    risk_score: int
    confidence: float
    prediction_status: str
    license_utilization: float
    activity_score: float
    health_score: int
    days_since_last_login: int | None
    summary: str
    signals: list[str]
    model_version: str
    computed_at: datetime

    def to_dict(self) -> dict[str, Any]:
        return {
            "clinic_id": self.clinic_id,
            "risk_level": self.risk_level,
            "risk_score": self.risk_score,
            "confidence": self.confidence,
            "prediction_status": self.prediction_status,
            "license_utilization": self.license_utilization,
            "activity_score": self.activity_score,
            "health_score": self.health_score,
            "days_since_last_login": self.days_since_last_login,
            "summary": self.summary,
            "signals": self.signals,
            "model_version": self.model_version,
            "computed_at": self.computed_at.isoformat() + "Z",
        }


def _days_since(value: datetime | None, now: datetime) -> int | None:
    if not value:
        return None
    if value.tzinfo:
        value = value.replace(tzinfo=None)
    return max(0, (now - value).days)


def _license_utilization(clinic: Clinic) -> float:
    limit = max(int(getattr(clinic, "patients_limit", 0) or 0), 0)
    used = max(int(getattr(clinic, "patients_used", 0) or 0), 0)
    return min(1.0, used / limit) if limit else 0.0


def _activity_score(usage: ClinicUsageMetric | None) -> float:
    if not usage:
        return 0.0

    active_clinicians = min((usage.active_clinicians or 0) / 5, 1.0)
    sessions = min((usage.patient_sessions_completed or 0) / 250, 1.0)
    api_calls = min((usage.api_calls or 0) / 1000, 1.0)
    appointments = min((usage.appointments_this_month or 0) / 80, 1.0)
    notes = min((usage.notes_generated or 0) / 80, 1.0)
    exercises = min((usage.exercises_assigned or 0) / 80, 1.0)

    return (
        active_clinicians * 0.22
        + sessions * 0.22
        + api_calls * 0.12
        + appointments * 0.16
        + notes * 0.14
        + exercises * 0.14
    )


def _has_usage_signal(usage: ClinicUsageMetric | None) -> bool:
    if not usage:
        return False
    return any([
        (usage.active_clinicians or 0) > 0,
        (usage.patient_sessions_completed or 0) > 0,
        (usage.api_calls or 0) > 0,
        (usage.appointments_this_month or 0) > 0,
        (usage.notes_generated or 0) > 0,
        (usage.exercises_assigned or 0) > 0,
    ])


def compute_churn_prediction(
    clinic: Clinic,
    usage: ClinicUsageMetric | None,
    *,
    now: datetime | None = None,
) -> ChurnPrediction:
    now = now or datetime.utcnow()
    signals: list[str] = []

    health_score = max(0, min(100, int(getattr(clinic, "health_score", 100) or 0)))
    days_inactive = _days_since(getattr(clinic, "last_login", None), now)
    days_since_created = _days_since(getattr(clinic, "created_at", None), now)
    utilization = _license_utilization(clinic)
    activity = _activity_score(usage)
    has_usage_signal = _has_usage_signal(usage)
    patients_used = int(getattr(clinic, "patients_used", 0) or 0)

    is_new_without_history = (
        days_since_created is not None
        and days_since_created < ONBOARDING_GRACE_DAYS
        and days_inactive is None
        and patients_used == 0
        and not has_usage_signal
    )

    if is_new_without_history:
        return ChurnPrediction(
            clinic_id=clinic.clinic_id,
            risk_level="insufficient_data",
            risk_score=0,
            confidence=0.0,
            prediction_status="insufficient_data",
            license_utilization=round(utilization, 4),
            activity_score=round(activity, 4),
            health_score=health_score,
            days_since_last_login=days_inactive,
            summary="La clinica esta en onboarding y aun no tiene historial suficiente para estimar churn.",
            signals=[
                f"Clinica creada hace {days_since_created} dias",
                "Sin uso historico suficiente para prediccion",
            ],
            model_version=MODEL_VERSION,
            computed_at=now,
        )

    health_risk = 100 - health_score

    if days_inactive is None:
        login_risk = 100
        signals.append("Sin registro de login reciente")
    elif days_inactive >= 90:
        login_risk = 100
        signals.append(f"{days_inactive} dias sin login")
    elif days_inactive >= 30:
        login_risk = 72
        signals.append(f"{days_inactive} dias sin login")
    elif days_inactive >= 14:
        login_risk = 45
        signals.append(f"{days_inactive} dias desde el ultimo login")
    else:
        login_risk = 12

    if utilization < 0.2:
        license_risk = 86
        signals.append("Uso de licencias bajo el 20%")
    elif utilization < 0.45:
        license_risk = 55
        signals.append("Uso de licencias bajo el 45%")
    elif utilization > 0.95:
        license_risk = 35
        signals.append("Uso de licencias cercano al limite")
    else:
        license_risk = 14

    activity_risk = round((1 - activity) * 100)
    if activity < 0.25:
        signals.append("Baja actividad clinica en el periodo")
    elif activity < 0.5:
        signals.append("Actividad clinica moderada")

    status = str(getattr(clinic, "status", "active") or "active").lower()
    status_risk = {
        "critical": 95,
        "warning": 62,
        "suspended": 76,
        "churned": 100,
        "active": 8,
    }.get(status, 20)
    if status in {"critical", "warning", "suspended", "churned"}:
        signals.append(f"Estado de cuenta: {status}")

    risk_score = round(
        health_risk * 0.35
        + login_risk * 0.25
        + license_risk * 0.18
        + activity_risk * 0.17
        + status_risk * 0.05
    )
    risk_score = max(0, min(100, risk_score))

    if risk_score >= 70:
        risk_level = "high"
    elif risk_score >= 45:
        risk_level = "medium"
    else:
        risk_level = "low"

    evidence_points = 2
    evidence_points += 1 if days_inactive is not None else 0
    evidence_points += 1 if usage else 0
    evidence_points += 1 if getattr(clinic, "patients_limit", 0) else 0
    confidence = round(min(0.94, 0.48 + evidence_points * 0.11), 2)

    if not signals:
        signals.append("Engagement y uso dentro de rangos saludables")

    summary_by_level = {
        "high": "La clinica muestra senales fuertes de desenganche y requiere intervencion comercial prioritaria.",
        "medium": "La clinica presenta senales mixtas de engagement; conviene monitorear y activar acciones preventivas.",
        "low": "La clinica mantiene senales saludables de uso y continuidad.",
    }

    return ChurnPrediction(
        clinic_id=clinic.clinic_id,
        risk_level=risk_level,
        risk_score=risk_score,
        confidence=confidence,
        prediction_status="ready",
        license_utilization=round(utilization, 4),
        activity_score=round(activity, 4),
        health_score=health_score,
        days_since_last_login=days_inactive,
        summary=summary_by_level[risk_level],
        signals=signals[:5],
        model_version=MODEL_VERSION,
        computed_at=now,
    )
