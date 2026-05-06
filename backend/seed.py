"""
seed.py — Migra los datos JSON hardcodeados a PostgreSQL (Neon)
===============================================================
Ejecutar UNA SOLA VEZ desde la carpeta backend/:

    python seed.py

Esto crea todas las tablas (si no existen) y las llena con los datos
que actualmente están en duro en los routers.
"""

import asyncio
import json
from datetime import datetime, timezone

from sqlmodel import SQLModel
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

import sys, os
sys.path.insert(0, os.path.dirname(__file__))

# SE AGREGARON LAS 16 TABLAS NUEVAS AL IMPORT
from app.models_db import (
    Clinic, Feature, Plan, PlanFeature,
    ClinicPlan, ScheduledChange, Alert,
    Notification, Job, AdminUser,
    KpiSnapshot, AppMetric,
    Invoice, ClinicUsageMetric, Server, BackgroundProcess,
    MrrSnapshot, ChurnRiskRegion, AppUsageStat, FeatureAdoption,
    AdherenceSnapshot, CohortRetention, SoapQualityMetric, AiCostSnapshot,
    AiLatencyMetric, PoseAnalysisSnapshot, AppVersion, PlatformSetting
)

DATABASE_URL = "postgresql+asyncpg://neondb_owner:npg_bENZm4lgO6XM@ep-delicate-sunset-ac8h03br-pooler.sa-east-1.aws.neon.tech/neondb"

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


# ══════════════════════════════════════════════════════════════════════════════
# DATOS ORIGINALES (NO SE BORRÓ NADA)
# ══════════════════════════════════════════════════════════════════════════════

CLINICS_DATA = [
    {
        "clinic_id": "CL-001", "name": "Clínica San José",
        "tier": "enterprise", "status": "active",
        "patients_used": 1500, "patients_limit": 5000,
        "health_score": 87,
        "last_login": datetime(2026, 4, 25, 14, 30, 0),
        "mrr": 1999.0,
        "contact_name": "Juan Pérez", "contact_email": "admin@clinicasanjose.com",
        "contact_phone": "+56911111111",
        "company_name": "Inversiones San José SpA", "tax_id": "77.123.456-7",
        "billing_email": "facturacion@clinicasanjose.com",
        "address": "Av. Providencia 1234, Santiago",
        "internal_notes": "Cliente clave, renovó por 2 años.",
    },
    {
        "clinic_id": "CL-002", "name": "Centro Médico Integral",
        "tier": "smb", "status": "active",
        "patients_used": 340, "patients_limit": 500,
        "health_score": 62,
        "last_login": datetime(2026, 4, 23, 9, 15, 0),
        "mrr": 299.0,
        "contact_name": "María González", "contact_email": "hola@centromedico.com",
        "contact_phone": "+56922222222",
        "company_name": "Centro Médico Integral SpA", "tax_id": "76.234.567-8",
        "billing_email": "hola@centromedico.com",
        "address": "Av. Las Condes 456, Santiago",
        "internal_notes": None,
    },
]

FEATURES_DATA = [
    {"feature_id": "feat-patients",   "name": "Active Patients",      "category": "Patients & Licenses",    "unit": "patients",    "unit_type": "number", "default_limit": "500",  "description": "Maximum number of concurrent active patients",         "icon": "users"},
    {"feature_id": "feat-clinicians", "name": "Clinician Seats",      "category": "Patients & Licenses",    "unit": "seats",       "unit_type": "number", "default_limit": "5",    "description": "Number of clinician licenses included",                "icon": "users"},
    {"feature_id": "feat-tablets",    "name": "Tablet Devices",       "category": "Patients & Licenses",    "unit": "devices",     "unit_type": "number", "default_limit": "3",    "description": "Connected clinician tablet devices",                   "icon": "smartphone"},
    {"feature_id": "feat-locations",  "name": "Clinic Locations",     "category": "Patients & Licenses",    "unit": "locations",   "unit_type": "number", "default_limit": "1",    "description": "Number of physical locations under one account",       "icon": "building2"},
    {"feature_id": "feat-pose",       "name": "Pose Analysis",        "category": "AI Capabilities",        "unit": "sessions/mo", "unit_type": "number", "default_limit": "1000", "description": "AI-powered movement & pose analysis sessions",         "icon": "activity"},
    {"feature_id": "feat-soap",       "name": "SOAP Note Generation", "category": "AI Capabilities",        "unit": "notes/mo",    "unit_type": "number", "default_limit": "500",  "description": "Auto-generated clinical SOAP notes",                   "icon": "fileText"},
    {"feature_id": "feat-churn",      "name": "Churn Prediction",     "category": "AI Capabilities",        "unit": "enabled",     "unit_type": "toggle", "default_limit": "1",    "description": "AI-driven patient/clinic churn risk insights",         "icon": "trendingUp"},
    {"feature_id": "feat-video",      "name": "Video Processing",     "category": "AI Capabilities",        "unit": "minutes/mo",  "unit_type": "number", "default_limit": "600",  "description": "Cloud video session processing minutes",               "icon": "zap"},
    {"feature_id": "feat-storage",    "name": "Cloud Storage",        "category": "Storage & Data",         "unit": "GB",          "unit_type": "number", "default_limit": "100",  "description": "Patient records and media storage",                    "icon": "hardDrive"},
    {"feature_id": "feat-retention",  "name": "Data Retention",       "category": "Storage & Data",         "unit": "months",      "unit_type": "number", "default_limit": "24",   "description": "How long historical records are kept",                 "icon": "calendar"},
    {"feature_id": "feat-exports",    "name": "Data Exports",         "category": "Storage & Data",         "unit": "exports/mo",  "unit_type": "number", "default_limit": "10",   "description": "Bulk data export operations per month",                "icon": "download"},
    {"feature_id": "feat-backup",     "name": "Daily Backups",        "category": "Storage & Data",         "unit": "enabled",     "unit_type": "toggle", "default_limit": "1",    "description": "Automated encrypted daily backups",                    "icon": "database"},
    {"feature_id": "feat-support",    "name": "Support Tier",         "category": "Support & Integrations", "unit": "level",       "unit_type": "select", "default_limit": "Email","description": "Customer support response level",                      "icon": "headphones",
     "options": json.dumps(["Email", "Business Hours", "24/7 Priority"])},
    {"feature_id": "feat-ehr",        "name": "EHR Integration",      "category": "Support & Integrations", "unit": "integrations","unit_type": "number", "default_limit": "1",    "description": "Connections to external EHR systems",                  "icon": "globe"},
    {"feature_id": "feat-api",        "name": "API Rate Limit",       "category": "Support & Integrations", "unit": "req/min",     "unit_type": "number", "default_limit": "60",   "description": "Public API requests per minute",                       "icon": "zap"},
    {"feature_id": "feat-webhooks",   "name": "Webhooks",             "category": "Support & Integrations", "unit": "enabled",     "unit_type": "toggle", "default_limit": "0",    "description": "Real-time event webhooks",                             "icon": "globe"},
]

PLANS_DATA = [
    {
        "plan_id": "plan-trial", "name": "Trial", "tag_color": "purple", "status": "active",
        "description": "14-day free evaluation tier",
        "setup_price": 0.0, "monthly_price": 0.0, "currency": "USD",
        "effective_date": "2026-01-01", "active_clinics": 8, "arr": 0.0,
    },
    {
        "plan_id": "plan-smb", "name": "SMB", "tag_color": "blue", "status": "active",
        "description": "Small & medium clinics",
        "setup_price": 500.0, "monthly_price": 299.0, "currency": "USD",
        "effective_date": "2026-01-01", "active_clinics": 74, "arr": 264924.0,
    },
    {
        "plan_id": "plan-enterprise", "name": "Enterprise", "tag_color": "indigo", "status": "active",
        "description": "Multi-location and hospital networks",
        "setup_price": 5000.0, "monthly_price": 1999.0, "currency": "USD",
        "effective_date": "2026-01-01", "active_clinics": 42, "arr": 1007496.0,
    },
]

PLAN_FEATURES_DATA = {
    "plan-trial": [
        ("feat-patients", "50"), ("feat-clinicians", "2"), ("feat-pose", "100"),
        ("feat-storage", "5"), ("feat-support", "Email"),
    ],
    "plan-smb": [
        ("feat-patients", "500"), ("feat-clinicians", "5"), ("feat-tablets", "3"),
        ("feat-pose", "1000"), ("feat-soap", "500"), ("feat-storage", "100"),
        ("feat-retention", "24"), ("feat-support", "Business Hours"), ("feat-api", "60"),
    ],
    "plan-enterprise": [
        ("feat-patients", "5000"), ("feat-clinicians", "50"), ("feat-tablets", "30"),
        ("feat-locations", "10"), ("feat-pose", "20000"), ("feat-soap", "10000"),
        ("feat-churn", "1"), ("feat-video", "12000"), ("feat-storage", "2000"),
        ("feat-retention", "84"), ("feat-exports", "200"), ("feat-backup", "1"),
        ("feat-support", "24/7 Priority"), ("feat-ehr", "5"), ("feat-api", "600"),
        ("feat-webhooks", "1"),
    ],
}

CLINIC_PLANS_DATA = [
    {
        "assignment_id": "asgn-001", "clinic_id": "CL-001", "plan_id": "plan-enterprise",
        "plan_snapshot": json.dumps({"id": "plan-enterprise", "name": "Enterprise", "monthlyPrice": 1999.0, "currency": "USD"}),
        "effective_from": datetime(2026, 1, 15), "effective_to": None,
        "reason": "Upgrade inicial al plan Enterprise",
    },
    {
        "assignment_id": "asgn-000", "clinic_id": "CL-001", "plan_id": "plan-smb",
        "plan_snapshot": json.dumps({"id": "plan-smb", "name": "SMB", "monthlyPrice": 299.0, "currency": "USD"}),
        "effective_from": datetime(2025, 5, 1), "effective_to": datetime(2026, 1, 14, 23, 59, 59),
        "reason": "Onboarding inicial",
    },
    {
        "assignment_id": "asgn-002", "clinic_id": "CL-002", "plan_id": "plan-smb",
        "plan_snapshot": json.dumps({"id": "plan-smb", "name": "SMB", "monthlyPrice": 299.0, "currency": "USD"}),
        "effective_from": datetime(2026, 2, 1), "effective_to": None,
        "reason": "Onboarding",
    },
]

SCHEDULED_CHANGES_DATA = [
    {
        "schedule_id": "sched-001", "clinic_id": "CL-001", "plan_id": "plan-enterprise",
        "effective_from": datetime(2026, 7, 1),
        "status": "scheduled", "notify_clinic": True,
    },
]

ALERTS_DATA = [
    {
        "alert_id": "ALT-001", "type": "billing_warning",
        "title": "Factura Vencida",
        "message": "La Clínica San José tiene una factura pendiente de hace 30 días.",
        "severity": "high", "related_type": "clinic", "related_id": "CL-001",
        "created_at": datetime(2026, 4, 20, 10, 0, 0),
    },
    {
        "alert_id": "ALT-002", "type": "license_usage",
        "title": "Límite de licencias próximo",
        "message": "Centro Médico Integral ha consumido el 90% de sus licencias de pacientes.",
        "severity": "medium", "related_type": "clinic", "related_id": "CL-002",
        "created_at": datetime(2026, 4, 24, 15, 30, 0),
    },
]

NOTIFICATIONS_DATA = [
    {
        "notification_id": "notif-001", "title": "Actualización de Términos",
        "message": "Hemos actualizado nuestras políticas de IA. Revise los cambios.",
        "channel": "email", "status": "sent", "recipient_clinic_id": "clinic-12345",
        "sent_by": "super-admin-usr", "sender_name": "Super Admin",
        "sent_at": datetime(2026, 4, 20, 10, 0, 0),
    },
    {
        "notification_id": "notif-002", "title": "Mantenimiento Programado",
        "message": "El motor de análisis de posturas estará inactivo a las 03:00 AM.",
        "channel": "in_app", "status": "pending", "recipient_clinic_id": "all",
        "sent_by": "system-ops", "sender_name": "System Ops",
    },
]

JOBS_DATA = [
    {
        "job_id": "job-8d72-4f1a-b3c9", "job_type": "export_clinics",
        "status": "completed", "progress": 100, "created_by": "super-admin-usr",
        "result_url": "https://storage.wellq.co/exports/clinics_20260425.csv",
        "created_at": datetime(2026, 4, 25, 19, 0, 0),
        "started_at": datetime(2026, 4, 25, 19, 0, 5),
        "completed_at": datetime(2026, 4, 25, 19, 1, 10),
    },
]

ADMIN_USERS_DATA = [
    {"user_id": "USR-SUPER-001", "full_name": "Carlos Administrador", "email": "carlos.admin@wellq.co", "role": "super_admin", "status": "active"},
    {"user_id": "USR-ADMIN-002", "full_name": "Ana Soporte",          "email": "ana.soporte@wellq.co",  "role": "admin",       "status": "active"},
    {"user_id": "USR-VIEW-003",  "full_name": "Juan Auditor",         "email": "juan.auditor@wellq.co", "role": "viewer",      "status": "inactive"},
]

KPI_SNAPSHOTS_DATA = [
    {"month": "Nov", "year": 2025, "arr": 492000, "mrr": 41000, "nrr_percentage": 101.2, "expansion_mrr": 8000,  "churn_mrr": 2100, "nrr_status": "healthy"},
    {"month": "Dic", "year": 2025, "arr": 504000, "mrr": 42000, "nrr_percentage": 102.0, "expansion_mrr": 9500,  "churn_mrr": 1900, "nrr_status": "healthy"},
    {"month": "Ene", "year": 2026, "arr": 527400, "mrr": 43950, "nrr_percentage": 103.1, "expansion_mrr": 11000, "churn_mrr": 1750, "nrr_status": "healthy"},
    {"month": "Feb", "year": 2026, "arr": 537000, "mrr": 44750, "nrr_percentage": 103.8, "expansion_mrr": 12500, "churn_mrr": 1700, "nrr_status": "healthy"},
    {"month": "Mar", "year": 2026, "arr": 555600, "mrr": 46300, "nrr_percentage": 104.0, "expansion_mrr": 14000, "churn_mrr": 1650, "nrr_status": "healthy"},
    {"month": "Abr", "year": 2026, "arr": 542400, "mrr": 45200, "nrr_percentage": 104.5, "expansion_mrr": 15000, "churn_mrr": 1600, "nrr_status": "healthy"},
]

APP_METRICS_DATA = [
    {"metric_key": "active_now_total",           "metric_value": 42},
    {"metric_key": "active_now_web_admin",        "metric_value": 5},
    {"metric_key": "active_now_mobile_clinician", "metric_value": 12},
    {"metric_key": "active_now_mobile_patient",   "metric_value": 25},
    {"metric_key": "downloads_total",             "metric_value": 8540},
    {"metric_key": "downloads_ios",               "metric_value": 4200},
    {"metric_key": "downloads_android",           "metric_value": 4340},
    {"metric_key": "downloads_last_24h",          "metric_value": 56},
]

# ══════════════════════════════════════════════════════════════════════════════
# DATOS NUEVOS AGREGADOS (LAS 16 TABLAS FALTANTES DE MODELS_DB.PY)
# ══════════════════════════════════════════════════════════════════════════════

INVOICES_DATA = [
    {"invoice_id": "INV-2026-001", "clinic_id": "CL-001", "amount": 1999.0, "currency": "USD", "status": "paid", "issued_at": datetime(2026, 4, 1), "pdf_url": "https://storage.wellq.co/inv/1.pdf"},
    {"invoice_id": "INV-2026-002", "clinic_id": "CL-002", "amount": 299.0, "currency": "USD", "status": "pending", "issued_at": datetime(2026, 4, 15), "pdf_url": "https://storage.wellq.co/inv/2.pdf"},
]

CLINIC_USAGE_METRICS_DATA = [
    {"clinic_id": "CL-001", "period": "last_30_days", "active_clinicians": 45, "patient_sessions_completed": 3500, "ai_processing_minutes": 8400, "api_calls": 125000},
    {"clinic_id": "CL-002", "period": "last_30_days", "active_clinicians": 5, "patient_sessions_completed": 450, "ai_processing_minutes": 950, "api_calls": 12000},
]

SERVERS_DATA = [
    {"server_id": "SRV-AZ-001", "name": "AI Processing Node 1", "region": "us-east-1", "status": "healthy", "uptime": "99.9%", "cpu_usage": "45%", "ram_usage": "60%"},
    {"server_id": "SRV-AZ-002", "name": "Database Primary", "region": "sa-east-1", "status": "healthy", "uptime": "99.99%", "cpu_usage": "65%", "ram_usage": "80%"},
]

BACKGROUND_PROCESSES_DATA = [
    {"process_id": "PROC-001", "name": "Daily Invoice Generation", "status": "sleeping", "queued_items": 0, "memory_consumption": "120MB"},
    {"process_id": "PROC-002", "name": "Video Pose Estimation Queue", "status": "running", "queued_items": 15, "memory_consumption": "1024MB"},
]

MRR_SNAPSHOTS_DATA = [
    {"period_month": "Mar", "period_year": 2026, "total_mrr": 46300.0, "new_business": 1200.0, "expansion": 14000.0, "contraction": 500.0, "churn": 1650.0, "retained": 44650.0, "monthly_growth_percentage": 3.4},
    {"period_month": "Abr", "period_year": 2026, "total_mrr": 45200.0, "new_business": 1500.0, "expansion": 15000.0, "contraction": 800.0, "churn": 1600.0, "retained": 43600.0, "monthly_growth_percentage": 2.1},
]

CHURN_RISK_REGIONS_DATA = [
    {"region": "North America", "clinics_at_risk": 2, "potential_mrr_loss": 598.0, "risk_level": "Low"},
    {"region": "LATAM", "clinics_at_risk": 5, "potential_mrr_loss": 1495.0, "risk_level": "Medium"},
]

APP_USAGE_STATS_DATA = [
    {"app_type": "patients", "period": "current_month", "monthly_active_users": 15200, "average_session_length_minutes": 8.5, "crash_free_sessions_percentage": 99.8, "top_screens": json.dumps(["Home", "Exercises", "Progress"])},
    {"app_type": "tablet", "period": "current_month", "monthly_active_users": 3400, "average_session_length_minutes": 45.2, "crash_free_sessions_percentage": 99.9, "top_screens": json.dumps(["Dashboard", "Patient Details", "Notes"])},
]

FEATURE_ADOPTION_DATA = [
    {"feature_name": "SOAP Note Generation", "period": "last_30_days", "adoption_rate_percentage": 68.5, "total_uses": 45000, "user_feedback_score": 4.8},
    {"feature_name": "Pose Analysis", "period": "last_30_days", "adoption_rate_percentage": 42.0, "total_uses": 12500, "user_feedback_score": 4.5},
]

ADHERENCE_SNAPSHOTS_DATA = [
    {"period": "current_month", "overall_adherence_percentage": 76.5, "breakdown_by_week": json.dumps({"Week 1": 80, "Week 2": 78, "Week 3": 75, "Week 4": 73}), "top_dropping_point": "Day 14"},
]

COHORT_RETENTION_DATA = [
    {"cohort_label": "Ene 2026", "cohort_month": 1, "cohort_year": 2026, "users_count": 1200, "retention_by_month": json.dumps({"Month 1": 100, "Month 2": 85, "Month 3": 78})},
    {"cohort_label": "Feb 2026", "cohort_month": 2, "cohort_year": 2026, "users_count": 1500, "retention_by_month": json.dumps({"Month 1": 100, "Month 2": 88})},
]

SOAP_QUALITY_METRICS_DATA = [
    {"period": "current_month", "total_notes_generated": 45000, "acceptance_rate_percentage": 92.5, "edits_required_percentage": 7.5, "average_time_saved_minutes_per_note": 6.2, "common_corrections": json.dumps(["Patient tone adjustment", "Adding specific ROM degrees"])},
]

AI_COST_SNAPSHOTS_DATA = [
    {"period": "current_month", "currency": "USD", "total_cost": 3450.0, "breakdown": json.dumps({"OpenAI (SOAP)": 1200, "GCP Vertex (Pose)": 2250}), "projected_eom_cost": 4200.0},
]

AI_LATENCY_METRICS_DATA = [
    {"service": "soap_generation", "period": "last_24_hours", "average_latency_ms": 1200, "p95_latency_ms": 2500, "status": "healthy"},
    {"service": "pose_estimation_realtime", "period": "last_24_hours", "average_latency_ms": 150, "p95_latency_ms": 300, "status": "healthy"},
]

POSE_ANALYSIS_SNAPSHOTS_DATA = [
    {"period": "last_7_days", "total_sessions_analyzed": 8500, "overall_success_rate_percentage": 98.2, "failure_reasons": json.dumps({"Poor Lighting": 45, "Subject out of frame": 40, "Unknown Error": 15})},
]

APP_VERSIONS_DATA = [
    {"app_type": "patient", "version": "v2.1.0", "user_count": 12000, "percentage": 80.0},
    {"app_type": "patient", "version": "v2.0.5", "user_count": 3000, "percentage": 20.0},
    {"app_type": "clinician", "version": "v3.0.0", "user_count": 3400, "percentage": 100.0},
]

PLATFORM_SETTINGS_DATA = [
    {"setting_key": "maintenance_mode", "setting_value": "false"},
    {"setting_key": "enforce_2fa", "setting_value": "true"},
    {"setting_key": "api_version", "setting_value": "v1.4.2"},
    {"setting_key": "support_email", "setting_value": "support@wellq.co"},
]


# ══════════════════════════════════════════════════════════════════════════════
# FUNCIONES DE SEED
# ══════════════════════════════════════════════════════════════════════════════

async def create_tables():
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    print("✅ Tablas creadas/verificadas en Neon")

async def seed_clinics(session: AsyncSession):
    for data in CLINICS_DATA:
        session.add(Clinic(**data))
    print(f"  → {len(CLINICS_DATA)} clínicas")

async def seed_features(session: AsyncSession):
    for data in FEATURES_DATA:
        session.add(Feature(**data))
    print(f"  → {len(FEATURES_DATA)} features")

async def seed_plans(session: AsyncSession):
    for data in PLANS_DATA:
        session.add(Plan(**data))
    print(f"  → {len(PLANS_DATA)} planes")

async def seed_plan_features(session: AsyncSession):
    count = 0
    for plan_id, features in PLAN_FEATURES_DATA.items():
        for feature_id, limit in features:
            session.add(PlanFeature(plan_id=plan_id, feature_id=feature_id, limit_value=limit))
            count += 1
    print(f"  → {count} plan_features (relaciones plan↔feature)")

async def seed_clinic_plans(session: AsyncSession):
    for data in CLINIC_PLANS_DATA:
        session.add(ClinicPlan(**data))
    print(f"  → {len(CLINIC_PLANS_DATA)} asignaciones de planes a clínicas")

async def seed_scheduled_changes(session: AsyncSession):
    for data in SCHEDULED_CHANGES_DATA:
        session.add(ScheduledChange(**data))
    print(f"  → {len(SCHEDULED_CHANGES_DATA)} cambios programados")

async def seed_alerts(session: AsyncSession):
    for data in ALERTS_DATA:
        session.add(Alert(**data))
    print(f"  → {len(ALERTS_DATA)} alertas")

async def seed_notifications(session: AsyncSession):
    for data in NOTIFICATIONS_DATA:
        session.add(Notification(**data))
    print(f"  → {len(NOTIFICATIONS_DATA)} notificaciones")

async def seed_jobs(session: AsyncSession):
    for data in JOBS_DATA:
        session.add(Job(**data))
    print(f"  → {len(JOBS_DATA)} jobs")

async def seed_admin_users(session: AsyncSession):
    for data in ADMIN_USERS_DATA:
        session.add(AdminUser(**data))
    print(f"  → {len(ADMIN_USERS_DATA)} usuarios admin")

async def seed_kpi_snapshots(session: AsyncSession):
    for data in KPI_SNAPSHOTS_DATA:
        session.add(KpiSnapshot(**data))
    print(f"  → {len(KPI_SNAPSHOTS_DATA)} kpi_snapshots")

async def seed_app_metrics(session: AsyncSession):
    for data in APP_METRICS_DATA:
        session.add(AppMetric(**data))
    print(f"  → {len(APP_METRICS_DATA)} app_metrics")

# --- NUEVAS FUNCIONES DE SEED (LAS 16 TABLAS FALTANTES) ---

async def seed_invoices(session: AsyncSession):
    for data in INVOICES_DATA:
        session.add(Invoice(**data))
    print(f"  → {len(INVOICES_DATA)} invoices")

async def seed_clinic_usage_metrics(session: AsyncSession):
    for data in CLINIC_USAGE_METRICS_DATA:
        session.add(ClinicUsageMetric(**data))
    print(f"  → {len(CLINIC_USAGE_METRICS_DATA)} clinic_usage_metrics")

async def seed_servers(session: AsyncSession):
    for data in SERVERS_DATA:
        session.add(Server(**data))
    print(f"  → {len(SERVERS_DATA)} servers")

async def seed_background_processes(session: AsyncSession):
    for data in BACKGROUND_PROCESSES_DATA:
        session.add(BackgroundProcess(**data))
    print(f"  → {len(BACKGROUND_PROCESSES_DATA)} background_processes")

async def seed_mrr_snapshots(session: AsyncSession):
    for data in MRR_SNAPSHOTS_DATA:
        session.add(MrrSnapshot(**data))
    print(f"  → {len(MRR_SNAPSHOTS_DATA)} mrr_snapshots")

async def seed_churn_risk_regions(session: AsyncSession):
    for data in CHURN_RISK_REGIONS_DATA:
        session.add(ChurnRiskRegion(**data))
    print(f"  → {len(CHURN_RISK_REGIONS_DATA)} churn_risk_regions")

async def seed_app_usage_stats(session: AsyncSession):
    for data in APP_USAGE_STATS_DATA:
        session.add(AppUsageStat(**data))
    print(f"  → {len(APP_USAGE_STATS_DATA)} app_usage_stats")

async def seed_feature_adoption(session: AsyncSession):
    for data in FEATURE_ADOPTION_DATA:
        session.add(FeatureAdoption(**data))
    print(f"  → {len(FEATURE_ADOPTION_DATA)} feature_adoption")

async def seed_adherence_snapshots(session: AsyncSession):
    for data in ADHERENCE_SNAPSHOTS_DATA:
        session.add(AdherenceSnapshot(**data))
    print(f"  → {len(ADHERENCE_SNAPSHOTS_DATA)} adherence_snapshots")

async def seed_cohort_retention(session: AsyncSession):
    for data in COHORT_RETENTION_DATA:
        session.add(CohortRetention(**data))
    print(f"  → {len(COHORT_RETENTION_DATA)} cohort_retention")

async def seed_soap_quality_metrics(session: AsyncSession):
    for data in SOAP_QUALITY_METRICS_DATA:
        session.add(SoapQualityMetric(**data))
    print(f"  → {len(SOAP_QUALITY_METRICS_DATA)} soap_quality_metrics")

async def seed_ai_cost_snapshots(session: AsyncSession):
    for data in AI_COST_SNAPSHOTS_DATA:
        session.add(AiCostSnapshot(**data))
    print(f"  → {len(AI_COST_SNAPSHOTS_DATA)} ai_cost_snapshots")

async def seed_ai_latency_metrics(session: AsyncSession):
    for data in AI_LATENCY_METRICS_DATA:
        session.add(AiLatencyMetric(**data))
    print(f"  → {len(AI_LATENCY_METRICS_DATA)} ai_latency_metrics")

async def seed_pose_analysis_snapshots(session: AsyncSession):
    for data in POSE_ANALYSIS_SNAPSHOTS_DATA:
        session.add(PoseAnalysisSnapshot(**data))
    print(f"  → {len(POSE_ANALYSIS_SNAPSHOTS_DATA)} pose_analysis_snapshots")

async def seed_app_versions(session: AsyncSession):
    for data in APP_VERSIONS_DATA:
        session.add(AppVersion(**data))
    print(f"  → {len(APP_VERSIONS_DATA)} app_versions")

async def seed_platform_settings(session: AsyncSession):
    for data in PLATFORM_SETTINGS_DATA:
        session.add(PlatformSetting(**data))
    print(f"  → {len(PLATFORM_SETTINGS_DATA)} platform_settings")


async def run_seed():
    print("\n🌱 Iniciando seed de WellQ Admin...\n")

    await create_tables()

    async with AsyncSessionLocal() as session:
        from sqlalchemy import text
        # SE AGREGARON LAS 16 TABLAS NUEVAS AL TRUNCATE CASCADE
        await session.execute(text(
            "TRUNCATE TABLE alerts, notifications, jobs, admin_users, scheduled_changes, "
            "clinic_plans, plan_features, plans, features, clinics, "
            "kpi_snapshots, app_metrics, "
            "invoices, clinic_usage_metrics, servers, background_processes, "
            "mrr_snapshots, churn_risk_regions, app_usage_stats, feature_adoption, "
            "adherence_snapshots, cohort_retention, soap_quality_metrics, ai_cost_snapshots, "
            "ai_latency_metrics, pose_analysis_snapshots, app_versions, platform_settings "
            "RESTART IDENTITY CASCADE"
        ))
        await session.commit()
    print("🧹 Tablas limpiadas\n")

    async with AsyncSessionLocal() as session:
        print("\n📥 Insertando datos:")
        await seed_clinics(session)
        await seed_features(session)
        await seed_plans(session)
        await seed_plan_features(session)
        await seed_clinic_plans(session)
        await seed_scheduled_changes(session)
        await seed_alerts(session)
        await seed_notifications(session)
        await seed_jobs(session)
        await seed_admin_users(session)
        await seed_kpi_snapshots(session)
        await seed_app_metrics(session)
        
        # LLAMADAS A LAS 16 FUNCIONES NUEVAS
        await seed_invoices(session)
        await seed_clinic_usage_metrics(session)
        await seed_servers(session)
        await seed_background_processes(session)
        await seed_mrr_snapshots(session)
        await seed_churn_risk_regions(session)
        await seed_app_usage_stats(session)
        await seed_feature_adoption(session)
        await seed_adherence_snapshots(session)
        await seed_cohort_retention(session)
        await seed_soap_quality_metrics(session)
        await seed_ai_cost_snapshots(session)
        await seed_ai_latency_metrics(session)
        await seed_pose_analysis_snapshots(session)
        await seed_app_versions(session)
        await seed_platform_settings(session)
        
        await session.commit()

    print("\n✅ Seed completado. Todas las 28 tablas tienen datos en Neon.\n")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run_seed())