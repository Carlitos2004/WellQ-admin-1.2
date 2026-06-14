# 🐳 Entorno local con Docker (base de datos aislada)

Esta copia usa un **Postgres local en Docker** en vez de la base de Neon compartida.
Cada desarrollador trabaja contra su propia base — nadie pisa los datos del otro y
no se necesita ninguna credencial de Neon.

## Requisitos
- Docker Desktop
- Python 3.11+
- Node 18+

## Puesta en marcha (desde cero)

```bash
# 1. Levantar la base de datos local
docker compose up -d

# 2. Configurar variables de entorno (copiar las plantillas)
#    Windows PowerShell:
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env
#    Linux/Mac:  cp backend/.env.example backend/.env  (idem frontend)
#    Los valores por defecto ya apuntan al Postgres local — no hace falta cambiar nada.

# 3. Backend
cd backend
python -m venv venv
.\venv\Scripts\activate        # Windows   (Linux/Mac: source venv/bin/activate)
pip install -r requirements.txt
pip install bcrypt
python seed.py                 # crea tablas, siembra permisos/roles y datos de ejemplo
uvicorn app.main:app --reload --port 8000

# 4. Frontend (en otra terminal)
cd frontend
npm install
npm run dev
```

App: http://localhost:5173 — API: http://localhost:8000/docs

## Cómo cambiar entre base LOCAL y NEON
Todo se controla con dos variables en `backend/.env`:

| Entorno | DATABASE_URL | DB_SSL |
|---|---|---|
| Local (Docker) | `postgresql+asyncpg://wellq:wellq_local_pass@localhost:5432/wellq` | `false` |
| Neon | `postgresql+asyncpg://<usuario>:<pass>@<host>.neon.tech/<db>` | `true` |

> Ya **no hay URLs hardcodeadas**: `seed.py` y `cleanup_duplicates.py` leen `DATABASE_URL` del `.env`.

## Notas
- `.env` está en `.gitignore` → tus secretos no se suben. Solo se versionan los `.env.example`.
- **No subas volcados de datos reales** al repo (contienen datos de clientes). Para datos de prueba usa `python seed.py`.
- Parar la base sin borrar datos: `docker compose down`. Borrar también los datos: `docker compose down -v`.
- Esta carpeta es un clon independiente del repo. No se ha hecho ningún commit ni push.
