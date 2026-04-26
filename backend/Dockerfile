# =============================================================================
# Dockerfile — WellQ Admin Backend (FastAPI)
# =============================================================================
# Construcción en dos etapas (multi-stage) para mantener la imagen final
# lo más pequeña posible (sin herramientas de build ni archivos temporales).

# ── Etapa 1: Construcción ─────────────────────────────────────────────────────
FROM python:3.12-slim AS builder

# Directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiar solo requirements primero para aprovechar la caché de capas de Docker.
# Si el código cambia pero requirements.txt no, esta capa no se reconstruye.
COPY requirements.txt .

# Instalar dependencias en una carpeta separada para copiar a la imagen final
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ── Etapa 2: Imagen final de producción ───────────────────────────────────────
FROM python:3.12-slim AS production

# Crear usuario no-root para seguridad (no correr como root en producción)
RUN useradd --create-home --shell /bin/bash wellq
WORKDIR /app

# Copiar las dependencias instaladas desde la etapa de construcción
COPY --from=builder /install /usr/local

# Copiar el código fuente de la aplicación
COPY --chown=wellq:wellq . .

# Cambiar al usuario no-root
USER wellq

# Puerto en el que escucha Uvicorn
EXPOSE 8000

# Variable de entorno para evitar buffering de stdout (ver logs en tiempo real)
ENV PYTHONUNBUFFERED=1

# Comando de inicio:
# - workers=4: 4 procesos para aprovechar múltiples CPUs
# - host 0.0.0.0: escuchar en todas las interfaces (necesario en Docker)
# - log-level info: logs informativos en producción
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4", "--log-level", "info"]
