# Manual de instalacion local - WellQ Admin 1.2

Este manual permite instalar y ejecutar el proyecto desde una copia limpia del repositorio.

Arquitectura actual del proyecto:

- Base de datos: Neon/PostgreSQL.
- Backend: FastAPI desplegado en Google Cloud Run.
- Frontend: React/Vite desplegado en Vercel.

Para pruebas locales se pueden usar dos modos:

- Modo completo local: ejecutar backend y frontend en el computador.
- Modo frontend local: ejecutar solo frontend local conectado al backend desplegado en Google Cloud Run.

## 1. Requisitos previos

Instalar antes de comenzar:

- Git.
- Python 3.11 o 3.12. Recomendado: Python 3.12.
- Node.js compatible con Vite: `^20.19.0` o `>=22.12.0`.
- npm incluido con Node.js.
- Acceso a las variables privadas del proyecto.

Verificar versiones:

```bash
git --version
python --version
node --version
npm --version
```

## 2. Descargar el proyecto

Opcion A: clonar desde GitHub.

```bash
git clone https://github.com/Carlitos2004/WellQ-admin-1.2.git
cd WellQ-admin-1.2
```

Opcion B: descargar el `.zip` desde GitHub, descomprimirlo y abrir la carpeta del proyecto.

## 3. Archivos privados necesarios

El proyecto necesita archivos de configuracion que no deben subirse a Git porque contienen credenciales y datos sensibles.

Solicitar al responsable tecnico estos archivos por un canal privado autorizado por la empresa, por ejemplo:

- Google Drive privado con acceso restringido.
- WhatsApp empresarial o canal interno autorizado.
- Gestor de secretos como 1Password, Bitwarden o similar.

Para ejecutar backend y frontend localmente:

```txt
backend/.env
frontend/.env
```

Para ejecutar solo el frontend local conectado al backend de Google Cloud Run:

```txt
frontend/.env
```

No subir estos archivos a Git:

```txt
backend/.env
frontend/.env
```

En el repositorio si pueden quedar estos archivos de ejemplo:

```txt
backend/.env.example
frontend/.env.example
```

## 4. Variables de entorno del backend

Crear el archivo solo si se va a ejecutar el backend localmente:

```txt
backend/.env
```

Puede copiarse desde:

```txt
backend/.env.example
```

Plantilla de variables necesarias, sin credenciales reales:

```env
APP_ENV=development
APP_PORT=8000
DEBUG=true
ALLOWED_ORIGINS=http://localhost:5173

DATABASE_URL=

JWT_SECRET=
JWT_ALGORITHM=HS256

KEYCLOAK_URL=
KEYCLOAK_REALM=wellq
KEYCLOAK_CLIENT_ID=
KEYCLOAK_CLIENT_SECRET=
KEYCLOAK_ADMIN_ROLE=wellq-admin

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_APP_PASSWORD=
SMTP_FROM_NAME=WellQ Admin
SMTP_FROM_EMAIL=
```

Notas:

- `DATABASE_URL` es la conexion a Neon/PostgreSQL. Debe usar formato compatible con SQLAlchemy async, por ejemplo `postgresql+asyncpg://...`.
- `JWT_SECRET` debe ser una cadena larga y privada.
- `KEYCLOAK_*` corresponde a la configuracion de autenticacion.
- `SMTP_*` se usa para recuperacion de contrasena por correo.

## 5. Variables de entorno del frontend

Crear el archivo:

```txt
frontend/.env
```

Puede copiarse desde:

```txt
frontend/.env.example
```

Si el frontend local debe usar backend local:

```env
VITE_API_URL=http://localhost:8000
```

Si el frontend local debe usar el backend desplegado en Google Cloud Run:

```env
VITE_API_URL=https://URL-DEL-BACKEND-EN-GOOGLE-CLOUD-RUN
```

Usar la URL real entregada por el responsable tecnico.

## 6. Instalar backend local

Este paso solo es necesario si se quiere ejecutar el backend localmente. Si se usara el backend ya desplegado en Google Cloud Run, se puede saltar a la instalacion del frontend.

Abrir una terminal en la raiz del proyecto y ejecutar:

```bash
cd backend
python -m venv venv
.\venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Antes de ejecutar el backend local, confirmar que existe:

```txt
backend/.env
```

## 7. Preparar datos iniciales

Ejecutar este paso solo si se esta usando una base de datos de desarrollo o pruebas.

Con el entorno virtual activo y dentro de `backend`, ejecutar:

```bash
python seed.py
python cleanup_duplicates.py
```

Importante:

- Estos scripts usan `DATABASE_URL` desde `backend/.env`.
- Ejecutarlos solo contra una base de datos de desarrollo o pruebas, salvo autorizacion expresa.
- No ejecutarlos contra produccion sin confirmacion de la empresa.

## 8. Ejecutar backend local

Con el entorno virtual activo y dentro de `backend`, ejecutar:

```bash
uvicorn app.main:app --reload --port 8000
```

Verificar en el navegador:

```txt
http://localhost:8000/health
```

Si `DEBUG=true`, tambien se puede revisar:

```txt
http://localhost:8000/docs
```

## 9. Instalar frontend

Abrir una segunda terminal en la raiz del proyecto y ejecutar:

```bash
cd frontend
npm install
```

No es necesario instalar manualmente `sweetalert2`, `xlsx`, `xlsx-js-style` o `exceljs` si ya estan declarados en `package.json`. El comando `npm install` instala todo lo necesario desde `package.json` y `package-lock.json`.

Confirmar que existe:

```txt
frontend/.env
```

## 10. Ejecutar frontend

Dentro de `frontend`, ejecutar:

```bash
npm run dev
```

Abrir en el navegador:

```txt
http://localhost:5173
```

## 11. Verificacion final

La instalacion queda correcta si:

- El frontend carga en `http://localhost:5173`.
- Si se usa backend local, el backend responde en `http://localhost:8000/health`.
- Si se usa backend de Google Cloud Run, `VITE_API_URL` apunta a la URL real del backend desplegado.
- La app permite iniciar sesion con un usuario de prueba entregado por la empresa.
- Las pantallas principales cargan datos sin errores de CORS ni errores 500.

## 12. Problemas comunes

### El backend local no arranca por variables faltantes

Revisar que exista `backend/.env` y que tenga todas las variables necesarias del archivo `backend/.env.example`.

### Error de base de datos

Revisar `DATABASE_URL`. Debe ser una conexion valida a Neon/PostgreSQL y debe usar el formato `postgresql+asyncpg://...`.

### El frontend no conecta con el backend

Revisar `frontend/.env`.

Para backend local:

```env
VITE_API_URL=http://localhost:8000
```

Para backend desplegado en Google Cloud Run:

```env
VITE_API_URL=https://URL-DEL-BACKEND-EN-GOOGLE-CLOUD-RUN
```

### Puerto ocupado

Si `8000` esta ocupado, cerrar el proceso que lo usa o levantar Uvicorn en otro puerto. Si se cambia el puerto del backend local, actualizar tambien `frontend/.env`.

## 13. Seguridad

- No subir `.env` a Git.
- No pegar claves reales en `README.md`, `INSTALL.md` ni capturas de pantalla.
- Entregar credenciales solo por Drive privado, WhatsApp empresarial autorizado o gestor de secretos.
- Usar ambiente de pruebas para demostraciones locales. Evitar apuntar a produccion salvo autorizacion expresa.
