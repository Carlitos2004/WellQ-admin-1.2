from fastapi import APIRouter, Path, Body, status, Query

router = APIRouter(prefix="/api/clinics", tags=["Gestión de Clínicas"])

# 14. GET /clinics
@router.get(
    "",
    summary="Listar clínicas con filtros y paginación",
    description="Retorna JSON en duro simulando la lista paginada de clínicas.",
)
async def list_clinics(
    search: str | None = None,
    tier: str | None = None,
    status: str | None = None,
    page: int = 1,
    page_size: int = 20,
    sort_by: str = "name",
    sort_order: str = "asc",
):
    return {
        "total": 2,
        "page": page,
        "page_size": page_size,
        "data": [
            {
                "_id": "605c72e21234567890abcdef",
                "clinic_id": "CL-001",
                "name": "Clínica San José",
                "tier": "enterprise",
                "status": "active",
                "contact": {
                    "phone": "+56911111111",
                    "email": "contacto@clinicasanjose.com"
                },
                "patient_count": 1500
            },
            {
                "_id": "605c72e21234567890abcdee",
                "clinic_id": "CL-002",
                "name": "Centro Médico Integral",
                "tier": "pro",
                "status": "active",
                "contact": {
                    "phone": "+56922222222",
                    "email": "hola@centromedico.com"
                },
                "patient_count": 340
            }
        ]
    }

# 15. POST /clinics
@router.post(
    "",
    summary="Registro de una nueva clínica en el sistema",
    status_code=status.HTTP_201_CREATED
)
async def create_clinic(body: dict = Body(...)):
    return {
        "status": "success",
        "message": "Clínica registrada correctamente",
        "data": {
            "_id": "605c72e21234567890abcdff",
            "clinic_id": "CL-003",
            "name": body.get("name", "Nueva Clínica"),
            "status": "onboarding",
            "tier": body.get("tier", "basic")
        }
    }

# 24. POST /clinics/bulk/email
@router.post(
    "/bulk/email",
    summary="Envío de comunicaciones masivas a encargados de clínicas",
    description="Simula el envío de un correo a múltiples clínicas."
)
async def bulk_email(body: dict = Body(...)):
    return {
        "status": "success",
        "message": f"Correos encolados para {len(body.get('clinic_ids', []))} clínicas.",
        "subject": body.get("subject", "Actualización importante")
    }

# 25. GET /clinics/export
@router.get(
    "/export",
    summary="Exportación de lista de clínicas",
    description="Retorna una URL simulada de descarga para el CSV o Excel."
)
async def export_clinics(format: str = Query("csv", description="Formato: csv o excel")):
    return {
        "status": "success",
        "download_url": f"https://storage.wellq.co/exports/clinics_export_2026.{format}",
        "expires_in": "3600s"
    }

# 16. GET /clinics/{clinic_id}
@router.get(
    "/{clinic_id}",
    summary="Obtener detalle de una clínica",
)
async def get_clinic(clinic_id: str = Path(..., description="ID único de la clínica")):
    return {
        "_id": "605c72e21234567890abcdef",
        "clinic_id": clinic_id,
        "name": "Clínica San José",
        "status": "active",
        "tier": "enterprise",
        "internal_notes": "Cliente clave, renovó por 2 años.",
        "created_at": "2023-05-15T12:00:00Z"
    }

# 17. PATCH /clinics/{clinic_id}
@router.patch(
    "/{clinic_id}",
    summary="Actualizar campos de una clínica",
)
async def update_clinic(
    clinic_id: str = Path(..., description="ID de la clínica a actualizar"),
    updates: dict = Body(...),
):
    return {
        "status": "success",
        "message": f"Clínica {clinic_id} actualizada correctamente",
        "updated_fields": list(updates.keys())
    }

# 18. GET /clinics/{clinic_id}/contact
@router.get(
    "/{clinic_id}/contact",
    summary="Información de contacto y facturación de la clínica"
)
async def get_clinic_contact(clinic_id: str = Path(...)):
    return {
        "clinic_id": clinic_id,
        "contact_info": {
            "primary_name": "Juan Pérez",
            "primary_email": "admin@clinicasanjose.com",
            "primary_phone": "+56911111111"
        },
        "billing_info": {
            "company_name": "Inversiones San José SpA",
            "tax_id": "77.123.456-7",
            "billing_email": "facturacion@clinicasanjose.com",
            "address": "Av. Providencia 1234, Santiago"
        }
    }

# 19. GET /clinics/{clinic_id}/subscription
@router.get(
    "/{clinic_id}/subscription",
    summary="Detalles del plan de suscripción contratado"
)
async def get_clinic_subscription(clinic_id: str = Path(...)):
    return {
        "clinic_id": clinic_id,
        "subscription": {
            "plan_name": "Enterprise Anual",
            "status": "active",
            "mrr_value": 1500,
            "currency": "USD",
            "started_at": "2023-05-15T00:00:00Z",
            "renews_at": "2027-01-01T00:00:00Z",
            "features_enabled": ["custom_branding", "api_access", "priority_support"]
        }
    }

# 20. GET /clinics/{clinic_id}/usage
@router.get(
    "/{clinic_id}/usage",
    summary="Estadísticas de uso de la plataforma por la clínica"
)
async def get_clinic_usage(clinic_id: str = Path(...)):
    return {
        "clinic_id": clinic_id,
        "period": "last_30_days",
        "metrics": {
            "active_clinicians": 45,
            "patient_sessions_completed": 3200,
            "ai_processing_minutes": 15400,
            "api_calls": 450000
        }
    }

# 21. GET /clinics/{clinic_id}/license
@router.get(
    "/{clinic_id}/license",
    summary="Monitoreo de utilización de licencias de pacientes"
)
async def get_clinic_license(clinic_id: str = Path(...)):
    return {
        "clinic_id": clinic_id,
        "licenses": {
            "total_limit": 5000,
            "currently_active": 4250,
            "available": 750,
            "utilization_percentage": 85.0
        },
        "warning_threshold_reached": False
    }

# 22. GET /clinics/{clinic_id}/invoices
@router.get(
    "/{clinic_id}/invoices",
    summary="Historial de facturas emitidas a la clínica"
)
async def get_clinic_invoices(clinic_id: str = Path(...)):
    return {
        "clinic_id": clinic_id,
        "pending_balance": 0,
        "invoices": [
            {
                "invoice_id": "INV-2026-001",
                "amount": 1500,
                "currency": "USD",
                "status": "paid",
                "issued_at": "2026-01-01T00:00:00Z",
                "pdf_url": "https://storage.wellq.co/invoices/INV-2026-001.pdf"
            },
            {
                "invoice_id": "INV-2025-012",
                "amount": 1500,
                "currency": "USD",
                "status": "paid",
                "issued_at": "2025-12-01T00:00:00Z",
                "pdf_url": "https://storage.wellq.co/invoices/INV-2025-012.pdf"
            }
        ]
    }

# 23. POST /clinics/{clinic_id}/impersonate
@router.post(
    "/{clinic_id}/impersonate",
    summary="Ingreso como soporte técnico",
    description="JSON en duro simulando un token de acceso a la cuenta del hospital.",
    status_code=status.HTTP_201_CREATED,
)
async def impersonate_clinic(
    clinic_id: str = Path(..., description="ID de la clínica a impersonar"),
    body: dict = Body(..., description="Requiere 'reason' mayor a 10 caracteres"),
):
    reason = body.get("reason", "")
    if len(reason) < 10:
        # Aunque es JSON en duro, dejamos esta pequeña lógica que te pide la empresa por ética
        return {
            "success": False,
            "error": "La justificación ética debe tener más de 10 caracteres."
        }

    return {
        "success": True,
        "message": "Impersonation session started successfully.",
        "session_id": "sess_9876543210",
        "temp_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiw...",
        "expires_at": "2026-04-25T14:28:00Z",
        "clinic_id": clinic_id,
        "reason_logged": reason
    }