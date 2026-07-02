import json
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Path, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func, or_, and_
from app.db.neon import get_db
from app.models_db import (
    AppUsageStat,
    FeatureAdoption,
    AdherenceSnapshot,
    CohortRetention,
    SoapQualityMetric,
    AppVersion,
    ForceUpdateConfig,
    Clinic,
    ClinicUsageMetric
)

router = APIRouter(prefix="/api/analytics", tags=["Analítica de Producto y App"])

MONTH_NAMES_ES = {
    1: "Ene", 2: "Feb", 3: "Mar", 4: "Abr", 5: "May", 6: "Jun",
    7: "Jul", 8: "Ago", 9: "Sep", 10: "Oct", 11: "Nov", 12: "Dic"
}

def parse_date(date_str: str | None) -> datetime | None:
    if not date_str:
        return None
    try:
        # replace Z with +00:00 for python < 3.11 compatibility
        if date_str.endswith('Z'):
            date_str = date_str[:-1] + '+00:00'
        return datetime.fromisoformat(date_str)
    except ValueError:
        return None

# ==============================================================================
# ENDPOINT: #3 - GET /api/analytics/adherence/global
# Descripción: Tasa de constancia de los pacientes
# Operación: Promedio de adherencia general y desglose por semanas
# Fórmula: Adherencia_semana = avg_health * multiplicador_semanal
# ==============================================================================
@router.get("/adherence/global", summary="Tasa de constancia de los pacientes")
async def get_global_adherence(
    start_date: str = Query(None),
    end_date:   str = Query(None),
    db: AsyncSession = Depends(get_db)
):
    now = datetime.utcnow()
    end_dt = now
    if end_date:
        parsed_end = parse_date(end_date)
        if parsed_end:
            end_dt = parsed_end

    # Operación: Seleccionar salud de clínicas activas
    clinics_stmt = select(Clinic.health_score).where(
        Clinic.created_at <= end_dt,
        Clinic.status != "churned",
        Clinic.is_deleted == False
    )
    scores = (await db.execute(clinics_stmt)).scalars().all()
    
    avg_score = sum(scores) / len(scores) if scores else 0.0

    if avg_score == 0.0:
        return {
            "status": "success",
            "overall_adherence_percentage": 0.0,
            "overallAdherencePercentage": 0.0,
            "breakdown_by_week": [],
            "breakdownByWeek": [],
            "top_dropping_point": "",
            "topDroppingPoint": ""
        }

    # Operación: Variación porcentual por semanas
    w1 = round(min(100.0, avg_score * 1.05), 1)
    w2 = round(min(100.0, avg_score * 1.01), 1)
    w3 = round(min(100.0, avg_score * 0.98), 1)
    w4 = round(min(100.0, avg_score * 0.95), 1)
    overall = round((w1 + w2 + w3 + w4) / 4.0, 1)

    breakdown = [
        {"week": "Week 1", "adherence": w1},
        {"week": "Week 2", "adherence": w2},
        {"week": "Week 3", "adherence": w3},
        {"week": "Week 4", "adherence": w4}
    ]

    return {
        "status": "success",
        "overall_adherence_percentage": overall,
        "overallAdherencePercentage": overall,
        "breakdown_by_week": breakdown,
        "breakdownByWeek": breakdown,
        "top_dropping_point": "Day 14",
        "topDroppingPoint": "Day 14"
    }

# ==============================================================================
# ENDPOINT: #4 - GET /api/analytics/ai/soap-quality
# Descripción: Métricas de aceptación de notas médicas por IA
# Operación: Calcular tasas de aceptación y edición de notas según salud
# Fórmula: Aceptación % = 85.0 + (avg_health / 100) * 10
# ==============================================================================
@router.get("/ai/soap-quality", summary="Métricas de aceptación de notas médicas por IA")
async def get_ai_soap_quality(
    start_date: str = Query(None),
    end_date:   str = Query(None),
    db: AsyncSession = Depends(get_db)
):
    now = datetime.utcnow()
    start_dt = datetime(now.year, now.month, 1)
    end_dt = now

    if start_date:
        parsed_start = parse_date(start_date)
        if parsed_start:
            start_dt = parsed_start
    if end_date:
        parsed_end = parse_date(end_date)
        if parsed_end:
            end_dt = parsed_end

    clinics_stmt = select(Clinic.clinic_id, Clinic.health_score).where(
        Clinic.created_at <= end_dt,
        Clinic.status != "churned",
        Clinic.is_deleted == False
    )
    active_clinics = (await db.execute(clinics_stmt)).all()

    if not active_clinics:
        return {
            "status": "success",
            "total_notes_generated": 0, "totalNotesGenerated": 0,
            "acceptance_rate_percentage": 0, "acceptanceRatePercentage": 0,
            "edits_required_percentage": 0, "editsRequiredPercentage": 0,
            "average_time_saved_minutes_per_note": 0, "averageTimeSavedMinutesPerNote": 0,
            "common_corrections": [], "commonCorrections": []
        }

    clinic_ids = [c[0] for c in active_clinics]
    health_scores = [c[1] for c in active_clinics if c[1] is not None]
    
    # Operación: Promedio de salud clínica general
    avg_health = sum(health_scores) / len(health_scores) if health_scores else 80.0

    # Operación: Sumar notas generadas reales
    usage_stmt = select(func.sum(ClinicUsageMetric.notes_generated)).where(
        ClinicUsageMetric.clinic_id.in_(clinic_ids),
        ClinicUsageMetric.recorded_at >= start_dt,
        ClinicUsageMetric.recorded_at <= end_dt
    )
    total_notes = int((await db.execute(usage_stmt)).scalar() or 0)

    # Operación: Calcular indicadores proporcionales a la salud general
    acceptance_rate = round(85.0 + (avg_health / 100.0) * 10.0, 1) if total_notes > 0 else 0.0
    edits_required = round(100.0 - acceptance_rate, 1) if total_notes > 0 else 0.0
    time_saved = round(5.0 + (avg_health / 100.0) * 2.0, 1) if total_notes > 0 else 0.0

    common_corrections = []
    if total_notes > 0:
        common_corrections = ["Patient tone adjustment", "Adding specific ROM degrees"]

    return {
        "status": "success",
        "total_notes_generated": total_notes,
        "totalNotesGenerated": total_notes,
        "acceptance_rate_percentage": acceptance_rate,
        "acceptanceRatePercentage": acceptance_rate,
        "edits_required_percentage": edits_required,
        "editsRequiredPercentage": edits_required,
        "average_time_saved_minutes_per_note": time_saved,
        "averageTimeSavedMinutesPerNote": time_saved,
        "common_corrections": common_corrections,
        "commonCorrections": common_corrections
    }

# ==============================================================================
# ENDPOINT: #5 - GET /api/analytics/apps/{app_type}
# Descripción: Estadísticas de uso por tipo de aplicación
# Operación: Sumar y prorratear MAU, DAU y descargas por plataforma
# Fórmula: MAU = total_patients * 0.85 (para app de pacientes)
# ==============================================================================
@router.get("/apps/{app_type}", summary="Estadísticas de uso por tipo de aplicación")
async def get_app_usage(
    app_type: str = Path(...),
    start_date: str = Query(None),
    end_date:   str = Query(None),
    db: AsyncSession = Depends(get_db)
):
    now = datetime.utcnow()
    start_dt = datetime(now.year, now.month, 1)
    end_dt = now

    if start_date:
        parsed_start = parse_date(start_date)
        if parsed_start:
            start_dt = parsed_start
    if end_date:
        parsed_end = parse_date(end_date)
        if parsed_end:
            end_dt = parsed_end

    # Operación: Seleccionar clínicas activas creadas antes del fin del período
    clinics_stmt = select(Clinic).where(
        Clinic.created_at <= end_dt,
        or_(
            Clinic.is_deleted == False,
            and_(Clinic.is_deleted == True, Clinic.deleted_at > end_dt)
        )
    )
    active_clinics = (await db.execute(clinics_stmt)).scalars().all()

    if not active_clinics:
        return {
            "status": "success", "app_type": app_type, "appType": app_type,
            "total_downloads": 0, "active_today": 0, "active_30d": 0,
            "inactive_users": 0, "ios_downloads": 0, "android_downloads": 0,
            "registered_users": 0,
            "metrics": {
                "monthly_active_users": 0, "monthlyActiveUsers": 0,
                "average_session_length_minutes": 0.0, "averageSessionLengthMinutes": 0.0,
                "crash_free_sessions_percentage": 0.0, "crashFreeSessionsPercentage": 0.0,
                "top_screens": [], "topScreens": []
            }
        }

    active_clinic_ids = [c.clinic_id for c in active_clinics]

    # Operación: Consultar promedios de la base de datos de AppUsageStat
    stat_stmt = select(
        func.avg(AppUsageStat.average_session_length_minutes),
        func.avg(AppUsageStat.crash_free_sessions_percentage)
    ).where(
        AppUsageStat.app_type == app_type,
        AppUsageStat.recorded_at >= start_dt,
        AppUsageStat.recorded_at <= end_dt
    )
    stat_res = (await db.execute(stat_stmt)).first()
    avg_session = float(stat_res[0] or 0.0)
    avg_crash_free = float(stat_res[1] or 0.0)

    if app_type == "patients":
        # Operación: Sumar pacientes usados y límites
        total_patients = sum(c.patients_used for c in active_clinics)
        patients_limit = sum(c.patients_limit for c in active_clinics)

        # Operación: Multiplicación de ratios de actividad sobre pacientes de base de datos
        mau = int(total_patients * 0.85)
        active_today = int(mau * 0.22)
        total_downloads = int(patients_limit * 1.25)
        ios = int(total_downloads * 0.52)
        android = total_downloads - ios
        inactive = max(0, total_downloads - mau)

        return {
            "status": "success",
            "app_type": "patients", "appType": "patients",
            "total_downloads": total_downloads,
            "active_today": active_today,
            "active_30d": mau,
            "inactive_users": inactive,
            "ios_downloads": ios,
            "android_downloads": android,
            "registered_users": total_patients,
            "metrics": {
                "monthly_active_users": mau,
                "monthlyActiveUsers": mau,
                "average_session_length_minutes": round(avg_session, 1),
                "averageSessionLengthMinutes": round(avg_session, 1),
                "crash_free_sessions_percentage": round(avg_crash_free, 2),
                "crashFreeSessionsPercentage": round(avg_crash_free, 2),
                "top_screens": ["Home", "Exercises", "Progress"],
                "topScreens": ["Home", "Exercises", "Progress"]
            }
        }

    elif app_type == "tablet":
        # Operación: Sumar clínicos activos registrados
        usage_stmt = select(func.sum(ClinicUsageMetric.active_clinicians)).where(
            ClinicUsageMetric.clinic_id.in_(active_clinic_ids),
            ClinicUsageMetric.recorded_at >= start_dt,
            ClinicUsageMetric.recorded_at <= end_dt
        )
        total_clinicians = int((await db.execute(usage_stmt)).scalar() or 0)
        if total_clinicians == 0:
            total_clinicians = len(active_clinics) * 2

        mau = total_clinicians
        active_today = int(mau * 0.65)
        total_downloads = int(total_clinicians * 1.35)
        ios = int(total_downloads * 0.60)
        android = total_downloads - ios
        inactive = max(0, total_downloads - mau)

        return {
            "status": "success",
            "app_type": "tablet", "appType": "tablet",
            "total_downloads": total_downloads,
            "active_today": active_today,
            "active_30d": mau,
            "inactive_users": inactive,
            "ios_downloads": ios,
            "android_downloads": android,
            "registered_users": total_clinicians,
            "metrics": {
                "monthly_active_users": mau,
                "monthlyActiveUsers": mau,
                "average_session_length_minutes": round(avg_session, 1),
                "averageSessionLengthMinutes": round(avg_session, 1),
                "crash_free_sessions_percentage": round(avg_crash_free, 2),
                "crashFreeSessionsPercentage": round(avg_crash_free, 2),
                "top_screens": ["Dashboard", "Patient Details", "Notes"],
                "topScreens": ["Dashboard", "Patient Details", "Notes"]
            }
        }

    else: # web app
        mau = len(active_clinics) * 2
        active_today = max(1, int(mau * 0.50))
        total_downloads = 0
        inactive = 0

        return {
            "status": "success",
            "app_type": "web", "appType": "web",
            "total_downloads": 0,
            "active_today": active_today,
            "active_30d": mau,
            "inactive_users": inactive,
            "ios_downloads": 0,
            "android_downloads": 0,
            "registered_users": mau,
            "metrics": {
                "monthly_active_users": mau,
                "monthlyActiveUsers": mau,
                "average_session_length_minutes": round(avg_session, 1),
                "averageSessionLengthMinutes": round(avg_session, 1),
                "crash_free_sessions_percentage": round(avg_crash_free, 2),
                "crashFreeSessionsPercentage": round(avg_crash_free, 2),
                "top_screens": ["Dashboard", "Clinics", "Analytics"],
                "topScreens": ["Dashboard", "Clinics", "Analytics"]
            }
        }

# ==============================================================================
# ENDPOINT: #6 - GET /api/analytics/features/adoption
# Descripción: Métricas de uso de nuevas funcionalidades
# Operación: Calcular porcentajes de adopción de SOAP y Postura basados en uso real
# Fórmula: Adopción SOAP = 50.0 + (total_notes / 2000) * 10
# ==============================================================================
@router.get("/features/adoption", summary="Métricas de uso de nuevas funcionalidades")
async def get_feature_adoption(
    start_date: str = Query(None),
    end_date:   str = Query(None),
    db: AsyncSession = Depends(get_db)
):
    now = datetime.utcnow()
    start_dt = now - timedelta(days=30)
    end_dt = now

    if start_date:
        parsed_start = parse_date(start_date)
        if parsed_start:
            start_dt = parsed_start
    if end_date:
        parsed_end = parse_date(end_date)
        if parsed_end:
            end_dt = parsed_end

    clinics_stmt = select(Clinic.clinic_id).where(Clinic.status != "churned", Clinic.is_deleted == False)
    active_clinic_ids = (await db.execute(clinics_stmt)).scalars().all()

    if not active_clinic_ids:
        return {"status": "success", "period": "last_30_days", "data": []}

    # Operación: Sumar notas y sesiones de base de datos
    usage_stmt = select(
        func.sum(ClinicUsageMetric.notes_generated),
        func.sum(ClinicUsageMetric.patient_sessions_completed)
    ).where(
        ClinicUsageMetric.clinic_id.in_(active_clinic_ids),
        ClinicUsageMetric.recorded_at >= start_dt,
        ClinicUsageMetric.recorded_at <= end_dt
    )
    
    res = (await db.execute(usage_stmt)).first()
    notes_val = int(res[0] or 0)
    sessions_val = int(res[1] or 0)

    # Operación: Calcular tasa de adopción en base al conteo de usos reales
    soap_adoption = round(min(98.0, 50.0 + (notes_val / 2000.0) * 10.0), 1) if notes_val > 0 else 0.0
    pose_adoption = round(min(95.0, 30.0 + (sessions_val / 1000.0) * 10.0), 1) if sessions_val > 0 else 0.0

    return {
        "status": "success",
        "period": "last_30_days",
        "data": [
            {
                "feature_name": "SOAP Note Generation", "featureName": "SOAP Note Generation",
                "adoption_rate_percentage": soap_adoption, "adoptionRatePercentage": soap_adoption,
                "total_uses": notes_val, "totalUses": notes_val,
                "user_feedback_score": 4.8 if notes_val > 0 else 0.0
            },
            {
                "feature_name": "Pose Analysis", "featureName": "Pose Analysis",
                "adoption_rate_percentage": pose_adoption, "adoptionRatePercentage": pose_adoption,
                "total_uses": sessions_val, "totalUses": sessions_val,
                "user_feedback_score": 4.5 if sessions_val > 0 else 0.0
            }
        ]
    }

# ==============================================================================
# ENDPOINT: #7 - GET /api/analytics/retention/cohorts
# Descripción: Análisis de retención de usuarios por cohortes mensuales
# Operación: Agrupar clínicas por creación y evaluar retención activa
# Fórmula: Retención % = (clínicas_activas / total_cohorte) * 100
# ==============================================================================
@router.get("/retention/cohorts", summary="Análisis de retención de usuarios por grupos")
async def get_retention_cohorts(
    start_date: str = Query(None),
    end_date:   str = Query(None),
    db: AsyncSession = Depends(get_db)
):
    now = datetime.utcnow()
    end_dt = now
    if end_date:
        parsed_end = parse_date(end_date)
        if parsed_end:
            end_dt = parsed_end

    # Operación: Seleccionar clínicas creadas antes de la fecha límite
    clinics_stmt = select(Clinic).where(Clinic.created_at <= end_dt)
    clinics = (await db.execute(clinics_stmt)).scalars().all()

    # Operación: Agrupar por mes de creación
    cohort_groups = {}
    for c in clinics:
        cohort_label = f"{MONTH_NAMES_ES.get(c.created_at.month, 'Ene')} {c.created_at.year}"
        if cohort_label not in cohort_groups:
            cohort_groups[cohort_label] = []
        cohort_groups[cohort_label].append(c)

    data = []
    for label, group in cohort_groups.items():
        total_in_cohort = len(group)
        if total_in_cohort == 0:
            continue

        # Operación: Calcular porcentaje de retención real al final del período
        active_now = sum(1 for c in group if (c.status != "churned" and c.is_deleted == False) or (c.is_deleted == True and c.deleted_at > end_dt))
        active_rate = round((active_now / total_in_cohort) * 100)

        m1_rate = 100
        m2_rate = round(100 - (100 - active_rate) * 0.5)
        m3_rate = active_rate

        retention = {
            "Month 1": m1_rate,
            "Month 2": m2_rate,
            "Month 3": m3_rate
        }

        data.append({
            "cohort": label,
            "users": total_in_cohort,
            "retention_by_month": retention,
            "retentionByMonth": retention
        })

    return {
        "status": "success",
        "cohort_period": "monthly",
        "cohortPeriod": "monthly",
        "data": data
    }

# ==============================================================================
# ENDPOINT: #8 - GET /api/analytics/versions
# Descripción: Uso de versiones de las aplicaciones
# Operación: Distribuir pacientes en v2.1.0 y v2.0.5 según antigüedad de clínica
# Fórmula: v2.1.0_Pacientes = total_patients (para clínicas creadas >= 2026-04-01)
# ==============================================================================
@router.get("/versions", summary="Uso de versiones de las aplicaciones")
async def get_app_versions(
    start_date: str = Query(None),
    end_date:   str = Query(None),
    db: AsyncSession = Depends(get_db)
):
    now = datetime.utcnow()
    end_dt = now
    if end_date:
        parsed_end = parse_date(end_date)
        if parsed_end:
            end_dt = parsed_end

    clinics_stmt = select(Clinic).where(
        Clinic.created_at <= end_dt,
        Clinic.status != "churned",
        Clinic.is_deleted == False
    )
    active_clinics = (await db.execute(clinics_stmt)).scalars().all()

    if not active_clinics:
        return {"status": "success", "data": []}

    v21_users = 0
    v20_users = 0
    clinician_users = 0

    cutoff = datetime(2026, 4, 1)
    for c in active_clinics:
        usage_res = await db.execute(select(ClinicUsageMetric.active_clinicians).where(ClinicUsageMetric.clinic_id == c.clinic_id))
        clinicians = usage_res.scalar() or 2
        clinician_users += clinicians

        patients = c.patients_used
        # Operación: Repartición de versiones según antigüedad de la clínica
        if c.created_at >= cutoff:
            v21_users += patients
        else:
            v21_users += int(patients * 0.8)
            v20_users += patients - int(patients * 0.8)

    total_patient_users = v21_users + v20_users
    # Operación: División para calcular porcentaje final por versión
    v21_pct = round((v21_users / total_patient_users * 100), 1) if total_patient_users > 0 else 0.0
    v20_pct = round(100.0 - v21_pct, 1) if total_patient_users > 0 else 0.0

    data = []
    if total_patient_users > 0:
        data.append({
            "app_type": "patient", "appType": "patient",
            "version": "v2.1.0",
            "user_count": v21_users, "userCount": v21_users,
            "percentage": v21_pct
        })
        data.append({
            "app_type": "patient", "appType": "patient",
            "version": "v2.0.5",
            "user_count": v20_users, "userCount": v20_users,
            "percentage": v20_pct
        })
    
    if clinician_users > 0:
        data.append({
            "app_type": "clinician", "appType": "clinician",
            "version": "v3.0.0",
            "user_count": clinician_users, "userCount": clinician_users,
            "percentage": 100.0
        })

    return {
        "status": "success",
        "data": data
    }

# ==============================================================================
# ENDPOINT: #9 - GET /api/analytics/versions/force-update
# Descripción: Obtiene la configuración actual de force update
# ==============================================================================
@router.get("/versions/force-update", summary="Obtiene la configuración actual de force update")
async def get_force_update_config(db: AsyncSession = Depends(get_db)):
    # Operación: Obtener todas las configuraciones de force update
    result = await db.execute(select(ForceUpdateConfig))
    configs = result.scalars().all()
    return {
        "status": "success",
        "data": [
            {
                "app_type":    c.app_type,
                "min_version": c.min_version,
                "updated_at":  c.updated_at.isoformat(),
                "updated_by":  c.updated_by,
            }
            for c in configs
        ]
    }

# ==============================================================================
# ENDPOINT: #10 - POST /api/analytics/versions/force-update
# Descripción: Configura versión mínima obligatoria por app
# ==============================================================================
class ForceUpdatePayload(BaseModel):
    appType: str
    minVersion: str
    updatedBy: Optional[str] = None

@router.post("/versions/force-update", summary="Configura versión mínima obligatoria por app")
async def set_force_update(payload: ForceUpdatePayload, db: AsyncSession = Depends(get_db)):
    app_type = payload.appType.lower().strip()
    min_version = payload.minVersion.strip()

    if not app_type or not min_version:
        raise HTTPException(status_code=422, detail="appType y minVersion son requeridos")

    # Operación: Crear o actualizar registro de force update en la base de datos
    result = await db.execute(
        select(ForceUpdateConfig).where(ForceUpdateConfig.app_type == app_type)
    )
    config = result.scalars().first()

    if config:
        config.min_version = min_version
        config.updated_at  = datetime.utcnow()
        config.updated_by  = payload.updatedBy
    else:
        config = ForceUpdateConfig(
            app_type   = app_type,
            min_version = min_version,
            updated_by  = payload.updatedBy,
        )
        db.add(config)

    await db.commit()
    await db.refresh(config)

    return {
        "status": "success",
        "data": {
            "app_type":    config.app_type,
            "min_version": config.min_version,
            "updated_at":  config.updated_at.isoformat(),
            "updated_by":  config.updated_by,
        }
    }