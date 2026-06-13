"""
seed.py — Migra los datos JSON hardcodeados a PostgreSQL (Neon)
===============================================================
SEED NO DESTRUCTIVO:
Puedes ejecutar este script múltiples veces (`python seed.py`).
Creará tablas faltantes, agregará columnas nuevas e insertará la data base.
Si un registro ya existe, lo omitirá para no borrar ni alterar los datos
que hayas creado manualmente.

CLÍNICAS CHURNED:
Las clínicas con status="churned" se marcan automáticamente con
is_deleted=TRUE. Cuando elimines una clínica desde el frontend,
cambia su status a "churned" — el seed preserva ese estado.

CORRECCIONES v2:
- 14 funciones de seed corregidas: insert_ignore_duplicates → insert_if_not_exists
  para tablas con ID auto-generado (evita duplicados en cada run).
- CL-007 añadida como ejemplo de clínica churned (soft-deleted).
- text() movido a imports globales.

RBAC v3:
- Importa Role, Permission, RolePermission desde models_db.
- PERMISSIONS_DATA: catálogo fijo de 13 permisos del sistema.
- ROLES_DATA: 4 roles base (Super Admin, Billing, Tech Support, Platform Ops).
- seed_permissions / seed_roles / seed_role_permissions — todos idempotentes.
- create_tables añade role_id e invite_token a admin_users si no existen.
- run_seed llama las 3 funciones RBAC antes de seed_admin_users.
"""

import asyncio
import json
from datetime import datetime, timezone

from sqlmodel import SQLModel
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import IntegrityError
from sqlalchemy import select, text

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
    ClinicianSummary, PatientHealthSummary, SupportTicket, Responder,
    TicketCategory,
    # ── RBAC ──────────────────────────────────────────────────────────────────
    Role, Permission, RolePermission,
)

DATABASE_URL = "postgresql+asyncpg://neondb_owner:npg_bENZm4lgO6XM@ep-delicate-sunset-ac8h03br-pooler.sa-east-1.aws.neon.tech/neondb"

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


# ══════════════════════════════════════════════════════════════════════════════
# DATA DEFINITIONS
# ══════════════════════════════════════════════════════════════════════════════

CLINICS_DATA = [
    {
        "clinic_id": "CL-001", "name": "Clínica San José",
        "tier": "enterprise", "status": "active",
        "patients_used": 1500, "patients_limit": 5000,
        "health_score": 87,
        "last_login": datetime(2026, 4, 25, 14, 30, 0),
        "created_at": datetime(2026, 1, 15),
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
        "last_login": datetime(2026, 3, 20, 9, 15, 0),
        "created_at": datetime(2026, 3, 20),
        "mrr": 299.0,
        "contact_name": "María González", "contact_email": "hola@centromedico.com",
        "contact_phone": "+56922222222",
        "company_name": "Centro Médico Integral SpA", "tax_id": "76.234.567-8",
        "billing_email": "hola@centromedico.com",
        "address": "Av. Las Condes 456, Santiago",
        "internal_notes": None,
    },
    {
        "clinic_id": "CL-003", "name": "Centro Kinésico del Sur",
        "tier": "smb", "status": "active",
        "patients_used": 412, "patients_limit": 500,
        "health_score": 54,
        "last_login": datetime(2026, 5, 22, 8, 45, 0),
        "created_at": datetime(2026, 5, 22, 14, 0, 0),
        "mrr": 299.0,
        "contact_name": "Pedro Alarcón", "contact_email": "pedro@kinesur.cl",
        "contact_phone": "+56933333333",
        "company_name": "Kinésica del Sur Ltda.", "tax_id": "78.111.222-3",
        "billing_email": "facturas@kinesur.cl",
        "address": "Av. Matta 2001, Santiago",
        "internal_notes": "Posible upgrade a plan superior en 3 meses.",
    },
    {
        "clinic_id": "CL-004", "name": "Fisioclínica Norte",
        "tier": "enterprise", "status": "active",
        "patients_used": 3800, "patients_limit": 5000,
        "health_score": 91,
        "last_login": datetime(2026, 5, 22, 10, 20, 0),
        "created_at": datetime(2026, 5, 19, 12, 0, 0),
        "mrr": 1999.0,
        "contact_name": "Carolina Muñoz", "contact_email": "carolina@fisioclinicanorte.cl",
        "contact_phone": "+56944444444",
        "company_name": "Fisioclínica Norte SpA", "tax_id": "79.333.444-5",
        "billing_email": "carolina@fisioclinicanorte.cl",
        "address": "Av. Independencia 3456, Santiago",
        "internal_notes": None,
    },
    {
        "clinic_id": "CL-005", "name": "Rehab Centro",
        "tier": "trial", "status": "trial",
        "patients_used": 30, "patients_limit": 50,
        "health_score": 88,
        "last_login": datetime(2026, 5, 3, 16, 0, 0),
        "created_at": datetime(2026, 4, 10, 8, 0, 0),
        "mrr": 0.0,
        "contact_name": "Andrés Soto", "contact_email": "info@rehabcentro.cl",
        "contact_phone": "+56955555555",
        "company_name": "Rehab Centro Ltda.", "tax_id": "80.555.666-7",
        "billing_email": None,
        "address": "Calle Ejército 123, Santiago",
        "internal_notes": "Cliente en período de prueba, muy activo.",
    },
    {
        "clinic_id": "CL-006", "name": "Clínica del Deporte SpA",
        "tier": "smb", "status": "warning",
        "patients_used": 490, "patients_limit": 500,
        "health_score": 41,
        "last_login": datetime(2026, 2, 10, 12, 30, 0),
        "created_at": datetime(2026, 3, 1),
        "mrr": 299.0,
        "contact_name": "Ignacio Rojas", "contact_email": "irojas@deporte.cl",
        "contact_phone": "+56966666666",
        "company_name": "Clínica del Deporte SpA", "tax_id": "81.777.888-9",
        "billing_email": "irojas@deporte.cl",
        "address": "Av. Bilbao 987, Santiago",
        "internal_notes": "Salud financiera baja, riesgo de churn moderado.",
    },
    # ── Clínica churned: ejemplo de soft-delete desde el frontend ──────────
    {
        "clinic_id": "CL-007", "name": "Clínica del Bienestar",
        "tier": "smb", "status": "churned",
        "patients_used": 0, "patients_limit": 500,
        "health_score": 18,
        "last_login": datetime(2026, 4, 5, 10, 0, 0),
        "created_at": datetime(2026, 2, 1),
        "mrr": 0.0,
        "contact_name": "Roberto Fernández", "contact_email": "rfernandez@bienestar.cl",
        "contact_phone": "+56977777777",
        "company_name": "Clínica del Bienestar Ltda.", "tax_id": "82.999.000-1",
        "billing_email": "rfernandez@bienestar.cl",
        "address": "Av. Vicuña Mackenna 500, Santiago",
        "internal_notes": "Cliente churneado en Abril 2026 por motivos de precio. No renovó plan SMB.",
    },
]

FEATURES_DATA = [
    {"feature_id": "feat-patients",   "name": "Active Patients",      "category": "Patients & Licenses",    "unit": "patients",    "unit_type": "number", "default_limit": "500",  "description": "Maximum number of concurrent active patients",         "icon": "users"},
    {"feature_id": "feat-clinicians", "name": "Clinician Seats",      "category": "Patients & Licenses",    "unit": "seats",       "unit_type": "number", "default_limit": "5",    "description": "Number of clinician licenses included",                "icon": "users"},
    {"feature_id": "feat-tablets",    "name": "Tablet Devices",       "category": "Patients & Licenses",    "unit": "devices",     "unit_type": "number", "default_limit": "3",    "description": "Connected clinician tablet devices",                    "icon": "smartphone"},
    {"feature_id": "feat-locations",  "name": "Clinic Locations",     "category": "Patients & Licenses",    "unit": "locations",   "unit_type": "number", "default_limit": "1",    "description": "Number of physical locations under one account",       "icon": "building2"},
    {"feature_id": "feat-pose",       "name": "Pose Analysis",        "category": "AI Capabilities",        "unit": "sessions/mo", "unit_type": "number", "default_limit": "1000", "description": "AI-powered movement & pose analysis sessions",         "icon": "activity"},
    {"feature_id": "feat-soap",       "name": "SOAP Note Generation", "category": "AI Capabilities",        "unit": "notes/mo",    "unit_type": "number", "default_limit": "500",  "description": "Auto-generated clinical SOAP notes",                    "icon": "fileText"},
    {"feature_id": "feat-churn",      "name": "Churn Prediction",     "category": "AI Capabilities",        "unit": "enabled",     "unit_type": "toggle", "default_limit": "1",    "description": "AI-driven patient/clinic churn risk insights",         "icon": "trendingUp"},
    {"feature_id": "feat-video",      "name": "Video Processing",     "category": "AI Capabilities",        "unit": "minutes/mo",  "unit_type": "number", "default_limit": "600",  "description": "Cloud video session processing minutes",               "icon": "zap"},
    {"feature_id": "feat-storage",    "name": "Cloud Storage",        "category": "Storage & Data",         "unit": "GB",          "unit_type": "number", "default_limit": "100",  "description": "Patient records and media storage",                    "icon": "hardDrive"},
    {"feature_id": "feat-retention",  "name": "Data Retention",       "category": "Storage & Data",         "unit": "months",      "unit_type": "number", "default_limit": "24",   "description": "How long historical records are kept",                 "icon": "calendar"},
    {"feature_id": "feat-exports",    "name": "Data Exports",         "category": "Storage & Data",         "unit": "exports/mo",  "unit_type": "number", "default_limit": "10",   "description": "Bulk data export operations per month",                "icon": "download"},
    {"feature_id": "feat-backup",     "name": "Daily Backups",        "category": "Storage & Data",         "unit": "enabled",     "unit_type": "toggle", "default_limit": "1",    "description": "Automated encrypted daily backups",                    "icon": "database"},
    {"feature_id": "feat-support",    "name": "Support Tier",         "category": "Support & Integrations", "unit": "level",       "unit_type": "select", "default_limit": "Email","description": "Customer support response level",                      "icon": "headphones", "options": json.dumps(["Email", "Business Hours", "24/7 Priority"])},
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
    # ── CL-007: plan histórico antes de churn ─────────────────────────────
    {
        "assignment_id": "asgn-007", "clinic_id": "CL-007", "plan_id": "plan-smb",
        "plan_snapshot": json.dumps({"id": "plan-smb", "name": "SMB", "monthlyPrice": 299.0, "currency": "USD"}),
        "effective_from": datetime(2026, 2, 1), "effective_to": datetime(2026, 4, 15, 23, 59, 59),
        "reason": "Plan cancelado — cliente churneado por precio",
    },
]

SCHEDULED_CHANGES_DATA = [
    {
        "schedule_id": "sched-001", "clinic_id": "CL-001", "plan_id": "plan-enterprise",
        "effective_from": datetime(2026, 7, 1),
        "status": "scheduled", "notify_clinic": True,
    },
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
    {
        "alert_id": "ALT-005", "type": "clinic_churned",
        "title": "Clínica churneada",
        "message": "Clínica del Bienestar canceló su suscripción y fue marcada como churned.",
        "title_key": "alerts.clinic_churned.title",
        "message_key": "alerts.clinic_churned.message",
        "message_params": json.dumps({"clinic": "Clínica del Bienestar", "date": "2026-04-15"}),
        "severity": "high", "related_type": "clinic", "related_id": "CL-007",
        "created_at": datetime(2026, 4, 15, 16, 0, 0),
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
]

APP_METRICS_DATA = [
    {"metric_key": "active_now_total",             "metric_value": 42},
    {"metric_key": "active_now_web_admin",         "metric_value": 5},
    {"metric_key": "active_now_mobile_clinician",  "metric_value": 12},
    {"metric_key": "active_now_mobile_patient",    "metric_value": 25},
    {"metric_key": "downloads_total",              "metric_value": 8540},
    {"metric_key": "downloads_ios",                "metric_value": 4200},
    {"metric_key": "downloads_android",            "metric_value": 4340},
    {"metric_key": "downloads_last_24h",           "metric_value": 56},
]

INVOICES_DATA = [
    {"invoice_id": "INV-2026-001", "clinic_id": "CL-001", "amount": 1999.0, "currency": "USD", "status": "paid",    "issued_at": datetime(2026, 1, 1),  "pdf_url": "https://storage.wellq.co/inv/1.pdf"},
    {"invoice_id": "INV-2026-002", "clinic_id": "CL-001", "amount": 1999.0, "currency": "USD", "status": "paid",    "issued_at": datetime(2026, 2, 1),  "pdf_url": "https://storage.wellq.co/inv/2.pdf"},
    {"invoice_id": "INV-2026-003", "clinic_id": "CL-001", "amount": 1999.0, "currency": "USD", "status": "paid",    "issued_at": datetime(2026, 3, 1),  "pdf_url": "https://storage.wellq.co/inv/3.pdf"},
    {"invoice_id": "INV-2026-004", "clinic_id": "CL-001", "amount": 1999.0, "currency": "USD", "status": "paid",    "issued_at": datetime(2026, 4, 1),  "pdf_url": "https://storage.wellq.co/inv/4.pdf"},
    {"invoice_id": "INV-2026-005", "clinic_id": "CL-001", "amount": 1999.0, "currency": "USD", "status": "pending", "issued_at": datetime(2026, 5, 1),  "pdf_url": "https://storage.wellq.co/inv/5.pdf"},
    {"invoice_id": "INV-2026-006", "clinic_id": "CL-002", "amount": 299.0,  "currency": "USD", "status": "paid",    "issued_at": datetime(2026, 2, 1),  "pdf_url": "https://storage.wellq.co/inv/6.pdf"},
    {"invoice_id": "INV-2026-007", "clinic_id": "CL-002", "amount": 299.0,  "currency": "USD", "status": "paid",    "issued_at": datetime(2026, 3, 1),  "pdf_url": "https://storage.wellq.co/inv/7.pdf"},
    {"invoice_id": "INV-2026-008", "clinic_id": "CL-002", "amount": 299.0,  "currency": "USD", "status": "pending", "issued_at": datetime(2026, 4, 15), "pdf_url": "https://storage.wellq.co/inv/8.pdf"},
    {"invoice_id": "INV-2026-009", "clinic_id": "CL-002", "amount": 299.0,  "currency": "USD", "status": "pending", "issued_at": datetime(2026, 5, 1),  "pdf_url": "https://storage.wellq.co/inv/9.pdf"},
    {"invoice_id": "INV-2026-010", "clinic_id": "CL-003", "amount": 299.0,  "currency": "USD", "status": "overdue", "issued_at": datetime(2026, 3, 15), "pdf_url": "https://storage.wellq.co/inv/10.pdf"},
    {"invoice_id": "INV-2026-011", "clinic_id": "CL-003", "amount": 299.0,  "currency": "USD", "status": "overdue", "issued_at": datetime(2026, 4, 15), "pdf_url": "https://storage.wellq.co/inv/11.pdf"},
    {"invoice_id": "INV-2026-012", "clinic_id": "CL-003", "amount": 299.0,  "currency": "USD", "status": "pending", "issued_at": datetime(2026, 5, 15), "pdf_url": "https://storage.wellq.co/inv/12.pdf"},
    {"invoice_id": "INV-2026-013", "clinic_id": "CL-004", "amount": 1999.0, "currency": "USD", "status": "paid",    "issued_at": datetime(2026, 1, 20), "pdf_url": "https://storage.wellq.co/inv/13.pdf"},
    {"invoice_id": "INV-2026-014", "clinic_id": "CL-004", "amount": 1999.0, "currency": "USD", "status": "paid",    "issued_at": datetime(2026, 2, 20), "pdf_url": "https://storage.wellq.co/inv/14.pdf"},
    {"invoice_id": "INV-2026-015", "clinic_id": "CL-004", "amount": 1999.0, "currency": "USD", "status": "paid",    "issued_at": datetime(2026, 3, 20), "pdf_url": "https://storage.wellq.co/inv/15.pdf"},
    {"invoice_id": "INV-2026-016", "clinic_id": "CL-004", "amount": 1999.0, "currency": "USD", "status": "paid",    "issued_at": datetime(2026, 4, 20), "pdf_url": "https://storage.wellq.co/inv/16.pdf"},
    {"invoice_id": "INV-2026-017", "clinic_id": "CL-004", "amount": 1999.0, "currency": "USD", "status": "paid",    "issued_at": datetime(2026, 5, 1),  "pdf_url": "https://storage.wellq.co/inv/17.pdf"},
    {"invoice_id": "INV-2026-018", "clinic_id": "CL-006", "amount": 299.0,  "currency": "USD", "status": "overdue", "issued_at": datetime(2026, 2, 1),  "pdf_url": "https://storage.wellq.co/inv/18.pdf"},
    {"invoice_id": "INV-2026-019", "clinic_id": "CL-006", "amount": 299.0,  "currency": "USD", "status": "overdue", "issued_at": datetime(2026, 3, 1),  "pdf_url": "https://storage.wellq.co/inv/19.pdf"},
    {"invoice_id": "INV-2026-020", "clinic_id": "CL-006", "amount": 299.0,  "currency": "USD", "status": "overdue", "issued_at": datetime(2026, 4, 1),  "pdf_url": "https://storage.wellq.co/inv/20.pdf"},
    {"invoice_id": "INV-2026-021", "clinic_id": "CL-006", "amount": 299.0,  "currency": "USD", "status": "pending", "issued_at": datetime(2026, 5, 1),  "pdf_url": "https://storage.wellq.co/inv/21.pdf"},
    # ── CL-007: historial de facturas antes de churn ──────────────────────
    {"invoice_id": "INV-2026-022", "clinic_id": "CL-007", "amount": 299.0, "currency": "USD", "status": "paid",    "issued_at": datetime(2026, 2, 1), "pdf_url": "https://storage.wellq.co/inv/22.pdf"},
    {"invoice_id": "INV-2026-023", "clinic_id": "CL-007", "amount": 299.0, "currency": "USD", "status": "paid",    "issued_at": datetime(2026, 3, 1), "pdf_url": "https://storage.wellq.co/inv/23.pdf"},
    {"invoice_id": "INV-2026-024", "clinic_id": "CL-007", "amount": 299.0, "currency": "USD", "status": "overdue", "issued_at": datetime(2026, 4, 1), "pdf_url": "https://storage.wellq.co/inv/24.pdf"},
]

CLINIC_USAGE_METRICS_DATA = [
    {
        "clinic_id": "CL-001", "period": "last_30_days",
        "active_clinicians": 45, "patient_sessions_completed": 3500,
        "ai_processing_minutes": 8400, "api_calls": 125000,
        "appointments_this_month": 320, "notes_generated": 280, "exercises_assigned": 95,
    },
    {
        "clinic_id": "CL-002", "period": "last_30_days",
        "active_clinicians": 5, "patient_sessions_completed": 450,
        "ai_processing_minutes": 950, "api_calls": 12000,
        "appointments_this_month": 87, "notes_generated": 64, "exercises_assigned": 22,
    },
    {
        "clinic_id": "CL-003", "period": "last_30_days",
        "active_clinicians": 4, "patient_sessions_completed": 380,
        "ai_processing_minutes": 720, "api_calls": 9400,
        "appointments_this_month": 145, "notes_generated": 110, "exercises_assigned": 41,
    },
    {
        "clinic_id": "CL-004", "period": "last_30_days",
        "active_clinicians": 42, "patient_sessions_completed": 3200,
        "ai_processing_minutes": 7600, "api_calls": 98500,
        "appointments_this_month": 210, "notes_generated": 185, "exercises_assigned": 67,
    },
    {
        "clinic_id": "CL-005", "period": "last_30_days",
        "active_clinicians": 1, "patient_sessions_completed": 80,
        "ai_processing_minutes": 110, "api_calls": 1350,
        "appointments_this_month": 53, "notes_generated": 38, "exercises_assigned": 14,
    },
    {
        "clinic_id": "CL-006", "period": "last_30_days",
        "active_clinicians": 3, "patient_sessions_completed": 320,
        "ai_processing_minutes": 510, "api_calls": 8700,
        "appointments_this_month": 60, "notes_generated": 42, "exercises_assigned": 18,
    },
    # ── CL-007: métricas históricas (último mes activo) ───────────────────
    {
        "clinic_id": "CL-007", "period": "last_30_days",
        "active_clinicians": 0, "patient_sessions_completed": 0,
        "ai_processing_minutes": 0, "api_calls": 0,
        "appointments_this_month": 0, "notes_generated": 0, "exercises_assigned": 0,
    },
]

SERVERS_DATA = [
    {"server_id": "SRV-AZ-001", "name": "AI Processing Node 1", "region": "us-east-1", "status": "healthy",  "uptime": "99.9%",  "cpu_usage": "45%", "ram_usage": "60%"},
    {"server_id": "SRV-AZ-002", "name": "Database Primary",     "region": "sa-east-1", "status": "healthy",  "uptime": "99.99%", "cpu_usage": "65%", "ram_usage": "80%"},
    {"server_id": "SRV-AZ-003", "name": "Web App Server",       "region": "us-east-1", "status": "healthy",  "uptime": "99.95%", "cpu_usage": "30%", "ram_usage": "55%"},
    {"server_id": "SRV-AZ-004", "name": "Cache Redis",          "region": "sa-east-1", "status": "healthy",  "uptime": "100%",   "cpu_usage": "10%", "ram_usage": "25%"},
    {"server_id": "SRV-AZ-005", "name": "Queue Worker 1",       "region": "us-east-1", "status": "degraded", "uptime": "99.8%",  "cpu_usage": "78%", "ram_usage": "90%"},
]

BACKGROUND_PROCESSES_DATA = [
    {"process_id": "PROC-001", "name": "Daily Invoice Generation",    "status": "sleeping", "queued_items": 0,   "memory_consumption": "120MB"},
    {"process_id": "PROC-002", "name": "Video Pose Estimation Queue", "status": "running",  "queued_items": 15,  "memory_consumption": "1024MB"},
    {"process_id": "PROC-003", "name": "Email Scheduler",             "status": "running",  "queued_items": 120, "memory_consumption": "45MB"},
    {"process_id": "PROC-004", "name": "Health Score Calculator",     "status": "sleeping", "queued_items": 0,   "memory_consumption": "80MB"},
    {"process_id": "PROC-005", "name": "Churn Prediction Job",        "status": "running",  "queued_items": 3,   "memory_consumption": "512MB"},
]

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
]

CHURN_RISK_REGIONS_DATA = [
    {"region": "North America", "clinics_at_risk": 2, "potential_mrr_loss": 598.0,  "risk_level": "Low"},
    {"region": "LATAM",         "clinics_at_risk": 5, "potential_mrr_loss": 1495.0, "risk_level": "Medium"},
    {"region": "Europe",        "clinics_at_risk": 1, "potential_mrr_loss": 299.0,  "risk_level": "Low"},
    {"region": "Asia Pacific",  "clinics_at_risk": 3, "potential_mrr_loss": 897.0,  "risk_level": "Medium"},
]

APP_USAGE_STATS_DATA = [
    {
        "app_type": "patients", "period": "current_month",
        "monthly_active_users": 15200, "average_session_length_minutes": 8.5,
        "crash_free_sessions_percentage": 99.8, "top_screens": json.dumps(["Home", "Exercises", "Progress"]),
        "total_downloads": 892000, "active_today": 45200, "active_30d": 579000, "inactive_users": 314000,
        "ios_downloads": 456000, "android_downloads": 436000, "registered_users": 0,
    },
    {
        "app_type": "tablet", "period": "current_month",
        "monthly_active_users": 3400, "average_session_length_minutes": 45.2,
        "crash_free_sessions_percentage": 99.9, "top_screens": json.dumps(["Dashboard", "Patient Details", "Notes"]),
        "total_downloads": 4850, "active_today": 2340, "active_30d": 4210, "inactive_users": 640,
        "ios_downloads": 2900, "android_downloads": 1950, "registered_users": 0,
    },
    {
        "app_type": "web", "period": "current_month",
        "monthly_active_users": 7890, "average_session_length_minutes": 22.0,
        "crash_free_sessions_percentage": 99.7, "top_screens": json.dumps(["Dashboard", "Clinics", "Reports"]),
        "total_downloads": 0, "active_today": 1245, "active_30d": 7890, "inactive_users": 1030,
        "ios_downloads": 0, "android_downloads": 0, "registered_users": 8920,
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
        "total_notes_generated": 45000, "acceptance_rate_percentage": 92.5, "edits_required_percentage": 7.5,
        "average_time_saved_minutes_per_note": 6.2, "common_corrections": json.dumps(["Patient tone adjustment", "Adding specific ROM degrees"]),
    },
]

AI_COST_SNAPSHOTS_DATA = [
    {"period": "last_month",     "currency": "USD", "total_cost": 3200.0, "breakdown": json.dumps({"OpenAI (SOAP)": 1100, "GCP Vertex (Pose)": 2100}), "projected_eom_cost": 3800.0},
    {"period": "current_month",  "currency": "USD", "total_cost": 3450.0, "breakdown": json.dumps({"OpenAI (SOAP)": 1200, "GCP Vertex (Pose)": 2250}), "projected_eom_cost": 4200.0},
]

POSE_ANALYSIS_SNAPSHOTS_DATA = [
    {"period": "last_month",  "total_sessions_analyzed": 7800, "overall_success_rate_percentage": 97.5, "failure_reasons": json.dumps({"Poor Lighting": 50, "Subject out of frame": 45, "Unknown Error": 20})},
    {"period": "last_7_days", "total_sessions_analyzed": 8500, "overall_success_rate_percentage": 98.2, "failure_reasons": json.dumps({"Poor Lighting": 45, "Subject out of frame": 40, "Unknown Error": 15})},
]

AI_LATENCY_METRICS_DATA = [
    {"service": "soap_generation",          "period": "last_24_hours", "average_latency_ms": 1200, "p95_latency_ms": 2500, "status": "healthy"},
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

IMPERSONATE_AUDIT_LOG_DATA = [
    {
        "audit_log_id": "audit-001", "clinic_id": "CL-001", "clinic_name": "Clínica San José",
        "admin_user_id": "USR-WELLQ-001", "admin_email": "admin@wellq.com",
        "reason": "Revisar configuración de facturación por solicitud del cliente.",
        "session_token_hash": "hash123ejemplo",
        "expires_at": datetime(2026, 5, 8, 12, 0, 0), "revoked_at": None,
    },
]

NEEDS_ATTENTION_ITEMS_DATA = [
    {"item_id": "attn-001", "clinic_id": "CL-001", "clinic_name": "Clínica San José",       "issue_type": "overdue_invoice", "severity": "critical", "description": "Factura INV-2026-001 vencida hace más de 30 días.", "action_url": "/invoices/INV-2026-001"},
    {"item_id": "attn-002", "clinic_id": "CL-006", "clinic_name": "Clínica del Deporte SpA","issue_type": "low_health",      "severity": "warning",  "description": "Health Score bajó a 41. Revisar engagement y facturación.", "action_url": "/clinics/CL-006"},
    {"item_id": "attn-003", "clinic_id": "CL-005", "clinic_name": "Rehab Centro",           "issue_type": "no_login",        "severity": "info",     "description": "No ha iniciado sesión en 3 días. Posible inactividad en prueba.", "action_url": "/clinics/CL-005"},
]

INFRASTRUCTURE_COST_SNAPSHOTS_DATA = [
    {
        "period": "Marzo 2026", "period_year": 2026, "period_month": 3,
        "total_usd": 8450.0, "budget_usd": 9000.0, "budget_used_percent": 93.9,
        "breakdown": json.dumps([{"service": "Compute Engine", "cost": 3200}, {"service": "Cloud SQL", "cost": 1800}, {"service": "Cloud Storage", "cost": 450}, {"service": "AI APIs", "cost": 2200}, {"service": "Networking", "cost": 800}]),
    },
    {
        "period": "Abril 2026", "period_year": 2026, "period_month": 4,
        "total_usd": 9120.0, "budget_usd": 9000.0, "budget_used_percent": 101.3,
        "breakdown": json.dumps([{"service": "Compute Engine", "cost": 3500}, {"service": "Cloud SQL", "cost": 1900}, {"service": "Cloud Storage", "cost": 520}, {"service": "AI APIs", "cost": 2400}, {"service": "Networking", "cost": 800}]),
    },
]

INFRA_NODES_DATA = [
    {"node_id": "node-api-us-east", "name": "API Gateway US East", "type": "api",      "status": "healthy",  "region": "us-east-1", "metrics": json.dumps({"requests_per_sec": 340, "latency_p95": 120})},
    {"node_id": "node-worker-pose", "name": "Pose Worker",         "type": "worker",   "status": "healthy",  "region": "us-east-1", "metrics": json.dumps({"queue_depth": 15, "processed_last_hour": 200})},
    {"node_id": "node-db-primary",  "name": "Database Primary",    "type": "database", "status": "healthy",  "region": "sa-east-1", "metrics": json.dumps({"connections": 45, "slow_queries": 2})},
    {"node_id": "node-cache-01",    "name": "Redis Cache",         "type": "cache",    "status": "healthy",  "region": "us-east-1", "metrics": json.dumps({"hit_rate": 0.92, "memory_used_mb": 256})},
    {"node_id": "node-queue-01",    "name": "Bull Queue Worker",   "type": "queue",    "status": "degraded", "region": "us-east-1", "metrics": json.dumps({"queue_depth": 340, "failures_last_hour": 5})},
]

CLINICIAN_SUMMARIES_DATA = [
    {"clinic_id": "CL-001", "total_clinicians": 12, "active_clinicians": 10, "specialties": json.dumps(["Kinesiología", "Traumatología", "Rehabilitación Física"]),           "recorded_at": datetime(2026, 5, 15, 3, 0, 0)},
    {"clinic_id": "CL-002", "total_clinicians": 5,  "active_clinicians": 4,  "specialties": json.dumps(["Kinesiología", "Neurología"]),                                       "recorded_at": datetime(2026, 5, 15, 3, 0, 0)},
    {"clinic_id": "CL-003", "total_clinicians": 6,  "active_clinicians": 4,  "specialties": json.dumps(["Kinesiología", "Medicina del Deporte"]),                             "recorded_at": datetime(2026, 5, 15, 3, 0, 0)},
    {"clinic_id": "CL-004", "total_clinicians": 48, "active_clinicians": 42, "specialties": json.dumps(["Kinesiología", "Traumatología", "Reumatología", "Rehabilitación Física", "Neurología"]), "recorded_at": datetime(2026, 5, 15, 3, 0, 0)},
    {"clinic_id": "CL-005", "total_clinicians": 2,  "active_clinicians": 1,  "specialties": json.dumps(["Kinesiología"]),                                                     "recorded_at": datetime(2026, 5, 15, 3, 0, 0)},
    {"clinic_id": "CL-006", "total_clinicians": 4,  "active_clinicians": 3,  "specialties": json.dumps(["Kinesiología", "Medicina del Deporte"]),                             "recorded_at": datetime(2026, 5, 15, 3, 0, 0)},
    # ── CL-007: datos al momento del churn ───────────────────────────────
    {"clinic_id": "CL-007", "total_clinicians": 3,  "active_clinicians": 0,  "specialties": json.dumps(["Kinesiología"]),                                                     "recorded_at": datetime(2026, 4, 15, 3, 0, 0)},
]

PATIENT_HEALTH_DATA = [
    {"clinic_id": "CL-001", "total_patients": 1500, "at_risk": 120, "declining": 180, "stable": 850,  "improving": 350, "recorded_at": datetime(2026, 5, 15, 3, 0, 0)},
    {"clinic_id": "CL-002", "total_patients": 340,  "at_risk": 45,  "declining": 60,  "stable": 180,  "improving": 55,  "recorded_at": datetime(2026, 5, 15, 3, 0, 0)},
    {"clinic_id": "CL-003", "total_patients": 412,  "at_risk": 58,  "declining": 74,  "stable": 210,  "improving": 70,  "recorded_at": datetime(2026, 5, 15, 3, 0, 0)},
    {"clinic_id": "CL-004", "total_patients": 3800, "at_risk": 280, "declining": 420, "stable": 2200, "improving": 900, "recorded_at": datetime(2026, 5, 15, 3, 0, 0)},
    {"clinic_id": "CL-005", "total_patients": 30,   "at_risk": 2,   "declining": 3,   "stable": 18,   "improving": 7,   "recorded_at": datetime(2026, 5, 15, 3, 0, 0)},
    {"clinic_id": "CL-006", "total_patients": 490,  "at_risk": 95,  "declining": 120, "stable": 220,  "improving": 55,  "recorded_at": datetime(2026, 5, 15, 3, 0, 0)},
    # ── CL-007: datos históricos al momento del churn ────────────────────
    {"clinic_id": "CL-007", "total_patients": 85,   "at_risk": 85,  "declining": 0,   "stable": 0,    "improving": 0,   "recorded_at": datetime(2026, 4, 15, 3, 0, 0)},
]

RESPONDERS_DATA = [
    {
        "responder_id": "RESP-001",
        "name": "WellQ Admin",
        "team": "General",
        "username": "admin@wellq.co",
        "password": "seed-password-hash-placeholder",
    },
]

SUPPORT_TICKETS_DATA = [
    {
        "ticket_id": "TK-001", "clinic_id": "CL-001", "title": "Error al cargar historial de ejercicios",
        "description": "Algunos pacientes reportan que la pantalla de historial queda en blanco al cargar.",
        "status": "Open", "category": "Bug", "reporter_name": "Juan Pérez", "reporter_email": "admin@clinicasanjose.com",
        "responder_id": "RESP-001", "responder_name": "WellQ Admin",
        "reported_at": datetime(2026, 5, 10, 9, 30, 0), "closed_at": None, "solution": None, "recorded_at": datetime(2026, 5, 15, 3, 0, 0),
    },
    {
        "ticket_id": "TK-002", "clinic_id": "CL-002", "title": "Cobro duplicado en factura de abril",
        "description": "La factura de abril aparece cobrada dos veces en el estado de cuenta.",
        "status": "Closed", "category": "Billing", "reporter_name": "María González", "reporter_email": "hola@centromedico.com",
        "responder_id": "RESP-001", "responder_name": "WellQ Admin",
        "reported_at": datetime(2026, 4, 20, 11, 0, 0), "closed_at": datetime(2026, 4, 22, 15, 0, 0),
        "solution": "Se emitió nota de crédito y se ajustó la factura. Reembolso procesado.", "recorded_at": datetime(2026, 5, 15, 3, 0, 0),
    },
    {
        "ticket_id": "TK-003", "clinic_id": "CL-003", "title": "Solicitud: exportar reportes en formato Excel",
        "description": "Necesitamos poder exportar los reportes de adherencia en .xlsx además de PDF.",
        "status": "Open", "category": "Feature", "reporter_name": "Pedro Alarcón", "reporter_email": "pedro@kinesur.cl",
        "responder_id": None, "responder_name": None,
        "reported_at": datetime(2026, 5, 8, 14, 0, 0), "closed_at": None, "solution": None, "recorded_at": datetime(2026, 5, 15, 3, 0, 0),
    },
    {
        "ticket_id": "TK-004", "clinic_id": "CL-001", "title": "Solicitud de aumento de límite de pacientes",
        "description": "Estamos llegando al 95% del límite. Necesitamos ampliar a 6000 pacientes.",
        "status": "Sent", "category": "Request", "reporter_name": "Juan Pérez", "reporter_email": "admin@clinicasanjose.com",
        "responder_id": "RESP-001", "responder_name": "WellQ Admin",
        "reported_at": datetime(2026, 5, 12, 10, 0, 0), "closed_at": None, "solution": None, "recorded_at": datetime(2026, 5, 15, 3, 0, 0),
    },
    {
        "ticket_id": "TK-005", "clinic_id": "CL-004", "title": "Falla en sincronización con TM3",
        "description": "Las citas del día no se están sincronizando correctamente desde TM3.",
        "status": "Closed", "category": "Bug", "reporter_name": "Carolina Muñoz", "reporter_email": "carolina@fisioclinicanorte.cl",
        "responder_id": "RESP-001", "responder_name": "WellQ Admin",
        "reported_at": datetime(2026, 5, 5, 8, 0, 0), "closed_at": datetime(2026, 5, 6, 12, 0, 0),
        "solution": "Se reconfiguró el webhook de TM3 y se forzó re-sync manual. Estable desde entonces.", "recorded_at": datetime(2026, 5, 15, 3, 0, 0),
    },
    {
        "ticket_id": "TK-006", "clinic_id": "CL-006", "title": "No puedo acceder al módulo de reportes",
        "description": "Al intentar abrir la sección de reportes aparece error 403.",
        "status": "Open", "category": "Bug", "reporter_name": "Ignacio Rojas", "reporter_email": "irojas@deporte.cl",
        "responder_id": "RESP-001", "responder_name": "WellQ Admin",
        "reported_at": datetime(2026, 5, 14, 16, 30, 0), "closed_at": None, "solution": None, "recorded_at": datetime(2026, 5, 15, 3, 0, 0),
    },
]

TICKET_CATEGORIES_DATA = [
    {"category_id": "cat-001", "name": "Bug",     "team": "Técnico",    "emails": '[\"soporte@wellq.co\"]',  "is_active": True},
    {"category_id": "cat-002", "name": "Billing", "team": "Financiero", "emails": '[\"pagos@wellq.co\"]',    "is_active": True},
    {"category_id": "cat-003", "name": "Feature", "team": "Técnico",    "emails": '[\"producto@wellq.co\"]', "is_active": True},
    {"category_id": "cat-004", "name": "Request", "team": "General",    "emails": '[\"contacto@wellq.co\"]', "is_active": True},
]


# ══════════════════════════════════════════════════════════════════════════════
# DATA DEFINITIONS — RBAC
# ══════════════════════════════════════════════════════════════════════════════
#
# NOTA sobre separación de conceptos:
# - PERMISSIONS_DATA / ROLES_DATA → controlan acceso de usuarios INTERNOS de WellQ
#   al Admin Console (quién puede ver Financials, quién puede gestionar Clinics, etc.)
# - TICKET_CATEGORIES_DATA → clasifican los tickets que envían las CLÍNICAS al soporte
# - Responder.team ("Técnico", "Financiero") → equipo que atiende cada categoría de ticket

PERMISSIONS_DATA = [
    {"key": "overview.view",  "label": "View Overview",          "module": "Overview"},
    {"key": "clinics.view",   "label": "View Clinics",           "module": "Clinic Management"},
    {"key": "clinics.edit",   "label": "Manage Clinics",         "module": "Clinic Management"},
    {"key": "plans.view",     "label": "View Plans & Pricing",   "module": "Plans & Pricing"},
    {"key": "plans.manage",   "label": "Manage Plans & Pricing", "module": "Plans & Pricing"},
    {"key": "billing.view",   "label": "View Financials",        "module": "Financials"},
    {"key": "billing.edit",   "label": "Manage Financials",      "module": "Financials"},
    {"key": "platform.view",  "label": "View Platform Ops",      "module": "Platform Ops"},
    {"key": "platform.manage","label": "Manage Platform Ops",    "module": "Platform Ops"},
    {"key": "analytics.view", "label": "View Product Analytics", "module": "Product Analytics"},
    {"key": "tickets.view",   "label": "View Support Tickets",   "module": "Support"},
    {"key": "tickets.manage", "label": "Manage Support Tickets", "module": "Support"},

    # 🔥 AQUI ESTÁN LOS DE SETTINGS SEPARADOS
    {"key": "settings.view",  "label": "View General Settings",  "module": "Settings"}, # <-- Para el idioma y temas
    {"key": "settings.manage","label": "Manage Settings",         "module": "Settings"}, # <-- Para API Keys y Team Manager
    {"key": "users.manage",   "label": "Manage Users",           "module": "Settings"}, # <-- Para Team Manager
    {"key": "roles.manage",   "label": "Manage Roles",           "module": "Settings"}, # <-- Para Team Manager
]

ROLES_DATA = [
    {"name": "Super Administrator",     "description": "Full access to the entire platform"},
    {"name": "Finance Specialist",      "description": "Access to financial modules and billing support tickets"},
    {"name": "Technical Support Agent", "description": "Access to platform operations and technical support tickets"},
    {"name": "Operations Analyst",      "description": "Access to platform operations, product analytics, and support tickets"},
]

# Mapeo de permisos por rol (se usa en seed_role_permissions)
ROLE_PERMISSIONS_MAP = {
    "Super Administrator": [
        "settings.view", "settings.manage",
        "overview.view", "clinics.view", "clinics.edit",
        "billing.view", "billing.edit",
        "platform.view", "platform.manage",
        "analytics.view",
        "tickets.view", "tickets.manage",
        "plans.view", "plans.manage",
        "users.manage", "roles.manage",
    ],
    # 🔥 Fíjate cómo TODOS los roles empiezan ahora con "settings.view"
    "Finance Specialist":      ["settings.view", "overview.view", "billing.view", "billing.edit", "tickets.view"],
    "Technical Support Agent": ["settings.view", "platform.view", "tickets.view", "tickets.manage"],
    "Operations Analyst":      ["settings.view", "overview.view", "platform.view", "platform.manage", "analytics.view", "tickets.view"],
}


# ══════════════════════════════════════════════════════════════════════════════
# SETUP DE TABLAS
# ══════════════════════════════════════════════════════════════════════════════

async def create_tables():
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)

        await conn.execute(text("ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS password_hash varchar DEFAULT NULL"))
        await conn.execute(text("ALTER TABLE app_usage_stats ADD COLUMN IF NOT EXISTS total_downloads integer DEFAULT 0"))
        await conn.execute(text("ALTER TABLE app_usage_stats ADD COLUMN IF NOT EXISTS active_today integer DEFAULT 0"))
        await conn.execute(text("ALTER TABLE app_usage_stats ADD COLUMN IF NOT EXISTS active_30d integer DEFAULT 0"))
        await conn.execute(text("ALTER TABLE app_usage_stats ADD COLUMN IF NOT EXISTS inactive_users integer DEFAULT 0"))
        await conn.execute(text("ALTER TABLE app_usage_stats ADD COLUMN IF NOT EXISTS ios_downloads integer DEFAULT 0"))
        await conn.execute(text("ALTER TABLE app_usage_stats ADD COLUMN IF NOT EXISTS android_downloads integer DEFAULT 0"))
        await conn.execute(text("ALTER TABLE app_usage_stats ADD COLUMN IF NOT EXISTS registered_users integer DEFAULT 0"))

        # ── Soft delete para clínicas churned ────────────────────────────
        await conn.execute(text("ALTER TABLE clinics ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT FALSE"))
        await conn.execute(text("ALTER TABLE clinics ADD COLUMN IF NOT EXISTS deleted_at timestamp DEFAULT NULL"))

        await conn.execute(text("ALTER TABLE clinic_usage_metrics ADD COLUMN IF NOT EXISTS appointments_this_month integer DEFAULT 0"))
        await conn.execute(text("ALTER TABLE clinic_usage_metrics ADD COLUMN IF NOT EXISTS notes_generated integer DEFAULT 0"))
        await conn.execute(text("ALTER TABLE clinic_usage_metrics ADD COLUMN IF NOT EXISTS exercises_assigned integer DEFAULT 0"))
        await conn.execute(text("ALTER TABLE alerts ADD COLUMN IF NOT EXISTS title_key varchar DEFAULT NULL"))
        await conn.execute(text("ALTER TABLE alerts ADD COLUMN IF NOT EXISTS message_key varchar DEFAULT NULL"))
        await conn.execute(text("ALTER TABLE alerts ADD COLUMN IF NOT EXISTS message_params text DEFAULT NULL"))
        await conn.execute(text("ALTER TABLE kpi_snapshots ADD COLUMN IF NOT EXISTS period varchar DEFAULT NULL"))
        await conn.execute(text("ALTER TABLE kpi_snapshots ADD COLUMN IF NOT EXISTS total_patients integer DEFAULT 0"))
        await conn.execute(text("ALTER TABLE kpi_snapshots ADD COLUMN IF NOT EXISTS patients_delta integer DEFAULT 0"))
        await conn.execute(text("ALTER TABLE kpi_snapshots ADD COLUMN IF NOT EXISTS active_clinics integer DEFAULT 0"))
        await conn.execute(text("ALTER TABLE kpi_snapshots ADD COLUMN IF NOT EXISTS clinics_delta integer DEFAULT 0"))
        await conn.execute(text("ALTER TABLE kpi_snapshots ADD COLUMN IF NOT EXISTS in_treatment integer DEFAULT 0"))

        await conn.execute(text("ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS responder_id varchar DEFAULT NULL"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_support_tickets_responder_id ON support_tickets (responder_id)"))
        await conn.execute(text("ALTER TABLE responders ADD COLUMN IF NOT EXISTS email varchar DEFAULT NULL"))

        await conn.execute(text("""
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns WHERE table_name = 'responders' AND column_name = 'group'
                ) AND NOT EXISTS (
                    SELECT 1 FROM information_schema.columns WHERE table_name = 'responders' AND column_name = 'team'
                ) THEN
                    ALTER TABLE responders RENAME COLUMN "group" TO team;
                END IF;
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns WHERE table_name = 'responders' AND column_name = 'user'
                ) AND NOT EXISTS (
                    SELECT 1 FROM information_schema.columns WHERE table_name = 'responders' AND column_name = 'username'
                ) THEN
                    ALTER TABLE responders RENAME COLUMN "user" TO username;
                END IF;
            END $$;
        """))

        # ── RBAC: nuevas columnas en admin_users ──────────────────────────────
        # role_id: FK nullable a roles.id — si NULL y role="super_admin" → acceso total
        # invite_token: token de activación para el flujo de invitación por email
        await conn.execute(text("ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS role_id integer DEFAULT NULL"))
        await conn.execute(text("ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS invite_token varchar DEFAULT NULL"))

    print("✅ Tablas verificadas y actualizadas de forma segura en Neon")


# ══════════════════════════════════════════════════════════════════════════════
# HELPERS DE INSERCIÓN
# ══════════════════════════════════════════════════════════════════════════════

async def insert_ignore_duplicates(session, model_class, data_list):
    """Para tablas con ID explícito en el dict (PK string como clinic_id, plan_id...)."""
    inserted = 0
    for data in data_list:
        session.add(model_class(**data))
        try:
            await session.commit()
            inserted += 1
        except IntegrityError:
            await session.rollback()
    return inserted


async def insert_if_not_exists(session, model_class, data_list, unique_keys):
    """Para tablas con ID auto-generado. Hace SELECT antes de insertar."""
    inserted = 0
    for data in data_list:
        conditions = [getattr(model_class, key) == data[key] for key in unique_keys]
        result = await session.execute(select(model_class).where(*conditions))
        if result.first() is None:
            session.add(model_class(**data))
            try:
                await session.commit()
                inserted += 1
            except IntegrityError:
                await session.rollback()
    return inserted


# ══════════════════════════════════════════════════════════════════════════════
# FUNCIONES DE SEED
# ══════════════════════════════════════════════════════════════════════════════

async def seed_clinics(session):
    count = await insert_ignore_duplicates(session, Clinic, CLINICS_DATA)
    # Sincronizar soft-delete: clínicas churned → is_deleted=TRUE
    await session.execute(text("""
        UPDATE clinics
        SET is_deleted = TRUE,
            deleted_at = COALESCE(deleted_at, NOW())
        WHERE status = 'churned'
          AND (is_deleted IS DISTINCT FROM TRUE)
    """))
    await session.commit()
    print(f"  → {count}/{len(CLINICS_DATA)} clínicas agregadas (incluyendo churned)")

async def seed_features(session):
    count = await insert_ignore_duplicates(session, Feature, FEATURES_DATA)
    print(f"  → {count}/{len(FEATURES_DATA)} features agregados")

async def seed_plans(session):
    count = await insert_ignore_duplicates(session, Plan, PLANS_DATA)
    print(f"  → {count}/{len(PLANS_DATA)} planes agregados")

async def seed_plan_features(session):
    flat = [
        {"plan_id": plan_id, "feature_id": feature_id, "limit_value": limit}
        for plan_id, features in PLAN_FEATURES_DATA.items()
        for feature_id, limit in features
    ]
    count = await insert_if_not_exists(session, PlanFeature, flat, ["plan_id", "feature_id"])
    print(f"  → {count}/{len(flat)} plan_features agregados")

async def seed_clinic_plans(session):
    count = await insert_ignore_duplicates(session, ClinicPlan, CLINIC_PLANS_DATA)
    print(f"  → {count}/{len(CLINIC_PLANS_DATA)} asignaciones agregadas")

async def seed_scheduled_changes(session):
    count = await insert_ignore_duplicates(session, ScheduledChange, SCHEDULED_CHANGES_DATA)
    print(f"  → {count}/{len(SCHEDULED_CHANGES_DATA)} cambios programados")

async def seed_alerts(session):
    count = await insert_ignore_duplicates(session, Alert, ALERTS_DATA)
    print(f"  → {count}/{len(ALERTS_DATA)} alertas agregadas")

async def seed_notifications(session):
    count = await insert_ignore_duplicates(session, Notification, NOTIFICATIONS_DATA)
    print(f"  → {count}/{len(NOTIFICATIONS_DATA)} notificaciones")

async def seed_jobs(session):
    count = await insert_ignore_duplicates(session, Job, JOBS_DATA)
    print(f"  → {count}/{len(JOBS_DATA)} jobs")

async def seed_admin_users(session):
    count = await insert_ignore_duplicates(session, AdminUser, ADMIN_USERS_DATA)
    print(f"  → {count}/{len(ADMIN_USERS_DATA)} usuarios admin")

async def seed_kpi_snapshots(session):
    count = await insert_if_not_exists(session, KpiSnapshot, KPI_SNAPSHOTS_DATA, ["month", "year"])
    print(f"  → {count}/{len(KPI_SNAPSHOTS_DATA)} kpi_snapshots")

async def seed_app_metrics(session):
    count = await insert_if_not_exists(session, AppMetric, APP_METRICS_DATA, ["metric_key"])
    print(f"  → {count}/{len(APP_METRICS_DATA)} app_metrics")

async def seed_invoices(session):
    count = await insert_ignore_duplicates(session, Invoice, INVOICES_DATA)
    print(f"  → {count}/{len(INVOICES_DATA)} invoices")

async def seed_clinic_usage_metrics(session):
    count = await insert_if_not_exists(session, ClinicUsageMetric, CLINIC_USAGE_METRICS_DATA, ["clinic_id", "period"])
    print(f"  → {count}/{len(CLINIC_USAGE_METRICS_DATA)} clinic_usage_metrics")

async def seed_servers(session):
    count = await insert_ignore_duplicates(session, Server, SERVERS_DATA)
    print(f"  → {count}/{len(SERVERS_DATA)} servers")

async def seed_background_processes(session):
    count = await insert_ignore_duplicates(session, BackgroundProcess, BACKGROUND_PROCESSES_DATA)
    print(f"  → {count}/{len(BACKGROUND_PROCESSES_DATA)} background_processes")

# ── CORREGIDAS: insert_if_not_exists para tablas con ID auto-generado ────────

async def seed_mrr_snapshots(session):
    count = await insert_if_not_exists(session, MrrSnapshot, MRR_SNAPSHOTS_DATA, ["period_month", "period_year"])
    print(f"  → {count}/{len(MRR_SNAPSHOTS_DATA)} mrr_snapshots")

async def seed_churn_risk_regions(session):
    count = await insert_if_not_exists(session, ChurnRiskRegion, CHURN_RISK_REGIONS_DATA, ["region"])
    print(f"  → {count}/{len(CHURN_RISK_REGIONS_DATA)} churn_risk_regions")

async def seed_app_usage_stats(session):
    count = await insert_if_not_exists(session, AppUsageStat, APP_USAGE_STATS_DATA, ["app_type", "period"])
    print(f"  → {count}/{len(APP_USAGE_STATS_DATA)} app_usage_stats")

async def seed_feature_adoption(session):
    count = await insert_if_not_exists(session, FeatureAdoption, FEATURE_ADOPTION_DATA, ["feature_name", "period"])
    print(f"  → {count}/{len(FEATURE_ADOPTION_DATA)} feature_adoption")

async def seed_adherence_snapshots(session):
    count = await insert_if_not_exists(session, AdherenceSnapshot, ADHERENCE_SNAPSHOTS_DATA, ["period"])
    print(f"  → {count}/{len(ADHERENCE_SNAPSHOTS_DATA)} adherence_snapshots")

async def seed_cohort_retention(session):
    count = await insert_if_not_exists(session, CohortRetention, COHORT_RETENTION_DATA, ["cohort_month", "cohort_year"])
    print(f"  → {count}/{len(COHORT_RETENTION_DATA)} cohort_retention")

async def seed_soap_quality_metrics(session):
    count = await insert_if_not_exists(session, SoapQualityMetric, SOAP_QUALITY_METRICS_DATA, ["period"])
    print(f"  → {count}/{len(SOAP_QUALITY_METRICS_DATA)} soap_quality_metrics")

async def seed_ai_cost_snapshots(session):
    count = await insert_if_not_exists(session, AiCostSnapshot, AI_COST_SNAPSHOTS_DATA, ["period"])
    print(f"  → {count}/{len(AI_COST_SNAPSHOTS_DATA)} ai_cost_snapshots")

async def seed_ai_latency_metrics(session):
    count = await insert_if_not_exists(session, AiLatencyMetric, AI_LATENCY_METRICS_DATA, ["service", "period"])
    print(f"  → {count}/{len(AI_LATENCY_METRICS_DATA)} ai_latency_metrics")

async def seed_pose_analysis_snapshots(session):
    count = await insert_if_not_exists(session, PoseAnalysisSnapshot, POSE_ANALYSIS_SNAPSHOTS_DATA, ["period"])
    print(f"  → {count}/{len(POSE_ANALYSIS_SNAPSHOTS_DATA)} pose_analysis_snapshots")

async def seed_app_versions(session):
    count = await insert_if_not_exists(session, AppVersion, APP_VERSIONS_DATA, ["app_type", "version"])
    print(f"  → {count}/{len(APP_VERSIONS_DATA)} app_versions")

async def seed_infrastructure_cost_snapshots(session):
    count = await insert_if_not_exists(session, InfrastructureCostSnapshot, INFRASTRUCTURE_COST_SNAPSHOTS_DATA, ["period_month", "period_year"])
    print(f"  → {count}/{len(INFRASTRUCTURE_COST_SNAPSHOTS_DATA)} infrastructure_cost_snapshots")

async def seed_clinician_summaries(session):
    count = await insert_if_not_exists(session, ClinicianSummary, CLINICIAN_SUMMARIES_DATA, ["clinic_id"])
    print(f"  → {count}/{len(CLINICIAN_SUMMARIES_DATA)} clinician_summaries")

async def seed_patient_health_summaries(session):
    count = await insert_if_not_exists(session, PatientHealthSummary, PATIENT_HEALTH_DATA, ["clinic_id"])
    print(f"  → {count}/{len(PATIENT_HEALTH_DATA)} patient_health_summaries")

# ── Sin cambios ──────────────────────────────────────────────────────────────

async def seed_platform_settings(session):
    count = await insert_ignore_duplicates(session, PlatformSetting, PLATFORM_SETTINGS_DATA)
    print(f"  → {count}/{len(PLATFORM_SETTINGS_DATA)} platform_settings")

async def seed_impersonate_audit_log(session):
    count = await insert_ignore_duplicates(session, ImpersonateAuditLog, IMPERSONATE_AUDIT_LOG_DATA)
    print(f"  → {count}/{len(IMPERSONATE_AUDIT_LOG_DATA)} impersonate_audit_log")

async def seed_needs_attention_items(session):
    count = await insert_ignore_duplicates(session, NeedsAttentionItem, NEEDS_ATTENTION_ITEMS_DATA)
    print(f"  → {count}/{len(NEEDS_ATTENTION_ITEMS_DATA)} needs_attention_items")

async def seed_infra_nodes(session):
    count = await insert_ignore_duplicates(session, InfraNode, INFRA_NODES_DATA)
    print(f"  → {count}/{len(INFRA_NODES_DATA)} infra_nodes")

async def seed_responders(session):
    count = await insert_ignore_duplicates(session, Responder, RESPONDERS_DATA)
    print(f"  → {count}/{len(RESPONDERS_DATA)} responders")

async def seed_support_tickets(session):
    count = await insert_ignore_duplicates(session, SupportTicket, SUPPORT_TICKETS_DATA)
    print(f"  → {count}/{len(SUPPORT_TICKETS_DATA)} support_tickets")

async def seed_ticket_categories(session):
    count = await insert_ignore_duplicates(session, TicketCategory, TICKET_CATEGORIES_DATA)
    print(f"  → {count}/{len(TICKET_CATEGORIES_DATA)} categorías agregadas")


# ══════════════════════════════════════════════════════════════════════════════
# FUNCIONES DE SEED — RBAC
# Se llaman ANTES de seed_admin_users porque admin_users referenciará role_id.
# ══════════════════════════════════════════════════════════════════════════════

async def seed_permissions(session):
    """
    Seedea el catálogo fijo de 13 permisos del sistema.
    Usa insert_if_not_exists con key ["key"] para ser idempotente.
    """
    count = await insert_if_not_exists(session, Permission, PERMISSIONS_DATA, ["key"])
    print(f"  → {count}/{len(PERMISSIONS_DATA)} permissions seededados")


async def seed_roles(session):
    """
    Seedea los 4 roles base del sistema.
    Usa insert_if_not_exists con key ["name"] para ser idempotente.
    """
    count = await insert_if_not_exists(session, Role, ROLES_DATA, ["name"])
    print(f"  → {count}/{len(ROLES_DATA)} roles seededados")


async def remove_viewer_role(session):
    """
    Elimina el rol Viewer si quedo creado por un seed anterior.
    Limpia primero asignaciones y permisos para evitar restricciones FK.
    """
    await session.execute(text("""
        UPDATE admin_users
        SET role_id = NULL
        WHERE role_id IN (SELECT id FROM roles WHERE name = 'Viewer')
    """))
    await session.execute(text("""
        DELETE FROM role_permissions
        WHERE role_id IN (SELECT id FROM roles WHERE name = 'Viewer')
    """))
    result = await session.execute(text("DELETE FROM roles WHERE name = 'Viewer'"))
    await session.commit()
    deleted = result.rowcount or 0
    print(f"  → Viewer roles eliminados: {deleted}")


async def seed_role_permissions(session):
    """
    Asigna permisos a cada uno de los 4 roles base.

    Estrategia:
    - Para cada (role_name, perm_key) en ROLE_PERMISSIONS_MAP, hace un INSERT
      usando un SELECT de JOIN para resolver los IDs sin hardcodearlos.
    - ON CONFLICT DO NOTHING garantiza idempotencia — se puede correr múltiples veces.
    - Una sola llamada a session.commit() al final para eficiencia.
    """
    total = 0
    for role_name, perm_keys in ROLE_PERMISSIONS_MAP.items():
        for perm_key in perm_keys:
            await session.execute(text("""
                INSERT INTO role_permissions (role_id, permission_id)
                SELECT r.id, p.id
                FROM roles r
                CROSS JOIN permissions p
                WHERE r.name = :role_name
                  AND p.key  = :perm_key
                ON CONFLICT DO NOTHING
            """), {"role_name": role_name, "perm_key": perm_key})
            total += 1

    await session.commit()
    print(f"  → role_permissions seededadas ({total} asignaciones intentadas, duplicados ignorados)")


# ══════════════════════════════════════════════════════════════════════════════
# RUNNER
# ══════════════════════════════════════════════════════════════════════════════

async def run_seed():
    print("\n🌱 Iniciando seed NO DESTRUCTIVO de WellQ Admin...\n")

    await create_tables()

    async with AsyncSessionLocal() as session:
        print("\n📥 Insertando datos (se omiten duplicados):")
        await seed_clinics(session)
        await seed_features(session)
        await seed_plans(session)
        await seed_plan_features(session)
        await seed_clinic_plans(session)
        await seed_scheduled_changes(session)
        await seed_alerts(session)
        await seed_notifications(session)
        await seed_jobs(session)
        # ── RBAC: primero permisos y roles, luego sus asignaciones ────────────
        # Se ejecutan ANTES de seed_admin_users para que role_id pueda
        # referenciar un rol existente si se asigna manualmente luego.
        await seed_permissions(session)
        await remove_viewer_role(session)
        await seed_roles(session)
        await seed_role_permissions(session)
        # ── Admin users (pueden tener role_id asignado en futuras migraciones) ─
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
        await seed_impersonate_audit_log(session)
        await seed_needs_attention_items(session)
        await seed_infrastructure_cost_snapshots(session)
        await seed_infra_nodes(session)
        await seed_clinician_summaries(session)
        await seed_patient_health_summaries(session)
        await seed_responders(session)
        await seed_support_tickets(session)
        await seed_ticket_categories(session)

    print("\n✅ Seed completado de forma segura.\n")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run_seed())
