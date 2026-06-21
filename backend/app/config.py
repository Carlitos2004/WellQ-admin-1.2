"""
Configuracion centralizada de WellQ Admin.

Lee variables desde backend/.env cuando el backend se ejecuta localmente.
Los valores sensibles no deben subirse a Git.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Base de datos principal: Neon/PostgreSQL
    database_url: str

    # Configuracion general del servidor
    app_env: str = "development"
    app_port: int = 8000
    debug: bool = False
    allowed_origins: str = "http://localhost:5173"

    # JWT local
    jwt_secret: str
    jwt_algorithm: str = "HS256"

    # Keycloak / autenticacion OIDC
    keycloak_url: str
    keycloak_realm: str = "wellq"
    keycloak_client_id: str
    keycloak_client_secret: str = ""
    keycloak_admin_role: str = "wellq-admin"

    # Email transaccional
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_app_password: str = ""
    smtp_from_name: str = "WellQ Admin"
    smtp_from_email: str = ""

    # Configuraciones opcionales heredadas. No son necesarias para el flujo
    # actual, pero quedan con defaults para no romper imports antiguos.
    resend_api_key: str = ""
    resend_from_email: str = "WellQ Admin <onboarding@resend.dev>"
    google_application_credentials: str = ""
    gcp_project_id: str = ""
    firestore_database: str = ""
    mongodb_uri: str = ""
    mongodb_db_name: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",")]

    @property
    def keycloak_jwks_url(self) -> str:
        return f"{self.keycloak_url}/realms/{self.keycloak_realm}/protocol/openid-connect/certs"

    @property
    def keycloak_issuer(self) -> str:
        return f"{self.keycloak_url}/realms/{self.keycloak_realm}"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
