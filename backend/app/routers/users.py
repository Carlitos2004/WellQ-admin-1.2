import uuid
from datetime import datetime
from fastapi import APIRouter, Path, Body, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.db.neon import get_db
from app.models_db import AdminUser, Role        # ← Role añadido

router = APIRouter(prefix="/api/users", tags=["Usuarios Admin"])

# ── Schemas RBAC ──────────────────────────────────────────────────────────────
from pydantic import BaseModel, EmailStr
from typing import Optional

class UserCreate(BaseModel):
    user_id: str
    full_name: str
    email: EmailStr
    role_id: int            # ← FK real al rol RBAC (reemplaza 'role: str')
    status: str = "active"

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    role_id: Optional[int] = None   # ← FK real al rol RBAC
    status: Optional[str] = None


# ── Helper: aborta si el role_id no existe en la tabla roles ─────────────────
async def _assert_role_exists(role_id: int, db: AsyncSession) -> Role:
    result = await db.execute(select(Role).where(Role.id == role_id))
    role = result.scalars().first()
    if not role:
        raise HTTPException(
            status_code=400,
            detail=f"El role_id {role_id} no existe en la tabla de roles"
        )
    return role


def _legacy_role_from_rbac(role: Role) -> str:
    role_name = (role.name or "").strip().lower()
    if role_name in {"super admin", "super administrator"}:
        return "super_admin"
    return "admin"


# 44. GET /users/me
@router.get("/me", summary="Perfil del administrador logueado (legacy)")
async def get_my_profile(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(AdminUser).where(AdminUser.email == "admin@wellq.co")
    )
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="No encontrado")

    return {
        "status": "success",
        "data": {
            "user_id":    user.user_id,
            "full_name":  user.full_name,
            "email":      user.email,
            "role_id":    user.role_id,
            "role":       user.role,        # backward compat
            "status":     user.status,
            "last_login": user.last_login.isoformat() + "Z" if user.last_login else None,
        }
    }


# 45. GET /users
@router.get("", summary="Lista de todos los usuarios admin")
async def list_users(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AdminUser).order_by(AdminUser.created_at))
    users = result.scalars().all()

    return {
        "total": len(users),
        "data": [
            {
                "user_id":  u.user_id,
                "full_name": u.full_name,
                "email":    u.email,
                "role_id":  u.role_id,   # ← el frontend hace roles.find(r => r.id === u.role_id)
                "role":     u.role,       # ← backward compat para sidebar/fallback
                "status":   u.status,
            }
            for u in users
        ]
    }


# 46. POST /users
@router.post("", summary="Crear nuevo administrador", status_code=status.HTTP_201_CREATED)
async def create_user(payload: UserCreate, db: AsyncSession = Depends(get_db)):
    # 1) Validar que el rol existe antes de cualquier otra cosa
    role = await _assert_role_exists(payload.role_id, db)

    # 2) Verificar duplicado de user_id o email
    result = await db.execute(
        select(AdminUser).where(
            (AdminUser.user_id == payload.user_id) | (AdminUser.email == payload.email)
        )
    )
    if result.scalars().first():
        raise HTTPException(status_code=409, detail="El user_id o email ya existe")

    # 3) Crear el usuario con el FK real
    user = AdminUser(
        user_id=payload.user_id,
        full_name=payload.full_name,
        email=payload.email,
        role=_legacy_role_from_rbac(role),
        role_id=payload.role_id,    # ← guarda el FK real, no un string
        status=payload.status,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    return {
        "status": "success",
        "message": "Usuario creado correctamente",
        "data": {
            "user_id": user.user_id,
            "email":   user.email,
            "role_id": user.role_id,
        }
    }


# 47. PUT /users/{user_id}
@router.put("/{user_id}", summary="Actualizar usuario completo")
async def update_user(
    user_id: str = Path(...),
    payload: UserUpdate = Body(...),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(AdminUser).where(AdminUser.user_id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    update_data = payload.dict(exclude_unset=True)

    # Validar role_id si viene en el payload
    if "role_id" in update_data:
        role = await _assert_role_exists(update_data["role_id"], db)
        update_data["role"] = _legacy_role_from_rbac(role)

    for field, value in update_data.items():
        setattr(user, field, value)
    if hasattr(user, "updated_at"):
        user.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(user)

    return {
        "status": "success",
        "message": f"Usuario {user_id} actualizado",
        "data": {
            "user_id": user.user_id,
            "email":   user.email,
            "role_id": user.role_id,
            "status":  user.status,
        }
    }


# 47b. PATCH /users/{user_id}/role
# IMPORTANTE: esta ruta va ANTES de PATCH /{user_id} para que FastAPI
# no interprete "role" como un user_id
@router.patch("/{user_id}/role", summary="Actualizar solo el rol (por role_id)")
async def update_user_role(
    user_id: str = Path(...),
    body: dict = Body(...),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(AdminUser).where(AdminUser.user_id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="No encontrado")

    new_role_id = body.get("role_id")
    if new_role_id is None:
        raise HTTPException(status_code=400, detail="El campo 'role_id' es requerido")

    role = await _assert_role_exists(int(new_role_id), db)

    user.role_id = int(new_role_id)
    user.role = _legacy_role_from_rbac(role)
    if hasattr(user, "updated_at"):
        user.updated_at = datetime.utcnow()
    await db.commit()

    return {
        "status": "success",
        "message": f"Rol de {user_id} actualizado a role_id={new_role_id}"
    }


# 47c. PATCH /users/{user_id} — actualización parcial
@router.patch("/{user_id}", summary="Actualizar usuario (parcial)")
async def patch_user(
    user_id: str = Path(...),
    payload: UserUpdate = Body(...),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(AdminUser).where(AdminUser.user_id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    update_data = payload.dict(exclude_unset=True)

    if "role_id" in update_data:
        role = await _assert_role_exists(update_data["role_id"], db)
        update_data["role"] = _legacy_role_from_rbac(role)

    for field, value in update_data.items():
        setattr(user, field, value)
    if hasattr(user, "updated_at"):
        user.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(user)

    return {
        "status": "success",
        "message": f"Usuario {user_id} actualizado",
        "data": {
            "user_id": user.user_id,
            "email":   user.email,
            "role_id": user.role_id,
            "status":  user.status,
        }
    }


# 48. DELETE /users/{user_id}
@router.delete("/{user_id}", summary="Eliminar usuario")
async def delete_user(user_id: str = Path(...), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AdminUser).where(AdminUser.user_id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    await db.delete(user)
    await db.commit()
    return {"status": "success", "message": f"Usuario {user_id} eliminado"}
