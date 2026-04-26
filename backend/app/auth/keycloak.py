"""
auth/keycloak.py — Validación de tokens JWT de Keycloak
=========================================================
Este módulo descarga las claves públicas (JWKS) del servidor Keycloak
y las usa para verificar la firma de los tokens Bearer que llegan
en cada petición. No hace roundtrip al servidor Keycloak por request;
cachea las claves y solo las renueva cuando la firma falla.
"""

import httpx
import jwt
from jwt import PyJWKClient, InvalidTokenError
from functools import lru_cache
import structlog

from app.config import settings

logger = structlog.get_logger(__name__)


@lru_cache(maxsize=1)
def _get_jwks_client() -> PyJWKClient:
    """
    Crea un cliente JWKS (JSON Web Key Set) apuntando al endpoint de Keycloak.
    El cliente cachea internamente las claves públicas y las renueva automáticamente
    cuando detecta un `kid` (key ID) desconocido en el token.

    @lru_cache garantiza que se instancie una sola vez durante la vida del proceso.
    """
    return PyJWKClient(
        settings.keycloak_jwks_url,
        # Tiempo en segundos antes de refrescar las claves del JWKS
        lifespan=3600,
    )


def verify_token(token: str) -> dict:
    """
    Verifica y decodifica un token JWT de Keycloak.

    Pasos que realiza:
    1. Obtiene la clave pública correcta desde el JWKS de Keycloak (usando el `kid` del header).
    2. Verifica la firma con RS256.
    3. Valida el issuer, la audiencia, y que el token no esté expirado.
    4. Retorna el payload decodificado (claims del token).

    Args:
        token: Token Bearer sin el prefijo "Bearer ".

    Returns:
        dict: Claims del token (sub, email, realm_access, resource_access, etc.)

    Raises:
        InvalidTokenError: Si el token es inválido, expirado o la firma no coincide.
    """
    jwks_client = _get_jwks_client()

    try:
        # Obtener la clave pública que corresponde al `kid` del header del token
        signing_key = jwks_client.get_signing_key_from_jwt(token)

        # Decodificar y verificar el token
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],           # Keycloak usa RSA-SHA256 por defecto
            issuer=settings.keycloak_issuer,  # Validar que el token fue emitido por nuestro realm
            options={
                "verify_exp": True,          # Verificar que el token no esté expirado
                "verify_aud": False,         # La audiencia varía según el cliente; omitir por flexibilidad
            },
        )

        logger.debug(
            "Token validado correctamente",
            sub=payload.get("sub"),
            email=payload.get("email"),
        )

        return payload

    except InvalidTokenError as e:
        logger.warning("Token JWT inválido o expirado", error=str(e))
        raise


def extract_roles(payload: dict) -> list[str]:
    """
    Extrae los roles del realm y del cliente desde el payload del token.

    Keycloak incluye los roles en dos lugares:
    - realm_access.roles: roles globales del realm (ej. "wellq-admin")
    - resource_access.<client_id>.roles: roles específicos del cliente

    Args:
        payload: Claims decodificados del token JWT.

    Returns:
        Lista combinada de todos los roles del usuario.
    """
    roles: list[str] = []

    # Roles del realm (nivel global)
    realm_access = payload.get("realm_access", {})
    roles.extend(realm_access.get("roles", []))

    # Roles específicos del cliente backend
    resource_access = payload.get("resource_access", {})
    client_roles = resource_access.get(settings.keycloak_client_id, {})
    roles.extend(client_roles.get("roles", []))

    return list(set(roles))  # Eliminar duplicados
