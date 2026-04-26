from fastapi import APIRouter, Body, status

# Se comentan las dependencias reales para evitar errores de validación de tokens
# from app.auth.dependencies import get_current_user, CurrentUser

router = APIRouter(prefix="/api/auth", tags=["Autenticación y Seguridad"])

# 1. POST /auth/login
@router.post(
    "/login", 
    summary="Valida usuario y contraseña; entrega token de sesión (JWT)",
    status_code=status.HTTP_200_OK
)
async def login(body: dict = Body(...)):
    # JSON EN DURO - Simula la validación de Keycloak
    return {
        "status": "success",
        "message": "Autenticación exitosa",
        "data": {
            "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyMDEifQ.simulado",
            "refresh_token": "def502002f2324709f1a.simulado",
            "token_type": "Bearer",
            "expires_in": 3600,
            "user": {
                "auth_id": "b3e1c2d3-4f5g-6h7i-8j9k-0l1m2n3o4p5q",
                "email": body.get("email", "admin@wellq.co"),
                "role": "wellq-super-admin"
            }
        }
    }

# 2. POST /auth/logout
@router.post(
    "/logout",
    summary="Registrar cierre de sesión",
    description="Simula el cierre de sesión exitoso.",
    status_code=status.HTTP_200_OK
)
async def logout():
    # JSON EN DURO - Respuesta de éxito para que el frontend limpie su estado
    return {
        "status": "success",
        "message": "Sesión cerrada correctamente en el servidor simulado.",
        "action": "clear_local_storage"
    }

# 3. POST /auth/refresh
@router.post(
    "/refresh", 
    summary="Renueva el token de sesión expirado automáticamente",
    status_code=status.HTTP_200_OK
)
async def refresh_token(body: dict = Body(...)):
    # JSON EN DURO - Simula la rotación del token
    return {
        "status": "success",
        "message": "Token de sesión renovado",
        "data": {
            "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.NEW_TOKEN_GENERATED.simulado",
            "token_type": "Bearer",
            "expires_in": 3600
        }
    }

# Endpoint Adicional /me (Mapeado a la colección de MongoDB)
@router.get(
    "/me",
    summary="Obtener perfil del usuario autenticado",
    description="Retorna JSON en duro del perfil administrativo actual.",
)
async def get_me():
    # JSON EN DURO - Estructura basada en la colección 'usuarios' del modelo
    # Simulamos el perfil del desarrollador/administrador principal
    return {
        "_id": "605c72e21234567890user01",
        "auth_id": "b3e1c2d3-4f5g-6h7i-8j9k-0l1m2n3o4p5q", # UUID de Keycloak
        "email": "admin@wellq.co",
        "full_name": "Admin WellQ Master",
        "role": "wellq-super-admin",
        "clinic_id": None, # Null porque es Super Admin global, no pertenece a una sola clínica
        "state": "active",
        "preferences": {
            "language": "es",
            "dark_mode": True
        }
    }