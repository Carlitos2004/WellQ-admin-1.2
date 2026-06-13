"""
app/routers/roles.py
────────────────────
CRUD de Roles, catálogo de Permisos y asignación de permisos a roles.

Endpoints expuestos:
  GET    /api/roles                       → lista todos los roles activos + sus permission keys
  GET    /api/roles/{role_id}             → un rol con sus permisos
  POST   /api/roles                       → crea rol (requiere roles.manage)
  PUT    /api/roles/{role_id}             → edita nombre/descripción (requiere roles.manage)
  DELETE /api/roles/{role_id}             → hard-delete si sin usuarios (requiere roles.manage)
  GET    /api/permissions                 → catálogo completo de los 13 permisos del sistema
  POST   /api/roles/{role_id}/permissions → reemplaza permisos del rol, atómico (requiere roles.manage)
"""
from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, update

from app.db.neon import get_db
from app.models_db import AdminUser, Role, Permission, RolePermission
from app.routers.auth import get_current_user, require_permission

router = APIRouter(prefix="/api", tags=["Roles y Permisos"])


# ── Helpers internos ───────────────────────────────────────────────────────────

async def _role_with_permissions(role: Role, db: AsyncSession) -> dict:
    """
    Serializa un Role como dict incluyendo la lista de permission keys asignados.
    Se usa en todos los endpoints que retornan un rol para mantener la forma consistente.
    """
    q = (
        select(Permission.key)
        .join(RolePermission, RolePermission.permission_id == Permission.id)
        .where(RolePermission.role_id == role.id)
    )
    result    = await db.execute(q)
    perm_keys = list(result.scalars().all())

    return {
        "id":          role.id,
        "name":        role.name,
        "description": role.description,
        "is_active":   role.is_active,
        "created_at":  role.created_at.isoformat() if role.created_at else None,
        "permissions": perm_keys,
    }


async def _get_role_or_404(role_id: int, db: AsyncSession) -> Role:
    """Carga un Role por ID o lanza HTTP 404."""
    result = await db.execute(select(Role).where(Role.id == role_id))
    role   = result.scalars().first()
    if not role:
        raise HTTPException(status_code=404, detail="Rol no encontrado")
    return role


# ── GET /api/roles ─────────────────────────────────────────────────────────────
@router.get(
    "/roles",
    summary="Listar todos los roles activos con sus permisos",
)
async def list_roles(
    db: AsyncSession = Depends(get_db),
):
    """
    Retorna todos los roles con is_active=True, cada uno con su lista de permission keys.
    Endpoint público para permitir el registro de usuarios desde el LoginPage.
    """
    result = await db.execute(
        select(Role).where(Role.is_active == True).order_by(Role.id)
    )
    roles = result.scalars().all()
    data  = [await _role_with_permissions(r, db) for r in roles]

    return {"status": "success", "data": data}


# ── GET /api/roles/{role_id} ───────────────────────────────────────────────────
@router.get(
    "/roles/{role_id}",
    summary="Obtener un rol por ID con sus permisos",
)
async def get_role(
    role_id: int,
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    role = await _get_role_or_404(role_id, db)
    return {"status": "success", "data": await _role_with_permissions(role, db)}


# ── POST /api/roles ────────────────────────────────────────────────────────────
@router.post(
    "/roles",
    summary="Crear nuevo rol",
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("roles.manage"))],
)
async def create_role(
    body: dict = Body(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Crea un rol nuevo sin permisos asignados.
    Usa POST /api/roles/{id}/permissions para asignarle permisos después.
    Requiere el permiso 'roles.manage'.
    """
    name        = (body.get("name", "") or "").strip()
    description = (body.get("description", "") or "").strip() or None

    if not name:
        raise HTTPException(status_code=400, detail="El campo 'name' es requerido")

    # Nombre único
    existing = await db.execute(select(Role).where(Role.name == name))
    if existing.scalars().first():
        raise HTTPException(status_code=409, detail=f"Ya existe un rol con el nombre '{name}'")

    new_role = Role(name=name, description=description)
    db.add(new_role)
    await db.commit()
    await db.refresh(new_role)

    return {
        "status":  "success",
        "message": f"Rol '{name}' creado correctamente",
        "data":    await _role_with_permissions(new_role, db),
    }


# ── PUT /api/roles/{role_id} ───────────────────────────────────────────────────
@router.put(
    "/roles/{role_id}",
    summary="Actualizar nombre o descripción de un rol",
    dependencies=[Depends(require_permission("roles.manage"))],
)
async def update_role(
    role_id: int,
    body: dict = Body(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Actualiza name y/o description de un rol existente.
    Para cambiar los permisos asignados usar POST /api/roles/{id}/permissions.
    Requiere el permiso 'roles.manage'.

    Notas de comportamiento:
    - Si 'name' se omite o es vacío, no se modifica.
    - Si 'description' se omite (no aparece en el body), no se modifica.
    - Si 'description' llega como "" o null, se borra (queda NULL en BD).
    """
    role = await _get_role_or_404(role_id, db)

    new_name = (body.get("name", "") or "").strip()
    new_desc = body.get("description")   # None = ausente del body = no tocar

    if new_name and new_name != role.name:
        # Verificar que el nuevo nombre no esté en uso por otro rol
        conflict = await db.execute(
            select(Role).where(Role.name == new_name, Role.id != role_id)
        )
        if conflict.scalars().first():
            raise HTTPException(
                status_code=409,
                detail=f"Ya existe un rol con el nombre '{new_name}'",
            )
        role.name = new_name

    if new_desc is not None:
        role.description = new_desc.strip() or None

    db.add(role)
    await db.commit()
    await db.refresh(role)

    return {
        "status":  "success",
        "message": "Rol actualizado correctamente",
        "data":    await _role_with_permissions(role, db),
    }


# ── DELETE /api/roles/{role_id} ────────────────────────────────────────────────
@router.delete(
    "/roles/{role_id}",
    summary="Eliminar rol (hard-delete; desasigna usuarios primero)",
    dependencies=[Depends(require_permission("roles.manage"))],
)
async def delete_role(
    role_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Elimina el rol de forma permanente (hard-delete).
    Si hay usuarios asignados, primero deja AdminUser.role_id en NULL.
    Super Admin queda protegido para evitar perder acceso administrativo.

    Requiere el permiso 'roles.manage'.
    """
    role = await _get_role_or_404(role_id, db)

    protected_roles = {"Super Admin", "Super Administrator"}
    if role.name in protected_roles:
        raise HTTPException(
            status_code=409,
            detail=f"No se puede eliminar el rol protegido '{role.name}'.",
        )

    users_result = await db.execute(
        select(AdminUser).where(AdminUser.role_id == role_id)
    )
    assigned = users_result.scalars().all()
    reassigned_count = len(assigned)
    role_name = role.name

    if reassigned_count:
        await db.execute(
            update(AdminUser)
            .where(AdminUser.role_id == role_id)
            .values(role_id=None)
        )

    await db.execute(delete(RolePermission).where(RolePermission.role_id == role_id))
    await db.delete(role)
    await db.commit()

    return {
        "status":  "success",
        "message": f"Rol '{role_name}' eliminado correctamente",
        "reassigned_users": reassigned_count,
    }


# ── GET /api/permissions ───────────────────────────────────────────────────────
@router.get(
    "/permissions",
    summary="Catálogo completo de permisos del sistema (13 items)",
)
async def list_permissions(
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retorna el catálogo completo de permisos agrupados por módulo.
    Lo usa el panel de drag & drop de SettingsView para renderizar las "fichas" de permiso.
    Cualquier usuario autenticado puede consultarlo.
    """
    result = await db.execute(
        select(Permission).order_by(Permission.module, Permission.id)
    )
    permissions = result.scalars().all()

    data = [
        {
            "id":     p.id,
            "key":    p.key,
            "label":  p.label,
            "module": p.module,
        }
        for p in permissions
    ]

    return {"status": "success", "data": data}


# ── POST /api/roles/{role_id}/permissions ──────────────────────────────────────
@router.post(
    "/roles/{role_id}/permissions",
    summary="Reemplazar todos los permisos de un rol (operación atómica)",
    dependencies=[Depends(require_permission("roles.manage"))],
)
async def set_role_permissions(
    role_id: int,
    body: dict = Body(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Reemplaza TODOS los permisos del rol con el array recibido en una sola transacción:
      1. DELETE FROM role_permissions WHERE role_id = ?
      2. INSERT INTO role_permissions (role_id, permission_id) VALUES ...

    Si 'permission_ids' llega vacío o como [] el rol queda sin permisos (válido).
    Si algún ID no existe en el catálogo de permissions, falla con 400.
    Requiere el permiso 'roles.manage'.

    Body: { "permission_ids": [1, 3, 7, ...] }
    """
    await _get_role_or_404(role_id, db)

    permission_ids: list[int] = body.get("permission_ids", [])

    if not isinstance(permission_ids, list):
        raise HTTPException(
            status_code=400,
            detail="'permission_ids' debe ser un array de enteros",
        )

    # Validar que todos los IDs recibidos existen en el catálogo
    if permission_ids:
        valid_result = await db.execute(
            select(Permission.id).where(Permission.id.in_(permission_ids))
        )
        valid_ids = set(valid_result.scalars().all())
        invalid   = [i for i in permission_ids if i not in valid_ids]
        if invalid:
            raise HTTPException(
                status_code=400,
                detail=f"IDs de permiso no reconocidos: {invalid}",
            )

    # ── Transacción atómica ────────────────────────────────────────────────────
    # 1. Borrar todos los permisos actuales del rol
    await db.execute(delete(RolePermission).where(RolePermission.role_id == role_id))

    # 2. Insertar los nuevos (deduplica por si el cliente manda IDs repetidos)
    if permission_ids:
        db.add_all([
            RolePermission(role_id=role_id, permission_id=pid)
            for pid in set(permission_ids)
        ])

    await db.commit()
    # ──────────────────────────────────────────────────────────────────────────

    # Retornar el rol actualizado para que el frontend lo refleje sin hacer otro GET
    role = await _get_role_or_404(role_id, db)
    return {
        "status":  "success",
        "message": "Permisos actualizados correctamente",
        "data":    await _role_with_permissions(role, db),
    }
