"""SQLModel table definitions for the WellQ Admin Console."""

from datetime import datetime
from typing import Optional

from sqlalchemy import Column, ForeignKey, Integer, PrimaryKeyConstraint, Text
from sqlmodel import Field, SQLModel

class Role(SQLModel, table=True):
    """
    Roles de acceso configurables.

    Roles base seededados: Super Admin, Billing, Tech Support, Platform Ops.
    Los roles se borran hard (no soft delete) pero solo si no tienen usuarios
    asignados — el endpoint DELETE /api/roles/{role_id} lo verifica antes.

    Al borrar un rol, ON DELETE CASCADE limpia automáticamente sus entradas
    en role_permissions. Los AdminUser con ese role_id quedan con role_id=NULL
    (ON DELETE SET NULL en la FK de admin_users).
    """
    __tablename__ = "roles"

    id: Optional[int]          = Field(default=None, primary_key=True)
    name: str                  = Field(unique=True, index=True)    # "Super Admin" | "Billing" | etc.
    description: Optional[str] = Field(default=None, sa_column=Column(Text))
    is_active: bool            = Field(default=True)
    created_at: datetime       = Field(default_factory=datetime.utcnow)

class Permission(SQLModel, table=True):
    """
    Catálogo fijo de permisos del sistema (13 items).

    Los permisos son inmutables una vez seededados — no se crean ni eliminan
    desde la UI. Su catálogo completo está en seed.py: PERMISSIONS_DATA.

    Estructura del campo key: "<módulo>.<acción>" — ej: "billing.view".
    El frontend usa el campo key directamente para verificar acceso;
    el campo label se usa solo para mostrar en la UI de configuración de roles.
    """
    __tablename__ = "permissions"

    id: Optional[int]          = Field(default=None, primary_key=True)
    key: str                   = Field(unique=True, index=True)    # "billing.view" | "clinics.edit" | etc.
    label: str                 = Field()                            # "Ver Billing" | "Gestionar Clínicas" | etc.
    module: str                = Field(index=True)                  # "Billing" | "Clinics" | "Support" | etc.
    description: Optional[str] = Field(default=None, sa_column=Column(Text))

class RolePermission(SQLModel, table=True):
    """
    Tabla de unión N:M entre roles y permisos.

    PK compuesta (role_id, permission_id) implementada con PrimaryKeyConstraint
    porque SQLModel no soporta PKs compuestas nativamente.

    Ambas FKs tienen ON DELETE CASCADE:
      - Si se borra un rol      → se limpian todos sus permisos asignados.
      - Si se borra un permiso  → se limpia de todos los roles que lo tenían.

    La operación de guardar permisos de un rol es atómica:
    DELETE todos los permisos del rol → INSERT los nuevos. Ver routers/roles.py.
    """
    __tablename__ = "role_permissions"
    __table_args__ = (PrimaryKeyConstraint("role_id", "permission_id"),)

    role_id: int       = Field(
        sa_column=Column(Integer, ForeignKey("roles.id", ondelete="CASCADE"), nullable=False)
    )
    permission_id: int = Field(
        sa_column=Column(Integer, ForeignKey("permissions.id", ondelete="CASCADE"), nullable=False)
    )

class AdminUser(SQLModel, table=True):
    __tablename__ = "admin_users"

    id: Optional[int]              = Field(default=None, primary_key=True)
    user_id: str                   = Field(unique=True, index=True)
    full_name: str                 = Field()
    email: str                     = Field(unique=True, index=True)
    role: str                      = Field()                           # legacy: "super_admin" | "admin" | "viewer"
    status: str                    = Field(default="active")
    password_hash: Optional[str]   = Field(default=None)
    last_login: Optional[datetime] = Field(default=None)
    created_at: datetime           = Field(default_factory=datetime.utcnow)
    # ── RBAC: FK nullable al nuevo sistema de roles ───────────────────────────
    # Lógica de resolución de permisos:
    #   - role_id está seteado → usar permisos del rol RBAC asignado (JOIN a roles → role_permissions → permissions)
    #   - role_id es NULL y role == "super_admin" → conceder TODOS los permisos (backward compatibility)
    #   - role_id es NULL y role != "super_admin" → sin permisos (usuario legacy sin migrar)
    # ON DELETE SET NULL: si se elimina el rol, el usuario queda sin role_id pero sigue existiendo.
    role_id: Optional[int]         = Field(
        default=None,
        sa_column=Column(Integer, ForeignKey("roles.id", ondelete="SET NULL"), nullable=True)
    )
    # ── RBAC: token para flujo de invitación por email ────────────────────────
    # Generado al crear un usuario vía POST /api/users/invite.
    # El usuario activa su cuenta al primer login usando este token.
    # Se anula (NULL) una vez que el usuario completa la activación.
    invite_token: Optional[str]    = Field(default=None)

class PasswordResetToken(SQLModel, table=True):
    __tablename__ = "password_reset_tokens"

    id: Optional[int]              = Field(default=None, primary_key=True)
    reset_id: str                  = Field(unique=True, index=True)
    user_id: str                   = Field(index=True)
    email: str                     = Field(index=True)
    code_hash: str                 = Field()
    attempts: int                  = Field(default=0)
    expires_at: datetime           = Field(index=True)
    used_at: Optional[datetime]    = Field(default=None)
    created_at: datetime           = Field(default_factory=datetime.utcnow)
