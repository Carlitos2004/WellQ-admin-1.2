/**
 * PatientHealthSection.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Sección de salud de pacientes para agregar dentro de ClinicDrawer.
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, TrendingDown, TrendingUp, Minus, AlertTriangle, Loader2 } from 'lucide-react';
import { fetchPatientHealth } from '../../api/client';
import { useLanguage }         from '../../contexts/LanguageContext';

// ── Métricas re-mapeadas al diseño corporativo ──────────────────────────────
const METRICS = [
  {
    key:   'at_risk',
    icon:  AlertTriangle,
    label: (t) => t('health.atRisk'),
    color: 'text-red-500',
    bg:    'bg-red-500/5 dark:bg-red-500/10',
    border:'border-red-500/20',
    bar:   'bg-red-500',
  },
  {
    key:   'declining',
    icon:  TrendingDown,
    label: (t) => t('health.declining'),
    color: 'text-amber-500',
    bg:    'bg-amber-500/5 dark:bg-amber-500/10',
    border:'border-amber-500/20',
    bar:   'bg-amber-500',
  },
  {
    key:   'stable',
    icon:  Minus,
    label: (t) => t('health.stable'),
    color: 'text-wellq-blue dark:text-wellq-blue',
    bg:    'bg-wellq-blue/5 dark:bg-wellq-blue/10',
    border:'border-wellq-blue/20',
    bar:   'bg-wellq-blue',
  },
  {
    key:   'improving',
    icon:  TrendingUp,
    label: (t) => t('health.improving'),
    color: 'text-wellq-green dark:text-wellq-green',
    bg:    'bg-wellq-green/5 dark:bg-wellq-green/10',
    border:'border-wellq-green/20',
    bar:   'bg-wellq-green',
  },
];

// ── Componente ───────────────────────────────────────────────────────────────
export const PatientHealthSection = ({ clinicId }) => {
  const { t, locale } = useLanguage();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!clinicId) return;
    setLoading(true);
    setError(null);
    fetchPatientHealth(clinicId)
      .then(setData)
      .catch((err) => setError(err.message ?? 'Error'))
      .finally(() => setLoading(false));
  }, [clinicId]);

  const fmtDate = (iso) => {
    if (!iso) return null;
    return new Date(iso).toLocaleDateString(locale === 'es' ? 'es-CL' : 'en-US', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="bg-white dark:bg-wellq-dark rounded-2xl shadow-sm border border-wellq-gray/15 dark:border-white/5 p-5">
      {/* ── Encabezado alineado a los títulos del Drawer ── */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-wellq-green/10 dark:bg-wellq-green/10 border border-wellq-green/20 flex items-center justify-center shadow-sm">
            <Heart size={16} className="text-wellq-green" />
          </div>
          <div>
            <h3 className="font-bold text-wellq-dark dark:text-white text-sm tracking-tight leading-none mb-1">
              {t('health.title')}
            </h3>
            {!loading && data?.recorded_at && (
              <p className="text-[10px] font-semibold text-wellq-gray uppercase tracking-wider font-mono">
                {t('health.lastSync')}: {fmtDate(data.recorded_at)}
              </p>
            )}
          </div>
        </div>
        
        {!loading && data && (
          <div className="text-right">
            <span className="block text-lg font-black text-wellq-dark dark:text-white leading-none tabular-nums">
              {data.total_patients ?? 0}
            </span>
            <span className="text-[10px] font-bold text-wellq-gray uppercase tracking-widest">
              {t('health.patients')}
            </span>
          </div>
        )}
      </div>

      {/* ── Loading State ── */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={24} className="text-wellq-cyan animate-spin opacity-50" />
        </div>
      )}

      {/* ── Error State ── */}
      {!loading && error && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-4 text-center">
          <p className="text-xs font-bold text-red-500">{error}</p>
        </div>
      )}

      {/* ── Data Grid & Progress Bar ── */}
      {!loading && !error && data && (
        <>
          {/* Barra de proporción animada */}
          {data.total_patients > 0 && (
            <div className="flex rounded-full overflow-hidden h-1.5 mb-5 bg-wellq-gray/10 dark:bg-white/5">
              {METRICS.map((m) => {
                const pct = ((data[m.key] ?? 0) / data.total_patients) * 100;
                return pct > 0 ? (
                  <motion.div 
                    key={m.key} 
                    className={m.bar}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                ) : null;
              })}
            </div>
          )}

          {/* Grid 2x2 de métricas */}
          <div className="grid grid-cols-2 gap-3.5">
            {METRICS.map((m) => {
              const Icon  = m.icon;
              const count = data[m.key] ?? 0;
              const pct   = data.total_patients > 0
                ? Math.round((count / data.total_patients) * 100)
                : 0;

              return (
                <div key={m.key} className={`relative rounded-xl p-3 border ${m.border} ${m.bg} group overflow-hidden transition-colors hover:border-opacity-50`}>
                  <div className="flex items-center justify-between mb-2">
                    <Icon size={14} className={m.color} strokeWidth={2.5} />
                    <span className={`text-[10px] font-bold ${m.color} bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded tabular-nums`}>
                      {pct}%
                    </span>
                  </div>
                  
                  {/* Aquí está aplicado el text-2xl como me pediste */}
                  <p className={`text-2xl font-black ${m.color} leading-none tabular-nums tracking-tighter`}>
                    {count}
                  </p>
                  
                  <p className="text-[10px] font-bold text-wellq-gray dark:text-wellq-gray/80 uppercase tracking-widest mt-1.5 truncate">
                    {m.label(t)}
                  </p>

                  {/* Micro-animación base para complementar el panel */}
                  <div className={`absolute bottom-0 left-0 h-0.5 w-0 ${m.bar} opacity-40 group-hover:w-full transition-all duration-300 ease-out`} />
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};