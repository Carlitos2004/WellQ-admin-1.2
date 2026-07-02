from fastapi import APIRouter, Query, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, cast, String
from app.db.neon import get_db
from app.models_db import Clinic, Invoice, AdminUser

router = APIRouter(prefix="/api/search", tags=["Búsqueda Global"])

# ==============================================================================
# ENDPOINT: #92 - GET /api/search
# Descripción: Búsqueda universal de clínicas, facturas y usuarios
# ==============================================================================
@router.get(
    "",
    summary="Búsqueda universal de clínicas, facturas y usuarios",
    description="Realiza una búsqueda global retornando resultados mixtos desde la base de datos."
)
async def global_search(
    q: str = Query(..., description="Término de búsqueda", min_length=2),
    db: AsyncSession = Depends(get_db)
):
    search_term = f"%{q}%"
    results = []

    # 1. Buscar Clínicas
    # Usamos cast a String para evitar errores si la columna no es estrictamente de texto
    clinics_stmt = select(Clinic).where(cast(Clinic.name, String).ilike(search_term)).limit(5)
    clinics_result = await db.execute(clinics_stmt)
    
    for c in clinics_result.scalars().all():
        results.append({
            "type": "clinic",
            "id": str(c.id),
            "title": getattr(c, "name", str(c.id)),
            "subtitle": f"Status: {getattr(c, 'status', 'Active')}",
            "url": f"/clinics/{c.id}"
        })

    # 2. Buscar Facturas
    invoices_stmt = select(Invoice).where(cast(Invoice.id, String).ilike(search_term)).limit(5)
    invoices_result = await db.execute(invoices_stmt)
    
    for i in invoices_result.scalars().all():
        results.append({
            "type": "invoice",
            "id": str(i.id),
            "title": f"Factura #{i.id}",
            "subtitle": f"USD {getattr(i, 'amount', 0)} | {getattr(i, 'status', 'Pending')}",
            "url": f"/clinics/{getattr(i, 'clinic_id', 'unknown')}/invoices"
        })

    # 3. Buscar Usuarios Administradores
    users_stmt = select(AdminUser).where(cast(AdminUser.email, String).ilike(search_term)).limit(5)
    users_result = await db.execute(users_stmt)
    
    for u in users_result.scalars().all():
        # Usamos full_name, fallback a name, fallback final al email
        title_name = getattr(u, "full_name", getattr(u, "name", u.email))
        results.append({
            "type": "user",
            "id": str(u.id),
            "title": title_name,
            "subtitle": f"{getattr(u, 'role', 'Admin')} | {u.email}",
            "url": f"/settings/users/{u.id}"
        })

    return {
        "query": q,
        "total_results": len(results),
        "results": results
    }