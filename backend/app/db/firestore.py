"""
db/firestore.py — Conexión y cliente de Google Firestore
=========================================================
Inicializa el SDK de Firebase Admin y expone un cliente Firestore
listo para usar. El cliente se crea una sola vez al arrancar la app
(patrón singleton) para reutilizar la conexión TCP subyacente.
"""

import os
import firebase_admin
from firebase_admin import credentials, firestore
from google.cloud.firestore import Client
import structlog

from app.config import settings

# Logger estructurado para este módulo
logger = structlog.get_logger(__name__)

# Variable global que almacena el cliente Firestore después de inicializar
_db: Client | None = None


def init_firestore() -> None:
    """
    Inicializa la aplicación Firebase Admin y crea el cliente Firestore.
    Debe llamarse una sola vez al arrancar la aplicación (en el lifespan de FastAPI).
    Si Firebase Admin ya fue inicializado, esta función no hace nada.
    """
    global _db

    # Evitar inicialización doble (por ejemplo, en tests o recargas en caliente)
    if firebase_admin._apps:
        logger.info("Firebase Admin ya estaba inicializado. Reutilizando instancia.")
        _db = firestore.client()
        return

    try:
        # Cargar credenciales desde el archivo JSON de cuenta de servicio
        cred_path = settings.google_application_credentials
        if not os.path.exists(cred_path):
            raise FileNotFoundError(
                f"Archivo de credenciales no encontrado: {cred_path}. "
                "Verifica la variable GOOGLE_APPLICATION_CREDENTIALS en .env"
            )

        cred = credentials.Certificate(cred_path)

        # Inicializar Firebase Admin con las credenciales y el proyecto GCP
        firebase_admin.initialize_app(cred, {
            "projectId": settings.gcp_project_id,
            "databaseURL": None,  # No usamos Realtime Database, solo Firestore
        })

        # Crear el cliente Firestore apuntando a la base de datos configurada
        _db = firestore.client(database_id=settings.firestore_database)

        logger.info(
            "Firestore inicializado correctamente",
            proyecto=settings.gcp_project_id,
            base_de_datos=settings.firestore_database,
        )

    except Exception as e:
        logger.error("Error al inicializar Firestore", error=str(e))
        raise


def get_db() -> Client:
    """
    Retorna el cliente Firestore. Lanza un error si no se ha inicializado.

    Uso típico como dependencia de FastAPI:
        db: Client = Depends(get_db)
    """
    if _db is None:
        raise RuntimeError(
            "El cliente Firestore no está inicializado. "
            "Asegúrate de llamar a init_firestore() al arrancar la app."
        )
    return _db


# ── Colecciones de Firestore ───────────────────────────────────────────────────
# Nombres de las colecciones definidos como constantes para evitar errores de tipeo.
# Al cambiar el nombre de una colección, basta con actualizar aquí.

class Collections:
    """Nombres de todas las colecciones usadas en Firestore."""
    ADMINS = "admins"                    # Usuarios administradores del portal
    CLINICS = "clinics"                  # Clínicas registradas en la plataforma
    CLINIC_CONTACTS = "clinic_contacts"  # Contactos por clínica
    SUBSCRIPTIONS = "subscriptions"      # Suscripciones activas/pasadas
    INVOICES = "invoices"                # Facturas generadas
    ALERTS = "alerts"                    # Alertas del sistema (infraestructura, uso, etc.)
    NOTIFICATIONS = "notifications"      # Notificaciones enviadas a clínicas o admins
    JOB_RECORDS = "job_records"          # Registros de jobs asíncronos
    IMPERSONATION_LOGS = "impersonation_logs"  # Auditoría de sesiones de impersonación
    PLATFORM_METRICS = "platform_metrics"      # Métricas de infraestructura en tiempo real
