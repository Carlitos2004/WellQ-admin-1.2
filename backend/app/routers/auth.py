import uuid
from datetime import datetime, timedelta

import bcrypt as _bcrypt
from fastapi import APIRouter, Body, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.neon import get_db
from app.models_db import AdminUser, Permission, RolePermission, Role   # ← Role añadido

# ── Configuración ──────────────────────────────────────────────────────────────
# Cambia JWT_SECRET por una cadena larga y aleatoria en tu .env
# Ejemplo: openssl rand -hex 32
JWT_SECRET      = "CAMBIA_ESTO_POR_UN_SECRET_LARGO_Y_SEGURO"
JWT_ALGORITHM   = "HS256"
ACCESS_EXPIRES  = timedelta(hours=1)
REFRESH_EXPIRES = timedelta(days=7)

router = APIRouter(prefix="/api/auth", tags=["Autenticación y Seguridad"])

_bearer = HTTPBearer()


# ── Helpers de contraseña ─────────────────────────────────────────────────────
# Se usa bcrypt directo (sin passlib) para evitar el error:
#   ValueError: password cannot be longer than 72 bytes
# que ocurre porque passlib >= 1.7.4 con bcrypt >= 4.x tiene un bug interno.

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


# ── RBAC: user_payload incluye permissions ────────────────────────────────────
def user_payload(user: AdminUser, permissions: list[str] = []) -> dict:
    """
    Construye el payload del JWT.
    'permissions' es la lista de permission keys del rol del usuario.
    Se incluye en el token para que el frontend filtre el sidebar
    y para que require_permission() funcione sin query a BD en cada request.
    """
    return {
        "user_id":     user.user_id,
        "email":       user.email,
        "role":        user.role,
        "permissions": permissions,
    }


# ── RBAC: carga los permission keys desde la BD ───────────────────────────────
async def _load_user_permissions(user: AdminUser, db: AsyncSession) -> list[str]:
    """
    Retorna la lista de permission keys del usuario.

    Backward compatibility:
      - Si role_id es NULL y role == 'super_admin'  → todos los permisos del catálogo.
      - Si role_id es NULL y role != 'super_admin'  → sin permisos (lista vacía).
      - Si role_id está seteado                      → permisos del rol RBAC via JOIN.
    """
    # Usuarios legacy super_admin que aún no tienen role_id asignado
    if user.role_id is None and user.role == "super_admin":
        result = await db.execute(select(Permission.key))
        return list(result.scalars().all())

    # Usuarios sin rol RBAC y sin legacy super_admin
    if user.role_id is None:
        return []

    # JOIN: permissions ← role_permissions WHERE role_id = user.role_id
    q = (
        select(Permission.key)
        .join(RolePermission, RolePermission.permission_id == Permission.id)
        .where(RolePermission.role_id == user.role_id)
    )
    result = await db.execute(q)
    return list(result.scalars().all())


# ── NUEVO: carga el nombre del rol RBAC ───────────────────────────────────────
async def _load_role_name(user: AdminUser, db: AsyncSession) -> str:
    """
    Retorna el nombre legible del rol RBAC (ej: 'DevOps', 'Billing Manager').

    Fallback: si no tiene role_id, devuelve el campo legacy 'role' (string).
    Esto hace que el sidebar siempre muestre algo útil:
      - Con RBAC:   "DevOps" (nombre del rol de la tabla roles)
      - Sin RBAC:   "super_admin" (valor del campo texto legacy)
    """
    if user.role_id is None:
        return user.role or ""

    result = await db.execute(select(Role.name).where(Role.id == user.role_id))
    name = result.scalar_one_or_none()
    return name or user.role or ""


def _legacy_role_from_rbac(role: Role) -> str:
    role_name = (role.name or "").strip().lower()
    if role_name in {"super admin", "super administrator"}:
        return "super_admin"
    return "admin"


async def _load_register_role(role_id, db: AsyncSession) -> tuple[int | None, str, str | None]:
    if role_id in (None, ""):
        return None, "admin", None

    try:
        role_id_int = int(role_id)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="role_id inválido")

    result = await db.execute(select(Role).where(Role.id == role_id_int))
    role = result.scalars().first()
    if not role:
        raise HTTPException(status_code=400, detail=f"El role_id {role_id_int} no existe en la tabla de roles")

    return role_id_int, _legacy_role_from_rbac(role), role.name


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
    role_id, role, role_name = await _load_register_role(body.get("role_id"), db)

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
        role_id       = role_id,
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
            "role_id":   new_user.role_id,
            "role_name": role_name or new_user.role,
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
    # RBAC: refresh necesario para que user.role_id no esté expirado post-commit
    await db.refresh(user)

    # Cargar permissions y nombre del rol RBAC
    permissions   = await _load_user_permissions(user, db)
    role_name     = await _load_role_name(user, db)          # ← NUEVO
    payload       = user_payload(user, permissions)
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
                "user_id":     user.user_id,
                "email":       user.email,
                "full_name":   user.full_name,
                "role":        user.role,           # legacy string (backward compat)
                "role_name":   role_name,            # ← NUEVO: nombre real del rol RBAC para el sidebar
                "role_id":     user.role_id,         # ← NUEVO: ID para comparaciones en el frontend
                "permissions": permissions,
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

    # RBAC: recargar permissions actuales — pueden haber cambiado desde el último login
    permissions = await _load_user_permissions(user, db)
    new_access  = create_token({**user_payload(user, permissions), "type": "access"}, ACCESS_EXPIRES)

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

    # Cargar permissions y nombre del rol frescos desde BD
    permissions = await _load_user_permissions(user, db)
    role_name   = await _load_role_name(user, db)           # ← NUEVO

    return {
        "user_id":     user.user_id,
        "email":       user.email,
        "full_name":   user.full_name,
        "role":        user.role,           # legacy string (backward compat)
        "role_name":   role_name,            # ← NUEVO: nombre real del rol RBAC para el sidebar
        "role_id":     user.role_id,         # ← NUEVO: ID del rol
        "status":      user.status,
        "last_login":  user.last_login.isoformat() if user.last_login else None,
        "permissions": permissions,
    }


# ── Dependencies exportables (usados por otros routers) ───────────────────────

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
) -> AdminUser:
    """
    Dependency reutilizable: valida el access token y retorna el AdminUser activo.

    Uso en cualquier router:
        from app.auth import get_current_user

        @router.get("/algo")
        async def algo(current_user: AdminUser = Depends(get_current_user)):
            ...
    """
    payload = decode_token(credentials.credentials)

    if payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")

    result = await db.execute(select(AdminUser).where(AdminUser.email == payload["email"]))
    user: AdminUser | None = result.scalars().first()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")

    if user.status != "active":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Usuario inactivo")

    return user


def require_permission(permission_key: str):
    """
    Dependency factory: verifica que el usuario tenga un permiso específico.
    Lee los permissions desde el JWT (cargados en login/refresh) — sin query a BD.

    Uso:
        @router.get("/billing", dependencies=[Depends(require_permission("billing.view"))])
        async def billing_view(...):
            ...

    Lanza HTTP 403 si el usuario no tiene el permiso requerido.
    Backward compat: super_admin legacy sin permissions en JWT → acceso total.
    """
    async def _check(
        credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    ) -> None:
        payload = decode_token(credentials.credentials)

        if payload.get("type") != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido",
            )

        perms = payload.get("permissions", [])
        role  = payload.get("role", "")

        # Backward compat: super_admin que aún no pasó por login con RBAC activo
        if role == "super_admin" and not perms:
            return

        if permission_key not in perms:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acceso denegado: se requiere el permiso '{permission_key}'",
            )

    return _check
