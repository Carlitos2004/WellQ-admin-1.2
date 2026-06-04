# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 🚀   G U Í A   D E   I N I C I O   R Á P I D O   🚀
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


Bienvenido al proyecto. Sigue este paso a paso para instalar todo lo necesario y levantar la aplicación correctamente. Se divide en dos partes: **Backend** (el motor) y **Frontend** (la interfaz visual).


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


## ⚙️ 1. CONFIGURACIÓN DEL BACKEND (El Motor)

Abre tu primera terminal en la raíz del proyecto. Aquí vamos a crear el entorno virtual, instalar todas las dependencias de Python (incluyendo herramientas de seguridad como `bcrypt`) y poblar la base de datos antes de encender el servidor.

Copia y pega estos comandos en orden:

```bash
# 1. Entramos a la carpeta del motor
cd backend

# 2. Creamos la "caja" o entorno virtual de Python
python -m venv venv

# 3. Activamos el entorno virtual (verás un (venv) al inicio de la línea)
.\venv\Scripts\activate

# 4. Instalamos todas las dependencias base del proyecto
pip install -r requirements.txt

# 5. Instalamos bcrypt (necesario para encriptar contraseñas)
pip install bcrypt

# 6. Cargamos los datos iniciales a la base de datos
python seed.py
# 7. eliminar duplicados 
python cleanup_duplicates.py

# 8. Encendemos el motor
uvicorn app.main:app --reload --port 8000
```


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


## ⚙️ 1. CONFIGURACIÓN DEL frontend  (El Motor)

```bash
# 1. Entramos a la carpeta visual
cd frontend

# 2. Instalamos todas las dependencias base del proyecto (comando hermano necesario)
npm install

# 3. Instalamos la librería específica para manejar archivos Excel
npm install xlsx
npm install xlsx-js-style
npm install exceljs

# 4. Encendemos la interfaz
npm run dev
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


## ⚙️ 1. CONFIGURACIÓN DE GIT HUB

```bash
# 1. Empaqueta todos los archivos modificados o creados
git add .

# 2. Ponle un título a tu paquete de cambios (reemplaza el texto entre comillas)
git commit -m "Explica brevemente qué cambiaste"

# 3. Sube los cambios al repositorio
git push
```
