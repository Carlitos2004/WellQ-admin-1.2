# WellQ Admin Console

Aplicación web de administración para gestionar clínicas, métricas financieras y operaciones de plataforma.

## Arquitectura

```
wellq-admin/
├── backend/          FastAPI + Python + Firestore + MongoDB (Motor)
└── frontend/         Vue 3 + Tailwind CSS + Keycloak
```

## Backend (FastAPI)

### Requisitos
- Python 3.12+
- Cuenta de servicio de Google Cloud con acceso a Firestore
- MongoDB Atlas (o local) para analíticas
- Instancia Keycloak con realm `wellq`

### Configuración
```bash
cd backend
cp .env.example .env
# Editar .env con tus valores (Keycloak URL, GCP Project, MongoDB URI)
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Endpoints principales
| Ruta | Descripción |
|------|-------------|
| `GET /api/auth/me` | Perfil del usuario autenticado |
| `GET /api/dashboard/health/kpis` | KPIs de Business Health |
| `GET /api/dashboard/health/mrr-chart` | Gráfico MRR (12 meses) |
| `GET /api/clinics` | Lista paginada de clínicas |
| `PATCH /api/clinics/{id}` | Actualizar clínica |
| `POST /api/clinics/{id}/impersonate` | Impersonar clínica |
| `GET /api/platform/costs` | Costos de infraestructura |
| `GET /api/platform/latency` | Latencia de modelos IA |
| `POST /api/notifications` | Enviar notificación |

## Frontend (Vue 3)

### Requisitos
- Node.js 20+
- Client público `wellq-admin-app` configurado en Keycloak

### Configuración
```bash
cd frontend
cp .env.example .env.local
# Editar .env.local con VITE_KEYCLOAK_URL, VITE_KEYCLOAK_REALM, VITE_KEYCLOAK_CLIENT_ID
npm install
npm run dev
```

### Estructura de vistas
| Ruta | Vista |
|------|-------|
| `/overview` | Dashboard: Business Health + Operational Status |
| `/clinics` | Gestión de Clínicas con drawer lateral |
| `/financials` | Facturación e ingresos |
| `/platform` | Platform Ops: costos, latencia, versiones |
| `/analytics` | Product Analytics |
| `/settings` | Configuración y perfil |
