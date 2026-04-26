from fastapi import APIRouter, Query

router = APIRouter(prefix="/api/search", tags=["Búsqueda Global"])

# 28. GET /search
@router.get(
    "",
    summary="Búsqueda universal de clínicas, facturas y usuarios",
    description="Simula una búsqueda global retornando resultados mixtos."
)
async def global_search(
    q: str = Query(..., description="Término de búsqueda", min_length=2)
):
    # JSON EN DURO - Retorna un mix de resultados simulando una búsqueda indexada
    return {
        "query": q,
        "total_results": 3,
        "results": [
            {
                "type": "clinic",
                "id": "CL-001",
                "title": "Clínica San José",
                "subtitle": "Tier: Enterprise | Status: Active",
                "url": "/clinics/CL-001"
            },
            {
                "type": "invoice",
                "id": "INV-2026-001",
                "title": "Factura #INV-2026-001",
                "subtitle": "Clínica San José | USD 1500 | Paid",
                "url": "/clinics/CL-001/invoices"
            },
            {
                "type": "user",
                "id": "USR-089",
                "title": "Juan Pérez",
                "subtitle": "Admin | admin@clinicasanjose.com",
                "url": "/settings/users/USR-089"
            }
        ]
    }
