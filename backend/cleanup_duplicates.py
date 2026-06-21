"""
cleanup_duplicates.py — Elimina duplicados históricos de WellQ (Neon)
======================================================================
SEGURO para ejecutar en cualquier momento:

  ✅ Tablas con IDs explícitos (clinics, plans, invoices, tickets...):
     NO se modifican — PostgreSQL garantiza unicidad por PK.
     Las clínicas que agregues manualmente (CL-007, etc.) están 100% intactas.

  🧹 Tablas con IDs auto-generados (kpi_snapshots, mrr_snapshots, etc.):
     Se eliminan las filas duplicadas, conservando la primera fila insertada
     (ctid mínimo) para cada combinación única de columnas.

  ℹ️  Después del cleanup, el seed.py ya tiene lógica no-destructiva que
     previene que se vuelvan a crear duplicados en el futuro.
"""

import asyncio
import os
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

BACKEND_DIR = os.path.dirname(__file__)
load_dotenv(os.path.join(BACKEND_DIR, ".env"))

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL no esta configurada. Crea backend/.env usando backend/.env.example."
    )

engine = create_async_engine(DATABASE_URL, echo=False)

# (nombre_tabla, columnas_que_definen_unicidad_natural)
# Solo tablas con IDs auto-generados — las de ID explícito no están aquí.
DEDUP_TABLES = [
    ("kpi_snapshots",                  ["month", "year"]),
    ("app_metrics",                    ["metric_key"]),
    ("plan_features",                  ["plan_id", "feature_id"]),
    ("clinic_usage_metrics",           ["clinic_id", "period"]),
    ("mrr_snapshots",                  ["period_month", "period_year"]),
    ("churn_risk_regions",             ["region"]),
    ("app_usage_stats",                ["app_type", "period"]),
    ("feature_adoption",               ["feature_name", "period"]),
    ("adherence_snapshots",            ["period"]),
    ("cohort_retention",               ["cohort_month", "cohort_year"]),
    ("soap_quality_metrics",           ["period"]),
    ("ai_cost_snapshots",              ["period"]),
    ("ai_latency_metrics",             ["service", "period"]),
    ("pose_analysis_snapshots",        ["period"]),
    ("app_versions",                   ["app_type", "version"]),
    ("infrastructure_cost_snapshots",  ["period_month", "period_year"]),
    ("clinician_summaries",            ["clinic_id"]),
    ("patient_health_summaries",       ["clinic_id"]),
    ("platform_settings",              ["setting_key"]),
]


async def cleanup():
    print("\n🧹 Cleanup de duplicados — WellQ Neon")
    print("=" * 52)
    print("📌 Tablas con IDs explícitos: intocables.")
    print("   Tus clínicas manuales están 100% seguras.\n")

    total_deleted = 0
    not_found = []

    async with engine.begin() as conn:
        for table, keys in DEDUP_TABLES:

            # ── 1. Verificar que la tabla existe ──────────────────────────
            try:
                result = await conn.execute(text(f"""
                    SELECT EXISTS (
                        SELECT 1 FROM information_schema.tables
                        WHERE table_schema = 'public' AND table_name = :t
                    )
                """), {"t": table})
                if not result.scalar():
                    not_found.append(table)
                    continue
            except Exception as e:
                print(f"  ⚠️  {table}: error al verificar — {e}")
                continue

            group_by = ", ".join(keys)

            # ── 2. Contar cuántas filas son duplicadas ────────────────────
            try:
                result = await conn.execute(text(f"""
                    SELECT COALESCE(SUM(cnt - 1), 0) AS dup_rows
                    FROM (
                        SELECT COUNT(*) AS cnt
                        FROM {table}
                        GROUP BY {group_by}
                        HAVING COUNT(*) > 1
                    ) sub
                """))
                dup_count = result.scalar()
            except Exception as e:
                print(f"  ⚠️  {table}: no se pudo analizar — {e}")
                continue

            if dup_count == 0:
                print(f"  ✅ {table:<42} sin duplicados")
                continue

            # ── 3. Eliminar duplicados (conserva ctid mínimo = más antiguo) ─
            try:
                await conn.execute(text(f"""
                    DELETE FROM {table}
                    WHERE ctid NOT IN (
                        SELECT MIN(ctid)
                        FROM {table}
                        GROUP BY {group_by}
                    )
                """))
                print(f"  🗑️  {table:<42} {dup_count} duplicado(s) eliminado(s)")
                total_deleted += dup_count
            except Exception as e:
                print(f"  ⚠️  {table}: error al eliminar — {e}")

    # ── Resumen ───────────────────────────────────────────────────────────
    print("\n" + "=" * 52)
    if not_found:
        print(f"  ℹ️  Tablas no encontradas (omitidas): {', '.join(not_found)}")

    if total_deleted == 0:
        print("  ✅ Todo limpio — no había duplicados en Neon.")
    else:
        print(f"  🎉 Listo. {total_deleted} fila(s) duplicada(s) eliminada(s) en total.")

    print()
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(cleanup())
