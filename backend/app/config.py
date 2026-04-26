"""
config.py — Configuración centralizada de la aplicación
=======================================================
Utiliza pydantic-settings para leer y validar automáticamente las variables
de entorno definidas en el archivo .env. Todas las partes de la aplicación
importan la instancia singleton `settings` desde este módulo.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    """
    Clase de configuración principal.
    Cada campo se mapea directamente a una variable de entorno.
    Los tipos y valores por defecto sirven como documentación y validación.
    """

    # ── Configuración general ──────────────────────────────────────────────────
    app_env: str = "development"       # Entorno de ejecución
    app_port: int = 8000               # Puerto del servidor
    debug: bool = False                # Modo debug (habilita docs automáticos en /docs)
    allowed_origins: str = "http://localhost:5173"  # CORS: orígenes permitidos

    # ── Keycloak (Autenticación OIDC) ──────────────────────────────────────────
    keycloak_url: str                  # URL base del servidor Keycloak
    keycloak_realm: str = "wellq"      # Realm donde están registrados los clientes
    keycloak_client_id: str            # ID del cliente backend en Keycloak
    keycloak_client_secret: str = ""   # Secret del cliente (para flujos confidenciales)
    keycloak_admin_role: str = "wellq-admin"  # Rol mínimo requerido para usar la API

    # ── Google Cloud / Firestore ───────────────────────────────────────────────
    google_application_credentials: str = "./serviceAccountKey.json"
    gcp_project_id: str                # ID del proyecto en Google Cloud
    firestore_database: str = "(default)"  # Nombre de la BD en Firestore

    # ── MongoDB (Motor) ────────────────────────────────────────────────────────
    mongodb_uri: str                   # Cadena de conexión de MongoDB Atlas
    mongodb_db_name: str = "wellq_analytics"  # Base de datos para analíticas

    # ── Configuración de lectura de variables de entorno ──────────────────────
    model_config = SettingsConfigDict(
        env_file=".env",           # Archivo .env a leer (relativo al directorio de ejecución)
        env_file_encoding="utf-8",
        case_sensitive=False,      # Variables de entorno son case-insensitive
    )

    @property
    def cors_origins(self) -> list[str]:
        """Convierte la cadena de orígenes CORS separada por comas en una lista."""
        return [origin.strip() for origin in self.allowed_origins.split(",")]

    @property
    def keycloak_jwks_url(self) -> str:
        """URL del endpoint JWKS de Keycloak para obtener las claves públicas de firma."""
        return f"{self.keycloak_url}/realms/{self.keycloak_realm}/protocol/openid-connect/certs"

    @property
    def keycloak_issuer(self) -> str:
        """Issuer esperado en los tokens JWT emitidos por Keycloak."""
        return f"{self.keycloak_url}/realms/{self.keycloak_realm}"


@lru_cache()
def get_settings() -> Settings:
    """
    Retorna la instancia singleton de Settings.
    El decorador @lru_cache garantiza que solo se construya una vez,
    evitando releer el archivo .env en cada request.

    Uso:
        from app.config import get_settings
        settings = get_settings()
    """
    return Settings()


# Instancia global para uso directo en módulos
settings = get_settings()
