import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import { Globe, ChevronRight, AlertTriangle } from 'lucide-react';

// ── Animaciones Base ──
const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

const getRiskBadgeStyle = (risk) => {
  switch (risk) {
    case 'high':   
      return 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-500/20';
    case 'medium': 
      return 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-500/20';
    case 'low':    
      return 'bg-wellq-green/10 text-wellq-green border border-wellq-green/20';
    default:       
      return 'bg-wellq-gray/10 text-wellq-dark dark:text-white border border-wellq-gray/20 dark:border-white/5';
  }
};

const riskDotColors = {
  low:    'bg-wellq-green shadow-[0_0_8px_rgba(31,237,146,0.4)]',
  medium: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]',
  high:   'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)] animate-pulse',
};

export const ChurnHeatmap = ({ apiRegions, onRegionClick }) => {
  const { t } = useLanguage();
  const translateRegion = (name) => t(`financials.regions.${name}`, name);

  const getRiskLabel = (risk) => {
    switch (risk) {
      case 'high':   return t('churn.riskHigh');
      case 'medium': return t('churn.riskMedium');
      case 'low':    return t('churn.riskLow');
      default:       return risk ?? t('churn.riskUnknown');
    }
  };

  const hardcoded = [
    { name: t('overview.waitingConnection'), clinics: 0, risk: 'low', mrrLoss: 0 },
  ];

  const regions = apiRegions && apiRegions.length > 0
    ? apiRegions.map((r) => ({
        name:    r.region ?? r.name ?? 'Sin nombre',
        clinics: r.clinics_at_risk ?? r.clinics ?? 0,
        risk:    (r.risk_level ?? r.risk ?? 'low').toLowerCase(),
        mrrLoss: r.potential_mrr_loss ?? 0,
        raw: r,
      }))
    : hardcoded;

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="bg-white dark:bg-wellq-dark rounded-2xl p-6 shadow-sm border border-wellq-gray/20 dark:border-wellq-gray/30 font-sans h-full flex flex-col"
    >
      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-6 pb-5 border-b border-wellq-gray/10 dark:border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-wellq-gray/5 dark:bg-white/[0.02] flex items-center justify-center ring-1 ring-wellq-gray/10 dark:ring-white/5">
            <Globe size={18} className="text-wellq-dark dark:text-white" strokeWidth={2} />
          </div>
          <div>
            <h3 className="font-bold text-wellq-dark dark:text-white text-base tracking-tight leading-tight">
              {t('financials.churnRisk')}
            </h3>
            <p className="text-xs font-medium text-wellq-gray mt-0.5">
              {t('financials.churnRiskSub')}
            </p>
          </div>
        </div>
      </div>

      {/* ── Lista de Regiones ── */}
      <div className="space-y-3 flex-1">
        {regions.map((r, i) => (
          <motion.div
            variants={itemVariants}
            key={i}
            className="flex items-center gap-4 p-3.5 rounded-xl bg-wellq-gray/3 dark:bg-white/[0.02] border border-transparent hover:border-wellq-gray/20 dark:hover:border-white/10 hover:bg-wellq-gray/5 dark:hover:bg-white/[0.04] transition-all cursor-pointer group active:scale-[0.98]"
            onClick={() => onRegionClick?.(r)}
          >
            {/* Indicador de Riesgo */}
            <div className="relative flex items-center justify-center w-6 h-6 flex-shrink-0">
              <div className={`w-2.5 h-2.5 rounded-full ${riskDotColors[r.risk] ?? riskDotColors.low}`} />
            </div>

            {/* Info de la Región */}
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm text-wellq-dark dark:text-white truncate">
                {translateRegion(r.name)}
              </div>
              <div className="text-[11px] font-semibold text-wellq-gray mt-0.5 flex items-center gap-1.5 truncate">
                <span>{r.clinics} {r.clinics === 1 ? t('clinics.clinic') : t('clinics.clinics')}</span>
                {r.mrrLoss > 0 && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-wellq-gray/40" />
                    <span className="text-red-500/80 dark:text-red-400/80 flex items-center gap-1">
                      <AlertTriangle size={10} />
                      {t('financials.mrrAtRisk')}: ${r.mrrLoss.toLocaleString()}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Badge */}
            <span
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider flex-shrink-0 ${getRiskBadgeStyle(r.risk)}`}
            >
              {getRiskLabel(r.risk)}
            </span>

            {/* Flecha */}
            <ChevronRight
              size={16}
              strokeWidth={2.5}
              className="text-wellq-gray/30 dark:text-wellq-gray/40 group-hover:text-wellq-dark dark:group-hover:text-white group-hover:translate-x-0.5 transition-all flex-shrink-0"
            />
          </motion.div>
        ))}

        {regions.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <Globe size={24} className="text-wellq-gray/30 mb-2" />
            <p className="text-sm font-medium text-wellq-gray">{t('common.noData')}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};
