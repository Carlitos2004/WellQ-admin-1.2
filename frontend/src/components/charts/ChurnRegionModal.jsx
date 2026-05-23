import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, Building2, DollarSign, Calendar, MapPin } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

// Estilos usando estrictamente la paleta corporativa de WellQ
const riskStyles = {
  high: {
    badge: 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20',
    icon: 'text-red-500 dark:text-red-400',
    glow: 'from-red-500/20 via-red-500/5 to-transparent',
    bgIcon: 'bg-red-50 dark:bg-red-500/10 ring-red-100 dark:ring-red-500/20'
  },
  medium: {
    badge: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20',
    icon: 'text-amber-500 dark:text-amber-400',
    glow: 'from-amber-500/20 via-amber-500/5 to-transparent',
    bgIcon: 'bg-amber-50 dark:bg-amber-500/10 ring-amber-100 dark:ring-amber-500/20'
  },
  low: {
    badge: 'bg-wellq-green/10 text-wellq-green border-wellq-green/20 dark:border-wellq-green/20',
    icon: 'text-wellq-green',
    glow: 'from-wellq-green/20 via-wellq-green/5 to-transparent',
    bgIcon: 'bg-wellq-green/10 ring-wellq-green/20'
  },
  default: {
    badge: 'bg-wellq-gray/10 text-wellq-dark dark:text-white border-wellq-gray/20 dark:border-white/5',
    icon: 'text-wellq-gray dark:text-wellq-gray/80',
    glow: 'from-wellq-gray/20 via-wellq-gray/5 to-transparent',
    bgIcon: 'bg-wellq-gray/10 dark:bg-white/5 ring-wellq-gray/20 dark:ring-white/10'
  }
};

export const ChurnRegionModal = ({ region, onClose }) => {
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);

  // Evitar problemas de hidratación en SSR
  useEffect(() => {
    setMounted(true);
  }, []);

  // Bloquear el scroll del body solo cuando el modal está activo
  useEffect(() => {
    if (region) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [region]);

  // Si no está montado en el cliente, no renderizamos el portal
  if (!mounted) return null;

  // Helper seguro para fallbacks de traducción
  const tSafe = (key, fallback) => {
    const val = t(key);
    return (val === key || !val) ? fallback : val;
  };

  const currentRisk = region ? (riskStyles[region.risk] || riskStyles.default) : riskStyles.default;

  const riskLabel = region ? (
    region.risk === 'high'   ? t('churn.riskHigh')   :
    region.risk === 'medium' ? t('churn.riskMedium') :
                               t('churn.riskLow')
  ) : '';

  const modalContent = (
    <AnimatePresence>
      {region && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 font-sans">
          
          {/* Backdrop animado */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-wellq-black/40 dark:bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          
          {/* Contenedor principal del modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md bg-white dark:bg-wellq-dark rounded-[24px] shadow-2xl border border-wellq-gray/20 dark:border-white/10 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Resplandor (Glow) superior dinámico */}
            <div className={`absolute top-0 left-0 right-0 h-32 bg-gradient-to-b ${currentRisk.glow} opacity-50 pointer-events-none`} />

            {/* Header */}
            <div className="relative flex items-center justify-between p-6 pb-5 border-b border-wellq-gray/10 dark:border-white/5 bg-wellq-gray/3 dark:bg-white/[0.02]">
              <div className="flex items-center gap-3.5">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ring-1 ${currentRisk.bgIcon}`}>
                  <MapPin size={22} className={currentRisk.icon} strokeWidth={2.2} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-wellq-dark dark:text-white leading-tight tracking-tight">
                    {region.name}
                  </h2>
                  <p className="text-[11px] font-bold text-wellq-gray uppercase tracking-wider mt-1">
                    {t('financials.churnRisk')}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2.5 rounded-xl bg-wellq-gray/5 hover:bg-wellq-gray/10 dark:bg-white/5 dark:hover:bg-white/10 text-wellq-gray transition-colors active:scale-95"
              >
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>

            {/* Body */}
            <div className="relative p-6 space-y-3.5">
              
              {/* Risk level */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-wellq-gray/3 dark:bg-white/[0.02] border border-wellq-gray/10 dark:border-white/5">
                <div className="flex items-center gap-3">
                  <AlertTriangle size={18} className="text-wellq-gray dark:text-wellq-gray/70" />
                  <span className="text-xs font-bold text-wellq-gray uppercase tracking-wider">
                    {tSafe('financials.riskLevel', 'Risk Level')}
                  </span>
                </div>
                <span className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${currentRisk.badge}`}>
                  {riskLabel}
                </span>
              </div>

              {/* Clinics at risk */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-wellq-gray/3 dark:bg-white/[0.02] border border-wellq-gray/10 dark:border-white/5">
                <div className="flex items-center gap-3">
                  <Building2 size={18} className="text-wellq-gray dark:text-wellq-gray/70" />
                  <span className="text-xs font-bold text-wellq-gray uppercase tracking-wider">
                    {tSafe('financials.clinicsAtRisk', 'Clinics at Risk')}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black text-wellq-dark dark:text-white tabular-nums">
                    {region.clinics}
                  </span>
                  <span className="text-xs font-semibold text-wellq-gray ml-1.5">
                    {region.clinics === 1 ? t('clinics.clinic') : t('clinics.clinics')}
                  </span>
                </div>
              </div>

              {/* MRR at risk */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-red-50/80 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500" />
                <div className="flex items-center gap-3 pl-2">
                  <DollarSign size={18} className="text-red-500 dark:text-red-400" />
                  <span className="text-xs font-bold text-red-600/80 dark:text-red-400/80 uppercase tracking-wider">
                    {tSafe('financials.mrrAtRisk', 'Potential Loss')}
                  </span>
                </div>
                <span className="text-xl font-black text-red-600 dark:text-red-400 tabular-nums tracking-tight">
                  ${region.mrrLoss.toLocaleString()}
                </span>
              </div>

              {/* Recorded at */}
              {region.raw?.recorded_at && (
                <div className="flex items-center justify-between p-4 rounded-xl bg-wellq-gray/3 dark:bg-white/[0.02] border border-wellq-gray/10 dark:border-white/5">
                  <div className="flex items-center gap-3">
                    <Calendar size={18} className="text-wellq-gray dark:text-wellq-gray/70" />
                    <span className="text-xs font-bold text-wellq-gray uppercase tracking-wider">
                      {tSafe('financials.recordedAt', 'Updated')}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-wellq-dark dark:text-white">
                    {new Date(region.raw.recorded_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 pt-2">
              <button
                onClick={onClose}
                className="w-full py-3.5 rounded-xl bg-wellq-gray/10 hover:bg-wellq-gray/20 dark:bg-white/5 dark:hover:bg-white/10 text-sm font-bold text-wellq-dark dark:text-white transition-all active:scale-[0.98]"
              >
                {tSafe('common.close', 'Close')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};