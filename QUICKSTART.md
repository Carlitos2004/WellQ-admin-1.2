# Cómo correr esto en local

## Lo que necesitas instalar antes

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Python 3.12+](https://www.python.org/downloads/)
- [Node.js 20+](https://nodejs.org/)

---

## Paso 1 — Copiar los archivos de configuración

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Solo hay que hacerlo una vez. Los valores ya están listos para desarrollo local.

---

## Terminal 1 — Keycloak (servidor de login)

```bash
docker-compose up keycloak keycloak-setup
```

Espera hasta ver `[setup] Listo. Usuario de prueba configurado correctamente.` — tarda ~1 minuto la primera vez.

---

## Terminal 2 — Backend

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

---

## Terminal 3 — Frontend

```bash
cd frontend
npm install
npm run dev
```

---

Abre `http://localhost:5173` e inicia sesión con:

```
Email:      admin@wellq.com
Contraseña: WellQ@2024
```
