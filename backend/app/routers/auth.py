import uuid
from datetime import datetime, timedelta

import bcrypt as _bcrypt
from fastapi import APIRouter, Body, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.neon import get_db
from app.models_db import AdminUser

# ── Configuración ──────────────────────────────────────────────────────────────
# Cambia JWT_SECRET por una cadena larga y aleatoria en tu .env
# Ejemplo: openssl rand -hex 32
JWT_SECRET      = "CAMBIA_ESTO_POR_UN_SECRET_LARGO_Y_SEGURO"
JWT_ALGORITHM   = "HS256"
ACCESS_EXPIRES  = timedelta(hours=1)
REFRESH_EXPIRES = timedelta(days=7)

router = APIRouter(prefix="/api/auth", tags=["Autenticación y Seguridad"])

_bearer = HTTPBearer()


# ── Helpers ────────────────────────────────────────────────────────────────────
# Se usa bcrypt directo (sin passlib) para evitar el error:
#   ValueError: password cannot be longer than 72 bytes
# que ocurre porque passlib >= 1.7.4 con bcrypt >= 4.x tiene un bug interno
# al detectar el "wrap bug" usando una contraseña de prueba sin truncar.

def hash_password(password: str) -> str:
    """Genera hash bcrypt. Trunca a 72 bytes (límite real de bcrypt)."""
    return _bcrypt.hashpw(password[:72].encode(), _bcrypt.gensalt(12)).decode()

def verify_password(plain: str, hashed: str) -> bool:
    """Verifica contraseña contra hash bcrypt. Retorna False si hash es None/vacío."""
    if not hashed:
        return False
    return _bcrypt.checkpw(plain[:72].encode(), hashed.encode())


def create_token(data: dict, expires_delta: timedelta) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + expires_delta
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado"
        )


def user_payload(user: AdminUser) -> dict:
    return {
        "user_id": user.user_id,
        "email":   user.email,
        "role":    user.role,
    }


# ── 1. POST /api/auth/register ─────────────────────────────────────────────────
@router.post(
    "/register",
    summary="Crear nuevo usuario administrador",
    status_code=status.HTTP_201_CREATED,
)
async def register(body: dict = Body(...), db: AsyncSession = Depends(get_db)):
    email     = body.get("email", "").strip().lower()
    password  = body.get("password", "")
    full_name = body.get("full_name", "")
    role      = body.get("role", "admin")   # "super_admin" | "admin" | "viewer"

    if not email or not password or not full_name:
        raise HTTPException(status_code=400, detail="email, password y full_name son requeridos")

    # Verificar que no exista
    result = await db.execute(select(AdminUser).where(AdminUser.email == email))
    if result.scalars().first():
        raise HTTPException(status_code=409, detail="Ya existe un usuario con ese email")

    new_user = AdminUser(
        user_id       = f"usr-{uuid.uuid4().hex[:8]}",
        full_name     = full_name,
        email         = email,
        role          = role,
        status        = "active",
        password_hash = hash_password(password),
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    return {
        "status":  "success",
        "message": "Usuario creado correctamente",
        "data": {
            "user_id":   new_user.user_id,
            "email":     new_user.email,
            "full_name": new_user.full_name,
            "role":      new_user.role,
        }
    }


# ── 2. POST /api/auth/login ────────────────────────────────────────────────────
@router.post(
    "/login",
    summary="Valida usuario y contraseña; entrega token JWT real",
    status_code=status.HTTP_200_OK,
)
async def login(body: dict = Body(...), db: AsyncSession = Depends(get_db)):
    email    = body.get("email", "").strip().lower()
    password = body.get("password", "")

    if not email or not password:
        raise HTTPException(status_code=400, detail="email y password son requeridos")

    result = await db.execute(select(AdminUser).where(AdminUser.email == email))
    user: AdminUser | None = result.scalars().first()

    if not user or not user.password_hash:
        raise HTTPException(status_code=401, detail="Credenciales inválidas")

    if not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")

    if user.status != "active":
        raise HTTPException(status_code=403, detail="Usuario inactivo")

    # Actualizar last_login
    user.last_login = datetime.utcnow()
    db.add(user)
    await db.commit()

    payload       = user_payload(user)
    access_token  = create_token({**payload, "type": "access"},  ACCESS_EXPIRES)
    refresh_token = create_token({**payload, "type": "refresh"}, REFRESH_EXPIRES)

    return {
        "status":  "success",
        "message": "Autenticación exitosa",
        "data": {
            "access_token":  access_token,
            "refresh_token": refresh_token,
            "token_type":    "Bearer",
            "expires_in":    int(ACCESS_EXPIRES.total_seconds()),
            "user": {
                "user_id":   user.user_id,
                "email":     user.email,
                "full_name": user.full_name,
                "role":      user.role,
            }
        }
    }


# ── 3. POST /api/auth/logout ───────────────────────────────────────────────────
@router.post(
    "/logout",
    summary="Registrar cierre de sesión",
    status_code=status.HTTP_200_OK,
)
async def logout():
    # JWT es stateless: el frontend elimina el token del lado cliente.
    # Si en el futuro usas una blocklist (Redis), agrégala aquí.
    return {
        "status":  "success",
        "message": "Sesión cerrada correctamente en el servidor.",
        "action":  "clear_local_storage"
    }


# ── 4. POST /api/auth/refresh ──────────────────────────────────────────────────
@router.post(
    "/refresh",
    summary="Renueva el access token usando el refresh token",
    status_code=status.HTTP_200_OK,
)
async def refresh_token(body: dict = Body(...), db: AsyncSession = Depends(get_db)):
    token = body.get("refresh_token", "")
    if not token:
        raise HTTPException(status_code=400, detail="refresh_token es requerido")

    payload = decode_token(token)   # lanza 401 si es inválido

    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Token inválido")

    # Verificar que el usuario sigue activo en BD
    result = await db.execute(select(AdminUser).where(AdminUser.email == payload["email"]))
    user: AdminUser | None = result.scalars().first()

    if not user or user.status != "active":
        raise HTTPException(status_code=401, detail="Usuario no encontrado o inactivo")

    new_access = create_token({**user_payload(user), "type": "access"}, ACCESS_EXPIRES)

    return {
        "status":  "success",
        "message": "Token de sesión renovado",
        "data": {
            "access_token": new_access,
            "token_type":   "Bearer",
            "expires_in":   int(ACCESS_EXPIRES.total_seconds()),
        }
    }


# ── 5. GET /api/auth/me ────────────────────────────────────────────────────────
@router.get(
    "/me",
    summary="Obtener perfil del usuario autenticado (requiere Bearer token)",
)
async def get_me(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
):
    payload = decode_token(credentials.credentials)

    if payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")

    result = await db.execute(select(AdminUser).where(AdminUser.email == payload["email"]))
    user: AdminUser | None = result.scalars().first()

    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    return {
        "user_id":    user.user_id,
        "email":      user.email,
        "full_name":  user.full_name,
        "role":       user.role,
        "status":     user.status,
        "last_login": user.last_login.isoformat() if user.last_login else None,
    }