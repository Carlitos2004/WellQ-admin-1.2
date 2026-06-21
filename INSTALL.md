# Manual de instalacion local 

Arquitectura:

- Base de datos: Neon/PostgreSQL.
- Backend: FastAPI.
- Frontend: React/Vite.
- Despliegue actual: backend en Google Cloud Run y frontend en Vercel.

## 1. Requisitos

Instalar:

- Git.
- Python 3.11 o 3.12.
- Node.js `^20.19.0` o `>=22.12.0`.
- npm.

Verificar:

```bash
git --version
python --version
node --version
npm --version
```

## 2. Descargar proyecto

```bash
git clone https://github.com/Carlitos2004/WellQ-admin-1.2.git
cd WellQ-admin-1.2
```

Tambien se puede descargar el `.zip` desde GitHub y descomprimirlo.

## 3. Archivos privados

Solicitar los archivos `.env` al responsable tecnico. No vienen en Git porque tienen credenciales.

Para correr backend y frontend localmente:

```txt
backend/.env
frontend/.env
```

No subir estos archivos a Git.

En el repositorio solo quedan las plantillas:

```txt
backend/.env.example
frontend/.env.example
```

## 4. Configurar backend

Crear o copiar:

```txt
backend/.env
```


## 5. Instalar backend

```bash
cd backend
python -m venv venv
.\venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Opcional, solo si se necesita cargar datos iniciales en una base de pruebas:

```bash
python seed.py
python cleanup_duplicates.py
```

Ejecutar backend:

```bash
uvicorn app.main:app --reload --port 8000
```

Verificar:

```txt
http://localhost:8000/health
```

## 6. Configurar frontend

Crear o copiar:

```txt
frontend/.env
```

Para usar backend local:

```env
VITE_API_URL=http://localhost:8000
```

Para usar backend desplegado en Google Cloud Run:

```env
VITE_API_URL=https://URL-DEL-BACKEND-EN-GOOGLE-CLOUD-RUN
```

## 7. Instalar frontend

Abrir otra terminal desde la raiz del proyecto:

```bash
cd frontend
npm install
npm run dev
```

Abrir:

```txt
http://localhost:5173
```

## 8. Verificacion

La instalacion esta correcta si:

- El backend responde en `/health`.
- El frontend carga en `http://localhost:5173`.
- El login funciona con un usuario entregado por la empresa.
- Las vistas cargan datos sin errores de CORS ni errores 500.

## 9. Seguridad

- No subir `backend/.env`.
- No subir `frontend/.env`.
- No pegar claves reales en `README.md`, `INSTALL.md` ni capturas.
- Entregar credenciales solo por canal privado autorizado.
