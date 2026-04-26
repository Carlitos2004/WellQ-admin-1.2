"""
services/dashboard_service.py — Lógica de negocio del Dashboard
================================================================
Combina datos de Firestore (datos operativos en tiempo real) y
MongoDB/Motor (agregaciones históricas de MRR, churn) para construir
las respuestas del dashboard Overview.
"""

from google.cloud.firestore import Client
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timezone, timedelta
import structlog

from app.models.dashboard import (
    BusinessHealthKPIs, KPICard, MRRChartResponse, MRRDataPoint,
    NeedsAttentionItem, OperationalStatusResponse, ServerStatus,
    ProcessStatus, AppUsageMetric
)
from app.db.firestore import Collections
from app.db.mongodb import MongoCollections

logger = structlog.get_logger(__name__)


async def get_business_health_kpis(
    db: Client,
    mongo: AsyncIOMotorDatabase,
) -> BusinessHealthKPIs:
    """
    Calcula los 6 KPIs del dashboard de Business Health.
    Combina datos de Firestore (clínicas activas, facturas pendientes)
    con agregaciones de MongoDB (MRR, churn).
    """

    # ── MRR Total desde MongoDB ────────────────────────────────────────────────
    # Suma del MRR del último snapshot mensual en MongoDB
    pipeline_mrr = [
        {"$sort": {"date": -1}},
        {"$limit": 2},  # Mes actual y mes anterior para calcular % de cambio
        {"$group": {"_id": "$period", "total": {"$sum": "$mrr"}}},
        {"$sort": {"_id": -1}},
    ]
    mrr_cursor = mongo[MongoCollections.MRR_SNAPSHOTS].aggregate(pipeline_mrr)
    mrr_docs = await mrr_cursor.to_list(2)

    mrr_current = mrr_docs[0]["total"] if mrr_docs else 0.0
    mrr_previous = mrr_docs[1]["total"] if len(mrr_docs) > 1 else mrr_current
    mrr_change = ((mrr_current - mrr_previous) / mrr_previous * 100) if mrr_previous else 0

    # ── Clínicas Activas desde Firestore ──────────────────────────────────────
    from google.cloud.firestore_v1.base_query import FieldFilter
    active_query = db.collection(Collections.CLINICS).where(
        filter=FieldFilter("status", "==", "active")
    )
    active_docs = list(active_query.stream())
    active_count = len(active_docs)

    # Total de clínicas para calcular % de cambio (simplificado)
    all_clinics = list(db.collection(Collections.CLINICS).stream())
    total_clinics = len(all_clinics)

    # ── Churn Rate desde MongoDB ───────────────────────────────────────────────
    pipeline_churn = [
        {"$match": {"period": {"$gte": (datetime.now(timezone.utc) - timedelta(days=60))}}},
        {"$group": {
            "_id": "$period_month",
            "churned": {"$sum": "$churned_count"},
            "total": {"$sum": "$total_count"},
        }},
        {"$sort": {"_id": -1}},
        {"$limit": 2},
    ]
    churn_cursor = mongo[MongoCollections.CHURN_EVENTS].aggregate(pipeline_churn)
    churn_docs = await churn_cursor.to_list(2)

    churn_rate = 0.0
    churn_change = 0.0
    if churn_docs:
        current = churn_docs[0]
        churn_rate = (current["churned"] / current["total"] * 100) if current["total"] else 0
        if len(churn_docs) > 1:
            prev = churn_docs[1]
            prev_churn = (prev["churned"] / prev["total"] * 100) if prev["total"] else 0
            churn_change = churn_rate - prev_churn

    # ── Health Score Promedio desde Firestore ──────────────────────────────────
    scores = [doc.to_dict().get("healthScore", 0) for doc in all_clinics]
    avg_health = sum(scores) / len(scores) if scores else 0

    # ── Facturas Pendientes desde Firestore ────────────────────────────────────
    overdue_query = db.collection(Collections.INVOICES).where(
        filter=FieldFilter("status", "==", "overdue")
    )
    overdue_count = len(list(overdue_query.stream()))

    # ── Nuevos Signups este mes desde Firestore ────────────────────────────────
    month_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0)
    signups_query = db.collection(Collections.CLINICS).where(
        filter=FieldFilter("createdAt", ">=", month_start)
    )
    new_signups = len(list(signups_query.stream()))

    return BusinessHealthKPIs(
        mrrTotal=KPICard(
            label="MRR Total",
            value=f"${mrr_current:,.0f}",
            changePercent=round(mrr_change, 1),
            trend="up" if mrr_change > 0 else ("down" if mrr_change < 0 else "flat"),
            positiveTrendIsUp=True,
        ),
        activeClinics=KPICard(
            label="Clínicas Activas",
            value=str(active_count),
            changePercent=0.0,
            trend="flat",
            positiveTrendIsUp=True,
        ),
        churnRate=KPICard(
            label="Churn Rate",
            value=f"{churn_rate:.1f}%",
            changePercent=round(abs(churn_change), 1),
            trend="up" if churn_change > 0 else ("down" if churn_change < 0 else "flat"),
            positiveTrendIsUp=False,  # Para churn, bajar es bueno
        ),
        avgHealthScore=KPICard(
            label="Health Score Promedio",
            value=f"{avg_health:.0f}",
            changePercent=0.0,
            trend="flat",
            positiveTrendIsUp=True,
        ),
        outstandingInvoices=KPICard(
            label="Facturas Pendientes",
            value=str(overdue_count),
            changePercent=0.0,
            trend="flat",
            positiveTrendIsUp=False,
        ),
        newSignups=KPICard(
            label="Nuevas Clínicas (mes)",
            value=str(new_signups),
            changePercent=0.0,
            trend="flat",
            positiveTrendIsUp=True,
        ),
    )


async def get_mrr_chart(
    mongo: AsyncIOMotorDatabase,
    months: int = 12,
) -> MRRChartResponse:
    """
    Obtiene los datos del gráfico de MRR de los últimos N meses desde MongoDB.
    Usa una agregación para agrupar por mes y sumar los componentes del MRR.
    """
    since = datetime.now(timezone.utc) - timedelta(days=months * 31)

    pipeline = [
        {"$match": {"date": {"$gte": since}}},
        {"$group": {
            "_id": {"year": {"$year": "$date"}, "month": {"$month": "$date"}},
            "mrr": {"$sum": "$mrr"},
            "new_mrr": {"$sum": "$new_mrr"},
            "expansion_mrr": {"$sum": "$expansion_mrr"},
            "churned_mrr": {"$sum": "$churned_mrr"},
        }},
        {"$sort": {"_id.year": 1, "_id.month": 1}},
    ]

    cursor = mongo[MongoCollections.MRR_SNAPSHOTS].aggregate(pipeline)
    docs = await cursor.to_list(length=months)

    # Formatear los datos para el gráfico
    MONTHS_ES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun",
                 "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]

    data_points = [
        MRRDataPoint(
            month=f"{MONTHS_ES[doc['_id']['month'] - 1]} {str(doc['_id']['year'])[2:]}",
            mrr=doc["mrr"],
            newMrr=doc.get("new_mrr", 0),
            expansionMrr=doc.get("expansion_mrr", 0),
            churnedMrr=doc.get("churned_mrr", 0),
        )
        for doc in docs
    ]

    now = datetime.now(timezone.utc)
    return MRRChartResponse(
        data=data_points,
        periodStart=since,
        periodEnd=now,
    )


async def get_needs_attention(db: Client) -> list[NeedsAttentionItem]:
    """
    Obtiene la lista de clínicas y eventos que requieren atención del administrador.
    Combina alertas activas de Firestore con clínicas en estado crítico o warning.
    """
    from google.cloud.firestore_v1.base_query import FieldFilter
    items: list[NeedsAttentionItem] = []

    # Clínicas en estado crítico
    critical_clinics = db.collection(Collections.CLINICS).where(
        filter=FieldFilter("status", "==", "critical")
    ).stream()

    for doc in critical_clinics:
        data = doc.to_dict()
        items.append(NeedsAttentionItem(
            clinicId=doc.id,
            clinicName=data.get("name", ""),
            issueType="critical_status",
            severity="critical",
            description=f"La clínica '{data.get('name')}' está en estado crítico.",
            createdAt=data.get("updatedAt", datetime.now(timezone.utc)),
        ))

    # Facturas vencidas con más de 7 días
    overdue_cutoff = datetime.now(timezone.utc) - timedelta(days=7)
    overdue_invoices = db.collection(Collections.INVOICES).where(
        filter=FieldFilter("status", "==", "overdue")
    ).where(
        filter=FieldFilter("dueDate", "<=", overdue_cutoff)
    ).stream()

    for doc in overdue_invoices:
        data = doc.to_dict()
        items.append(NeedsAttentionItem(
            clinicId=data.get("clinicId", ""),
            clinicName=data.get("clinicName", ""),
            issueType="overdue_invoice",
            severity="warning",
            description=f"Factura de ${data.get('amount', 0):.0f} vencida hace más de 7 días.",
            createdAt=data.get("dueDate", datetime.now(timezone.utc)),
        ))

    # Ordenar por severidad: critical primero
    severity_order = {"critical": 0, "warning": 1, "info": 2}
    items.sort(key=lambda x: severity_order.get(x.severity, 3))

    return items[:20]  # Máximo 20 items para no saturar la UI


async def get_operational_status(db: Client) -> OperationalStatusResponse:
    """
    Retorna el estado operativo de servidores, procesos y uso de la app.
    Los datos se leen desde la colección platform_metrics de Firestore,
    que se actualiza cada minuto por un worker de monitoreo.
    """
    # Leer el documento más reciente de métricas de plataforma
    metrics_ref = db.collection(Collections.PLATFORM_METRICS).order_by(
        "timestamp", direction="DESCENDING"
    ).limit(1)

    docs = list(metrics_ref.stream())
    if not docs:
        # Si no hay datos, retornar estado desconocido
        return OperationalStatusResponse(
            servers=[],
            processes=[],
            appUsage=AppUsageMetric(
                activeSessions=0,
                dailyActiveUsers=0,
                avgSessionDurationMin=0,
                apiRequestsPerMin=0,
            ),
            generatedAt=datetime.now(timezone.utc),
        )

    data = docs[0].to_dict()

    # Construir lista de servidores desde los datos almacenados
    servers = [
        ServerStatus(**s) for s in data.get("servers", [])
    ]

    # Construir lista de procesos
    processes = [
        ProcessStatus(**p) for p in data.get("processes", [])
    ]

    app_usage_raw = data.get("appUsage", {})
    app_usage = AppUsageMetric(
        activeSessions=app_usage_raw.get("activeSessions", 0),
        dailyActiveUsers=app_usage_raw.get("dailyActiveUsers", 0),
        avgSessionDurationMin=app_usage_raw.get("avgSessionDurationMin", 0),
        apiRequestsPerMin=app_usage_raw.get("apiRequestsPerMin", 0),
    )

    return OperationalStatusResponse(
        servers=servers,
        processes=processes,
        appUsage=app_usage,
        generatedAt=data.get("timestamp", datetime.now(timezone.utc)),
    )
