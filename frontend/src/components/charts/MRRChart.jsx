import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import { TrendingUp, TrendingDown, ChevronLeft, ChevronRight, AlertTriangle, Activity } from 'lucide-react';
import { getAccessToken } from '../../services/auth';

const fmt = (val) => {
  if (!val && val !== 0) return '$0';
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000)     return `$${(val / 1_000).toFixed(1)}k`;
  return `$${val}`;
};

export const MRRChart = () => {
  const { t } = useLanguage();
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [selected, setSelected]   = useState(null);
  
  // ── Paginación ──
  const [currentPage, setCurrentPage] = useState(0); 
  const itemsPerPage = 6;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const _t = getAccessToken();
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/financials/mrr/snapshots`, {
          headers: _t ? { Authorization: `Bearer ${_t}` } : {},
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const data = json.data ?? [];
        setSnapshots(data);
        if (data.length > 0) setSelected(data.length - 1);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const totalPages = Math.ceil(snapshots.length / itemsPerPage);
  const endIndex = snapshots.length - (currentPage * itemsPerPage);
  const startIndex = Math.max(0, endIndex - itemsPerPage);
  const visibleSnapshots = snapshots.slice(startIndex, endIndex);

  const handleOlder = () => {
    if (currentPage < totalPages - 1) {
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      const newEndIndex = snapshots.length - (newPage * itemsPerPage);
      setSelected(newEndIndex - 1);
    }
  };

  const handleNewer = () => {
    if (currentPage > 0) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      const newEndIndex = snapshots.length - (newPage * itemsPerPage);
      setSelected(newEndIndex - 1);
    }
  };

  const snap     = selected !== null ? snapshots[selected] : null;
  const prevSnap = selected !== null && selected > 0 ? snapshots[selected - 1] : null;

  const maxPositive = Math.max(
    ...visibleSnapshots.map((d) => (d.retained ?? 0) + (d.new_business ?? 0) + (d.expansion ?? 0)),
    100
  ) * 1.15; 
  
  const maxChurn = Math.max(...visibleSnapshots.map((d) => Math.abs(d.churn ?? 0)), 1) * 1.1;

  if (loading) return (
    <div className="bg-white dark:bg-wellq-dark rounded-2xl p-6 shadow-sm border border-wellq-gray/20 dark:border-wellq-gray/30 flex items-center justify-center h-[500px]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-[3px] border-wellq-cyan border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-bold text-wellq-gray uppercase tracking-wider">Cargando datos…</span>
      </div>
    </div>
  );

  if (error) return (
    <div className="bg-white dark:bg-wellq-dark rounded-2xl p-6 shadow-sm border border-wellq-gray/20 flex items-center justify-center h-64">
      <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-500/10 rounded-xl border border-red-100 dark:border-red-500/20">
        <AlertTriangle size={20} className="text-red-500" />
        <p className="text-sm font-semibold text-red-600 dark:text-red-400">Error: {error}</p>
      </div>
    </div>
  );

  return (
    <div className="bg-white dark:bg-wellq-dark rounded-2xl shadow-sm border border-wellq-gray/20 dark:border-wellq-gray/30 overflow-hidden font-sans">
      {/* 1. Título y Leyenda */}
      <div className="px-6 pt-6 pb-5 border-b border-wellq-gray/10 dark:border-white/5 bg-wellq-gray/3 dark:bg-white/[0.02]">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-wellq-cyan/10 flex items-center justify-center ring-1 ring-wellq-cyan/20">
            <Activity size={16} className="text-wellq-cyan" />
          </div>
          <h3 className="font-bold text-wellq-dark dark:text-white text-lg tracking-tight">
            {t('financials.mrrBreakdown') || 'MRR Breakdown Detail'}
          </h3>
        </div>
        <p className="text-xs font-medium text-wellq-gray ml-11">
          {t('financials.mrrBreakdownSub') || 'Monthly breakdown of revenue changes'}
        </p>

        <div className="flex flex-wrap items-center gap-4 mt-5 ml-11">
          {[
            { color: 'bg-amber-500',   label: t('financials.retained') || 'Retained' },
            { color: 'bg-wellq-green', label: t('financials.newBusiness') || 'New Business' },
            { color: 'bg-wellq-cyan',  label: t('financials.expansion') || 'Expansion' },
            { color: 'bg-red-400',     label: t('financials.churnMrr') || 'Churn MRR' },
          ].map(({ color, label }) => (
            <span key={label} className="flex items-center gap-1.5 text-xs font-semibold text-wellq-gray">
              <span className={`w-2.5 h-2.5 rounded-sm ${color} flex-shrink-0`} />
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="p-6">
        {/* 2. Tarjetas de Resumen (KPIs) */}
        <AnimatePresence mode="wait">
          {snap && (
            <motion.div 
              key={snap.period_month}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
            >
              {/* Total MRR Card */}
              <div className="relative bg-wellq-gray/5 dark:bg-white/[0.02] rounded-xl p-5 border border-wellq-gray/10 dark:border-white/5 overflow-hidden group">
                <p className="text-[10px] font-bold text-wellq-gray uppercase tracking-wider mb-1">Total MRR</p>
                <p className="text-3xl font-black text-wellq-dark dark:text-white tabular-nums tracking-tight">{fmt(snap.total_mrr)}</p>
                {prevSnap && (
                  <div className={`flex items-center gap-1 mt-2 text-xs font-bold px-2 py-1 inline-flex rounded-md ${snap.monthly_growth_percentage >= 0 ? 'bg-wellq-green/10 text-wellq-green' : 'bg-red-500/10 text-red-400'}`}>
                    {snap.monthly_growth_percentage >= 0 ? <TrendingUp size={12} strokeWidth={3} /> : <TrendingDown size={12} strokeWidth={3} />}
                    {snap.monthly_growth_percentage >= 0 ? '+' : ''}{snap.monthly_growth_percentage?.toFixed(1)}% MoM
                  </div>
                )}
              </div>
              
              {/* New Business + Expansion Card */}
              <div className="relative bg-wellq-green/5 dark:bg-wellq-green/10 rounded-xl p-5 border border-wellq-green/20 overflow-hidden group">
                <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-wellq-green/10 to-transparent opacity-50 pointer-events-none" />
                <p className="relative text-[10px] font-bold text-wellq-green uppercase tracking-wider mb-1">New Biz + Expansion</p>
                <p className="relative text-3xl font-black text-wellq-green tabular-nums tracking-tight">
                  +{fmt((snap.new_business ?? 0) + (snap.expansion ?? 0))}
                </p>
                <p className="relative text-xs font-semibold text-wellq-green/70 mt-2">
                  {fmt(snap.new_business)} new · {fmt(snap.expansion)} exp
                </p>
              </div>
              
              {/* Churn Card */}
              <div className="relative bg-red-50 dark:bg-red-500/10 rounded-xl p-5 border border-red-500/20 overflow-hidden group">
                <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-red-500/10 to-transparent opacity-50 pointer-events-none" />
                <p className="relative text-[10px] font-bold text-red-500 uppercase tracking-wider mb-1">Churn MRR</p>
                <p className="relative text-3xl font-black text-red-400 tabular-nums tracking-tight">-{fmt(Math.abs(snap.churn ?? 0))}</p>
                {snap.contraction > 0 && (
                  <p className="relative text-xs font-semibold text-red-400/70 mt-2">+{fmt(snap.contraction)} contraction</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 3. Gráfico Principal */}
        <div>
          {/* Barras positivas */}
          <div className="flex items-end justify-between h-52 mt-4 gap-1">
            {visibleSnapshots.map((d, i) => {
              const realIndex  = startIndex + i; 
              const isSelected = selected === realIndex;
              const total      = (d.retained ?? 0) + (d.new_business ?? 0) + (d.expansion ?? 0);
              
              const barHeightPct = total > 0 ? (total / maxPositive) * 100 : 0;
              const retainedPct  = total > 0 ? ((d.retained ?? 0) / total) * 100 : 0;
              const newBizPct    = total > 0 ? ((d.new_business ?? 0) / total) * 100 : 0;
              const expansionPct = total > 0 ? ((d.expansion ?? 0) / total) * 100 : 0;

              return (
                <div
                  key={realIndex}
                  className="flex-1 flex flex-col items-center justify-end cursor-pointer group relative"
                  style={{ height: '100%' }}
                  onClick={() => setSelected(realIndex)}
                >
                  <div 
                    className={`absolute text-center text-xs font-bold whitespace-nowrap transition-all duration-200 ${
                      isSelected ? 'opacity-100 text-wellq-cyan -translate-y-1' : 'opacity-0 group-hover:opacity-70 text-wellq-gray'
                    }`}
                    style={{ bottom: `calc(${barHeightPct}% + 10px)` }}
                  >
                    {fmt(total)}
                  </div>

                  <div className="w-8 sm:w-9 h-full flex flex-col justify-end relative">
                    {/* Track de fondo */}
                    <div className="absolute inset-x-0 bottom-0 top-0 rounded-t-xl bg-white/[0.03] dark:bg-white/[0.025]" />
                    <div 
                      className={`relative w-full flex flex-col-reverse rounded-t-xl overflow-hidden transition-all duration-300 ${
                        isSelected
                          ? 'opacity-100 ring-1 ring-wellq-cyan/50 ring-offset-1 dark:ring-offset-wellq-dark scale-[1.08] shadow-[0_0_20px_4px_rgba(22,248,249,0.2)]'
                          : 'opacity-55 hover:opacity-85 hover:scale-105'
                      }`}
                      style={{ height: `${barHeightPct}%`, minHeight: barHeightPct > 0 ? '4px' : '0' }}
                    >
                      <motion.div
                        initial={{ height: 0 }} animate={{ height: `${newBizPct}%` }}
                        transition={{ duration: 0.55, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                        className="w-full bg-gradient-to-t from-emerald-600 to-emerald-400 flex-shrink-0"
                      />
                      <motion.div
                        initial={{ height: 0 }} animate={{ height: `${expansionPct}%` }}
                        transition={{ duration: 0.55, delay: i * 0.07 + 0.04, ease: [0.22, 1, 0.36, 1] }}
                        className="w-full bg-gradient-to-t from-cyan-500 to-cyan-300 flex-shrink-0"
                      />
                      <motion.div
                        initial={{ height: 0 }} animate={{ height: `${retainedPct}%` }}
                        transition={{ duration: 0.55, delay: i * 0.07 + 0.08, ease: [0.22, 1, 0.36, 1] }}
                        className="w-full bg-gradient-to-t from-amber-600 to-amber-400 flex-shrink-0"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t-2 border-dashed border-wellq-gray/20 dark:border-wellq-gray/30 my-2" />

          {/* Barras de churn */}
          <div className="flex items-start justify-between h-12 gap-1">
            {visibleSnapshots.map((d, i) => {
              const realIndex  = startIndex + i;
              const isSelected = selected === realIndex;
              const churnPct   = maxChurn > 0 ? (Math.abs(d.churn ?? 0) / maxChurn) * 100 : 0;
              return (
                <div
                  key={realIndex}
                  className="flex-1 flex justify-center h-full cursor-pointer group"
                  onClick={() => setSelected(realIndex)}
                >
                  <div className="w-8 sm:w-9 h-full">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${churnPct}%` }}
                      transition={{ duration: 0.5, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                      className={`w-full bg-gradient-to-b from-red-400 to-red-600 rounded-b-xl transition-all duration-300 ${
                        isSelected ? 'opacity-100 scale-105 shadow-[0_4px_14px_2px_rgba(239,68,68,0.25)]' : 'opacity-45 group-hover:opacity-75 group-hover:scale-105'
                      }`}
                      style={{ minHeight: churnPct > 0 ? '3px' : '0' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Labels de meses */}
          <div className="flex justify-between mt-4">
            {visibleSnapshots.map((d, i) => {
              const realIndex = startIndex + i;
              return (
                <div
                  key={realIndex}
                  className={`flex-1 text-center text-[11px] font-bold uppercase tracking-wider cursor-pointer transition-colors duration-200 ${
                    selected === realIndex
                      ? 'text-wellq-cyan'
                      : 'text-wellq-gray hover:text-wellq-dark dark:hover:text-white'
                  }`}
                  onClick={() => setSelected(realIndex)}
                >
                  {d.period_month}
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. Panel de detalle inferior */}
        <AnimatePresence mode="wait">
          {snap && (
            <motion.div 
              key={`detail-${snap.period_month}`}
              initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="mt-8 bg-wellq-gray/5 dark:bg-white/[0.02] rounded-xl p-5 border border-wellq-gray/10 dark:border-white/5"
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-bold text-wellq-dark dark:text-white tracking-tight">
                  Detail — {snap.period_month} {snap.period_year}
                </h4>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { label: 'Total MRR',    value: fmt(snap.total_mrr),                    color: 'text-wellq-dark dark:text-white' },
                  { label: 'Retained',     value: fmt(snap.retained ?? 0),                color: 'text-amber-500' },
                  { label: 'New Business', value: `+${fmt(snap.new_business ?? 0)}`,      color: 'text-wellq-green' },
                  { label: 'Expansion',    value: `+${fmt(snap.expansion ?? 0)}`,         color: 'text-wellq-cyan' },
                  { label: 'Churn',        value: `-${fmt(Math.abs(snap.churn ?? 0))}`,   color: 'text-red-400' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="text-center p-3 rounded-xl bg-white dark:bg-wellq-dark border border-wellq-gray/10 dark:border-white/5 shadow-sm">
                    <p className="text-[10px] font-bold text-wellq-gray uppercase tracking-wider mb-1">{label}</p>
                    <p className={`text-sm font-black tabular-nums ${color}`}>{value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 h-2 rounded-full overflow-hidden flex gap-0.5 bg-wellq-gray/10 dark:bg-white/5">
                {snap.retained > 0 && (
                  <motion.div initial={{ width: 0 }} animate={{ width: `${((snap.retained ?? 0) / snap.total_mrr) * 100}%` }} className="bg-amber-500 h-full" />
                )}
                {snap.new_business > 0 && (
                  <motion.div initial={{ width: 0 }} animate={{ width: `${((snap.new_business ?? 0) / snap.total_mrr) * 100}%` }} className="bg-wellq-green h-full" />
                )}
                {snap.expansion > 0 && (
                  <motion.div initial={{ width: 0 }} animate={{ width: `${((snap.expansion ?? 0) / snap.total_mrr) * 100}%` }} className="bg-wellq-cyan h-full" />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 5. Paginación */}
        {snapshots.length > itemsPerPage && (
          <div className="mt-6 flex justify-center items-center gap-4">
            <button 
              onClick={handleOlder} 
              disabled={currentPage >= totalPages - 1}
              className="p-2 rounded-xl bg-wellq-gray/5 hover:bg-wellq-gray/10 dark:bg-white/5 dark:hover:bg-white/10 text-wellq-gray dark:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
            >
              <ChevronLeft size={18} strokeWidth={2.5} />
                        </button>
                        <span className="text-xs font-bold text-wellq-gray tracking-widest">
                          {totalPages - currentPage} / {totalPages}
                        </span>
                        <button 
                          onClick={handleNewer} 
                          disabled={currentPage === 0}
                          className="p-2 rounded-xl bg-wellq-gray/5 hover:bg-wellq-gray/10 dark:bg-white/5 dark:hover:bg-white/10 text-wellq-gray dark:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
                        >
                          <ChevronRight size={18} strokeWidth={2.5} />
                        </button>
                      </div>
                    )}

                  </div>
                </div>
              );
            };