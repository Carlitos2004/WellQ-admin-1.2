"""
main.py — Punto de entrada de la aplicación FastAPI
====================================================
Configura la app FastAPI: CORS, lifespan (startup/shutdown),
registro de todos los routers, y middleware de logging.

Para ejecutar:
    uvicorn app.main:app --reload --port 8000
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import structlog
import logging

from app.config import settings
from app.db.firestore import init_firestore
from app.db.mongodb import init_mongodb, close_mongodb

# ÚNICA importación de routers, ordenada y con el apodo correcto
from app.routers import (
    auth, dashboard, clinics, platform, financials,
    alerts, search, infrastructure, analytics, users,
    notifications, jobs, settings as settings_router,
    features, plans, clinic_plans,
)

# ── Configurar logging estructurado con structlog ──────────────────────────────
structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.dev.ConsoleRenderer() if settings.debug else structlog.processors.JSONRenderer(),
    ],
    logger_factory=structlog.PrintLoggerFactory(),
)
logging.basicConfig(level=logging.DEBUG if settings.debug else logging.INFO)
logger = structlog.get_logger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Gestión del ciclo de vida de la aplicación.
    """
    # ── Startup ────────────────────────────────────────────────────────────────
    logger.info("Iniciando WellQ Admin API", entorno=settings.app_env)

    # --- INICIO DEL HACK ---
    # Comentamos la inicialización de bases de datos para arrancar sin internet/credenciales
    # init_firestore()     # Inicializa Firebase Admin y el cliente Firestore
    # init_mongodb()       # Inicializa el cliente Motor para MongoDB
    # --- FIN DEL HACK ---

    logger.info("Todas las conexiones de base de datos inicializadas (simulado).")

    yield  # La app está lista para recibir requests

    # ── Shutdown ───────────────────────────────────────────────────────────────
    logger.info("Cerrando WellQ Admin API...")

    # También comentamos el cierre porque nunca la abrimos
    # await close_mongodb()  # Cierra el pool de Motor

    logger.info("Conexiones cerradas. API detenida.")


# ── Crear la aplicación FastAPI ────────────────────────────────────────────────
app = FastAPI(
    title="WellQ Admin API",
    description="""
    API REST para el WellQ Admin Console.
    Gestiona clínicas, métricas de negocio, operaciones de plataforma
    y notificaciones. Autenticación mediante tokens JWT de Keycloak.
    """,
    version="1.0.0",
    # En producción (debug=False), ocultar /docs y /redoc para seguridad
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    lifespan=lifespan,
)

# ── Middleware de CORS ─────────────────────────────────────────────────────────
# Permite que el frontend Vue acceda a la API desde su dominio/puerto
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,   # Orígenes del .env (ej. http://localhost:5173)
    allow_credentials=True,                # Necesario para enviar cookies de refresh
    allow_methods=["*"],                   # GET, POST, PATCH, DELETE, etc.
    allow_headers=["*"],                   # Authorization, Content-Type, etc.
)

# ── Registro de Routers ────────────────────────────────────────────────────────
# Cada router agrupa los endpoints de un dominio funcional.

# — Módulos existentes —
app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(clinics.router)
app.include_router(platform.router)
app.include_router(notifications.router)
app.include_router(jobs.router)
app.include_router(financials.router)
app.include_router(alerts.router)
app.include_router(search.router)
app.include_router(infrastructure.router)
app.include_router(analytics.router)
app.include_router(users.router)
app.include_router(settings_router.router)

# — Módulo de Planes y Pricing 
app.include_router(features.router)      # GET/POST/PUT/DELETE /api/features
app.include_router(plans.router)         # GET/POST/PUT /api/plans + archive/restore/duplicate
app.include_router(clinic_plans.router)  # GET/PUT /api/clinics/{id}/plan + history/schedule/usage

# ── Health check público ───────────────────────────────────────────────────────
@app.get("/health", tags=["Sistema"], summary="Health check de la API")
async def health_check() -> dict:
    """
    Endpoint público para verificar que la API está operativa.
    No requiere autenticación. Usado por el load balancer y monitoreo.
    """
    return {
        "status": "ok",
        "version": "1.0.0",
        "environment": settings.app_env,
    }
