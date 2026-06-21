"""Compatibility facade for WellQ Admin SQLModel database models.

The canonical table definitions live in ``app.models``. This module remains
so existing imports like ``from app.models_db import Clinic`` keep working.
"""

from app.models import *  # noqa: F401,F403
