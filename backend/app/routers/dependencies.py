"""
routers/dependencies.py — DEPENDENCIAS CENTRALIZADAS DE AUTH Y AUTORIZACIÓN

Uso en plans.py, clinics.py o cualquier router:
    from .dependencies import require_super_admin
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from .auth import decode_token          # ← relativo: auth.py está en la misma carpeta routers/

_bearer = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> dict:
    """Decodifica el JWT y retorna el payload {user_id, email, role, type, exp}."""
    payload = decode_token(credentials.credentials)
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido: se requiere un access token.",
        )
    return payload


def require_super_admin(
    current_user: dict = Depends(get_current_user),
) -> dict:
    """Guard de rol: solo permite role == 'super_admin'. Lanza 403 si no."""
    if current_user.get("role") != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado: se requiere el rol 'super_admin' para esta operación.",
        )
    return current_user