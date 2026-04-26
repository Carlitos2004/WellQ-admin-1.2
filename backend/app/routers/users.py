from fastapi import APIRouter, Path, Body, status

router = APIRouter(prefix="/api/users", tags=["Usuarios"])

# 44. GET /users/me
@router.get("/me", summary="Datos del perfil del super-administrador logueado")
async def get_my_profile():
    return {
        "status": "success",
        "data": {
            "user_id": "USR-SUPER-001",
            "full_name": "Carlos Administrador",
            "email": "carlos.admin@wellq.co",
            "role": "super_admin",
            "permissions": ["all"],
            "last_login": "2026-04-25T14:30:00Z"
        }
    }

# 45. GET /users
@router.get("", summary="Lista de usuarios con acceso a la consola")
async def list_users():
    return {
        "total": 3,
        "data": [
            {"user_id": "USR-SUPER-001", "name": "Carlos Admin", "role": "super_admin", "status": "active"},
            {"user_id": "USR-ADMIN-002", "name": "Ana Soporte", "role": "admin", "status": "active"},
            {"user_id": "USR-VIEW-003", "name": "Juan Auditor", "role": "viewer", "status": "inactive"}
        ]
    }

# 46. POST /users
@router.post("", summary="Creación de una nueva cuenta de administrador", status_code=status.HTTP_201_CREATED)
async def create_user(body: dict = Body(...)):
    return {
        "status": "success",
        "message": "Usuario creado correctamente",
        "data": {
            "user_id": "USR-NEW-999",
            "email": body.get("email"),
            "role": body.get("role", "admin")
        }
    }

# 47. PATCH /users/{user_id}/role
@router.patch("/{user_id}/role", summary="Modificación de permisos y roles")
async def update_user_role(user_id: str = Path(...), body: dict = Body(...)):
    return {
        "status": "success",
        "message": f"Rol del usuario {user_id} actualizado a {body.get('role')}"
    }
