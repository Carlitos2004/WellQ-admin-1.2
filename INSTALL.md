# Manual de instalacion local - WellQ Admin 1.2

Este manual permite instalar y ejecutar el proyecto localmente desde una copia limpia del repositorio. El objetivo es que la empresa pueda compilar, levantar y revisar el sistema en un computador local.

El proyecto tiene dos partes:

- `backend`: API en Python con FastAPI.
- `frontend`: interfaz en React con Vite.

## 1. Requisitos previos

Instalar antes de comenzar:

- Git.
- Python 3.11 o 3.12. Recomendado: Python 3.12.
- Node.js compatible con Vite: `^20.19.0` o `>=22.12.0`.
- npm incluido con Node.js.
- Acceso a las credenciales privadas del proyecto.

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

Archivos privados requeridos:

```txt
backend/.env
frontend/.env
backend/serviceAccountKey.json
```

`backend/serviceAccountKey.json` solo es necesario si se van a usar credenciales reales de Google Cloud / Firebase / Firestore. Si el ambiente de pruebas no usa Firestore, el responsable tecnico debe confirmarlo.

No subir estos archivos a Git:

```txt
backend/.env
frontend/.env
backend/serviceAccountKey.json
```

En el repositorio si pueden quedar estos archivos de ejemplo:

```txt
backend/.env.example
frontend/.env.example
```

## 4. Variables de entorno del backend

Crear el archivo:

```txt
backend/.env
```

Puede copiarse desde:

```txt
backend/.env.example
```

Contenido esperado:

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

GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
GCP_PROJECT_ID=
FIRESTORE_DATABASE=(default)

MONGODB_URI=
MONGODB_DB_NAME=wellq_analytics

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_APP_PASSWORD=
SMTP_FROM_NAME=WellQ Admin
SMTP_FROM_EMAIL=

RESEND_API_KEY=
RESEND_FROM_EMAIL=WellQ Admin <onboarding@resend.dev>
```

Notas:

- `DATABASE_URL` debe ser la conexion de Neon/PostgreSQL en formato compatible con SQLAlchemy async, por ejemplo `postgresql+asyncpg://...`.
- `JWT_SECRET` debe ser una cadena larga y privada. No usar valores de ejemplo en ambientes reales.
- `KEYCLOAK_*` corresponde a la configuracion de autenticacion.
- `GOOGLE_APPLICATION_CREDENTIALS` normalmente apunta a `./serviceAccountKey.json` dentro de `backend`.
- `MONGODB_URI` corresponde a MongoDB Atlas si el ambiente lo usa.
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

Contenido esperado para ejecucion local:

```env
VITE_API_URL=http://localhost:8000
```

## 6. Instalar backend

Abrir una terminal en la raiz del proyecto y ejecutar:

```bash
cd backend
python -m venv venv
.\venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Antes de ejecutar el backend, confirmar que existen:

```txt
backend/.env
backend/serviceAccountKey.json
```

Si el ambiente entregado no usa Google Cloud / Firestore, confirmar con el responsable tecnico si `serviceAccountKey.json` puede quedar como archivo vacio de pruebas.

## 7. Preparar datos iniciales

Con el entorno virtual activo y dentro de `backend`, ejecutar:

```bash
python seed.py
python cleanup_duplicates.py
```

Importante:

- Estos scripts usan `DATABASE_URL` desde `backend/.env`.
- Ejecutarlos solo contra una base de datos de desarrollo o pruebas, salvo autorizacion expresa.
- No ejecutarlos contra produccion sin confirmacion de la empresa.

## 8. Ejecutar backend

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

El frontend debe apuntar al backend local:

```txt
VITE_API_URL=http://localhost:8000
```

## 11. Verificacion final

La instalacion queda correcta si:

- El backend responde en `http://localhost:8000/health`.
- El frontend carga en `http://localhost:5173`.
- La app permite iniciar sesion con un usuario de prueba entregado por la empresa.
- Las pantallas principales cargan datos sin errores de CORS ni errores 500.

## 12. Problemas comunes

### El backend no arranca por variables faltantes

Revisar que exista `backend/.env` y que tenga todas las variables del archivo `backend/.env.example`.

### Error de base de datos

Revisar `DATABASE_URL`. Debe ser una conexion valida a Neon/PostgreSQL y debe usar el formato `postgresql+asyncpg://...`.

### Error de credenciales de Google

Revisar:

```txt
backend/serviceAccountKey.json
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
GCP_PROJECT_ID
FIRESTORE_DATABASE
```

### El frontend no conecta con el backend

Revisar que el backend este corriendo en:

```txt
http://localhost:8000
```

Y que `frontend/.env` tenga:

```env
VITE_API_URL=http://localhost:8000
```

### Puerto ocupado

Si `8000` esta ocupado, cerrar el proceso que lo usa o levantar Uvicorn en otro puerto. Si se cambia el puerto del backend, actualizar tambien `frontend/.env`.

## 13. Seguridad

- No subir `.env` a Git.
- No subir `serviceAccountKey.json` real a Git.
- No pegar claves reales en `README.md`, `INSTALL.md` ni capturas de pantalla.
- Entregar credenciales solo por Drive privado, WhatsApp empresarial autorizado o gestor de secretos.
- Usar ambiente de pruebas para demostraciones locales. Evitar apuntar a produccion salvo autorizacion expresa.
