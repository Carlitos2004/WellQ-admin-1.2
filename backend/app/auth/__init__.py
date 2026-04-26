# Exportaciones convenientes del paquete auth
from app.auth.dependencies import get_current_user, require_admin, require_super_admin, CurrentUser

__all__ = ["get_current_user", "require_admin", "require_super_admin", "CurrentUser"]
