import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DollarSign, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, 
  PieChart, BarChart3, AlertCircle 
} from 'lucide-react';

import { MRRChart } from '../components/charts/MRRChart';
import { ChurnHeatmap } from '../components/charts/ChurnHeatmap';
import { ChurnRegionModal } from '../components/charts/ChurnRegionModal';
import { useLanguage } from '../contexts/LanguageContext';

// ─── Design Tokens para Financials ─────────────────────────────────────────
const FINANCIALS_META = {
  totalMrr: {
    icon: DollarSign,
    color: 'text-wellq-dark dark:text-white',
    bg: 'bg-wellq-gray/5 dark:bg-wellq-dark/50',
    border: 'border-wellq-gray/20 dark:border-white/5',
  },
  newBusiness: {
    icon: TrendingUp,
    color: 'text-wellq-green',
    bg: 'bg-wellq-green/10 dark:bg-wellq-green/10',
    ring: 'ring-wellq-green/20 dark:ring-wellq-green/20',
    border: 'border-wellq-green/20 dark:border-wellq-green/20',
  },
  expansion: {
    icon: ArrowUpRight,
    color: 'text-wellq-cyan',
    bg: 'bg-wellq-cyan/10 dark:bg-wellq-cyan/10',
    ring: 'ring-wellq-cyan/20 dark:ring-wellq-cyan/20',
    border: 'border-wellq-cyan/20 dark:border-wellq-cyan/20',
  },
  churn: {
    icon: TrendingDown,
    color: 'text-red-400',
    bg: 'bg-red-50 dark:bg-red-500/10',
    ring: 'ring-red-400/20 dark:ring-red-500/20',
    border: 'border-red-200/50 dark:border-red-500/20',
  },
};

// ─── Animaciones ─────────────────────────────────────────────────────────
const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

export const FinancialsView = ({ mrrData, churnRegions, loading = false }) => {
  const { t } = useLanguage();
  const [selectedRegion, setSelectedRegion] = useState(null);

  const breakdown = mrrData?.breakdown;
  const totalMrr = mrrData?.total_mrr ?? 0;

  const breakdownLabels = {
    new_business: t('financials.newBusiness'),
    expansion:    t('financials.expansion'),
    contraction:  t('financials.contraction'),
    churn:        t('financials.churnMrr'),
    retained:     t('financials.retained'),
  };

  // Configuración de estilos semánticos para el desglose detallado
  const getBreakdownConfig = (key) => {
    const configs = {
      new_business: { color: 'bg-wellq-green', text: 'text-wellq-green', bgSoft: 'bg-wellq-green/10', icon: TrendingUp },
      expansion:    { color: 'bg-wellq-cyan',  text: 'text-wellq-cyan',  bgSoft: 'bg-wellq-cyan/10',  icon: ArrowUpRight },
      retained:     { color: 'bg-amber-500',   text: 'text-amber-500',  bgSoft: 'bg-amber-500/10',  icon: DollarSign },
      contraction:  { color: 'bg-orange-400',  text: 'text-orange-400', bgSoft: 'bg-orange-400/10', icon: TrendingDown },
      churn:        { color: 'bg-red-500',     text: 'text-red-500',    bgSoft: 'bg-red-500/10',    icon: TrendingDown },
    };
    return configs[key] || { color: 'bg-wellq-gray', text: 'text-wellq-gray', bgSoft: 'bg-wellq-gray/10', icon: DollarSign };
  };

  return (
    <motion.div
      className="space-y-6 font-sans"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* ── KPIs Superiores ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Total MRR */}
        <motion.div variants={itemVariants} className={`bg-white dark:bg-wellq-dark rounded-2xl p-6 shadow-sm border ${FINANCIALS_META.totalMrr.border}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-wellq-gray">{t('financials.totalMrr')}</span>
            <DollarSign size={16} className="text-wellq-gray/40 dark:text-wellq-gray/50" />
          </div>
          {loading ? <Skeleton className="h-8 w-32" /> : <div className="text-3xl font-black text-wellq-dark dark:text-white">$ {totalMrr.toLocaleString()}</div>}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-wellq-green text-xs font-bold flex items-center gap-1">
              <ArrowUpRight size={14} /> {mrrData?.monthly_growth_percentage ?? 0}%
            </span>
            <span className="text-xs font-medium text-wellq-gray">{t('financials.vsLastMonth')}</span>
          </div>
        </motion.div>

        {/* New Business */}
        <motion.div variants={itemVariants} className={`bg-white dark:bg-wellq-dark rounded-2xl p-6 shadow-sm border ${FINANCIALS_META.newBusiness.border}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-wellq-gray">{t('financials.newBusiness')}</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${FINANCIALS_META.newBusiness.bg} ring-1 ${FINANCIALS_META.newBusiness.ring}`}>
              <TrendingUp size={16} className={FINANCIALS_META.newBusiness.color} />
            </div>
          </div>
          {loading ? <Skeleton className="h-8 w-24" /> : <div className={`text-3xl font-black ${FINANCIALS_META.newBusiness.color}`}>+${(breakdown?.new_business ?? 0).toLocaleString()}</div>}
        </motion.div>

        {/* Expansion */}
        <motion.div variants={itemVariants} className={`bg-white dark:bg-wellq-dark rounded-2xl p-6 shadow-sm border ${FINANCIALS_META.expansion.border}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-wellq-gray">{t('financials.expansion')}</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${FINANCIALS_META.expansion.bg} ring-1 ${FINANCIALS_META.expansion.ring}`}>
              <ArrowUpRight size={16} className={FINANCIALS_META.expansion.color} />
            </div>
          </div>
          {loading ? <Skeleton className="h-8 w-24" /> : <div className={`text-3xl font-black ${FINANCIALS_META.expansion.color}`}>+${(breakdown?.expansion ?? 0).toLocaleString()}</div>}
        </motion.div>

        {/* Churn MRR */}
        <motion.div variants={itemVariants} className={`bg-white dark:bg-wellq-dark rounded-2xl p-6 shadow-sm border ${FINANCIALS_META.churn.border}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-wellq-gray">{t('financials.churnMrr')}</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${FINANCIALS_META.churn.bg} ring-1 ${FINANCIALS_META.churn.ring}`}>
              <TrendingDown size={16} className={FINANCIALS_META.churn.color} />
            </div>
          </div>
          {loading ? <Skeleton className="h-8 w-24" /> : <div className={`text-3xl font-black ${FINANCIALS_META.churn.color}`}>-${Math.abs(breakdown?.churn ?? 0).toLocaleString()}</div>}
        </motion.div>
      </div>

      {/* ── Gráficos ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MRRChart />
        <ChurnHeatmap apiRegions={churnRegions} onRegionClick={setSelectedRegion} />
      </div>

      <AnimatePresence>
        {selectedRegion && <ChurnRegionModal region={selectedRegion} onClose={() => setSelectedRegion(null)} />}
      </AnimatePresence>

      {/* ── Desglose detallado de MRR (Premium UI) ── */}
      {breakdown && (
        <motion.div variants={itemVariants} className="bg-white dark:bg-wellq-dark rounded-2xl shadow-sm border border-wellq-gray/20 dark:border-white/10 overflow-hidden">
          <div className="px-6 py-5 border-b border-wellq-gray/10 dark:border-white/5 bg-wellq-gray/3 dark:bg-white/[0.02]">
            <h3 className="font-bold text-wellq-dark dark:text-white text-lg flex items-center gap-2">
              <PieChart size={18} className="text-wellq-cyan" /> {t('financials.mrrBreakdown')}
            </h3>
            <p className="text-xs font-medium text-wellq-gray dark:text-wellq-gray/80 mt-1">
              {t('financials.mrrBreakdownSub') || 'Distribución exacta del ingreso recurrente'}
            </p>
          </div>

          <div className="p-6 space-y-5">
            {Object.entries(breakdown).map(([key, value], idx) => {
              const isNeg = value < 0;
              const safeTotal = totalMrr > 0 ? totalMrr : 1;
              const pct = Math.min((Math.abs(value) / safeTotal) * 100, 100);
              const config = getBreakdownConfig(key);
              const Icon = config.icon;

              return (
                <div key={key} className="flex items-center gap-4 group">
                  <div className="w-44 flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 ${config.bgSoft} ${config.text}`}>
                      <Icon size={14} strokeWidth={2} />
                    </div>
                    <span className="text-sm font-bold text-wellq-dark dark:text-white/90 capitalize truncate">{breakdownLabels[key] ?? key}</span>
                  </div>

                  <div className="flex-1 h-2.5 bg-wellq-gray/10 dark:bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 1, delay: idx * 0.1, ease: "easeOut" }}
                      className={`h-full rounded-full ${config.color}`}
                    />
                  </div>

                  <div className="w-24 text-right flex flex-col justify-center">
                    <span className={`text-sm font-black ${config.text}`}>
                      {isNeg ? '-' : '+'}${Math.abs(value).toLocaleString()}
                    </span>
                    <span className="text-[10px] font-bold text-wellq-gray uppercase tracking-wider">{pct.toFixed(1)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};