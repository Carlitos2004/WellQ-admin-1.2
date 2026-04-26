"""
auth.py — Endpoints de autenticación contra Keycloak
=====================================================
Implementa los flujos OIDC (Resource Owner Password Credentials) para
login, logout y renovación de tokens delegando al servidor Keycloak.
"""

from fastapi import APIRouter, Body, HTTPException, Depends, status
import httpx
import structlog

from app.config import settings
from app.auth.dependencies import get_current_user, CurrentUser

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/api/auth", tags=["Autenticación y Seguridad"])

# URLs del endpoint OpenID Connect de Keycloak
_OIDC_BASE = f"{settings.keycloak_url}/realms/{settings.keycloak_realm}/protocol/openid-connect"
TOKEN_URL   = f"{_OIDC_BASE}/token"
LOGOUT_URL  = f"{_OIDC_BASE}/logout"


@router.post(
    "/login",
    summary="Valida credenciales contra Keycloak y entrega tokens JWT",
    status_code=status.HTTP_200_OK,
)
async def login(body: dict = Body(...)):
    """
    Flujo ROPC (Resource Owner Password Credentials).
    El frontend envía email + password; el backend los intercambia por
    tokens JWT de Keycloak sin exponer el client_secret al navegador.
    """
    email    = body.get("email", "").strip()
    password = body.get("password", "")

    if not email or not password:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Los campos 'email' y 'password' son requeridos.",
        )

    async with httpx.AsyncClient() as client:
        response = await client.post(
            TOKEN_URL,
            data={
                "grant_type":    "password",
                "client_id":     settings.keycloak_client_id,
                "client_secret": settings.keycloak_client_secret,
                "username":      email,
                "password":      password,
                "scope":         "openid email profile",
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=10.0,
        )

    if response.status_code == 401:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if response.status_code != 200:
        error_body = response.json()
        logger.warning("Error al autenticar en Keycloak", status=response.status_code, detail=error_body)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Error del servidor de autenticación: {error_body.get('error_description', 'unknown')}",
        )

    tokens = response.json()

    logger.info("Login exitoso", email=email)

    return {
        "status": "success",
        "message": "Autenticación exitosa",
        "data": {
            "access_token":  tokens["access_token"],
            "refresh_token": tokens.get("refresh_token"),
            "token_type":    "Bearer",
            "expires_in":    tokens.get("expires_in", 300),
        },
    }


@router.post(
    "/logout",
    summary="Revoca la sesión en Keycloak",
    status_code=status.HTTP_200_OK,
)
async def logout(body: dict = Body(default={})):
    """
    Revoca el refresh_token en Keycloak para invalidar la sesión en el servidor.
    El frontend debe además limpiar sus tokens locales.
    """
    refresh_token = body.get("refresh_token")

    if refresh_token:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                LOGOUT_URL,
                data={
                    "client_id":     settings.keycloak_client_id,
                    "client_secret": settings.keycloak_client_secret,
                    "refresh_token": refresh_token,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                timeout=10.0,
            )
        if response.status_code not in (200, 204):
            logger.warning("No se pudo revocar el token en Keycloak", status=response.status_code)

    return {
        "status": "success",
        "message": "Sesión cerrada correctamente.",
        "action": "clear_local_storage",
    }


@router.post(
    "/refresh",
    summary="Renueva el access_token usando el refresh_token",
    status_code=status.HTTP_200_OK,
)
async def refresh_token(body: dict = Body(...)):
    """
    Intercambia un refresh_token válido por un nuevo par de tokens.
    """
    token = body.get("refresh_token", "").strip()

    if not token:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="El campo 'refresh_token' es requerido.",
        )

    async with httpx.AsyncClient() as client:
        response = await client.post(
            TOKEN_URL,
            data={
                "grant_type":    "refresh_token",
                "client_id":     settings.keycloak_client_id,
                "client_secret": settings.keycloak_client_secret,
                "refresh_token": token,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=10.0,
        )

    if response.status_code == 400:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token inválido o expirado. Vuelva a iniciar sesión.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Error al renovar la sesión en el servidor de autenticación.",
        )

    tokens = response.json()

    return {
        "status": "success",
        "message": "Token renovado correctamente.",
        "data": {
            "access_token":  tokens["access_token"],
            "refresh_token": tokens.get("refresh_token"),
            "token_type":    "Bearer",
            "expires_in":    tokens.get("expires_in", 300),
        },
    }


@router.get(
    "/me",
    summary="Perfil del usuario autenticado extraído del token JWT",
    status_code=status.HTTP_200_OK,
)
async def get_me(current_user: CurrentUser = Depends(get_current_user)):
    """
    Endpoint protegido: retorna los datos del usuario a partir del token Bearer.
    No hace una llamada adicional a Keycloak; los datos vienen directamente
    de los claims del JWT ya validado.
    """
    return {
        "auth_id":   current_user.sub,
        "email":     current_user.email,
        "full_name": current_user.name,
        "roles":     current_user.roles,
        "state":     "active",
    }
