# routers/users.py
import uuid
from datetime import datetime
from fastapi import APIRouter, Path, Body, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.db.neon import get_db
from app.models_db import AdminUser

router = APIRouter(prefix="/api/users", tags=["Usuarios Admin"])

# ── Schemas ──────────────────────────────────────────────────────────────────
from pydantic import BaseModel, EmailStr
from typing import Optional

class UserCreate(BaseModel):
    user_id: str
    full_name: str
    email: EmailStr
    role: str = "admin"
    status: str = "active"

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    status: Optional[str] = None


# 44. GET /users/me
@router.get("/me", summary="Perfil del administrador logueado")
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
            "user_id": user.user_id,
            "full_name": user.full_name,
            "email": user.email,
            "role": user.role,
            "status": user.status,
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
                "user_id": u.user_id,
                "full_name": u.full_name,
                "email": u.email,
                "role": u.role,
                "status": u.status,
            }
            for u in users
        ]
    }


# 46. POST /users
@router.post("", summary="Crear nuevo administrador", status_code=status.HTTP_201_CREATED)
async def create_user(payload: UserCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(AdminUser).where(
            (AdminUser.user_id == payload.user_id) | (AdminUser.email == payload.email)
        )
    )
    if result.scalars().first():
        raise HTTPException(status_code=409, detail="El user_id o email ya existe")

    user = AdminUser(
        user_id=payload.user_id,
        full_name=payload.full_name,
        email=payload.email,
        role=payload.role,
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
            "email": user.email,
            "role": user.role,
        }
    }


# 47. PUT /users/{user_id}
@router.put("/{user_id}", summary="Actualizar usuario completo")
async def update_user(user_id: str = Path(...), payload: UserUpdate = Body(...), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AdminUser).where(AdminUser.user_id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    update_data = payload.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    user.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(user)

    return {
        "status": "success",
        "message": f"Usuario {user_id} actualizado",
        "data": {
            "user_id": user.user_id,
            "email": user.email,
            "role": user.role,
            "status": user.status,
        }
    }


# 47b. PATCH /users/{user_id}/role (mantenido por compatibilidad)
# IMPORTANTE: esta ruta debe ir ANTES de PATCH /{user_id} para que FastAPI
# no interprete "role" como un user_id
@router.patch("/{user_id}/role", summary="Actualizar solo el rol")
async def update_user_role(user_id: str = Path(...), body: dict = Body(...), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AdminUser).where(AdminUser.user_id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="No encontrado")

    new_role = body.get("role")
    if not new_role:
        raise HTTPException(status_code=400, detail="El campo 'role' es requerido")

    user.role = new_role
    if hasattr(user, "updated_at"):
        user.updated_at = datetime.utcnow()
    await db.commit()

    return {"status": "success", "message": f"Rol de {user_id} actualizado a {new_role}"}


# 47c. PATCH /users/{user_id} — FIX: el frontend mandaba PATCH pero solo existía PUT
# Esto resuelve el HTTP 405 en /api/users/USR-VIEW-003
@router.patch("/{user_id}", summary="Actualizar usuario (parcial)")
async def patch_user(
    user_id: str = Path(...),
    payload: UserUpdate = Body(...),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(AdminUser).where(AdminUser.user_id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    update_data = payload.dict(exclude_unset=True)
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
            "email": user.email,
            "role": user.role,
            "status": user.status,
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