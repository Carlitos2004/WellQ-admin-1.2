# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 🚀   G U Í A   D E   I N I C I O   R Á P I D O   🚀
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Bienvenido al proyecto. Sigue este paso a paso para instalar todo lo necesario y levantar la aplicación correctamente. Se divide en dos partes: **Backend** (el motor) y **Frontend** (la interfaz visual).

Para una instalación local desde cero, revisar también el archivo:

```txt
INSTALL.md
```

Ahí se explica qué archivos `.env` se necesitan y cómo se entregan las credenciales privadas.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## ⚙️ 1. CONFIGURACIÓN DEL BACKEND (El Motor)

Abre tu primera terminal en la raíz del proyecto. Aquí vamos a crear el entorno virtual, instalar todas las dependencias de Python y poblar la base de datos antes de encender el servidor.

Copia y pega estos comandos en orden:

```bash
# 1. Entramos a la carpeta del motor
cd backend

# 2. Creamos la "caja" o entorno virtual de Python
python -m venv venv

# 3. Activamos el entorno virtual (verás un (venv) al inicio de la línea)
.\venv\Scripts\activate

# 4. Actualizamos pip
python -m pip install --upgrade pip

# 5. Instalamos todas las dependencias base del proyecto
pip install -r requirements.txt

# 6. Cargamos los datos iniciales a la base de datos
python seed.py

# 7. Eliminamos duplicados históricos si corresponde
python cleanup_duplicates.py

# 8. Encendemos el motor
uvicorn app.main:app --reload --port 8000
```

Antes de ejecutar el backend, debe existir:

```txt
backend/.env
```

Ese archivo no se sube a Git. Se entrega por Drive privado, WhatsApp empresarial autorizado o canal interno definido por la empresa.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## ⚙️ 2. CONFIGURACIÓN DEL FRONTEND (La Interfaz)

Abre una segunda terminal en la raíz del proyecto.

```bash
# 1. Entramos a la carpeta visual
cd frontend

# 2. Instalamos todas las dependencias del frontend
npm install

# 3. Encendemos la interfaz
npm run dev
```

Antes de ejecutar el frontend, debe existir:

```txt
frontend/.env
```

Para ejecución local normalmente debe apuntar a:

```env
VITE_API_URL=http://localhost:8000
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## ⚙️ 3. CONFIGURACIÓN DE GIT HUB

Usar estos comandos cuando quieras subir cambios al repositorio.

Importante: no subir archivos privados como `.env` o `serviceAccountKey.json`.

```bash
# 1. Revisa qué archivos cambiaron
git status

# 2. Empaqueta los archivos modificados o creados que sí deben subirse
git add .

# 3. Ponle un título a tu paquete de cambios
git commit -m "Explica brevemente qué cambiaste"

# 4. Sube los cambios al repositorio
git push
```

