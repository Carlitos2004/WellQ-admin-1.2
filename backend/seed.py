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

# ── Importar modelos ───────────────────────────────────────────────────────────
# Ajusta el path si seed.py está dentro de app/
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from app.models_db import (
    Clinic, Feature, Plan, PlanFeature,
    ClinicPlan, ScheduledChange, Alert,
    Notification, Job, AdminUser
)

DATABASE_URL = "postgresql+asyncpg://neondb_owner:npg_bENZm4lgO6XM@ep-delicate-sunset-ac8h03br-pooler.sa-east-1.aws.neon.tech/neondb"

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


# ══════════════════════════════════════════════════════════════════════════════
# DATOS — extraídos exactamente de los routers actuales
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

# Features por plan: {plan_id: [(feature_id, limit)]}
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
        "effective_from": datetime(2026, 1, 15),
        "effective_to": None,
        "reason": "Upgrade inicial al plan Enterprise",
    },
    {
        "assignment_id": "asgn-000", "clinic_id": "CL-001", "plan_id": "plan-smb",
        "plan_snapshot": json.dumps({"id": "plan-smb", "name": "SMB", "monthlyPrice": 299.0, "currency": "USD"}),
        "effective_from": datetime(2025, 5, 1),
        "effective_to": datetime(2026, 1, 14, 23, 59, 59),
        "reason": "Onboarding inicial",
    },
    {
        "assignment_id": "asgn-002", "clinic_id": "CL-002", "plan_id": "plan-smb",
        "plan_snapshot": json.dumps({"id": "plan-smb", "name": "SMB", "monthlyPrice": 299.0, "currency": "USD"}),
        "effective_from": datetime(2026, 2, 1),
        "effective_to": None,
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
        "channel": "email", "status": "sent",
        "recipient_clinic_id": "clinic-12345",
        "sent_by": "super-admin-usr", "sender_name": "Super Admin",
        "sent_at": datetime(2026, 4, 20, 10, 0, 0),
    },
    {
        "notification_id": "notif-002", "title": "Mantenimiento Programado",
        "message": "El motor de análisis de posturas estará inactivo a las 03:00 AM.",
        "channel": "in_app", "status": "pending",
        "recipient_clinic_id": "all",
        "sent_by": "system-ops", "sender_name": "System Ops",
    },
]

JOBS_DATA = [
    {
        "job_id": "job-8d72-4f1a-b3c9", "job_type": "export_clinics",
        "status": "completed", "progress": 100,
        "created_by": "super-admin-usr",
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


# ══════════════════════════════════════════════════════════════════════════════
# FUNCIONES DE SEED
# ══════════════════════════════════════════════════════════════════════════════

async def create_tables():
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    print("✅ Tablas creadas/verificadas en Neon")


async def seed_clinics(session: AsyncSession):
    for data in CLINICS_DATA:
        clinic = Clinic(**data)
        session.add(clinic)
    print(f"  → {len(CLINICS_DATA)} clínicas")


async def seed_features(session: AsyncSession):
    for data in FEATURES_DATA:
        feature = Feature(**data)
        session.add(feature)
    print(f"  → {len(FEATURES_DATA)} features")


async def seed_plans(session: AsyncSession):
    for data in PLANS_DATA:
        plan = Plan(**data)
        session.add(plan)
    print(f"  → {len(PLANS_DATA)} planes")


async def seed_plan_features(session: AsyncSession):
    count = 0
    for plan_id, features in PLAN_FEATURES_DATA.items():
        for feature_id, limit in features:
            pf = PlanFeature(plan_id=plan_id, feature_id=feature_id, limit_value=limit)
            session.add(pf)
            count += 1
    print(f"  → {count} plan_features (relaciones plan↔feature)")


async def seed_clinic_plans(session: AsyncSession):
    for data in CLINIC_PLANS_DATA:
        cp = ClinicPlan(**data)
        session.add(cp)
    print(f"  → {len(CLINIC_PLANS_DATA)} asignaciones de planes a clínicas")


async def seed_scheduled_changes(session: AsyncSession):
    for data in SCHEDULED_CHANGES_DATA:
        sc = ScheduledChange(**data)
        session.add(sc)
    print(f"  → {len(SCHEDULED_CHANGES_DATA)} cambios programados")


async def seed_alerts(session: AsyncSession):
    for data in ALERTS_DATA:
        alert = Alert(**data)
        session.add(alert)
    print(f"  → {len(ALERTS_DATA)} alertas")


async def seed_notifications(session: AsyncSession):
    for data in NOTIFICATIONS_DATA:
        notif = Notification(**data)
        session.add(notif)
    print(f"  → {len(NOTIFICATIONS_DATA)} notificaciones")


async def seed_jobs(session: AsyncSession):
    for data in JOBS_DATA:
        job = Job(**data)
        session.add(job)
    print(f"  → {len(JOBS_DATA)} jobs")


async def seed_admin_users(session: AsyncSession):
    for data in ADMIN_USERS_DATA:
        user = AdminUser(**data)
        session.add(user)
    print(f"  → {len(ADMIN_USERS_DATA)} usuarios admin")


async def run_seed():
    print("\n🌱 Iniciando seed de WellQ Admin...\n")

    # 1. Crear tablas
    await create_tables()

    # 2. Limpiar tablas antes de reinsertar
    async with AsyncSessionLocal() as session:
        from sqlalchemy import text
        await session.execute(text("TRUNCATE TABLE alerts, notifications, jobs, admin_users, scheduled_changes, clinic_plans, plan_features, plans, features, clinics RESTART IDENTITY CASCADE"))
        await session.commit()
    print("🧹 Tablas limpiadas\n")

    # 3. Insertar datos
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
        await session.commit()

    print("\n✅ Seed completado. Todas las tablas tienen datos en Neon.\n")
    
    # Cerrar las conexiones limpiamente para evitar el error SSL de asyncio al final
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run_seed())