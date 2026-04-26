"""
services/clinic_service.py — Lógica de negocio para Clínicas
=============================================================
Abstrae todas las operaciones de Firestore relacionadas con clínicas.
Los routers llaman a estas funciones; los routers NO acceden directamente
a Firestore. Esto facilita los tests y el cambio de base de datos.
"""

from google.cloud.firestore import Client
from google.cloud.firestore_v1.base_query import FieldFilter
from datetime import datetime, timezone
import uuid
import structlog

from app.models.clinic import (
    ClinicSummary, ClinicDetail, ClinicListResponse, ClinicFilters,
    UpdateClinicRequest, ImpersonateResponse, ClinicStatus, ClinicTier
)
from app.db.firestore import Collections

logger = structlog.get_logger(__name__)


def _doc_to_clinic_summary(doc) -> ClinicSummary:
    """
    Convierte un documento de Firestore en un objeto ClinicSummary.
    Firestore retorna documentos como dicts; aquí mapeamos los campos.
    """
    data = doc.to_dict()
    data["id"] = doc.id  # El ID del documento es el ID de la clínica
    # Normalizar campos opcionales
    data.setdefault("lastLogin", None)
    data.setdefault("mrr", 0.0)
    data.setdefault("location", None)
    return ClinicSummary(**data)


def _doc_to_clinic_detail(doc) -> ClinicDetail:
    """Convierte un documento de Firestore en ClinicDetail (con campos adicionales)."""
    data = doc.to_dict()
    data["id"] = doc.id
    return ClinicDetail(**data)


async def list_clinics(db: Client, filters: ClinicFilters) -> ClinicListResponse:
    """
    Retorna una lista paginada de clínicas aplicando los filtros indicados.

    Nota sobre Firestore:
    Firestore no soporta búsqueda de texto libre (LIKE). Para el campo `search`,
    usamos un índice de campo de array con tokens de texto o delegamos a Algolia/Typesense.
    Aquí implementamos filtrado en memoria para la paginación simple; en producción
    se recomienda un índice dedicado.
    """
    ref = db.collection(Collections.CLINICS)
    query = ref

    # ── Aplicar filtros de Firestore ───────────────────────────────────────────
    if filters.tier:
        query = query.where(filter=FieldFilter("tier", "==", filters.tier.value))

    if filters.status:
        query = query.where(filter=FieldFilter("status", "==", filters.status.value))

    # Obtener todos los documentos que pasen los filtros de Firestore
    docs = query.stream()
    clinics = [_doc_to_clinic_summary(doc) for doc in docs]

    # ── Filtro de búsqueda en memoria ─────────────────────────────────────────
    if filters.search:
        term = filters.search.lower()
        clinics = [c for c in clinics if term in c.name.lower()]

    # ── Ordenar ────────────────────────────────────────────────────────────────
    reverse = filters.sort_order.value == "desc"
    clinics.sort(
        key=lambda c: getattr(c, filters.sort_by, c.name) or "",
        reverse=reverse
    )

    # ── Paginación en memoria ──────────────────────────────────────────────────
    total = len(clinics)
    start = (filters.page - 1) * filters.page_size
    end = start + filters.page_size
    page_data = clinics[start:end]

    return ClinicListResponse(
        data=page_data,
        total=total,
        page=filters.page,
        pageSize=filters.page_size,
        hasNext=end < total,
    )


async def get_clinic_by_id(db: Client, clinic_id: str) -> ClinicDetail:
    """
    Obtiene el detalle completo de una clínica por su ID.
    Lanza ValueError si la clínica no existe.
    """
    doc_ref = db.collection(Collections.CLINICS).document(clinic_id)
    doc = doc_ref.get()

    if not doc.exists:
        raise ValueError(f"Clínica con ID '{clinic_id}' no encontrada.")

    return _doc_to_clinic_detail(doc)


async def update_clinic(
    db: Client,
    clinic_id: str,
    updates: UpdateClinicRequest,
    updated_by: str,
) -> ClinicDetail:
    """
    Actualiza parcialmente los campos de una clínica (PATCH).
    Solo actualiza los campos que no son None en el request.

    Args:
        updated_by: Sub (UUID) del administrador que realiza el cambio.
    """
    doc_ref = db.collection(Collections.CLINICS).document(clinic_id)

    # Verificar que la clínica existe antes de actualizar
    if not doc_ref.get().exists:
        raise ValueError(f"Clínica con ID '{clinic_id}' no encontrada.")

    # Construir dict de campos a actualizar (solo los que no son None)
    update_data = updates.model_dump(exclude_none=True, by_alias=False)
    update_data["updatedAt"] = datetime.now(timezone.utc)
    update_data["updatedBy"] = updated_by

    logger.info(
        "Actualizando clínica",
        clinic_id=clinic_id,
        campos=list(update_data.keys()),
        admin=updated_by,
    )

    # Firestore merge=True actualiza solo los campos enviados, sin borrar el resto
    doc_ref.set(update_data, merge=True)

    # Retornar el documento actualizado
    return _doc_to_clinic_detail(doc_ref.get())


async def impersonate_clinic(
    db: Client,
    clinic_id: str,
    admin_sub: str,
    reason: str,
) -> ImpersonateResponse:
    """
    Genera un token de sesión temporal para que un administrador acceda
    a la clínica como si fuera un usuario de esa clínica (impersonación).

    Registra la acción en el log de auditoría de Firestore.
    """
    from datetime import timedelta

    # Verificar que la clínica existe
    clinic_doc = db.collection(Collections.CLINICS).document(clinic_id).get()
    if not clinic_doc.exists:
        raise ValueError(f"Clínica '{clinic_id}' no encontrada.")

    clinic_data = clinic_doc.to_dict()
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)  # Token válido 1 hora

    # Generar ID único para el log de auditoría
    audit_id = str(uuid.uuid4())

    # Registrar la impersonación para auditoría (quién, cuándo, por qué)
    db.collection(Collections.IMPERSONATION_LOGS).document(audit_id).set({
        "clinicId": clinic_id,
        "clinicName": clinic_data.get("name", ""),
        "adminSub": admin_sub,
        "reason": reason,
        "startedAt": datetime.now(timezone.utc),
        "expiresAt": expires_at,
        "sessionToken": audit_id,  # En producción usar un JWT firmado
    })

    logger.warning(
        "Sesión de impersonación iniciada",
        clinic_id=clinic_id,
        admin=admin_sub,
        razon=reason,
    )

    return ImpersonateResponse(
        sessionToken=audit_id,
        expiresAt=expires_at,
        clinicId=clinic_id,
        clinicName=clinic_data.get("name", ""),
        auditLogId=audit_id,
    )
