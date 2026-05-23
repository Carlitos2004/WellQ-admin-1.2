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

from app.models_db import (
    Clinic, Feature, Plan, PlanFeature,
    ClinicPlan, ScheduledChange, Alert,
    Notification, Job, AdminUser,
    KpiSnapshot, AppMetric,
    Invoice, ClinicUsageMetric, Server, BackgroundProcess,
    MrrSnapshot, ChurnRiskRegion, AppUsageStat, FeatureAdoption,
    AdherenceSnapshot, CohortRetention, SoapQualityMetric, AiCostSnapshot,
    AiLatencyMetric, PoseAnalysisSnapshot, AppVersion, PlatformSetting,
    ImpersonateAuditLog, NeedsAttentionItem,
    InfrastructureCostSnapshot, InfraNode,
    # ── NUEVOS MODELOS ────────────────────────────────────────────────────────
    ClinicianSummary, PatientHealthSummary, SupportTicket,
)

DATABASE_URL = "postgresql+asyncpg://neondb_owner:npg_bENZm4lgO6XM@ep-delicate-sunset-ac8h03br-pooler.sa-east-1.aws.neon.tech/neondb"

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


# ══════════════════════════════════════════════════════════════════════════════
# DATOS ORIGINALES (NO SE BORRÓ NADA)
# ══════════════════════════════════════════════════════════════════════════════

# ── CLINICS_DATA: se agrega mongo_clinic_id a cada clínica ───────────────────
# mongo_clinic_id = _id de la clínica en MongoDB Atlas.
# Permite al job de sync hacer el lookup directo sin ambigüedad.
# Los IDs placeholder "mongo_id_CLxxx" deben reemplazarse por los ObjectId
# reales una vez que la empresa los entregue.
CLINICS_DATA = [
    {
        "clinic_id": "CL-001", "name": "Clínica San José",
        "tier": "enterprise", "status": "active",
        "patients_used": 1500, "patients_limit": 5000,
        "health_score": 87,
        "last_login": datetime(2026, 4, 25, 14, 30, 0),
        "created_at": datetime(2026, 1, 15),                     # ← YTD
        "mrr": 1999.0,
        "contact_name": "Juan Pérez", "contact_email": "admin@clinicasanjose.com",
        "contact_phone": "+56911111111",
        "company_name": "Inversiones San José SpA", "tax_id": "77.123.456-7",
        "billing_email": "facturacion@clinicasanjose.com",
        "address": "Av. Providencia 1234, Santiago",
        "internal_notes": "Cliente clave, renovó por 2 años.",
        "mongo_clinic_id": "mongo_id_CL001",                     # ← NUEVO
    },
    {
        "clinic_id": "CL-002", "name": "Centro Médico Integral",
        "tier": "smb", "status": "active",
        "patients_used": 340, "patients_limit": 500,
        "health_score": 62,
        "last_login": datetime(2026, 3, 20, 9, 15, 0),           # ← dormido (>30d)
        "created_at": datetime(2026, 3, 20),                     # ← YTD / QTD-Q1 (antes de 30D)
        "mrr": 299.0,
        "contact_name": "María González", "contact_email": "hola@centromedico.com",
        "contact_phone": "+56922222222",
        "company_name": "Centro Médico Integral SpA", "tax_id": "76.234.567-8",
        "billing_email": "hola@centromedico.com",
        "address": "Av. Las Condes 456, Santiago",
        "internal_notes": None,
        "mongo_clinic_id": "mongo_id_CL002",                     # ← NUEVO
    },
    # ── NUEVAS CLÍNICAS ──────────────────────────────────────────────────────
    {
        "clinic_id": "CL-003", "name": "Centro Kinésico del Sur",
        "tier": "smb", "status": "active",
        "patients_used": 412, "patients_limit": 500,
        "health_score": 54,
        "last_login": datetime(2026, 5, 22, 8, 45, 0),
        "created_at": datetime(2026, 5, 22, 14, 0, 0),           # ← 24H (ayer)
        "mrr": 299.0,
        "contact_name": "Pedro Alarcón", "contact_email": "pedro@kinesur.cl",
        "contact_phone": "+56933333333",
        "company_name": "Kinésica del Sur Ltda.", "tax_id": "78.111.222-3",
        "billing_email": "facturas@kinesur.cl",
        "address": "Av. Matta 2001, Santiago",
        "internal_notes": "Posible upgrade a plan superior en 3 meses.",
        "mongo_clinic_id": "mongo_id_CL003",                     # ← NUEVO
    },
    {
        "clinic_id": "CL-004", "name": "Fisioclínica Norte",
        "tier": "enterprise", "status": "active",
        "patients_used": 3800, "patients_limit": 5000,
        "health_score": 91,
        "last_login": datetime(2026, 5, 22, 10, 20, 0),
        "created_at": datetime(2026, 5, 19, 12, 0, 0),           # ← 7D
        "mrr": 1999.0,
        "contact_name": "Carolina Muñoz", "contact_email": "carolina@fisioclinicanorte.cl",
        "contact_phone": "+56944444444",
        "company_name": "Fisioclínica Norte SpA", "tax_id": "79.333.444-5",
        "billing_email": "carolina@fisioclinicanorte.cl",
        "address": "Av. Independencia 3456, Santiago",
        "internal_notes": None,
        "mongo_clinic_id": "mongo_id_CL004",                     # ← NUEVO
    },
    {
        "clinic_id": "CL-005", "name": "Rehab Centro",
        "tier": "trial", "status": "trial",
        "patients_used": 30, "patients_limit": 50,
        "health_score": 88,
        "last_login": datetime(2026, 5, 3, 16, 0, 0),
        "created_at": datetime(2026, 4, 10, 8, 0, 0),            # ← QTD (fuera de 30D)
        "mrr": 0.0,
        "contact_name": "Andrés Soto", "contact_email": "info@rehabcentro.cl",
        "contact_phone": "+56955555555",
        "company_name": "Rehab Centro Ltda.", "tax_id": "80.555.666-7",
        "billing_email": None,
        "address": "Calle Ejército 123, Santiago",
        "internal_notes": "Cliente en período de prueba, muy activo.",
        "mongo_clinic_id": "mongo_id_CL005",                     # ← NUEVO
    },
    {
        "clinic_id": "CL-006", "name": "Clínica del Deporte SpA",
        "tier": "smb", "status": "warning",
        "patients_used": 490, "patients_limit": 500,
        "health_score": 41,
        "last_login": datetime(2026, 2, 10, 12, 30, 0),          # ← dormido (>90d)
        "created_at": datetime(2026, 3, 1),                      # ← antigua (>30d)
        "mrr": 299.0,
        "contact_name": "Ignacio Rojas", "contact_email": "irojas@deporte.cl",
        "contact_phone": "+56966666666",
        "company_name": "Clínica del Deporte SpA", "tax_id": "81.777.888-9",
        "billing_email": "irojas@deporte.cl",
        "address": "Av. Bilbao 987, Santiago",
        "internal_notes": "Salud financiera baja, riesgo de churn moderado.",
        "mongo_clinic_id": "mongo_id_CL006",                     # ← NUEVO
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
        "effective_date": datetime(2026, 1, 1), "active_clinics": 8, "arr": 0.0,
    },
    {
        "plan_id": "plan-smb", "name": "SMB", "tag_color": "blue", "status": "active",
        "description": "Small & medium clinics",
        "setup_price": 500.0, "monthly_price": 299.0, "currency": "USD",
        "effective_date": datetime(2026, 1, 1), "active_clinics": 74, "arr": 264924.0,
    },
    {
        "plan_id": "plan-enterprise", "name": "Enterprise", "tag_color": "indigo", "status": "active",
        "description": "Multi-location and hospital networks",
        "setup_price": 5000.0, "monthly_price": 1999.0, "currency": "USD",
        "effective_date": datetime(2026, 1, 1), "active_clinics": 42, "arr": 1007496.0,
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
    # ── NUEVAS ASIGNACIONES ──────────────────────────────────────────────────
    {
        "assignment_id": "asgn-003", "clinic_id": "CL-003", "plan_id": "plan-smb",
        "plan_snapshot": json.dumps({"id": "plan-smb", "name": "SMB", "monthlyPrice": 299.0, "currency": "USD"}),
        "effective_from": datetime(2026, 3, 15), "effective_to": None,
        "reason": "Onboarding",
    },
    {
        "assignment_id": "asgn-004", "clinic_id": "CL-004", "plan_id": "plan-enterprise",
        "plan_snapshot": json.dumps({"id": "plan-enterprise", "name": "Enterprise", "monthlyPrice": 1999.0, "currency": "USD"}),
        "effective_from": datetime(2026, 1, 20), "effective_to": None,
        "reason": "Cliente grande desde inicio",
    },
    {
        "assignment_id": "asgn-005", "clinic_id": "CL-005", "plan_id": "plan-trial",
        "plan_snapshot": json.dumps({"id": "plan-trial", "name": "Trial", "monthlyPrice": 0.0, "currency": "USD"}),
        "effective_from": datetime(2026, 5, 1), "effective_to": datetime(2026, 5, 14, 23, 59, 59),
        "reason": "Período de prueba 14 días",
    },
    {
        "assignment_id": "asgn-006", "clinic_id": "CL-006", "plan_id": "plan-smb",
        "plan_snapshot": json.dumps({"id": "plan-smb", "name": "SMB", "monthlyPrice": 299.0, "currency": "USD"}),
        "effective_from": datetime(2026, 3, 1), "effective_to": None,
        "reason": "Onboarding",
    },
]

SCHEDULED_CHANGES_DATA = [
    {
        "schedule_id": "sched-001", "clinic_id": "CL-001", "plan_id": "plan-enterprise",
        "effective_from": datetime(2026, 7, 1),
        "status": "scheduled", "notify_clinic": True,
    },
    # ── NUEVOS CAMBIOS PROGRAMADOS ──────────────────────────────────────────
    {
        "schedule_id": "sched-002", "clinic_id": "CL-003", "plan_id": "plan-enterprise",
        "effective_from": datetime(2026, 8, 1),
        "status": "scheduled", "notify_clinic": False,
    },
]

ALERTS_DATA = [
    {
        "alert_id": "ALT-001", "type": "billing_warning",
        "title": "Factura Vencida",
        "message": "La Clínica San José tiene una factura pendiente de hace 30 días.",
        "title_key": "alerts.billing_warning.title",
        "message_key": "alerts.billing_warning.message",
        "message_params": json.dumps({"clinic": "Clínica San José", "days": 30}),
        "severity": "high", "related_type": "clinic", "related_id": "CL-001",
        "created_at": datetime(2026, 4, 20, 10, 0, 0),
    },
    {
        "alert_id": "ALT-002", "type": "license_usage",
        "title": "Límite de licencias próximo",
        "message": "Centro Médico Integral ha consumido el 90% de sus licencias de pacientes.",
        "title_key": "alerts.license_usage.title",
        "message_key": "alerts.license_usage.message",
        "message_params": json.dumps({"clinic": "Centro Médico Integral", "pct": 90}),
        "severity": "medium", "related_type": "clinic", "related_id": "CL-002",
        "created_at": datetime(2026, 4, 24, 15, 30, 0),
    },
    # ── NUEVAS ALERTAS ──────────────────────────────────────────────────────
    {
        "alert_id": "ALT-003", "type": "health_declining",
        "title": "Salud de cliente cayendo",
        "message": "Clínica del Deporte SpA descendió a health score 41. Riesgo de churn.",
        "title_key": "alerts.health_declining.title",
        "message_key": "alerts.health_declining.message",
        "message_params": json.dumps({"clinic": "Clínica del Deporte SpA", "score": 41}),
        "severity": "high", "related_type": "clinic", "related_id": "CL-006",
        "created_at": datetime(2026, 5, 1, 9, 15, 0),
    },
    {
        "alert_id": "ALT-004", "type": "trial_ending",
        "title": "Prueba por terminar",
        "message": "Rehab Centro finaliza su prueba en 2 días. Sin plan activo asignado después.",
        "title_key": "alerts.trial_ending.title",
        "message_key": "alerts.trial_ending.message",
        "message_params": json.dumps({"clinic": "Rehab Centro", "days": 2}),
        "severity": "medium", "related_type": "clinic", "related_id": "CL-005",
        "created_at": datetime(2026, 5, 6, 11, 0, 0),
    },
]

NOTIFICATIONS_DATA = [
    {
        "notification_id": "notif-001", "title": "Actualización de Términos",
        "message": "Hemos actualizado nuestras políticas de IA. Revise los cambios.",
        "channel": "email", "status": "sent", "recipient_clinic_id": "clinic-12345",
        "sent_by": "USR-WELLQ-001", "sender_name": "WellQ Admin",
        "sent_at": datetime(2026, 4, 20, 10, 0, 0),
    },
    {
        "notification_id": "notif-002", "title": "Mantenimiento Programado",
        "message": "El motor de análisis de posturas estará inactivo a las 03:00 AM.",
        "channel": "in_app", "status": "pending", "recipient_clinic_id": "all",
        "sent_by": "system-ops", "sender_name": "System Ops",
    },
    # ── NUEVAS NOTIFICACIONES ──────────────────────────────────────────────
    {
        "notification_id": "notif-003", "title": "Recordatorio de pago",
        "message": "Su factura de abril está disponible. Pague antes del 5 de mayo.",
        "channel": "email", "status": "sent", "recipient_clinic_id": "CL-003",
        "sent_by": "system-billing", "sender_name": "Facturación WellQ",
        "sent_at": datetime(2026, 5, 1, 8, 0, 0),
    },
    {
        "notification_id": "notif-004", "title": "Nuevo feature: Integración con Clio",
        "message": "Ya puedes conectar tu cuenta con Clio EHR. Actívalo en Settings.",
        "channel": "in_app", "status": "pending", "recipient_clinic_id": "all",
        "sent_by": "PM-001", "sender_name": "Producto WellQ",
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
    # ── NUEVOS JOBS ─────────────────────────────────────────────────────────
    {
        "job_id": "job-b2a5-4c9e-8d1f", "job_type": "generate_monthly_invoices",
        "status": "running", "progress": 45, "created_by": "system-scheduler",
        "result_url": None,
        "created_at": datetime(2026, 5, 1, 1, 0, 0),
        "started_at": datetime(2026, 5, 1, 1, 0, 3),
        "completed_at": None,
    },
    {
        "job_id": "job-1f3c-4a2b-9e7d", "job_type": "data_cleanup_temp_files",
        "status": "completed", "progress": 100, "created_by": "system-ops",
        "result_url": None,
        "created_at": datetime(2026, 4, 30, 22, 0, 0),
        "started_at": datetime(2026, 4, 30, 22, 0, 1),
        "completed_at": datetime(2026, 4, 30, 22, 5, 45),
    },
]

# ── Un único usuario administrador WellQ ──────────────────────────────────────
# Contraseña: WellQ2026!
# Formato bcrypt $2b$12$ — compatible con passlib CryptContext(schemes=["bcrypt"])
ADMIN_USERS_DATA = [
    {
        "user_id": "USR-WELLQ-001", "full_name": "WellQ Admin",
        "email": "admin@wellq.com",
        "role": "super_admin", "status": "active",
        "password_hash": "$2b$12$0vC24ewJ9UTWRDXVkm9p8eVq2Wnt/AArq0gloESsA2po.3GO6D44G",
    },
]

KPI_SNAPSHOTS_DATA = [
    {"month": "Nov", "year": 2025, "arr": 492000,  "mrr": 41000, "nrr_percentage": 101.2, "expansion_mrr": 8000,  "churn_mrr": 2100, "nrr_status": "healthy"},
    {"month": "Dic", "year": 2025, "arr": 504000,  "mrr": 42000, "nrr_percentage": 102.0, "expansion_mrr": 9500,  "churn_mrr": 1900, "nrr_status": "healthy"},
    {"month": "Ene", "year": 2026, "arr": 527400,  "mrr": 43950, "nrr_percentage": 103.1, "expansion_mrr": 11000, "churn_mrr": 1750, "nrr_status": "healthy"},
    {"month": "Feb", "year": 2026, "arr": 537000,  "mrr": 44750, "nrr_percentage": 103.8, "expansion_mrr": 12500, "churn_mrr": 1700, "nrr_status": "healthy"},
    {"month": "Mar", "year": 2026, "arr": 555600,  "mrr": 46300, "nrr_percentage": 104.0, "expansion_mrr": 14000, "churn_mrr": 1650, "nrr_status": "healthy"},
    {"month": "Abr", "year": 2026, "arr": 542400,  "mrr": 45200, "nrr_percentage": 104.5, "expansion_mrr": 15000, "churn_mrr": 1600, "nrr_status": "healthy"},
    {"month": "May", "year": 2026, "arr": 556800,  "mrr": 46400, "nrr_percentage": 104.8, "expansion_mrr": 15500, "churn_mrr": 1580, "nrr_status": "healthy"},

    # ── PERIOD-TAGGED SNAPSHOTS (para filtros 24H / 7D / 30D / QTD / YTD) ─────
    # Estos registros son usados por el backend para responder al filtro de período.
    # Fecha de referencia: May 23, 2026 (hoy).
    #   24H  → últimas 24 horas   (May 22 → May 23)
    #   7D   → últimos 7 días     (May 16 → May 23)
    #   30D  → últimos 30 días    (Apr 23 → May 23)
    #   qtd  → Q2 2026            (Apr  1 → May 23)
    #   ytd  → Año 2026           (Ene  1 → May 23)
    {
        "period": "24h",  "month": "May", "year": 2026,
        "arr": 556800,  "mrr": 46400,  "nrr_percentage": 104.8,
        "expansion_mrr": 516,  "churn_mrr": 53,  "nrr_status": "healthy",
        "total_patients": 6172, "patients_delta": 120,
        "active_clinics": 4,   "clinics_delta": 1,  "in_treatment": 5762,
    },
    {
        "period": "7d",   "month": "May", "year": 2026,
        "arr": 556800,  "mrr": 46400,  "nrr_percentage": 104.8,
        "expansion_mrr": 3617, "churn_mrr": 369, "nrr_status": "healthy",
        "total_patients": 6052, "patients_delta": 4212,
        "active_clinics": 4,   "clinics_delta": 2,  "in_treatment": 5640,
    },
    {
        "period": "30d",  "month": "May", "year": 2026,
        "arr": 542400,  "mrr": 45200,  "nrr_percentage": 104.5,
        "expansion_mrr": 15000, "churn_mrr": 1600, "nrr_status": "healthy",
        "total_patients": 6052, "patients_delta": 4212,
        "active_clinics": 4,   "clinics_delta": 2,  "in_treatment": 5640,
    },
    {
        "period": "qtd",  "month": "Q2",  "year": 2026,
        "arr": 549600,  "mrr": 45800,  "nrr_percentage": 104.3,
        "expansion_mrr": 30500, "churn_mrr": 3180, "nrr_status": "healthy",
        "total_patients": 6052, "patients_delta": 8750,
        "active_clinics": 4,   "clinics_delta": 3,  "in_treatment": 5320,
    },
    {
        "period": "ytd",  "month": "YTD", "year": 2026,
        "arr": 527400,  "mrr": 43950,  "nrr_percentage": 103.8,
        "expansion_mrr": 68000, "churn_mrr": 8780, "nrr_status": "healthy",
        "total_patients": 6052, "patients_delta": 14800,
        "active_clinics": 4,   "clinics_delta": 6,  "in_treatment": 5640,
    },
]

APP_METRICS_DATA = [
    {"metric_key": "active_now_total",            "metric_value": 42},
    {"metric_key": "active_now_web_admin",         "metric_value": 5},
    {"metric_key": "active_now_mobile_clinician",  "metric_value": 12},
    {"metric_key": "active_now_mobile_patient",    "metric_value": 25},
    {"metric_key": "downloads_total",              "metric_value": 8540},
    {"metric_key": "downloads_ios",                "metric_value": 4200},
    {"metric_key": "downloads_android",            "metric_value": 4340},
    {"metric_key": "downloads_last_24h",           "metric_value": 56},
]


# ══════════════════════════════════════════════════════════════════════════════
# DATOS NUEVOS (YA EXISTENTES + NUEVOS)
# ══════════════════════════════════════════════════════════════════════════════

INVOICES_DATA = [
    # ── CL-001: Clínica San José — Enterprise $1,999/mo (desde Ene 2026) ────────
    {"invoice_id": "INV-2026-001", "clinic_id": "CL-001", "amount": 1999.0, "currency": "USD", "status": "paid",    "issued_at": datetime(2026, 1, 1),  "pdf_url": "https://storage.wellq.co/inv/1.pdf"},
    {"invoice_id": "INV-2026-002", "clinic_id": "CL-001", "amount": 1999.0, "currency": "USD", "status": "paid",    "issued_at": datetime(2026, 2, 1),  "pdf_url": "https://storage.wellq.co/inv/2.pdf"},
    {"invoice_id": "INV-2026-003", "clinic_id": "CL-001", "amount": 1999.0, "currency": "USD", "status": "paid",    "issued_at": datetime(2026, 3, 1),  "pdf_url": "https://storage.wellq.co/inv/3.pdf"},
    {"invoice_id": "INV-2026-004", "clinic_id": "CL-001", "amount": 1999.0, "currency": "USD", "status": "paid",    "issued_at": datetime(2026, 4, 1),  "pdf_url": "https://storage.wellq.co/inv/4.pdf"},
    {"invoice_id": "INV-2026-005", "clinic_id": "CL-001", "amount": 1999.0, "currency": "USD", "status": "pending", "issued_at": datetime(2026, 5, 1),  "pdf_url": "https://storage.wellq.co/inv/5.pdf"},

    # ── CL-002: Centro Médico Integral — SMB $299/mo (desde Feb 2026) ───────────
    {"invoice_id": "INV-2026-006", "clinic_id": "CL-002", "amount": 299.0,  "currency": "USD", "status": "paid",    "issued_at": datetime(2026, 2, 1),  "pdf_url": "https://storage.wellq.co/inv/6.pdf"},
    {"invoice_id": "INV-2026-007", "clinic_id": "CL-002", "amount": 299.0,  "currency": "USD", "status": "paid",    "issued_at": datetime(2026, 3, 1),  "pdf_url": "https://storage.wellq.co/inv/7.pdf"},
    {"invoice_id": "INV-2026-008", "clinic_id": "CL-002", "amount": 299.0,  "currency": "USD", "status": "pending", "issued_at": datetime(2026, 4, 15), "pdf_url": "https://storage.wellq.co/inv/8.pdf"},
    {"invoice_id": "INV-2026-009", "clinic_id": "CL-002", "amount": 299.0,  "currency": "USD", "status": "pending", "issued_at": datetime(2026, 5, 1),  "pdf_url": "https://storage.wellq.co/inv/9.pdf"},

    # ── CL-003: Centro Kinésico del Sur — SMB $299/mo (desde Mar 2026) ──────────
    # Tiene facturas impagas desde el inicio — riesgo de churn
    {"invoice_id": "INV-2026-010", "clinic_id": "CL-003", "amount": 299.0,  "currency": "USD", "status": "overdue", "issued_at": datetime(2026, 3, 15), "pdf_url": "https://storage.wellq.co/inv/10.pdf"},
    {"invoice_id": "INV-2026-011", "clinic_id": "CL-003", "amount": 299.0,  "currency": "USD", "status": "overdue", "issued_at": datetime(2026, 4, 15), "pdf_url": "https://storage.wellq.co/inv/11.pdf"},
    {"invoice_id": "INV-2026-012", "clinic_id": "CL-003", "amount": 299.0,  "currency": "USD", "status": "pending", "issued_at": datetime(2026, 5, 15), "pdf_url": "https://storage.wellq.co/inv/12.pdf"},

    # ── CL-004: Fisioclínica Norte — Enterprise $1,999/mo (desde Ene 2026) ──────
    {"invoice_id": "INV-2026-013", "clinic_id": "CL-004", "amount": 1999.0, "currency": "USD", "status": "paid",    "issued_at": datetime(2026, 1, 20), "pdf_url": "https://storage.wellq.co/inv/13.pdf"},
    {"invoice_id": "INV-2026-014", "clinic_id": "CL-004", "amount": 1999.0, "currency": "USD", "status": "paid",    "issued_at": datetime(2026, 2, 20), "pdf_url": "https://storage.wellq.co/inv/14.pdf"},
    {"invoice_id": "INV-2026-015", "clinic_id": "CL-004", "amount": 1999.0, "currency": "USD", "status": "paid",    "issued_at": datetime(2026, 3, 20), "pdf_url": "https://storage.wellq.co/inv/15.pdf"},
    {"invoice_id": "INV-2026-016", "clinic_id": "CL-004", "amount": 1999.0, "currency": "USD", "status": "paid",    "issued_at": datetime(2026, 4, 20), "pdf_url": "https://storage.wellq.co/inv/16.pdf"},
    {"invoice_id": "INV-2026-017", "clinic_id": "CL-004", "amount": 1999.0, "currency": "USD", "status": "paid",    "issued_at": datetime(2026, 5, 1),  "pdf_url": "https://storage.wellq.co/inv/17.pdf"},

    # ── CL-005: Rehab Centro — Trial $0/mo (sin facturas, es período de prueba) ─
    # Sin registros intencionalmente — trial no genera cargos.

    # ── CL-006: Clínica del Deporte SpA — SMB $299/mo (desde Mar 2026) ──────────
    # Todas vencidas/atrasadas — health score bajo, riesgo real de churn
    {"invoice_id": "INV-2026-018", "clinic_id": "CL-006", "amount": 299.0,  "currency": "USD", "status": "overdue", "issued_at": datetime(2026, 2, 1),  "pdf_url": "https://storage.wellq.co/inv/18.pdf"},
    {"invoice_id": "INV-2026-019", "clinic_id": "CL-006", "amount": 299.0,  "currency": "USD", "status": "overdue", "issued_at": datetime(2026, 3, 1),  "pdf_url": "https://storage.wellq.co/inv/19.pdf"},
    {"invoice_id": "INV-2026-020", "clinic_id": "CL-006", "amount": 299.0,  "currency": "USD", "status": "overdue", "issued_at": datetime(2026, 4, 1),  "pdf_url": "https://storage.wellq.co/inv/20.pdf"},
    {"invoice_id": "INV-2026-021", "clinic_id": "CL-006", "amount": 299.0,  "currency": "USD", "status": "pending", "issued_at": datetime(2026, 5, 1),  "pdf_url": "https://storage.wellq.co/inv/21.pdf"},
]

# ── CLINIC_USAGE_METRICS_DATA: se agregan 3 campos nuevos por clínica ─────────
# appointments_this_month → COUNT appointments WHERE clinic_id=X AND start_time >= inicio mes
# notes_generated         → COUNT clinical_notes (join provider_id → clinicians.clinic_ids[])
# exercises_assigned      → COUNT patient_programs WHERE active_until = null (activos)
CLINIC_USAGE_METRICS_DATA = [
    {
        "clinic_id": "CL-001", "period": "last_30_days",
        "active_clinicians": 45, "patient_sessions_completed": 3500,
        "ai_processing_minutes": 8400, "api_calls": 125000,
        "appointments_this_month": 320, "notes_generated": 280, "exercises_assigned": 95,   # ← NUEVOS
    },
    {
        "clinic_id": "CL-002", "period": "last_30_days",
        "active_clinicians": 5, "patient_sessions_completed": 450,
        "ai_processing_minutes": 950, "api_calls": 12000,
        "appointments_this_month": 87,  "notes_generated": 64,  "exercises_assigned": 22,   # ← NUEVOS
    },
    # ── NUEVAS MÉTRICAS DE USO ──────────────────────────────────────────────
    {
        "clinic_id": "CL-003", "period": "last_30_days",
        "active_clinicians": 4, "patient_sessions_completed": 380,
        "ai_processing_minutes": 720, "api_calls": 9400,
        "appointments_this_month": 145, "notes_generated": 110, "exercises_assigned": 41,   # ← NUEVOS
    },
    {
        "clinic_id": "CL-004", "period": "last_30_days",
        "active_clinicians": 42, "patient_sessions_completed": 3200,
        "ai_processing_minutes": 7600, "api_calls": 98500,
        "appointments_this_month": 210, "notes_generated": 185, "exercises_assigned": 67,   # ← NUEVOS
    },
    {
        "clinic_id": "CL-005", "period": "last_30_days",
        "active_clinicians": 1, "patient_sessions_completed": 80,
        "ai_processing_minutes": 110, "api_calls": 1350,
        "appointments_this_month": 53,  "notes_generated": 38,  "exercises_assigned": 14,   # ← NUEVOS
    },
    {
        "clinic_id": "CL-006", "period": "last_30_days",
        "active_clinicians": 3, "patient_sessions_completed": 320,
        "ai_processing_minutes": 510, "api_calls": 8700,
        "appointments_this_month": 60,  "notes_generated": 42,  "exercises_assigned": 18,   # ← NUEVOS
    },
]

SERVERS_DATA = [
    {"server_id": "SRV-AZ-001", "name": "AI Processing Node 1", "region": "us-east-1", "status": "healthy",  "uptime": "99.9%",  "cpu_usage": "45%", "ram_usage": "60%"},
    {"server_id": "SRV-AZ-002", "name": "Database Primary",     "region": "sa-east-1", "status": "healthy",  "uptime": "99.99%", "cpu_usage": "65%", "ram_usage": "80%"},
    # ── NUEVOS SERVIDORES ───────────────────────────────────────────────────
    {"server_id": "SRV-AZ-003", "name": "Web App Server",       "region": "us-east-1", "status": "healthy",  "uptime": "99.95%", "cpu_usage": "30%", "ram_usage": "55%"},
    {"server_id": "SRV-AZ-004", "name": "Cache Redis",          "region": "sa-east-1", "status": "healthy",  "uptime": "100%",   "cpu_usage": "10%", "ram_usage": "25%"},
    {"server_id": "SRV-AZ-005", "name": "Queue Worker 1",       "region": "us-east-1", "status": "degraded", "uptime": "99.8%",  "cpu_usage": "78%", "ram_usage": "90%"},
]

BACKGROUND_PROCESSES_DATA = [
    {"process_id": "PROC-001", "name": "Daily Invoice Generation",    "status": "sleeping", "queued_items": 0,   "memory_consumption": "120MB"},
    {"process_id": "PROC-002", "name": "Video Pose Estimation Queue", "status": "running",  "queued_items": 15,  "memory_consumption": "1024MB"},
    # ── NUEVOS PROCESOS ─────────────────────────────────────────────────────
    {"process_id": "PROC-003", "name": "Email Scheduler",             "status": "running",  "queued_items": 120, "memory_consumption": "45MB"},
    {"process_id": "PROC-004", "name": "Health Score Calculator",     "status": "sleeping", "queued_items": 0,   "memory_consumption": "80MB"},
    {"process_id": "PROC-005", "name": "Churn Prediction Job",        "status": "running",  "queued_items": 3,   "memory_consumption": "512MB"},
]

# ── MRR: 12 meses completos (Jun 2025 → May 2026) ─────────────────────────────
MRR_SNAPSHOTS_DATA = [
    {"period_month": "Jun", "period_year": 2025, "total_mrr": 36500.0, "new_business": 900.0,  "expansion": 5500.0,  "contraction": 400.0, "churn": 2100.0, "retained": 34400.0, "monthly_growth_percentage": 1.2},
    {"period_month": "Jul", "period_year": 2025, "total_mrr": 37800.0, "new_business": 1000.0, "expansion": 6200.0,  "contraction": 350.0, "churn": 2000.0, "retained": 35800.0, "monthly_growth_percentage": 3.6},
    {"period_month": "Ago", "period_year": 2025, "total_mrr": 38900.0, "new_business": 850.0,  "expansion": 7000.0,  "contraction": 300.0, "churn": 1950.0, "retained": 36950.0, "monthly_growth_percentage": 2.9},
    {"period_month": "Sep", "period_year": 2025, "total_mrr": 39800.0, "new_business": 950.0,  "expansion": 7500.0,  "contraction": 320.0, "churn": 1900.0, "retained": 37900.0, "monthly_growth_percentage": 2.3},
    {"period_month": "Oct", "period_year": 2025, "total_mrr": 40600.0, "new_business": 1100.0, "expansion": 7800.0,  "contraction": 280.0, "churn": 2050.0, "retained": 38550.0, "monthly_growth_percentage": 2.0},
    {"period_month": "Nov", "period_year": 2025, "total_mrr": 41000.0, "new_business": 800.0,  "expansion": 8000.0,  "contraction": 260.0, "churn": 2100.0, "retained": 38900.0, "monthly_growth_percentage": 1.0},
    {"period_month": "Dic", "period_year": 2025, "total_mrr": 42000.0, "new_business": 1300.0, "expansion": 9500.0,  "contraction": 240.0, "churn": 1900.0, "retained": 40100.0, "monthly_growth_percentage": 2.4},
    {"period_month": "Ene", "period_year": 2026, "total_mrr": 43950.0, "new_business": 1500.0, "expansion": 11000.0, "contraction": 310.0, "churn": 1750.0, "retained": 42200.0, "monthly_growth_percentage": 4.6},
    {"period_month": "Feb", "period_year": 2026, "total_mrr": 44750.0, "new_business": 1200.0, "expansion": 12500.0, "contraction": 290.0, "churn": 1700.0, "retained": 43050.0, "monthly_growth_percentage": 1.8},
    {"period_month": "Mar", "period_year": 2026, "total_mrr": 46300.0, "new_business": 1200.0, "expansion": 14000.0, "contraction": 500.0, "churn": 1650.0, "retained": 44650.0, "monthly_growth_percentage": 3.4},
    {"period_month": "Abr", "period_year": 2026, "total_mrr": 45200.0, "new_business": 1500.0, "expansion": 15000.0, "contraction": 800.0, "churn": 1600.0, "retained": 43600.0, "monthly_growth_percentage": 2.1},
    {"period_month": "May", "period_year": 2026, "total_mrr": 46400.0, "new_business": 1800.0, "expansion": 15500.0, "contraction": 600.0, "churn": 1580.0, "retained": 44820.0, "monthly_growth_percentage": 2.7},

    # ── PERIOD-TAGGED MRR (para filtros del dashboard Financials) ─────────────
    # Referencia: May 23, 2026. total_mrr = estado actual; new_business / expansion /
    # contraction / churn = acumulado dentro de la ventana de tiempo.
    {"period_month": "24h", "period_year": 2026,
     "total_mrr": 46400.0, "new_business": 60.0,   "expansion": 516.0,
     "contraction": 20.0,  "churn": 53.0,   "retained": 46347.0, "monthly_growth_percentage": 0.1},
    {"period_month": "7d",  "period_year": 2026,
     "total_mrr": 46400.0, "new_business": 420.0,  "expansion": 3617.0,
     "contraction": 140.0, "churn": 369.0,  "retained": 45979.0, "monthly_growth_percentage": 0.7},
    {"period_month": "qtd", "period_year": 2026,
     "total_mrr": 46400.0, "new_business": 3300.0, "expansion": 31000.0,
     "contraction": 1400.0,"churn": 3180.0, "retained": 43220.0, "monthly_growth_percentage": 5.3},
    {"period_month": "ytd", "period_year": 2026,
     "total_mrr": 46400.0, "new_business": 7650.0, "expansion": 68500.0,
     "contraction": 2900.0,"churn": 8780.0, "retained": 37620.0, "monthly_growth_percentage": 27.1},
]

# ── Churn risk con risk_level siempre definido ─────────────────────────────────
CHURN_RISK_REGIONS_DATA = [
    {"region": "North America", "clinics_at_risk": 2, "potential_mrr_loss": 598.0,  "risk_level": "Low"},
    {"region": "LATAM",         "clinics_at_risk": 5, "potential_mrr_loss": 1495.0, "risk_level": "Medium"},
    {"region": "Europe",        "clinics_at_risk": 1, "potential_mrr_loss": 299.0,  "risk_level": "Low"},
    {"region": "Asia Pacific",  "clinics_at_risk": 3, "potential_mrr_loss": 897.0,  "risk_level": "Medium"},
]

APP_USAGE_STATS_DATA = [
    {
        "app_type": "patients", "period": "current_month",
        "monthly_active_users": 15200,
        "average_session_length_minutes": 8.5,
        "crash_free_sessions_percentage": 99.8,
        "top_screens": json.dumps(["Home", "Exercises", "Progress"]),
        "total_downloads": 892000,
        "active_today": 45200,
        "active_30d": 579000,
        "inactive_users": 314000,
        "ios_downloads": 456000,
        "android_downloads": 436000,
        "registered_users": 0,
    },
    {
        "app_type": "tablet", "period": "current_month",
        "monthly_active_users": 3400,
        "average_session_length_minutes": 45.2,
        "crash_free_sessions_percentage": 99.9,
        "top_screens": json.dumps(["Dashboard", "Patient Details", "Notes"]),
        "total_downloads": 4850,
        "active_today": 2340,
        "active_30d": 4210,
        "inactive_users": 640,
        "ios_downloads": 2900,
        "android_downloads": 1950,
        "registered_users": 0,
    },
    {
        "app_type": "web", "period": "current_month",
        "monthly_active_users": 7890,
        "average_session_length_minutes": 22.0,
        "crash_free_sessions_percentage": 99.7,
        "top_screens": json.dumps(["Dashboard", "Clinics", "Reports"]),
        "total_downloads": 0,
        "active_today": 1245,
        "active_30d": 7890,
        "inactive_users": 1030,
        "ios_downloads": 0,
        "android_downloads": 0,
        "registered_users": 8920,
    },
]

FEATURE_ADOPTION_DATA = [
    {"feature_name": "SOAP Note Generation", "period": "last_30_days", "adoption_rate_percentage": 68.5, "total_uses": 45000, "user_feedback_score": 4.8},
    {"feature_name": "Pose Analysis",        "period": "last_30_days", "adoption_rate_percentage": 42.0, "total_uses": 12500, "user_feedback_score": 4.5},
]

ADHERENCE_SNAPSHOTS_DATA = [
    {
        "period": "current_month",
        "overall_adherence_percentage": 76.5,
        "breakdown_by_week": json.dumps({"Week 1": 80, "Week 2": 78, "Week 3": 75, "Week 4": 73}),
        "top_dropping_point": "Day 14",
    },
]

COHORT_RETENTION_DATA = [
    {"cohort_label": "Ene 2026", "cohort_month": 1, "cohort_year": 2026, "users_count": 1200, "retention_by_month": json.dumps({"Month 1": 100, "Month 2": 85, "Month 3": 78})},
    {"cohort_label": "Feb 2026", "cohort_month": 2, "cohort_year": 2026, "users_count": 1500, "retention_by_month": json.dumps({"Month 1": 100, "Month 2": 88})},
]

SOAP_QUALITY_METRICS_DATA = [
    {
        "period": "current_month",
        "total_notes_generated": 45000,
        "acceptance_rate_percentage": 92.5,
        "edits_required_percentage": 7.5,
        "average_time_saved_minutes_per_note": 6.2,
        "common_corrections": json.dumps(["Patient tone adjustment", "Adding specific ROM degrees"]),
    },
]

AI_COST_SNAPSHOTS_DATA = [
    {
        "period": "last_month", "currency": "USD", "total_cost": 3200.0,
        "breakdown": json.dumps({"OpenAI (SOAP)": 1100, "GCP Vertex (Pose)": 2100}),
        "projected_eom_cost": 3800.0,
    },
    {
        "period": "current_month", "currency": "USD", "total_cost": 3450.0,
        "breakdown": json.dumps({"OpenAI (SOAP)": 1200, "GCP Vertex (Pose)": 2250}),
        "projected_eom_cost": 4200.0,
    },
]

POSE_ANALYSIS_SNAPSHOTS_DATA = [
    {
        "period": "last_month",
        "total_sessions_analyzed": 7800,
        "overall_success_rate_percentage": 97.5,
        "failure_reasons": json.dumps({"Poor Lighting": 50, "Subject out of frame": 45, "Unknown Error": 20}),
    },
    {
        "period": "last_7_days",
        "total_sessions_analyzed": 8500,
        "overall_success_rate_percentage": 98.2,
        "failure_reasons": json.dumps({"Poor Lighting": 45, "Subject out of frame": 40, "Unknown Error": 15}),
    },
]

AI_LATENCY_METRICS_DATA = [
    {"service": "soap_generation",         "period": "last_24_hours", "average_latency_ms": 1200, "p95_latency_ms": 2500, "status": "healthy"},
    {"service": "pose_estimation_realtime", "period": "last_24_hours", "average_latency_ms": 150,  "p95_latency_ms": 300,  "status": "healthy"},
]

APP_VERSIONS_DATA = [
    {"app_type": "patient",   "version": "v2.1.0", "user_count": 12000, "percentage": 80.0},
    {"app_type": "patient",   "version": "v2.0.5", "user_count": 3000,  "percentage": 20.0},
    {"app_type": "clinician", "version": "v3.0.0", "user_count": 3400,  "percentage": 100.0},
]

PLATFORM_SETTINGS_DATA = [
    {"setting_key": "maintenance_mode", "setting_value": "false"},
    {"setting_key": "enforce_2fa",      "setting_value": "true"},
    {"setting_key": "api_version",      "setting_value": "v1.4.2"},
    {"setting_key": "support_email",    "setting_value": "wellq.admin@gmail.com"},
]


# ══════════════════════════════════════════════════════════════════════════════
# TABLAS NUEVAS – DATOS INICIALES (existentes antes de este PR)
# ══════════════════════════════════════════════════════════════════════════════

IMPERSONATE_AUDIT_LOG_DATA = [
    {
        "audit_log_id": "audit-001", "clinic_id": "CL-001", "clinic_name": "Clínica San José",
        "admin_user_id": "USR-WELLQ-001", "admin_email": "admin@wellq.com",
        "reason": "Revisar configuración de facturación por solicitud del cliente.",
        "session_token_hash": "hash123ejemplo",
        "expires_at": datetime(2026, 5, 8, 12, 0, 0),
        "revoked_at": None,
    },
]

NEEDS_ATTENTION_ITEMS_DATA = [
    {
        "item_id": "attn-001", "clinic_id": "CL-001", "clinic_name": "Clínica San José",
        "issue_type": "overdue_invoice", "severity": "critical",
        "description": "Factura INV-2026-001 vencida hace más de 30 días.",
        "action_url": "/invoices/INV-2026-001",
    },
    {
        "item_id": "attn-002", "clinic_id": "CL-006", "clinic_name": "Clínica del Deporte SpA",
        "issue_type": "low_health", "severity": "warning",
        "description": "Health Score bajó a 41. Revisar engagement y facturación.",
        "action_url": "/clinics/CL-006",
    },
    {
        "item_id": "attn-003", "clinic_id": "CL-005", "clinic_name": "Rehab Centro",
        "issue_type": "no_login", "severity": "info",
        "description": "No ha iniciado sesión en 3 días. Posible inactividad en prueba.",
        "action_url": "/clinics/CL-005",
    },
]

INFRASTRUCTURE_COST_SNAPSHOTS_DATA = [
    {
        "period": "Marzo 2026", "period_year": 2026, "period_month": 3,
        "total_usd": 8450.0, "budget_usd": 9000.0, "budget_used_percent": 93.9,
        "breakdown": json.dumps([
            {"service": "Compute Engine", "cost": 3200},
            {"service": "Cloud SQL",      "cost": 1800},
            {"service": "Cloud Storage",  "cost": 450},
            {"service": "AI APIs",        "cost": 2200},
            {"service": "Networking",     "cost": 800},
        ]),
    },
    {
        "period": "Abril 2026", "period_year": 2026, "period_month": 4,
        "total_usd": 9120.0, "budget_usd": 9000.0, "budget_used_percent": 101.3,
        "breakdown": json.dumps([
            {"service": "Compute Engine", "cost": 3500},
            {"service": "Cloud SQL",      "cost": 1900},
            {"service": "Cloud Storage",  "cost": 520},
            {"service": "AI APIs",        "cost": 2400},
            {"service": "Networking",     "cost": 800},
        ]),
    },
]

INFRA_NODES_DATA = [
    {
        "node_id": "node-api-us-east", "name": "API Gateway US East", "type": "api",
        "status": "healthy", "region": "us-east-1",
        "metrics": json.dumps({"requests_per_sec": 340, "latency_p95": 120}),
    },
    {
        "node_id": "node-worker-pose", "name": "Pose Worker", "type": "worker",
        "status": "healthy", "region": "us-east-1",
        "metrics": json.dumps({"queue_depth": 15, "processed_last_hour": 200}),
    },
    {
        "node_id": "node-db-primary", "name": "Database Primary", "type": "database",
        "status": "healthy", "region": "sa-east-1",
        "metrics": json.dumps({"connections": 45, "slow_queries": 2}),
    },
    {
        "node_id": "node-cache-01", "name": "Redis Cache", "type": "cache",
        "status": "healthy", "region": "us-east-1",
        "metrics": json.dumps({"hit_rate": 0.92, "memory_used_mb": 256}),
    },
    {
        "node_id": "node-queue-01", "name": "Bull Queue Worker", "type": "queue",
        "status": "degraded", "region": "us-east-1",
        "metrics": json.dumps({"queue_depth": 340, "failures_last_hour": 5}),
    },
]


# ══════════════════════════════════════════════════════════════════════════════
# TABLAS NUEVAS — SINCRONIZADAS DESDE MONGODB DE LA EMPRESA
# ══════════════════════════════════════════════════════════════════════════════

# ── CLINICIAN_SUMMARIES_DATA ───────────────────────────────────────────────────
# Un registro por clínica. Fuente: colección `clinicians` de MongoDB.
# active_clinicians < total_clinicians en todos los casos (algunos inactivos).
# specialties: strings reales del contexto clínico WellQ.
# recorded_at simula el timestamp del último sync desde MongoDB.
CLINICIAN_SUMMARIES_DATA = [
    {
        "clinic_id": "CL-001",
        "total_clinicians": 12,
        "active_clinicians": 10,
        "specialties": json.dumps(["Kinesiología", "Traumatología", "Rehabilitación Física"]),
        "recorded_at": datetime(2026, 5, 15, 3, 0, 0),
    },
    {
        "clinic_id": "CL-002",
        "total_clinicians": 5,
        "active_clinicians": 4,
        "specialties": json.dumps(["Kinesiología", "Neurología"]),
        "recorded_at": datetime(2026, 5, 15, 3, 0, 0),
    },
    {
        "clinic_id": "CL-003",
        "total_clinicians": 6,
        "active_clinicians": 4,
        "specialties": json.dumps(["Kinesiología", "Medicina del Deporte"]),
        "recorded_at": datetime(2026, 5, 15, 3, 0, 0),
    },
    {
        "clinic_id": "CL-004",
        "total_clinicians": 48,
        "active_clinicians": 42,
        "specialties": json.dumps(["Kinesiología", "Traumatología", "Reumatología", "Rehabilitación Física", "Neurología"]),
        "recorded_at": datetime(2026, 5, 15, 3, 0, 0),
    },
    {
        "clinic_id": "CL-005",
        "total_clinicians": 2,
        "active_clinicians": 1,
        "specialties": json.dumps(["Kinesiología"]),
        "recorded_at": datetime(2026, 5, 15, 3, 0, 0),
    },
    {
        "clinic_id": "CL-006",
        "total_clinicians": 4,
        "active_clinicians": 3,
        "specialties": json.dumps(["Kinesiología", "Medicina del Deporte"]),
        "recorded_at": datetime(2026, 5, 15, 3, 0, 0),
    },
]

# ── PATIENT_HEALTH_DATA ────────────────────────────────────────────────────────
# Un registro por clínica. Fuente: colección `patients` de MongoDB, campo `status`.
# INVARIANTE: at_risk + declining + stable + improving == total_patients
#             total_patients debe coincidir con patients_used en CLINICS_DATA.
# CL-001: 1500 | CL-002: 340 | CL-003: 412 | CL-004: 3800 | CL-005: 30 | CL-006: 490
PATIENT_HEALTH_DATA = [
    {
        "clinic_id": "CL-001",
        "total_patients": 1500,   # = patients_used CL-001
        "at_risk":   120,         # 8%
        "declining": 180,         # 12%
        "stable":    850,         # 57%
        "improving": 350,         # 23%  → suma: 1500 ✓
        "recorded_at": datetime(2026, 5, 15, 3, 0, 0),
    },
    {
        "clinic_id": "CL-002",
        "total_patients": 340,    # = patients_used CL-002
        "at_risk":   45,          # 13%
        "declining": 60,          # 18%
        "stable":    180,         # 53%
        "improving": 55,          # 16%  → suma: 340 ✓
        "recorded_at": datetime(2026, 5, 15, 3, 0, 0),
    },
    {
        "clinic_id": "CL-003",
        "total_patients": 412,    # = patients_used CL-003
        "at_risk":   58,          # 14%
        "declining": 74,          # 18%
        "stable":    210,         # 51%
        "improving": 70,          # 17%  → suma: 412 ✓
        "recorded_at": datetime(2026, 5, 15, 3, 0, 0),
    },
    {
        "clinic_id": "CL-004",
        "total_patients": 3800,   # = patients_used CL-004
        "at_risk":   280,         # 7%
        "declining": 420,         # 11%
        "stable":    2200,        # 58%
        "improving": 900,         # 24%  → suma: 3800 ✓
        "recorded_at": datetime(2026, 5, 15, 3, 0, 0),
    },
    {
        "clinic_id": "CL-005",
        "total_patients": 30,     # = patients_used CL-005
        "at_risk":   2,           # 7%
        "declining": 3,           # 10%
        "stable":    18,          # 60%
        "improving": 7,           # 23%  → suma: 30 ✓
        "recorded_at": datetime(2026, 5, 15, 3, 0, 0),
    },
    {
        "clinic_id": "CL-006",
        "total_patients": 490,    # = patients_used CL-006
        "at_risk":   95,          # 19% — clínica en warning, más pacientes en riesgo
        "declining": 120,         # 24%
        "stable":    220,         # 45%
        "improving": 55,          # 12%  → suma: 490 ✓
        "recorded_at": datetime(2026, 5, 15, 3, 0, 0),
    },
]

# ── SUPPORT_TICKETS_DATA ───────────────────────────────────────────────────────
# 6 tickets distribuidos entre clínicas.
# Los 3 estados (Open, Closed, Sent) están representados para que los filtros
# de SupportView tengan datos variados.
# clinic_id se incluye directamente en el seed (en producción se infiere
# desde reporter.email → users → clinicians o lo provee la empresa en el sync).
SUPPORT_TICKETS_DATA = [
    {
        "ticket_id": "TK-001",
        "clinic_id": "CL-001",
        "title": "Error al cargar historial de ejercicios",
        "description": "Algunos pacientes reportan que la pantalla de historial queda en blanco al cargar.",
        "status": "Open",
        "category": "Bug",
        "reporter_name": "Juan Pérez",
        "reporter_email": "admin@clinicasanjose.com",
        "responder_name": "WellQ Admin",
        "reported_at": datetime(2026, 5, 10, 9, 30, 0),
        "closed_at": None,
        "solution": None,
        "recorded_at": datetime(2026, 5, 15, 3, 0, 0),
    },
    {
        "ticket_id": "TK-002",
        "clinic_id": "CL-002",
        "title": "Cobro duplicado en factura de abril",
        "description": "La factura de abril aparece cobrada dos veces en el estado de cuenta.",
        "status": "Closed",
        "category": "Billing",
        "reporter_name": "María González",
        "reporter_email": "hola@centromedico.com",
        "responder_name": "WellQ Admin",
        "reported_at": datetime(2026, 4, 20, 11, 0, 0),
        "closed_at": datetime(2026, 4, 22, 15, 0, 0),
        "solution": "Se emitió nota de crédito y se ajustó la factura. Reembolso procesado.",
        "recorded_at": datetime(2026, 5, 15, 3, 0, 0),
    },
    {
        "ticket_id": "TK-003",
        "clinic_id": "CL-003",
        "title": "Solicitud: exportar reportes en formato Excel",
        "description": "Necesitamos poder exportar los reportes de adherencia en .xlsx además de PDF.",
        "status": "Open",
        "category": "Feature",
        "reporter_name": "Pedro Alarcón",
        "reporter_email": "pedro@kinesur.cl",
        "responder_name": None,
        "reported_at": datetime(2026, 5, 8, 14, 0, 0),
        "closed_at": None,
        "solution": None,
        "recorded_at": datetime(2026, 5, 15, 3, 0, 0),
    },
    {
        "ticket_id": "TK-004",
        "clinic_id": "CL-001",
        "title": "Solicitud de aumento de límite de pacientes",
        "description": "Estamos llegando al 95% del límite. Necesitamos ampliar a 6000 pacientes.",
        "status": "Sent",
        "category": "Request",
        "reporter_name": "Juan Pérez",
        "reporter_email": "admin@clinicasanjose.com",
        "responder_name": "WellQ Admin",
        "reported_at": datetime(2026, 5, 12, 10, 0, 0),
        "closed_at": None,
        "solution": None,
        "recorded_at": datetime(2026, 5, 15, 3, 0, 0),
    },
    {
        "ticket_id": "TK-005",
        "clinic_id": "CL-004",
        "title": "Falla en sincronización con TM3",
        "description": "Las citas del día no se están sincronizando correctamente desde TM3.",
        "status": "Closed",
        "category": "Bug",
        "reporter_name": "Carolina Muñoz",
        "reporter_email": "carolina@fisioclinicanorte.cl",
        "responder_name": "WellQ Admin",
        "reported_at": datetime(2026, 5, 5, 8, 0, 0),
        "closed_at": datetime(2026, 5, 6, 12, 0, 0),
        "solution": "Se reconfiguró el webhook de TM3 y se forzó re-sync manual. Estable desde entonces.",
        "recorded_at": datetime(2026, 5, 15, 3, 0, 0),
    },
    {
        "ticket_id": "TK-006",
        "clinic_id": "CL-006",
        "title": "No puedo acceder al módulo de reportes",
        "description": "Al intentar abrir la sección de reportes aparece error 403.",
        "status": "Open",
        "category": "Bug",
        "reporter_name": "Ignacio Rojas",
        "reporter_email": "irojas@deporte.cl",
        "responder_name": "WellQ Admin",
        "reported_at": datetime(2026, 5, 14, 16, 30, 0),
        "closed_at": None,
        "solution": None,
        "recorded_at": datetime(2026, 5, 15, 3, 0, 0),
    },
]


# ══════════════════════════════════════════════════════════════════════════════
# FUNCIONES DE SEED
# ══════════════════════════════════════════════════════════════════════════════

async def create_tables():
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
        # Agrega columnas nuevas si no existen (idempotente — seguro de re-ejecutar)
        from sqlalchemy import text
        
        # ── SOLUCIÓN: Agrega la columna password_hash a los usuarios administradores ──
        await conn.execute(text("ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS password_hash varchar DEFAULT NULL"))

        # ── app_usage_stats (columnas previas) ──────────────────────────────
        await conn.execute(text("ALTER TABLE app_usage_stats ADD COLUMN IF NOT EXISTS total_downloads integer DEFAULT 0"))
        await conn.execute(text("ALTER TABLE app_usage_stats ADD COLUMN IF NOT EXISTS active_today integer DEFAULT 0"))
        await conn.execute(text("ALTER TABLE app_usage_stats ADD COLUMN IF NOT EXISTS active_30d integer DEFAULT 0"))
        await conn.execute(text("ALTER TABLE app_usage_stats ADD COLUMN IF NOT EXISTS inactive_users integer DEFAULT 0"))
        await conn.execute(text("ALTER TABLE app_usage_stats ADD COLUMN IF NOT EXISTS ios_downloads integer DEFAULT 0"))
        await conn.execute(text("ALTER TABLE app_usage_stats ADD COLUMN IF NOT EXISTS android_downloads integer DEFAULT 0"))
        await conn.execute(text("ALTER TABLE app_usage_stats ADD COLUMN IF NOT EXISTS registered_users integer DEFAULT 0"))
        # ── clinics (campo nuevo) ────────────────────────────────────────────
        await conn.execute(text("ALTER TABLE clinics ADD COLUMN IF NOT EXISTS mongo_clinic_id varchar DEFAULT NULL"))
        # ── clinic_usage_metrics (campos nuevos) ────────────────────────────
        await conn.execute(text("ALTER TABLE clinic_usage_metrics ADD COLUMN IF NOT EXISTS appointments_this_month integer DEFAULT 0"))
        await conn.execute(text("ALTER TABLE clinic_usage_metrics ADD COLUMN IF NOT EXISTS notes_generated integer DEFAULT 0"))
        await conn.execute(text("ALTER TABLE clinic_usage_metrics ADD COLUMN IF NOT EXISTS exercises_assigned integer DEFAULT 0"))
        # ── alerts (campos i18n) ─────────────────────────────────────────────
        await conn.execute(text("ALTER TABLE alerts ADD COLUMN IF NOT EXISTS title_key varchar DEFAULT NULL"))
        await conn.execute(text("ALTER TABLE alerts ADD COLUMN IF NOT EXISTS message_key varchar DEFAULT NULL"))
        await conn.execute(text("ALTER TABLE alerts ADD COLUMN IF NOT EXISTS message_params text DEFAULT NULL"))
        # ── kpi_snapshots (campos de período) ────────────────────────────────
        await conn.execute(text("ALTER TABLE kpi_snapshots ADD COLUMN IF NOT EXISTS period varchar DEFAULT NULL"))
        await conn.execute(text("ALTER TABLE kpi_snapshots ADD COLUMN IF NOT EXISTS total_patients integer DEFAULT 0"))
        await conn.execute(text("ALTER TABLE kpi_snapshots ADD COLUMN IF NOT EXISTS patients_delta integer DEFAULT 0"))
        await conn.execute(text("ALTER TABLE kpi_snapshots ADD COLUMN IF NOT EXISTS active_clinics integer DEFAULT 0"))
        await conn.execute(text("ALTER TABLE kpi_snapshots ADD COLUMN IF NOT EXISTS clinics_delta integer DEFAULT 0"))
        await conn.execute(text("ALTER TABLE kpi_snapshots ADD COLUMN IF NOT EXISTS in_treatment integer DEFAULT 0"))
    print("✅ Tablas creadas/verificadas en Neon")

async def seed_clinics(session):
    for data in CLINICS_DATA: session.add(Clinic(**data))
    print(f"  → {len(CLINICS_DATA)} clínicas")

async def seed_features(session):
    for data in FEATURES_DATA: session.add(Feature(**data))
    print(f"  → {len(FEATURES_DATA)} features")

async def seed_plans(session):
    for data in PLANS_DATA: session.add(Plan(**data))
    print(f"  → {len(PLANS_DATA)} planes")

async def seed_plan_features(session):
    count = 0
    for plan_id, features in PLAN_FEATURES_DATA.items():
        for feature_id, limit in features:
            session.add(PlanFeature(plan_id=plan_id, feature_id=feature_id, limit_value=limit))
            count += 1
    print(f"  → {count} plan_features (relaciones plan↔feature)")

async def seed_clinic_plans(session):
    for data in CLINIC_PLANS_DATA: session.add(ClinicPlan(**data))
    print(f"  → {len(CLINIC_PLANS_DATA)} asignaciones de planes a clínicas")

async def seed_scheduled_changes(session):
    for data in SCHEDULED_CHANGES_DATA: session.add(ScheduledChange(**data))
    print(f"  → {len(SCHEDULED_CHANGES_DATA)} cambios programados")

async def seed_alerts(session):
    for data in ALERTS_DATA: session.add(Alert(**data))
    print(f"  → {len(ALERTS_DATA)} alertas")

async def seed_notifications(session):
    for data in NOTIFICATIONS_DATA: session.add(Notification(**data))
    print(f"  → {len(NOTIFICATIONS_DATA)} notificaciones")

async def seed_jobs(session):
    for data in JOBS_DATA: session.add(Job(**data))
    print(f"  → {len(JOBS_DATA)} jobs")

async def seed_admin_users(session):
    for data in ADMIN_USERS_DATA: session.add(AdminUser(**data))
    print(f"  → {len(ADMIN_USERS_DATA)} usuarios admin")

async def seed_kpi_snapshots(session):
    for data in KPI_SNAPSHOTS_DATA: session.add(KpiSnapshot(**data))
    print(f"  → {len(KPI_SNAPSHOTS_DATA)} kpi_snapshots")

async def seed_app_metrics(session):
    for data in APP_METRICS_DATA: session.add(AppMetric(**data))
    print(f"  → {len(APP_METRICS_DATA)} app_metrics")

async def seed_invoices(session):
    for data in INVOICES_DATA: session.add(Invoice(**data))
    print(f"  → {len(INVOICES_DATA)} invoices")

async def seed_clinic_usage_metrics(session):
    for data in CLINIC_USAGE_METRICS_DATA: session.add(ClinicUsageMetric(**data))
    print(f"  → {len(CLINIC_USAGE_METRICS_DATA)} clinic_usage_metrics")

async def seed_servers(session):
    for data in SERVERS_DATA: session.add(Server(**data))
    print(f"  → {len(SERVERS_DATA)} servers")

async def seed_background_processes(session):
    for data in BACKGROUND_PROCESSES_DATA: session.add(BackgroundProcess(**data))
    print(f"  → {len(BACKGROUND_PROCESSES_DATA)} background_processes")

async def seed_mrr_snapshots(session):
    for data in MRR_SNAPSHOTS_DATA: session.add(MrrSnapshot(**data))
    print(f"  → {len(MRR_SNAPSHOTS_DATA)} mrr_snapshots")

async def seed_churn_risk_regions(session):
    for data in CHURN_RISK_REGIONS_DATA: session.add(ChurnRiskRegion(**data))
    print(f"  → {len(CHURN_RISK_REGIONS_DATA)} churn_risk_regions")

async def seed_app_usage_stats(session):
    for data in APP_USAGE_STATS_DATA: session.add(AppUsageStat(**data))
    print(f"  → {len(APP_USAGE_STATS_DATA)} app_usage_stats")

async def seed_feature_adoption(session):
    for data in FEATURE_ADOPTION_DATA: session.add(FeatureAdoption(**data))
    print(f"  → {len(FEATURE_ADOPTION_DATA)} feature_adoption")

async def seed_adherence_snapshots(session):
    for data in ADHERENCE_SNAPSHOTS_DATA: session.add(AdherenceSnapshot(**data))
    print(f"  → {len(ADHERENCE_SNAPSHOTS_DATA)} adherence_snapshots")

async def seed_cohort_retention(session):
    for data in COHORT_RETENTION_DATA: session.add(CohortRetention(**data))
    print(f"  → {len(COHORT_RETENTION_DATA)} cohort_retention")

async def seed_soap_quality_metrics(session):
    for data in SOAP_QUALITY_METRICS_DATA: session.add(SoapQualityMetric(**data))
    print(f"  → {len(SOAP_QUALITY_METRICS_DATA)} soap_quality_metrics")

async def seed_ai_cost_snapshots(session):
    for data in AI_COST_SNAPSHOTS_DATA: session.add(AiCostSnapshot(**data))
    print(f"  → {len(AI_COST_SNAPSHOTS_DATA)} ai_cost_snapshots")

async def seed_ai_latency_metrics(session):
    for data in AI_LATENCY_METRICS_DATA: session.add(AiLatencyMetric(**data))
    print(f"  → {len(AI_LATENCY_METRICS_DATA)} ai_latency_metrics")

async def seed_pose_analysis_snapshots(session):
    for data in POSE_ANALYSIS_SNAPSHOTS_DATA: session.add(PoseAnalysisSnapshot(**data))
    print(f"  → {len(POSE_ANALYSIS_SNAPSHOTS_DATA)} pose_analysis_snapshots")

async def seed_app_versions(session):
    for data in APP_VERSIONS_DATA: session.add(AppVersion(**data))
    print(f"  → {len(APP_VERSIONS_DATA)} app_versions")

async def seed_platform_settings(session):
    for data in PLATFORM_SETTINGS_DATA: session.add(PlatformSetting(**data))
    print(f"  → {len(PLATFORM_SETTINGS_DATA)} platform_settings")

# ── FUNCIONES DE SEED EXISTENTES (antes de este PR) ────────────────────────────
async def seed_impersonate_audit_log(session):
    for data in IMPERSONATE_AUDIT_LOG_DATA:
        session.add(ImpersonateAuditLog(**data))
    print(f"  → {len(IMPERSONATE_AUDIT_LOG_DATA)} impersonate_audit_log")

async def seed_needs_attention_items(session):
    for data in NEEDS_ATTENTION_ITEMS_DATA:
        session.add(NeedsAttentionItem(**data))
    print(f"  → {len(NEEDS_ATTENTION_ITEMS_DATA)} needs_attention_items")

async def seed_infrastructure_cost_snapshots(session):
    for data in INFRASTRUCTURE_COST_SNAPSHOTS_DATA:
        session.add(InfrastructureCostSnapshot(**data))
    print(f"  → {len(INFRASTRUCTURE_COST_SNAPSHOTS_DATA)} infrastructure_cost_snapshots")

async def seed_infra_nodes(session):
    for data in INFRA_NODES_DATA:
        session.add(InfraNode(**data))
    print(f"  → {len(INFRA_NODES_DATA)} infra_nodes")

# ── FUNCIONES DE SEED NUEVAS (tablas sincronizadas desde MongoDB) ──────────────
async def seed_clinician_summaries(session):
    for data in CLINICIAN_SUMMARIES_DATA:
        session.add(ClinicianSummary(**data))
    print(f"  → {len(CLINICIAN_SUMMARIES_DATA)} clinician_summaries")

async def seed_patient_health_summaries(session):
    for data in PATIENT_HEALTH_DATA:
        session.add(PatientHealthSummary(**data))
    print(f"  → {len(PATIENT_HEALTH_DATA)} patient_health_summaries")

async def seed_support_tickets(session):
    for data in SUPPORT_TICKETS_DATA:
        session.add(SupportTicket(**data))
    print(f"  → {len(SUPPORT_TICKETS_DATA)} support_tickets")


async def run_seed():
    print("\n🌱 Iniciando seed de WellQ Admin...\n")

    await create_tables()

    async with AsyncSessionLocal() as session:
        from sqlalchemy import text
        await session.execute(text(
            "TRUNCATE TABLE alerts, notifications, jobs, admin_users, scheduled_changes, "
            "clinic_plans, plan_features, plans, features, clinics, "
            "kpi_snapshots, app_metrics, "
            "invoices, clinic_usage_metrics, servers, background_processes, "
            "mrr_snapshots, churn_risk_regions, app_usage_stats, feature_adoption, "
            "adherence_snapshots, cohort_retention, soap_quality_metrics, ai_cost_snapshots, "
            "ai_latency_metrics, pose_analysis_snapshots, app_versions, platform_settings, "
            "impersonate_audit_log, needs_attention_items, infrastructure_cost_snapshots, infra_nodes, "
            # ── NUEVAS TABLAS ────────────────────────────────────────────────
            "clinician_summaries, patient_health_summaries, support_tickets, "
            "force_update_config "
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
        # ── EXISTENTES (antes de este PR) ────────────────────────────────────
        await seed_impersonate_audit_log(session)
        await seed_needs_attention_items(session)
        await seed_infrastructure_cost_snapshots(session)
        await seed_infra_nodes(session)
        # ── NUEVOS (tablas sincronizadas desde MongoDB) ───────────────────────
        await seed_clinician_summaries(session)
        await seed_patient_health_summaries(session)
        await seed_support_tickets(session)

        await session.commit()

    print("\n✅ Seed completado. Todas las tablas tienen datos en Neon.\n")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run_seed())