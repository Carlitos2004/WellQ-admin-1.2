"""
main.py — Punto de entrada de la aplicación FastAPI
====================================================
Para ejecutar:
    uvicorn app.main:app --reload --port 8000
"""

from contextlib import asynccontextmanager
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
import structlog
import logging
import app.models  # registra todos los modelos SQLModel

from app.config import settings
from app.db.neon import init_neon, close_neon, create_db_tables

# Imports de todos los routers desde app.routers
from app.routers import (
    auth,
    password_reset,
    dashboard,
    clinics,
    clinic_portal,
    platform,
    financials,
    alerts,
    search,
    infrastructure,
    analytics,
    users,
    notifications,
    jobs,
    settings as settings_router,
    features,
    plans,
    clinic_plans,
    support,
    clinic_health,
    sync,
    roles,                # RBAC: Roles, Permisos y asignación
    # kpis eliminado: sus endpoints fueron fusionados en dashboard.py
)

# RBAC: dependencia que bloquea el acceso a cada módulo según el permiso del rol.
from app.routers.auth import require_permission

structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.dev.ConsoleRenderer()
        if settings.debug
        else structlog.processors.JSONRenderer(),
    ],
    logger_factory=structlog.PrintLoggerFactory(),
)

logging.basicConfig(level=logging.DEBUG if settings.debug else logging.INFO)
logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Iniciando WellQ Admin API", entorno=settings.app_env)

    if settings.database_url:
        init_neon()
        await create_db_tables()
        logger.info("Neon (PostgreSQL) conectado y tablas verificadas.")
    else:
        logger.warning("DATABASE_URL no configurada — Neon desactivado.")

    yield

    logger.info("Cerrando WellQ Admin API...")

    if settings.database_url:
        await close_neon()

    logger.info("Conexiones closed. API detenida.")


app = FastAPI(
    title="WellQ Admin API",
    version="1.0.0",
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    lifespan=lifespan,
)

# ─────────────────────────────────────────────────────────────────────────────
# Configuración de CORS blindada para Producción (Vercel) y Local
# ─────────────────────────────────────────────────────────────────────────────
origins = [
    "http://localhost:5173",
    "https://well-q-admin-1-2.vercel.app",
    "https://well-q-admin-1-2-2g0tyvkyl-carlitos2004s-projects.vercel.app"  # Tu enlace exacto de Vercel
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.vercel\.app",  # El comodín mágico que deja pasar subdominios
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────────────────────────────────────
# Registro de routers + BLOQUEO RBAC por módulo.
# Cada router de datos exige el permiso ".view" de su módulo (piso de lectura):
# si el rol del usuario no lo tiene, TODOS los endpoints de ese router responden 403.
# Las escrituras sensibles se refuerzan además con ".manage" dentro de cada router.
# auth/password_reset quedan abiertos (login, registro, recuperación).
# roles se auto-protege internamente con require_permission("roles.manage").
# ─────────────────────────────────────────────────────────────────────────────
def _perm(key: str):
    return [Depends(require_permission(key))]

app.include_router(auth.router)
app.include_router(password_reset.router)
app.include_router(dashboard.router,       dependencies=_perm("overview.view"))   # KPIs / overview
app.include_router(clinics.router,          dependencies=_perm("clinics.view"))
app.include_router(clinic_portal.router)    # portal externo: se autentica con su propio token de impersonación, NO con JWT admin
app.include_router(platform.router,         dependencies=_perm("platform.view"))
app.include_router(notifications.router,     dependencies=_perm("platform.view"))
app.include_router(jobs.router,              dependencies=_perm("platform.view"))
app.include_router(financials.router,        dependencies=_perm("billing.view"))
app.include_router(alerts.router,            dependencies=_perm("overview.view"))
app.include_router(search.router,            dependencies=_perm("overview.view"))
app.include_router(infrastructure.router,    dependencies=_perm("platform.view"))
app.include_router(analytics.router,          dependencies=_perm("analytics.view"))
app.include_router(users.router,             dependencies=_perm("users.manage"))   # gestión de usuarios = manage
app.include_router(settings_router.router,    dependencies=_perm("settings.view"))
app.include_router(features.router,           dependencies=_perm("plans.view"))
app.include_router(plans.router,             dependencies=_perm("plans.view"))
app.include_router(clinic_plans.router,       dependencies=_perm("clinics.view"))

# Registro de los nuevos componentes adaptados
# ─────────────────────────────────────────────────────────────────────────────
# NOTA: clinic_health usa prefix="/api/clinics" igual que clinics.
# FastAPI permite múltiples routers con el mismo prefix — se fusionan sin
# conflicto. El nuevo endpoint queda en:
#   GET /api/clinics/{clinic_id}/patient-health
# ─────────────────────────────────────────────────────────────────────────────
app.include_router(support.router,           dependencies=_perm("tickets.view"))
app.include_router(clinic_health.router,      dependencies=_perm("clinics.view"))
app.include_router(sync.router,              dependencies=_perm("platform.view"))
app.include_router(roles.router)       # RBAC: se auto-protege con roles.manage


@app.get("/health", tags=["Sistema"])
async def health_check() -> dict:
    return {
        "status": "ok",
        "version": "1.0.0",
        "environment": settings.app_env,
        "database": "neon_connected" if settings.database_url else "not_configured",
    }
