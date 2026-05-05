"""
db/neon.py — Conexión asíncrona a Neon (PostgreSQL) con SQLModel
"""

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlmodel import SQLModel
import structlog

from app.config import settings

logger = structlog.get_logger(__name__)

# Singleton — se inicializa en init_neon(), NO al importar
_engine = None
_session_factory = None


def init_neon() -> None:
    """Inicializa el engine. Llamar UNA sola vez en el lifespan de FastAPI."""
    global _engine, _session_factory

    try:
        _engine = create_async_engine(
            settings.database_url,
            pool_size=5,
            max_overflow=5,
            pool_pre_ping=True,
            echo=settings.debug,
            connect_args={"ssl": True},
        )

        _session_factory = async_sessionmaker(
            bind=_engine,
            class_=AsyncSession,
            expire_on_commit=False,
        )

        logger.info(
            "Engine Neon (PostgreSQL) inicializado correctamente",
            host=settings.database_url.split("@")[-1].split("/")[0],
        )

    except Exception as e:
        logger.error("Error al inicializar Neon/PostgreSQL", error=str(e))
        raise


async def close_neon() -> None:
    """Cierra el pool de conexiones al detener la app."""
    global _engine
    if _engine is not None:
        await _engine.dispose()
        logger.info("Conexión Neon cerrada correctamente.")


async def create_db_tables() -> None:
    """Crea todas las tablas registradas en SQLModel.metadata si no existen."""
    global _engine
    if _engine is None:
        raise RuntimeError("Neon no inicializado. Llama a init_neon() primero.")

    async with _engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
        logger.info("Tablas de Neon verificadas/creadas correctamente.")


def get_session_factory():
    if _session_factory is None:
        raise RuntimeError("Neon no inicializado.")
    return _session_factory


async def get_db():
    """Dependencia FastAPI — entrega una sesión de BD por request."""
    if _session_factory is None:
        raise RuntimeError("Neon no inicializado. Llama a init_neon() primero.")

    async with _session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
