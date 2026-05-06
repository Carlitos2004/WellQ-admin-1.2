import uuid
from datetime import datetime
from fastapi import APIRouter, Path, Body, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.neon import get_db
from app.models_db import AdminUser

router = APIRouter(prefix="/api/users", tags=["Usuarios"])

# 44. GET /users/me
@router.get("/me", summary="Datos del perfil del super-administrador logueado")
async def get_my_profile(db: AsyncSession = Depends(get_db)):
    # Simulamos obtener el admin principal hasta que la capa de Auth (get_current_user) esté conectada
    result = await db.execute(select(AdminUser).where(AdminUser.email == "admin@wellq.co"))
    user = result.scalars().first()

    if not user:
        raise HTTPException(status_code=404, detail="No encontrado")

    return {
        "status": "success",
        "data": {
            "user_id": str(user.id),
            "full_name": getattr(user, "full_name", getattr(user, "name", "")),
            "email": user.email,
            "role": getattr(user, "role", "super_admin"),
            "permissions": getattr(user, "permissions", ["all"]),
            "last_login": user.last_login.isoformat() + "Z" if getattr(user, "last_login", None) else None
        }
    }

# 45. GET /users
@router.get("", summary="Lista de usuarios con acceso a la consola")
async def list_users(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AdminUser))
    users = result.scalars().all()

    return {
        "total": len(users),
        "data": [
            {
                "user_id": str(u.id),
                "name": getattr(u, "full_name", getattr(u, "name", u.email)),
                "role": getattr(u, "role", "admin"),
                "status": getattr(u, "status", getattr(u, "state", "active"))
            }
            for u in users
        ]
    }

# 46. POST /users
@router.post("", summary="Creación de una nueva cuenta de administrador", status_code=status.HTTP_201_CREATED)
async def create_user(body: dict = Body(...), db: AsyncSession = Depends(get_db)):
    new_id = f"USR-{uuid.uuid4().hex[:8].upper()}"
    
    new_user = AdminUser(
        id=new_id,
        email=body.get("email"),
        name=body.get("name", ""),
        full_name=body.get("full_name", ""),
        role=body.get("role", "admin"),
        created_at=datetime.utcnow()
    )
    
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    return {
        "status": "success",
        "message": "Usuario creado correctamente",
        "data": {
            "user_id": str(new_user.id),
            "email": new_user.email,
            "role": getattr(new_user, "role", "admin")
        }
    }

# 47. PATCH /users/{user_id}/role
@router.patch("/{user_id}/role", summary="Modificación de permisos y roles")
async def update_user_role(user_id: str = Path(...), body: dict = Body(...), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AdminUser).where(AdminUser.id == user_id))
    user = result.scalars().first()

    if not user:
        raise HTTPException(status_code=404, detail="No encontrado")

    new_role = body.get("role")
    if not new_role:
        raise HTTPException(status_code=400, detail="El campo 'role' es requerido")

    user.role = new_role
    
    if hasattr(user, "updated_at"):
        user.updated_at = datetime.utcnow()

    db.add(user)
    await db.commit()

    return {
        "status": "success",
        "message": f"Rol del usuario {user_id} actualizado a {new_role}"
    }