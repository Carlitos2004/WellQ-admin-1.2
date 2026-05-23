import React from 'react';
import { motion } from 'framer-motion';
import { 
  Smartphone, Tablet, Clock, ShieldCheck, 
  Sparkles, FileText, CheckCircle2, Percent, TrendingUp, AlertTriangle 
} from 'lucide-react';
import { Skeleton } from '../components/ui';
import { useLanguage } from '../contexts/LanguageContext';

// ─── Design Tokens para Analytics (Single Source of Truth) ───
// Centralizamos la tipología visual mapeada exactamente a tus variables de Tailwind v4
const METRIC_META = {
  patientMau: {
    icon: Smartphone,
    ring: 'ring-wellq-cyan/20 dark:ring-wellq-cyan/10',
    border: 'border-wellq-cyan/20 dark:border-wellq-cyan/30',
    bg: 'bg-wellq-cyan/5 dark:bg-wellq-cyan/10',
    text: 'text-wellq-cyan',
    bar: 'from-wellq-cyan to-wellq-blue',
  },
  tabletMau: {
    icon: Tablet,
    ring: 'ring-wellq-green/20 dark:ring-wellq-green/10',
    border: 'border-wellq-green/20 dark:border-wellq-green/30',
    bg: 'bg-wellq-green/5 dark:bg-wellq-green/10',
    text: 'text-wellq-green',
    bar: 'from-wellq-green to-teal-400',
  },
  session: {
    icon: Clock,
    ring: 'ring-wellq-blue/20 dark:ring-wellq-blue/10',
    border: 'border-wellq-gray/20 dark:border-[#1e293b]',
    bg: 'bg-wellq-gray/5 dark:bg-[#0b1017]/40',
    text: 'text-wellq-dark dark:text-white',
    bar: 'from-wellq-blue to-wellq-cyan',
  },
  crashFree: {
    icon: ShieldCheck,
    ring: 'ring-wellq-green/20 dark:ring-wellq-green/10',
    border: 'border-wellq-gray/20 dark:border-[#1e293b]',
    bg: 'bg-wellq-gray/5 dark:bg-[#0b1017]/40',
    text: 'text-wellq-green',
    bar: 'from-wellq-green to-emerald-400',
  }
};

export const AnalyticsView = ({
  appStats, featureAdoption, adherence, cohorts, soapQuality, loading,
}) => {
  const { t } = useLanguage();

  const patientApp = appStats?.patients;
  const tabletApp = appStats?.tablet;

  // Variantes de animación idénticas a la coreografía de tu vista Support
  const containerVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.05 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
  };

  return (
    <motion.div
      className="space-y-7 font-sans"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* ─── App Usage + SOAP Quality ─── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Tarjetas de Uso de Aplicaciones */}
        <motion.div 
          variants={itemVariants} 
          className="bg-white dark:bg-[#0b1017] rounded-2xl p-6 shadow-sm border border-wellq-gray/20 dark:border-[#1e293b] xl:col-span-2"
        >
          <div className="flex items-center gap-2 mb-5">
            <Smartphone size={16} className="text-wellq-cyan" />
            <h3 className="font-bold text-wellq-dark dark:text-white text-sm">{t('analytics.appUsage')}</h3>
          </div>
          
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: `${t('overview.patientApp')} — MAU`, value: patientApp?.metrics?.monthly_active_users?.toLocaleString() ?? '0', meta: METRIC_META.patientMau, pct: 100 },
                { label: `${t('overview.clinicianTablet')} — MAU`, value: tabletApp?.metrics?.monthly_active_users?.toLocaleString() ?? '0', meta: METRIC_META.tabletMau, pct: 100 },
                { label: t('analytics.avgSessionPatient'), value: `${patientApp?.metrics?.average_session_length_minutes ?? 0} min`, meta: METRIC_META.session, pct: 65 },
                { label: t('analytics.avgSessionTablet'), value: `${tabletApp?.metrics?.average_session_length_minutes ?? 0} min`, meta: METRIC_META.session, pct: 85 },
                { label: t('analytics.crashFreePatient'), value: `${patientApp?.metrics?.crash_free_sessions_percentage ?? 0}%`, meta: METRIC_META.crashFree, pct: patientApp?.metrics?.crash_free_sessions_percentage ?? 0 },
                { label: t('analytics.crashFreeTablet'), value: `${tabletApp?.metrics?.crash_free_sessions_percentage ?? 0}%`, meta: METRIC_META.crashFree, pct: tabletApp?.metrics?.crash_free_sessions_percentage ?? 0 },
              ].map((item, i) => (
                <AnalyticsMetricCard key={i} item={item} />
              ))}
            </div>
          )}
        </motion.div>

        {/* Calidad de Notas SOAP */}
        <motion.div 
          variants={itemVariants} 
          className="relative bg-gradient-to-br from-white to-wellq-gray/5 dark:from-[#0b1017] dark:to-white/[0.01] rounded-2xl p-6 shadow-sm border border-wellq-gray/20 dark:border-[#1e293b] overflow-hidden"
        >
          {/* Brillo ambiental superior */}
          <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-wellq-green/10 to-transparent opacity-60 pointer-events-none" />
          
          <div className="relative flex items-center gap-2 mb-5">
            <Sparkles size={16} className="text-wellq-green" />
            <h3 className="font-bold text-wellq-dark dark:text-white text-sm">{t('analytics.soapQuality')}</h3>
          </div>
          
          {loading ? (
            <div className="space-y-4 mt-2">
              <Skeleton className="h-10 w-24 rounded-lg" />
              <Skeleton className="h-4 w-full rounded" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          ) : (
            <div className="relative space-y-5">
              <div>
                <div className="text-4xl font-black text-wellq-green tracking-tight leading-none mb-1.5 tabular-nums">
                  {soapQuality?.acceptance_rate_percentage ?? 0}<span className="text-xl font-bold">%</span>
                </div>
                <div className="text-xs font-semibold text-wellq-gray uppercase tracking-wider">{t('analytics.acceptanceRate')}</div>
              </div>

              {/* Barra de progreso principal de la tarjeta */}
              <div className="h-1.5 bg-black/[0.06] dark:bg-white/[0.06] rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-gradient-to-r from-wellq-green to-teal-400 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${soapQuality?.acceptance_rate_percentage ?? 0}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>

              {/* Filas de detalles estilo Support List */}
              <div className="space-y-3 pt-2 text-sm">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-wellq-gray/5 dark:bg-white/[0.02]">
                  <span className="text-xs font-medium text-wellq-gray flex items-center gap-2">
                    <FileText size={14} /> {t('analytics.notesGenerated')}
                  </span>
                  <span className="font-bold text-wellq-dark dark:text-white tabular-nums">
                    {(soapQuality?.total_notes_generated ?? 0).toLocaleString()}
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-wellq-gray/5 dark:bg-white/[0.02]">
                  <span className="text-xs font-medium text-wellq-gray flex items-center gap-2">
                    <AlertTriangle size={14} className="text-amber-500" /> {t('analytics.requireEdits')}
                  </span>
                  <span className="font-bold text-amber-500 tabular-nums">
                    {soapQuality?.edits_required_percentage ?? 0}%
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-wellq-green/5 border border-wellq-green/10">
                  <span className="text-xs font-semibold text-wellq-green flex items-center gap-2">
                    <CheckCircle2 size={14} /> {t('analytics.timeSaved')}
                  </span>
                  <span className="font-extrabold text-wellq-green tabular-nums">
                    {soapQuality?.average_time_saved_minutes_per_note ?? 0} min/note
                  </span>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* ─── Feature Adoption ─── */}
      <motion.div 
        variants={itemVariants} 
        className="bg-white dark:bg-[#0b1017] rounded-2xl p-6 shadow-sm border border-wellq-gray/20 dark:border-[#1e293b]"
      >
        <div className="flex items-center justify-between mb-5 border-b border-wellq-gray/10 dark:border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <Percent size={16} className="text-wellq-cyan" />
            <h3 className="font-bold text-wellq-dark dark:text-white text-sm">
              {t('analytics.featureAdoption')}
            </h3>
          </div>
          <span className="text-xs font-bold uppercase bg-wellq-gray/10 text-wellq-gray px-2.5 py-1 rounded-md tracking-wider">
            {t('analytics.last30days')}
          </span>
        </div>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-full rounded" />
          </div>
        ) : (
          <div className="space-y-4">
            {(
              featureAdoption?.data ?? [
                { feature_name: t('overview.waitingConnection'), adoption_rate_percentage: 0, total_uses: 0, user_feedback_score: 0 },
              ]
            ).map((f, i) => (
              <div key={i} className="p-3 rounded-xl border border-transparent hover:border-wellq-gray/10 dark:hover:border-white/5 hover:bg-wellq-gray/3 dark:hover:bg-white/[0.01] transition-all group">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div>
                    <span className="text-sm font-semibold text-wellq-dark dark:text-white group-hover:text-wellq-cyan transition-colors">{f.feature_name}</span>
                    <span className="ml-2.5 text-xs font-medium text-wellq-gray bg-wellq-gray/5 dark:bg-white/5 px-2 py-0.5 rounded-md">
                      {f.total_uses?.toLocaleString()} {t('analytics.uses')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <span className="text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md flex items-center gap-1">
                      ⭐ {f.user_feedback_score}
                    </span>
                    <span className="text-sm font-black text-wellq-cyan tabular-nums">
                      {f.adoption_rate_percentage}%
                    </span>
                  </div>
                </div>
                {/* Barra de progreso animada con degradado corporativo */}
                <div className="h-2 bg-wellq-gray/10 dark:bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-wellq-cyan to-wellq-blue rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${f.adoption_rate_percentage}%` }}
                    transition={{ duration: 0.9, delay: i * 0.08, ease: 'easeOut' }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* ─── Adherence + Cohorts ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Gráfico de Adherencia Semanal */}
        <motion.div 
          variants={itemVariants} 
          className="bg-white dark:bg-[#0b1017] rounded-2xl p-6 shadow-sm border border-wellq-gray/20 dark:border-[#1e293b]"
        >
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-wellq-green" />
            <h3 className="font-bold text-wellq-dark dark:text-white text-sm">{t('analytics.adherence')}</h3>
          </div>
          
          {loading ? (
            <Skeleton className="h-44 w-full rounded-xl" />
          ) : (
            <>
              <div className="mb-4">
                <div className="text-4xl font-black text-wellq-green tracking-tight tabular-nums">
                  {adherence?.overall_adherence_percentage ?? 0}<span className="text-xl font-bold">%</span>
                </div>
                <div className="text-xs font-medium text-wellq-gray mt-1">
                  {t('analytics.topDropOff')}:{' '}
                  <span className="font-bold text-red-400 bg-red-500/5 border border-red-500/10 px-2 py-0.5 rounded-md ml-1 inline-block">
                    {adherence?.top_dropping_point ?? t('overview.waitingConnection')}
                  </span>
                </div>
              </div>
              
              <div className="space-y-3.5 pt-2">
                {(adherence?.breakdown_by_week ?? [{ week: 'Week 1', adherence: 0 }]).map((w, i) => (
                  <div key={i} className="flex items-center gap-3 group">
                    <span className="text-xs font-bold text-wellq-gray w-14 group-hover:text-wellq-dark dark:group-hover:text-white transition-colors">{w.week}</span>
                    <div className="flex-1 h-2 bg-wellq-gray/10 dark:bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-wellq-green to-emerald-400 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${w.adherence}%` }}
                        transition={{ duration: 0.8, delay: i * 0.05, ease: 'easeOut' }}
                      />
                    </div>
                    <span className="text-xs font-bold text-wellq-dark dark:text-white/90 w-10 text-right tabular-nums">
                      {w.adherence}%
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.div>

        {/* Matriz de Cohortes de Retención */}
        <motion.div 
          variants={itemVariants} 
          className="bg-white dark:bg-[#0b1017] rounded-2xl p-6 shadow-sm border border-wellq-gray/20 dark:border-[#1e293b]"
        >
          <div className="flex items-center gap-2 mb-5">
            <CheckCircle2 size={16} className="text-wellq-cyan" />
            <h3 className="font-bold text-wellq-dark dark:text-white text-sm">{t('analytics.cohortRetention')}</h3>
          </div>

          {loading ? (
            <Skeleton className="h-44 w-full rounded-xl" />
          ) : (
            <div className="space-y-4">
              {(
                cohorts?.data ?? [
                  { cohort: t('overview.waitingConnection'), users: 0, retention_by_month: { M1: 0, M2: 0, M3: 0, M4: 0 } },
                ]
              ).map((c, i) => {
                const months = Object.entries(c.retention_by_month);
                return (
                  <div key={i} className="p-3 rounded-xl bg-wellq-gray/3 dark:bg-white/[0.01] border border-wellq-gray/5 dark:border-white/5">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-bold text-wellq-dark dark:text-white text-xs uppercase tracking-wider">{c.cohort}</span>
                      <span className="text-xs font-semibold text-wellq-gray">
                        {c.users?.toLocaleString()} {t('analytics.users')}
                      </span>
                    </div>
                    <div className="flex gap-1.5">
                      {months.map(([m, pct], j) => (
                        <div key={j} className="flex-1 text-center">
                          {/* El recuadro usa opacidad dinámica basada en el % de retención usando la variable corporativa cyan */}
                          <motion.div
                            className="h-9 rounded-lg flex items-center justify-center border border-wellq-cyan/10"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.3, delay: j * 0.05 }}
                            style={{ backgroundColor: `rgba(22, 248, 249, ${pct / 100})` }}
                          >
                            <span className="text-xs font-black text-wellq-dark dark:text-white filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)] tabular-nums">
                              {pct}%
                            </span>
                          </motion.div>
                          <span className="text-[10px] font-bold uppercase text-wellq-gray block mt-1">{m}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
};

// ─── Subcomponente Local: Analytics Metric Card (Estilo Support MetricCard) ───
const AnalyticsMetricCard = ({ item }) => {
  const Icon = item.meta.icon;
  
  return (
    <div className={`relative rounded-xl border ${item.meta.border} ${item.meta.bg} p-4 overflow-hidden group transition-all duration-300 hover:shadow-md`}>
      <div className="flex items-start justify-between mb-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-white dark:bg-[#0b1017] ring-1 ${item.meta.ring} shadow-sm transition-transform group-hover:scale-105`}>
          <Icon size={15} className={item.meta.text} strokeWidth={2.2} />
        </div>
        <span className="text-[10px] font-bold bg-black/5 dark:bg-white/5 text-wellq-gray px-2 py-0.5 rounded-md tracking-wider">
          Live
        </span>
      </div>

      <p className={`text-2xl font-black ${item.meta.text} leading-none tabular-nums mb-1 tracking-tight`}>
        {item.value}
      </p>

      <p className="text-[11px] font-bold text-wellq-gray dark:text-wellq-gray/90 tracking-wide truncate">
        {item.label}
      </p>

      {/* Barra de progreso micro-animada en la base inferior de cada tarjeta */}
      <div className="mt-3 h-1 bg-black/[0.05] dark:bg-white/[0.05] rounded-full overflow-hidden">
        <motion.div
          className={`h-full bg-gradient-to-r ${item.meta.bar} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${item.pct}%` }}
          transition={{ duration: 0.7, ease: 'easeOut', delay: 0.1 }}
        />
      </div>
    </div>
  );
};