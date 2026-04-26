"""
auth/dependencies.py — Dependencias de autenticación para FastAPI
=================================================================
Define las dependencias inyectables que protegen los endpoints.
FastAPI las resuelve automáticamente antes de ejecutar cada handler.

Uso en un router:
    @router.get("/mi-ruta")
    async def mi_handler(current_user: CurrentUser = Depends(get_current_user)):
        ...
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jwt import InvalidTokenError
from pydantic import BaseModel

from app.auth.keycloak import verify_token, extract_roles
from app.config import settings

# Esquema de seguridad Bearer: extrae el token del header Authorization: Bearer <token>
bearer_scheme = HTTPBearer(
    scheme_name="Keycloak Bearer",
    description="Token JWT emitido por Keycloak. Formato: 'Bearer <token>'",
)


class CurrentUser(BaseModel):
    """
    Modelo que representa al usuario autenticado después de validar el token.
    Se inyecta en todos los endpoints protegidos.
    """
    sub: str          # Identificador único del usuario en Keycloak (UUID)
    email: str        # Email del usuario
    name: str         # Nombre completo
    roles: list[str]  # Lista de roles asignados en Keycloak
    raw: dict         # Payload completo del token (por si se necesita algún claim adicional)

    class Config:
        # Permitir campos extra en el modelo (útil para claims personalizados de Keycloak)
        extra = "allow"


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> CurrentUser:
    """
    Dependencia principal de autenticación.
    1. Extrae el token del header Authorization.
    2. Lo valida con las claves públicas de Keycloak.
    3. Construye y retorna un objeto CurrentUser.

    Lanza HTTP 401 si el token es inválido o ha expirado.
    """
    token = credentials.credentials  # El token sin el prefijo "Bearer "

    try:
        payload = verify_token(token)
    except InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token inválido o expirado: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Construir el objeto de usuario a partir de los claims del token
    return CurrentUser(
        sub=payload.get("sub", ""),
        email=payload.get("email", ""),
        name=payload.get("name", payload.get("preferred_username", "")),
        roles=extract_roles(payload),
        raw=payload,
    )


async def require_admin(
    current_user: CurrentUser = Depends(get_current_user),
) -> CurrentUser:
    """
    Dependencia de autorización: verifica que el usuario tenga el rol de administrador.
    Lanza HTTP 403 si el usuario no tiene el rol configurado en KEYCLOAK_ADMIN_ROLE.

    Uso:
        @router.get("/admin-only")
        async def handler(user: CurrentUser = Depends(require_admin)):
            ...
    """
    if settings.keycloak_admin_role not in current_user.roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Acceso denegado. Se requiere el rol '{settings.keycloak_admin_role}'. "
                f"Roles actuales: {current_user.roles}"
            ),
        )
    return current_user


async def require_super_admin(
    current_user: CurrentUser = Depends(get_current_user),
) -> CurrentUser:
    """
    Dependencia para operaciones sensibles que requieren el rol 'wellq-super-admin'.
    Por ejemplo: impersonación de clínicas, eliminación de datos, cambios de plan.
    """
    if "wellq-super-admin" not in current_user.roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Esta operación requiere privilegios de super-administrador.",
        )
    return current_user
