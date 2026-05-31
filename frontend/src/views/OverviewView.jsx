import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, AlertTriangle, Bell, Zap, Server, Users, Smartphone,
  Clock, Activity, ArrowUpRight, ChevronRight, CheckCheck, Info,
  Tablet, Monitor, X, Cpu, Database, Globe, HardDrive, ArrowDownRight
} from 'lucide-react';
import { KPICard, AlertItem, SegmentedControl, Skeleton } from '../components/ui';
import { MRRChart } from '../components/charts/MRRChart';
import { ChurnHeatmap } from '../components/charts/ChurnHeatmap';
import { useLanguage } from '../contexts/LanguageContext';
import { OpenTicketsWidget } from '../components/overview/OpenTicketsWidget';
import { ChurnRegionModal } from '../components/charts/ChurnRegionModal';

// ── Animaciones Base ──
const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

// ─── Operational Status helpers ───────────────────────────────────────────────
const getStatusDot = (status) => {
  switch (status) {
    case 'operational': case 'running': case 'healthy': return 'bg-wellq-green';
    case 'degraded': case 'warning': return 'bg-amber-500 animate-pulse';
    case 'down': case 'error': case 'failed': return 'bg-red-500 animate-pulse';
    case 'idle': return 'bg-wellq-gray/40';
    case 'scheduled': case 'sleeping': return 'bg-wellq-blue';
    default: return 'bg-wellq-gray/40';
  }
};

const getStatusColor = (status) => {
  switch (status) {
    case 'operational': case 'running': return 'text-wellq-green bg-wellq-green/10';
    case 'degraded': case 'warning': return 'text-amber-600 bg-amber-100';
    case 'down': case 'error': case 'failed': return 'text-red-600 bg-red-100';
    case 'idle': return 'text-wellq-gray bg-wellq-gray/10';
    case 'scheduled': case 'sleeping': return 'text-wellq-blue bg-wellq-blue/10';
    default: return 'text-wellq-gray bg-wellq-gray/10';
  }
};

const getLoadColor = (pct) => {
  if (pct === 0) return 'bg-wellq-gray/30';
  if (pct >= 85) return 'bg-red-500';
  if (pct >= 70) return 'bg-amber-500';
  return 'bg-wellq-green';
};

// ─── Severity tokens ────────────────────────────────────────────────────────
const getSeverityStyle = (severity) => {
  switch (severity) {
    case 'critical':
      return {
        bar:    'bg-gradient-to-b from-red-400 to-red-600',
        icon:   'text-red-500 dark:text-red-400',
        bg:     'bg-red-50/60 dark:bg-red-900/10',
        border: 'border-red-200/80 dark:border-red-700/30',
        badge:  'bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700/40',
        dot:    'bg-red-500',
        pulse:  true,
      };
    case 'high':
      return {
        bar:    'bg-gradient-to-b from-amber-400 to-amber-600',
        icon:   'text-amber-500 dark:text-amber-400',
        bg:     'bg-amber-50/60 dark:bg-amber-900/10',
        border: 'border-amber-200/80 dark:border-amber-700/30',
        badge:  'bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700/40',
        dot:    'bg-amber-500',
        pulse:  true,
      };
    case 'medium':
      return {
        bar:    'bg-gradient-to-b from-blue-400 to-wellq-blue',
        icon:   'text-wellq-blue dark:text-wellq-blue',
        bg:     'bg-white dark:bg-wellq-dark',
        border: 'border-wellq-gray/20 dark:border-white/5',
        badge:  'bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700/40',
        dot:    'bg-wellq-blue',
        pulse:  false,
      };
    default:
      return {
        bar:    'bg-wellq-gray/40',
        icon:   'text-wellq-gray dark:text-wellq-gray/70',
        bg:     'bg-white dark:bg-wellq-dark',
        border: 'border-wellq-gray/20 dark:border-white/5',
        badge:  'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800/30 dark:text-slate-300 dark:border-slate-700/40',
        dot:    'bg-slate-400',
        pulse:  false,
      };
  }
};

// ─── SERVER STATUS META ───────────────────────────────────────────────────────
export const SERVER_STATUS_META = {
  operational: {
    label:  'Operational', icon: CheckCheck, ring: 'ring-wellq-gray/20 dark:ring-white/5', border: 'border-wellq-gray/20 dark:border-white/10',
    bg: 'bg-white dark:bg-wellq-dark', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700/40',
    dot: 'bg-emerald-400', bar: 'from-emerald-400 to-teal-400', text: 'text-emerald-600 dark:text-emerald-400', metricText: 'text-wellq-dark dark:text-white', pulse: false,
  },
  healthy: {
    label:  'Healthy', icon: CheckCheck, ring: 'ring-wellq-gray/20 dark:ring-white/5', border: 'border-wellq-gray/20 dark:border-white/10',
    bg: 'bg-white dark:bg-wellq-dark', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700/40',
    dot: 'bg-emerald-400', bar: 'from-emerald-400 to-teal-400', text: 'text-emerald-600 dark:text-emerald-400', metricText: 'text-wellq-dark dark:text-white', pulse: false,
  },
  degraded: {
    label:  'Degraded', icon: AlertTriangle, ring: 'ring-amber-400/30 dark:ring-amber-500/20', border: 'border-amber-200/70 dark:border-amber-700/30',
    bg: 'bg-amber-50/80 dark:bg-amber-900/10', badge: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700/40',
    dot: 'bg-amber-400', bar: 'from-amber-400 to-orange-400', text: 'text-amber-600 dark:text-amber-400', metricText: 'text-amber-600 dark:text-amber-400', pulse: true,
  },
  warning: {
    label:  'Warning', icon: AlertTriangle, ring: 'ring-amber-400/30 dark:ring-amber-500/20', border: 'border-amber-200/70 dark:border-amber-700/30',
    bg: 'bg-amber-50/80 dark:bg-amber-900/10', badge: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700/40',
    dot: 'bg-amber-400', bar: 'from-amber-400 to-orange-400', text: 'text-amber-600 dark:text-amber-400', metricText: 'text-amber-600 dark:text-amber-400', pulse: true,
  },
  down: {
    label:  'Down', icon: X, ring: 'ring-red-400/30 dark:ring-red-500/20', border: 'border-red-200/70 dark:border-red-700/30',
    bg: 'bg-red-50/80 dark:bg-red-900/10', badge: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700/40',
    dot: 'bg-red-400', bar: 'from-red-400 to-rose-400', text: 'text-red-600 dark:text-red-400', metricText: 'text-red-600 dark:text-red-400', pulse: true,
  },
  error: {
    label:  'Error', icon: X, ring: 'ring-red-400/30 dark:ring-red-500/20', border: 'border-red-200/70 dark:border-red-700/30',
    bg: 'bg-red-50/80 dark:bg-red-900/10', badge: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700/40',
    dot: 'bg-red-400', bar: 'from-red-400 to-rose-400', text: 'text-red-600 dark:text-red-400', metricText: 'text-red-600 dark:text-red-400', pulse: true,
  },
  idle: {
    label:  'Idle', icon: Clock, ring: 'ring-wellq-gray/20 dark:ring-white/5', border: 'border-wellq-gray/20 dark:border-white/10',
    bg: 'bg-white dark:bg-wellq-dark', badge: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/30 dark:text-slate-300 dark:border-slate-700/40',
    dot: 'bg-slate-400', bar: 'from-slate-400 to-gray-400', text: 'text-slate-500 dark:text-slate-400', metricText: 'text-wellq-gray dark:text-wellq-gray/80', pulse: false,
  },
};

// ─── App Usage Breakdown ──────────────────────────────────────────────────────
const fmt = (n) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : (n ?? 0).toLocaleString();

const AppUsageBreakdown = ({ appStats }) => {
  const { t } = useLanguage();

  const patients = appStats?.patients;
  const tablet   = appStats?.tablet;
  const web      = appStats?.web;

  const apps = [
    {
      label:       t('overview.patientApp'),
      icon:        Smartphone,
      iconBg:      'bg-wellq-cyan/10 dark:bg-wellq-cyan/10',
      iconColor:   'text-wellq-cyan dark:text-wellq-cyan',
      ringColor:   'ring-wellq-cyan/20',
      total:       patients?.total_downloads   ?? 0,
      activeToday: patients?.active_today      ?? 0,
      active30d:   patients?.active_30d        ?? 0,
      inactive:    patients?.inactive_users    ?? 0,
      ios:         patients?.ios_downloads     ?? 0,
      android:     patients?.android_downloads ?? 0,
      registered:  0,
      isWeb:       false,
      barActive:   'from-wellq-cyan to-blue-400',
      barInactive: 'from-wellq-gray/30 to-wellq-gray/10',
    },
    {
      label:       t('overview.clinicianTablet'),
      icon:        Tablet,
      iconBg:      'bg-wellq-green/10 dark:bg-wellq-green/10',
      iconColor:   'text-wellq-green dark:text-wellq-green',
      ringColor:   'ring-wellq-green/20',
      total:       tablet?.total_downloads   ?? 0,
      activeToday: tablet?.active_today      ?? 0,
      active30d:   tablet?.active_30d        ?? 0,
      inactive:    tablet?.inactive_users    ?? 0,
      ios:         tablet?.ios_downloads     ?? 0,
      android:     tablet?.android_downloads ?? 0,
      registered:  0,
      isWeb:       false,
      barActive:   'from-wellq-green to-teal-400',
      barInactive: 'from-wellq-gray/30 to-wellq-gray/10',
    },
    {
      label:       t('overview.webDashboard'),
      icon:        Monitor,
      iconBg:      'bg-wellq-gray/10 dark:bg-white/5',
      iconColor:   'text-wellq-gray dark:text-white',
      ringColor:   'ring-wellq-gray/20 dark:ring-white/10',
      total:       0,
      activeToday: web?.active_today    ?? 0,
      active30d:   web?.active_30d      ?? 0,
      inactive:    web?.inactive_users  ?? 0,
      ios:         0,
      android:     0,
      registered:  web?.registered_users ?? 0,
      isWeb:       true,
      barActive:   'from-wellq-gray to-slate-400',
      barInactive: 'from-wellq-gray/30 to-wellq-gray/10',
    },
  ];

  if (!patients && !tablet && !web) {
    return (
      <motion.div variants={itemVariants} className="bg-white dark:bg-wellq-dark rounded-2xl p-6 shadow-sm border border-wellq-gray/20 dark:border-white/5 h-full">
        <div className="mb-5">
          <h3 className="font-bold text-wellq-dark dark:text-white text-base tracking-tight">{t('overview.appUsageBreakdown')}</h3>
          <p className="text-xs font-medium text-wellq-gray dark:text-wellq-gray/80 mt-1">{t('overview.downloadsVsActive')}</p>
        </div>
        <div className="flex flex-col items-center justify-center py-10 gap-2 h-4/5">
          <Smartphone size={32} className="text-wellq-gray/30 dark:text-wellq-gray/40 mb-2" />
          <p className="text-sm font-medium text-wellq-gray dark:text-wellq-gray/80">{t('overview.waitingAppData')}</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div variants={itemVariants} className="bg-white dark:bg-wellq-dark rounded-2xl p-6 shadow-sm border border-wellq-gray/20 dark:border-white/5">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h3 className="font-bold text-wellq-dark dark:text-white text-base tracking-tight">{t('overview.appUsageBreakdown')}</h3>
          <p className="text-xs font-medium text-wellq-gray dark:text-wellq-gray/80 mt-1">{t('overview.downloadsVsActive')}</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-wellq-blue/10 flex items-center justify-center ring-1 ring-wellq-blue/20">
          <Activity size={18} className="text-wellq-blue" strokeWidth={2.2} />
        </div>
      </div>
      
      <div className="space-y-4">
        {apps.map((app, i) => {
          const Icon          = app.icon;
          const base          = app.isWeb ? app.registered : app.total;
          const activeRatio   = base > 0 ? Math.round((app.active30d / base) * 100) : 0;
          const inactiveRatio = base > 0 ? Math.round((app.inactive  / base) * 100) : 0;
          
          return (
            <div key={i} className="rounded-xl border border-wellq-gray/10 dark:border-white/5 bg-wellq-gray/5 dark:bg-white/[0.02] p-4 space-y-4 transition-colors hover:border-wellq-gray/20 dark:hover:border-white/10 group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${app.iconBg} ring-1 ${app.ringColor} flex items-center justify-center shadow-sm`}>
                    <Icon size={18} className={app.iconColor} strokeWidth={2.2} />
                  </div>
                  <div>
                    <span className="font-bold text-wellq-dark dark:text-white text-sm tracking-tight">{app.label}</span>
                    <p className="text-[10px] font-bold text-wellq-gray uppercase tracking-wider mt-0.5">
                      {app.isWeb ? t('overview.registeredUsers') : t('overview.totalDownloads')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xl font-black text-wellq-dark dark:text-white tabular-nums tracking-tight">
                    {app.isWeb ? fmt(app.registered) : fmt(app.total)}
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-3 text-center border-t border-wellq-gray/10 dark:border-white/5 pt-3">
                <div>
                  <p className="text-sm font-black text-wellq-green tabular-nums tracking-tight">{fmt(app.activeToday)}</p>
                  <p className="text-[10px] font-semibold text-wellq-gray uppercase tracking-wider">{t('overview.activeToday')}</p>
                </div>
                <div>
                  <p className="text-sm font-black text-wellq-cyan tabular-nums tracking-tight">{fmt(app.active30d)}</p>
                  <p className="text-[10px] font-semibold text-wellq-gray uppercase tracking-wider">{t('overview.active30d')}</p>
                </div>
                <div>
                  <p className="text-sm font-black text-amber-500 tabular-nums tracking-tight">{fmt(app.inactive)}</p>
                  <p className="text-[10px] font-semibold text-wellq-gray uppercase tracking-wider">{t('overview.inactive')}</p>
                </div>
              </div>
              
              <div className="h-2.5 bg-wellq-gray/10 dark:bg-white/5 rounded-full overflow-hidden flex gap-0.5">
                <motion.div 
                  className={`bg-gradient-to-r ${app.barActive} h-full rounded-l-full`}   
                  initial={{ width: 0 }}
                  animate={{ width: `${activeRatio}%` }}
                  transition={{ duration: 1, delay: i * 0.1, ease: 'easeOut' }}
                />
                <motion.div 
                  className={`bg-gradient-to-r ${app.barInactive} h-full rounded-r-full`} 
                  initial={{ width: 0 }}
                  animate={{ width: `${inactiveRatio}%` }}
                  transition={{ duration: 1, delay: i * 0.1 + 0.2, ease: 'easeOut' }}
                />
              </div>
              
              {!app.isWeb && (app.ios > 0 || app.android > 0) && (
                <div className="flex justify-between text-[11px] font-medium text-wellq-gray">
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-wellq-gray/40"/> iOS: {fmt(app.ios)}</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-wellq-gray/40"/> Android: {fmt(app.android)}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

// ─── Business Health Tab ──────────────────────────────────────────────────────
const BusinessHealthTab = ({
  loading, kpiArr, kpiClinics, kpiPatients, kpiNrr,
  mrrData, churnRegions, apiAlerts, onAcknowledgeAlert,
  onRegionClick, fmtArr,
}) => {
  const { t, tVal } = useLanguage();
  const arrSpark = kpiArr?.trend_graph?.map((t) => t.value) ?? [0, 0, 0, 0, 0, 0];

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div variants={itemVariants} className="h-full">
          <KPICard
            title={t('overview.arr')} value={fmtArr(kpiArr?.current_arr)} trend="up" trendValue="+0%"
            sparkData={arrSpark} subtitle={kpiArr ? `MRR: ${fmtArr(kpiArr.current_arr / 12)}` : t('overview.waitingConnection')} loading={loading}
          />
        </motion.div>
        <motion.div variants={itemVariants} className="h-full">
          <KPICard
            title={t('overview.activeClinics')} value={kpiClinics ? String(kpiClinics.total_active) : '0'} trend="up" trendValue={kpiClinics ? `+${kpiClinics.new_clinics_month}` : '+0'}
            sparkData={[0, 0, 0, 0, 0, kpiClinics?.total_active ?? 0]}
            subtitle={kpiClinics ? `${kpiClinics.new_clinics_month} ${t('overview.onboarded')} · ${kpiClinics.churned_clinics_month} ${t('overview.churned')}` : `0 ${t('overview.onboarded')} · 0 ${t('overview.churned')}`}
            loading={loading}
          />
        </motion.div>
        <motion.div variants={itemVariants} className="h-full">
          <KPICard
            title={t('overview.totalPatients')} value={kpiPatients ? kpiPatients.total_patients.toLocaleString() : '0'} trend="up" trendValue={kpiPatients ? `+${kpiPatients.new_this_week} ${t('overview.thisWeek')}` : '+0%'}
            sparkData={[0, 0, 0, 0, 0, kpiPatients?.total_patients ?? 0]} subtitle={kpiPatients ? `${kpiPatients.active_in_treatment?.toLocaleString()} ${t('overview.inTreatment')}` : t('overview.waitingConnection')} loading={loading}
          />
        </motion.div>
        <motion.div variants={itemVariants} className="h-full">
          <KPICard
            title={t('overview.nrr')} value={kpiNrr ? `${kpiNrr.nrr_percentage}%` : '0%'} trend={kpiNrr?.nrr_percentage >= 100 ? 'up' : 'down'} trendValue={kpiNrr ? `Exp: $${kpiNrr.expansion_mrr?.toLocaleString()}` : '+0%'}
            sparkData={[0, 0, 0, 0, 0, kpiNrr?.nrr_percentage ?? 0]} subtitle={kpiNrr ? `Churn MRR: $${kpiNrr.churn_mrr?.toLocaleString()}` : t('overview.waitingDatabase')} loading={loading}
          />
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div variants={itemVariants}>
          <MRRChart />
        </motion.div>
        <motion.div variants={itemVariants}>
          <ChurnHeatmap apiRegions={churnRegions} onRegionClick={onRegionClick} />
        </motion.div>
      </div>

      <motion.div variants={itemVariants} className="relative bg-white dark:bg-wellq-dark rounded-2xl shadow-sm border border-wellq-gray/20 dark:border-white/5 overflow-hidden">
        {/* Glow estilo PlatformOps */}
        {apiAlerts.length > 0 && <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-red-500/10 to-transparent opacity-50 pointer-events-none" />}
        
        {/* ── Header ── */}
        <div className="relative flex items-center justify-between px-6 py-5 border-b border-wellq-gray/10 dark:border-white/5 bg-wellq-gray/3 dark:bg-white/[0.02]">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center ring-1 ring-red-200 dark:ring-red-500/20 shadow-sm">
              <Bell size={18} className="text-red-500 dark:text-red-400" strokeWidth={2.2} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="font-bold text-base text-wellq-dark dark:text-white tracking-tight">{t('overview.needsAttention')}</h3>
                {apiAlerts.length > 0 && (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="px-2 py-0.5 bg-red-500 text-white text-[11px] font-bold rounded-md flex items-center justify-center tabular-nums shadow-sm shadow-red-500/20">
                    {apiAlerts.length}
                  </motion.span>
                )}
              </div>
              <p className="text-xs font-medium text-wellq-gray mt-0.5">{t('overview.updatedRecently')}</p>
            </div>
          </div>
          
          {apiAlerts.length > 0 && (
            <div className="flex items-center gap-2">
              {['critical','high','medium'].map((sev) => {
                const count = apiAlerts.filter(a => a.severity === sev).length;
                if (!count) return null;
                const s = getSeverityStyle(sev);
                return (
                  <span key={sev} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${s.badge}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${s.dot} ${s.pulse ? 'animate-pulse' : ''}`} />
                    {count} {sev}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Content ── */}
        <div className="relative p-6 bg-white dark:bg-wellq-dark">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="w-full h-20 rounded-xl" />
              ))}
            </div>
          ) : apiAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center ring-1 ring-emerald-200 dark:ring-emerald-500/20 shadow-sm">
                <CheckCheck size={28} className="text-emerald-500" strokeWidth={2} />
              </div>
              <div className="text-center">
                <p className="text-base font-bold text-wellq-dark dark:text-white mt-1">{t('overview.allInOrder')}</p>
                <p className="text-sm font-medium text-wellq-gray mt-0.5">{t('overview.noAlerts')}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {apiAlerts.map((alert, idx) => {
                const style = getSeverityStyle(alert.severity);
                const params = alert.message_params
                  ? (typeof alert.message_params === 'string' ? JSON.parse(alert.message_params) : alert.message_params)
                  : {};
                const resolvedTitle   = alert.title_key   ? t(alert.title_key, params)   : alert.title;
                const resolvedMessage = alert.message_key ? t(alert.message_key, params) : alert.message;
                return (
                  <motion.div
                    key={alert.alert_id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05, type: 'spring', stiffness: 300, damping: 25 }}
                    className={`flex items-center gap-4 p-4 rounded-xl border ${style.border} ${style.bg} transition-all duration-200 hover:shadow-md group`}
                  >
                    <div className={`w-1.5 self-stretch rounded-full flex-shrink-0 ${style.bar}`} />
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ring-1 shadow-sm ${
                      alert.severity === 'critical' ? 'bg-red-50 dark:bg-red-500/10 ring-red-200 dark:ring-red-500/20'
                      : alert.severity === 'high'   ? 'bg-amber-50 dark:bg-amber-500/10 ring-amber-200 dark:ring-amber-500/20'
                      : 'bg-wellq-gray/5 dark:bg-white/5 ring-wellq-gray/20 dark:ring-white/10'
                    }`}>
                      <AlertTriangle size={18} className={`${style.icon} flex-shrink-0`} strokeWidth={2.2} />
                    </div>

                    <div className="flex-1 min-w-0 pr-4">
                      <p className="text-sm font-bold text-wellq-dark dark:text-white truncate leading-tight tracking-tight">{resolvedTitle}</p>
                      <p className="text-xs font-medium text-wellq-gray dark:text-wellq-gray/80 truncate mt-1">{resolvedMessage}</p>
                    </div>

                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider flex-shrink-0 ${style.badge}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${style.dot} ${style.pulse ? 'animate-pulse' : ''}`} />
                      {tVal(alert.severity)}
                    </span>

                    <button
                      onClick={() => onAcknowledgeAlert(alert.alert_id)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-wellq-dark border border-wellq-gray/20 dark:border-white/10 rounded-lg text-xs font-bold text-wellq-gray hover:text-wellq-dark dark:hover:text-white hover:border-wellq-gray/40 dark:hover:border-white/20 transition-all flex-shrink-0 cursor-pointer opacity-0 group-hover:opacity-100 shadow-sm active:scale-95"
                    >
                      <CheckCheck size={14} />
                      {t('overview.markRead')}
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Server Detail Drawer (Mejorado con createPortal para abarcar Sidebar) ───
const ServerDetailPanel = ({ server, onClose }) => {
  const { t } = useLanguage(); 

  if (!server) return null;

  const meta = SERVER_STATUS_META[server.status] ?? SERVER_STATUS_META.idle;
  
  const getBarColor = (val, warn, crit) => {
    if (val >= crit) return 'from-red-400 to-rose-400';
    if (val >= warn) return 'from-amber-400 to-orange-400';
    return 'from-emerald-400 to-teal-400';
  };

  const getTextColor = (val, warn, crit) =>
    val >= crit ? 'text-red-500 dark:text-red-400' : val >= warn ? 'text-amber-500 dark:text-amber-400' : 'text-emerald-500 dark:text-emerald-400';

  const isHealthy = server.status === 'operational' || server.status === 'healthy';
  const isDown    = server.status === 'down' || server.status === 'error';

  const metrics = [
    { label: 'CPU Usage',    value: server.cpu,    unit: '%', warn: 70, crit: 85 },
    { label: 'Memory (RAM)', value: server.memory, unit: '%', warn: 75, crit: 90 },
  ];

  const details = [
    { label: 'Region',       value: server.region     ?? 'N/A' },
    { label: 'Uptime',       value: server.uptime     ?? '—'   },
    { label: 'Server ID',    value: server.server_id  ?? server.name ?? '—' },
    { label: 'Type',         value: server.type       ?? 'Server' },
    { label: 'Last Updated', value: server.updated_at
        ? new Date(server.updated_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        : 'Just now' },
  ];

  return (
    <>
      {/* Aseguramos que cubra toda la pantalla usando fixed z-[9999] y backdrop-blur-md 
        para que la barra lateral también quede borrosa con ese efecto premium.
      */}
      <motion.div
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-[9999] bg-[#0b1017]/60 backdrop-blur-md"
        onClick={onClose}
      />
      
      {/* Drawer Panel a la derecha */}
      <motion.div
        initial={{ x: '100%', opacity: 0 }} 
        animate={{ x: 0, opacity: 1 }} 
        exit={{ x: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed right-0 top-0 h-full w-full max-w-md z-[10000] flex flex-col bg-white dark:bg-wellq-dark shadow-2xl border-l border-wellq-gray/20 dark:border-white/10 overflow-hidden font-sans"
      >
        <div className={`flex-shrink-0 h-1.5 w-full bg-gradient-to-r ${meta.bar}`} />
        
        <div className="flex items-start justify-between px-6 py-5 border-b border-wellq-gray/10 dark:border-white/5 bg-wellq-gray/3 dark:bg-white/[0.02]">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ring-1 shadow-sm ${meta.ring} ${meta.bg}`}>
              <Server size={20} className={meta.text} strokeWidth={2.2} />
            </div>
            <div>
              <h2 className="font-bold text-lg text-wellq-dark dark:text-white leading-tight tracking-tight">{server.name}</h2>
              <p className="text-xs font-medium text-wellq-gray mt-1">{server.region} · {server.server_id ?? ''}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <button onClick={onClose} className="p-2 hover:bg-wellq-gray/10 dark:hover:bg-white/10 rounded-xl transition-colors cursor-pointer outline-none">
              <X size={18} className="text-wellq-gray" strokeWidth={2.5} />
            </button>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${meta.badge}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${meta.dot} ${meta.pulse ? 'animate-pulse' : ''}`} />
              {meta.label}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide p-6 space-y-8 bg-white dark:bg-wellq-dark">
          <div>
            <p className="text-[10px] font-bold text-wellq-gray uppercase tracking-wider mb-3">Live Metrics</p>
            <div className="space-y-4">
              {metrics.map(({ label, value, unit, warn, crit }) => {
                const pct = Math.min(value, 100);
                return (
                  <div key={label} className={`rounded-xl p-5 border shadow-sm ${
                    value >= crit ? 'bg-red-50/80 dark:bg-red-500/5 border-red-200/70 dark:border-red-500/20'
                    : value >= warn ? 'bg-amber-50/80 dark:bg-amber-500/5 border-amber-200/70 dark:border-amber-500/20'
                    : 'bg-wellq-gray/5 dark:bg-white/[0.03] border-wellq-gray/20 dark:border-white/5'
                  }`}>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-bold text-wellq-dark dark:text-white">{label}</span>
                      <span className={`text-3xl font-black tabular-nums tracking-tight ${getTextColor(value, warn, crit)}`}>
                        {value}<span className="text-sm font-bold opacity-60 ml-0.5">{unit}</span>
                      </span>
                    </div>
                    <div className="h-2 bg-black/[0.06] dark:bg-white/[0.06] rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full bg-gradient-to-r ${getBarColor(value, warn, crit)}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.7, ease: 'easeOut', delay: 0.1 }}
                      />
                    </div>
                    <div className="relative mt-1.5 h-3">
                      <span className="absolute text-[10px] font-bold text-amber-500/70" style={{ left: `${warn}%`, transform: 'translateX(-50%)' }}>│{warn}%</span>
                      <span className="absolute text-[10px] font-bold text-red-500/70"   style={{ left: `${crit}%`, transform: 'translateX(-50%)' }}>│{crit}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {!isHealthy && (
            <div className={`rounded-xl p-4 border flex items-start gap-3 shadow-sm ${
              isDown ? 'bg-red-50/80 dark:bg-red-500/10 border-red-200/70 dark:border-red-500/20' : 'bg-amber-50/80 dark:bg-amber-500/10 border-amber-200/70 dark:border-amber-500/20'
            }`}>
              <AlertTriangle size={18} className={`mt-0.5 flex-shrink-0 ${isDown ? 'text-red-500' : 'text-amber-500'}`} strokeWidth={2.2} />
              <div>
                <p className={`text-sm font-bold tracking-tight ${isDown ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {isDown ? 'Server Unavailable' : 'Performance Degraded'}
                </p>
                <p className="text-xs font-medium text-wellq-gray mt-1">
                  {isDown ? 'This server is currently down. Check logs and escalate if needed.' : 'This server is showing elevated resource usage. Monitor closely.'}
                </p>
              </div>
            </div>
          )}

          <div>
            <p className="text-[10px] font-bold text-wellq-gray uppercase tracking-wider mb-3">Details</p>
            <div className="rounded-xl border border-wellq-gray/10 dark:border-white/5 overflow-hidden divide-y divide-wellq-gray/10 dark:divide-white/5 bg-wellq-gray/3 dark:bg-white/[0.02]">
              {details.map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between px-4 py-3.5 hover:bg-wellq-gray/5 dark:hover:bg-white/[0.04] transition-colors">
                  <span className="text-xs font-semibold text-wellq-gray">{label}</span>
                  <span className="text-sm font-bold text-wellq-dark dark:text-white text-right max-w-[55%] truncate">{value}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Resource summary cards */}
          <div>
            <p className="text-[10px] font-bold text-wellq-gray uppercase tracking-wider mb-3">Resource Summary</p>
            <div className="grid grid-cols-2 gap-3">
              {metrics.map(({ label, value, warn, crit }) => {
                const short = label.split(' ')[0];
                const cardMeta =
                  value >= crit
                    ? { border: 'border-red-200/70 dark:border-red-700/30',     bg: 'bg-red-50/80 dark:bg-red-900/10',     text: 'text-red-500 dark:text-red-400',     bar: 'from-red-400 to-rose-400',       label: 'Critical' }
                    : value >= warn
                    ? { border: 'border-amber-200/70 dark:border-amber-700/30', bg: 'bg-amber-50/80 dark:bg-amber-900/10', text: 'text-amber-500 dark:text-amber-400', bar: 'from-amber-400 to-orange-400',   label: 'Elevated' }
                    : { border: 'border-wellq-gray/20 dark:border-white/5', bg: 'bg-wellq-gray/5 dark:bg-white/[0.03]', text: 'text-wellq-dark dark:text-white', bar: 'from-emerald-400 to-teal-400', label: 'Normal' };
                return (
                  <div key={label} className={`relative rounded-xl border ${cardMeta.border} ${cardMeta.bg} p-4 overflow-hidden`}>
                    <p className="text-[10px] font-bold text-wellq-gray uppercase tracking-wider mb-1">{short}</p>
                    <p className={`text-2xl font-black tabular-nums tracking-tight ${cardMeta.text}`}>
                      {value}<span className="text-xs font-normal opacity-60">%</span>
                    </p>
                    <p className="text-[10px] font-semibold text-wellq-gray mt-1">{cardMeta.label}</p>
                    <div className="mt-3 h-1.5 bg-black/[0.06] dark:bg-white/[0.06] rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full bg-gradient-to-r ${cardMeta.bar} rounded-full`}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(value, 100)}%` }}
                        transition={{ duration: 0.7, ease: 'easeOut', delay: 0.2 }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer del Drawer */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-wellq-gray/10 dark:border-white/5 bg-wellq-gray/5 dark:bg-[#0b1017] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isHealthy ? 'bg-emerald-500' : isDown ? 'bg-red-500' : 'bg-amber-500'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isHealthy ? 'bg-emerald-500' : isDown ? 'bg-red-500' : 'bg-amber-500'}`}></span>
            </span>
            <span className="text-[11px] font-bold text-wellq-gray uppercase tracking-wider">Live data from database</span>
          </div>
          <span className="text-xs font-bold text-wellq-gray tabular-nums">
            {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </motion.div>
    </>
  );
};

// ─── Operational Status Tab ───────────────────────────────────────────────────
const OperationalStatusTab = ({
  apiServers, apiProcesses,
  kpiSystemHealth, kpiActiveNow, kpiDownloads, kpiDormant,
  appStats,
  onGoSupport,
}) => {
  const { t, tVal } = useLanguage();
  const [selectedServer, setSelectedServer] = useState(null);

  const servers = apiServers ?? [
    { name: t('overview.waitingConnection'), status: 'idle', uptime: '0%', cpu: 0, memory: 0, region: 'N/A' },
  ];
  const processes = apiProcesses ?? [
    { name: t('overview.waitingConnection'), status: 'idle', queued_items: 0 },
  ];

  const normalizeServer = (s) => ({
    name:   s.name,
    status: s.status === 'healthy' ? 'operational' : s.status,
    uptime: s.uptime,
    cpu:    parseInt(s.cpu || s.cpu_usage || s.cpuUsage || "0", 10),
    memory: parseInt(s.memory || s.ram_usage || s.ramUsage || "0", 10),
    region: s.region,
    server_id:  s.server_id,
    type:       s.type,
    updated_at: s.updated_at,
  });

  const cards = [
    { 
      label: t('overview.systemHealth'), 
      value: kpiSystemHealth ? (kpiSystemHealth.overall_status === 'optimal' ? '100%' : '50%') : '—', 
      icon: Activity,
      metaColor: kpiSystemHealth && kpiSystemHealth.overall_status === 'optimal' ? 'emerald' : 'amber',
      sub: kpiSystemHealth ? `${t('settings.latency')}: ${kpiSystemHealth.latency_ms}ms` : t('overview.waitingConnection') 
    },
    { 
      label: t('overview.activeUsersNow'), 
      value: kpiActiveNow != null ? String(kpiActiveNow.active_now) : '—', 
      icon: Users,
      metaColor: 'cyan',
      sub: kpiActiveNow ? `Web: ${kpiActiveNow.platform_distribution.web_admin} · Mobile: ${kpiActiveNow.platform_distribution.mobile_clinician + kpiActiveNow.platform_distribution.mobile_patient}` : t('overview.waitingConnection') 
    },
    { 
      label: t('overview.totalDownloads'), 
      value: kpiDownloads != null ? kpiDownloads.total_downloads.toLocaleString() : '—', 
      icon: Smartphone,
      metaColor: 'blue',
      sub: kpiDownloads ? `iOS: ${kpiDownloads.ios.toLocaleString()} · Android: ${kpiDownloads.android.toLocaleString()}` : t('overview.waitingDatabase') 
    },
    { 
      label: t('overview.dormantUsers'), 
      value: kpiDormant != null ? String(kpiDormant.dormant_30d) : '—', 
      icon: Clock,
      metaColor: 'amber',
      sub: kpiDormant ? `${kpiDormant.dormant_90d} ${t('overview.inactive')} 90d` : t('overview.waitingDatabase') 
    },
  ];

  const getColorClasses = (colorName) => {
    switch(colorName) {
      case 'emerald': return { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-500', ring: 'ring-emerald-500/20', glow: 'from-emerald-500/10' };
      case 'cyan':    return { bg: 'bg-wellq-cyan/10 dark:bg-wellq-cyan/10', text: 'text-wellq-cyan', ring: 'ring-wellq-cyan/20', glow: 'from-wellq-cyan/10' };
      case 'blue':    return { bg: 'bg-wellq-blue/10 dark:bg-wellq-blue/10', text: 'text-wellq-blue', ring: 'ring-wellq-blue/20', glow: 'from-wellq-blue/10' };
      case 'amber':   return { bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-500', ring: 'ring-amber-500/20', glow: 'from-amber-500/10' };
      default:        return { bg: 'bg-wellq-gray/10', text: 'text-wellq-gray', ring: 'ring-wellq-gray/20', glow: 'from-wellq-gray/10' };
    }
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      
      {/* ── Top 4 KPI Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map(({ label, value, icon: Icon, metaColor, sub }, i) => {
          const styles = getColorClasses(metaColor);
          return (
            <motion.div key={i} variants={itemVariants} className={`relative bg-white dark:bg-wellq-dark rounded-2xl p-6 shadow-sm border border-wellq-gray/20 dark:border-white/5 overflow-hidden group h-full`}>
              <div className={`absolute top-0 left-0 right-0 h-24 bg-gradient-to-b ${styles.glow} to-transparent opacity-50 pointer-events-none`} />
              <div className="relative flex items-center justify-between mb-5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${styles.bg} ring-1 ${styles.ring}`}>
                  <Icon size={18} className={styles.text} strokeWidth={2.2} />
                </div>
              </div>
              <div className="relative">
                <p className="text-[10px] font-bold text-wellq-gray uppercase tracking-wider mb-1">{label}</p>
                <p className="text-4xl font-black text-wellq-dark dark:text-white tabular-nums tracking-tight mb-3">
                  {value}
                </p>
                <p className="text-xs font-semibold text-wellq-gray/80 dark:text-wellq-gray border-t border-wellq-gray/10 dark:border-white/5 pt-3 mt-auto">
                  {sub}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── Server Infrastructure Grid ── */}
      <motion.div variants={itemVariants} className="bg-white dark:bg-wellq-dark rounded-2xl p-6 shadow-sm border border-wellq-gray/20 dark:border-white/5">
        <div className="mb-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-wellq-dark/5 dark:bg-white/5 flex items-center justify-center ring-1 ring-wellq-gray/20 dark:ring-white/10 shadow-sm">
            <Server size={18} className="text-wellq-dark dark:text-white" strokeWidth={2.2} />
          </div>
          <div>
            <h3 className="font-bold text-wellq-dark dark:text-white text-base tracking-tight">{t('overview.serverInfrastructure')}</h3>
            <p className="text-xs font-medium text-wellq-gray mt-1">{t('overview.serverInfrastructureSub')}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {servers.map(normalizeServer).map((server, i) => {
            const meta = SERVER_STATUS_META[server.status] ?? SERVER_STATUS_META.idle;
            return (
              <motion.div
                key={i}
                whileHover={{ y: -2, transition: { duration: 0.2 } }}
                onClick={() => setSelectedServer(server)}
                className={`relative rounded-2xl border ${meta.border} ${meta.bg} p-5 overflow-hidden group cursor-pointer transition-all hover:shadow-md`}
              >
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${meta.bar} ${meta.pulse ? 'opacity-80' : 'opacity-30'}`} />

                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ring-1 ring-wellq-gray/20 dark:ring-white/10 bg-white dark:bg-wellq-dark flex-shrink-0 shadow-sm`}>
                      <Server size={16} className="text-wellq-dark dark:text-white" strokeWidth={2.2} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-wellq-dark dark:text-white text-sm truncate tracking-tight">{server.name}</p>
                      <p className="text-[10px] font-semibold text-wellq-gray mt-0.5 uppercase tracking-wider truncate">{server.region} · {server.uptime} {t('overview.uptime')}</p>
                    </div>
                  </div>

                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border flex-shrink-0 ml-2 ${meta.badge}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${meta.dot} ${meta.pulse ? 'animate-pulse' : ''}`} />
                    {meta.label}
                  </span>
                </div>

                <div className="space-y-3">
                  {['cpu', 'memory'].map((metric) => {
                    const val = server[metric];
                    const pct = Math.min(val, 100);
                    return (
                      <div key={metric}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-bold text-wellq-gray uppercase tracking-wider">
                            {metric === 'cpu' ? 'CPU' : 'RAM'}
                          </span>
                          <span className={`text-xs font-black tabular-nums ${
                            val >= 85 ? 'text-red-500' : val >= 70 ? 'text-amber-500' : 'text-wellq-dark dark:text-white'
                          }`}>{val}%</span>
                        </div>
                        <div className="h-1.5 bg-black/[0.06] dark:bg-white/[0.06] rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full bg-gradient-to-r ${
                              val >= 85 ? 'from-red-400 to-rose-400' : val >= 70 ? 'from-amber-400 to-orange-400' : meta.bar
                            }`}
                            initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.7, ease: 'easeOut', delay: i * 0.05 + 0.1 }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div variants={itemVariants} className="bg-white dark:bg-wellq-dark rounded-2xl p-6 shadow-sm border border-wellq-gray/20 dark:border-white/5 flex flex-col">
          <div className="mb-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-wellq-dark/5 dark:bg-white/5 flex items-center justify-center ring-1 ring-wellq-gray/20 dark:ring-white/10 shadow-sm">
              <Cpu size={18} className="text-wellq-dark dark:text-white" strokeWidth={2.2} />
            </div>
            <div>
              <h3 className="font-bold text-wellq-dark dark:text-white text-base tracking-tight">{t('overview.backgroundProcesses')}</h3>
              <p className="text-xs font-medium text-wellq-gray mt-1">Queue & Jobs Status</p>
            </div>
          </div>
          <div className="flex-1 space-y-2.5">
            {processes.map((proc, i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-3.5 rounded-xl border border-transparent bg-wellq-gray/5 dark:bg-white/[0.02] hover:border-wellq-gray/20 dark:hover:border-white/10 transition-colors group"
              >
                <div className={`w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-wellq-dark shadow-sm ${getStatusDot(proc.status)}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-wellq-dark dark:text-white truncate tracking-tight">{proc.name}</div>
                </div>
                <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${getStatusColor(proc.status)}`}>
                  {tVal(proc.status)}
                </span>
                <div className="text-right text-xs font-black text-wellq-dark dark:text-white w-24 tabular-nums bg-white dark:bg-wellq-dark/50 py-1 px-2 rounded-lg border border-wellq-gray/10 dark:border-white/5">
                  {(proc.queued_items ?? proc.queuedItems ?? 0).toLocaleString()} <span className="text-[10px] font-semibold text-wellq-gray">jobs</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <AppUsageBreakdown appStats={appStats} />
      </div>

      <motion.div variants={itemVariants}>
        <OpenTicketsWidget onGoSupport={onGoSupport} />
      </motion.div>

      {/* Uso de createPortal para envolver AnimatePresence e inyectar el drawer en el body */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {selectedServer && (
            <ServerDetailPanel key={selectedServer.name} server={selectedServer} onClose={() => setSelectedServer(null)} />
          )}
        </AnimatePresence>,
        document.body
      )}
    </motion.div>
  );
};

// ─── Main export ──────────────────────────────────────────────────────────────
export const OverviewView = ({
  loading, kpiArr, kpiClinics, kpiPatients, kpiNrr,
  mrrData, churnRegions, apiAlerts, onAcknowledgeAlert,
  apiServers, apiProcesses, fmtArr,
  kpiSystemHealth, kpiActiveNow, kpiDownloads, kpiDormant,
  appStats,
  onGoSupport,
}) => {
  const [tab, setTab] = useState('business');
  const { t } = useLanguage();
  const [selectedRegion, setSelectedRegion] = useState(null);

  return (
    <div className="space-y-6 font-sans">
      
      {/* ── Tabs Selector ── */}
      <div className="flex items-center p-1 bg-wellq-gray/10 dark:bg-white/5 rounded-xl w-fit shadow-inner">
        <button
          onClick={() => setTab('business')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm transition-all duration-300 ${
            tab === 'business' 
              ? 'bg-white dark:bg-wellq-dark text-wellq-dark dark:text-white shadow-sm ring-1 ring-wellq-gray/20 dark:ring-white/10' 
              : 'text-wellq-gray hover:text-wellq-dark dark:hover:text-white'
          }`}
        >
          <TrendingUp size={16} strokeWidth={tab === 'business' ? 2.5 : 2} /> 
          {t('overview.businessHealth')}
        </button>
        <button
          onClick={() => setTab('operational')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm transition-all duration-300 ${
            tab === 'operational' 
              ? 'bg-white dark:bg-wellq-dark text-wellq-dark dark:text-white shadow-sm ring-1 ring-wellq-gray/20 dark:ring-white/10' 
              : 'text-wellq-gray hover:text-wellq-dark dark:hover:text-white'
          }`}
        >
          <Server size={16} strokeWidth={tab === 'operational' ? 2.5 : 2} /> 
          {t('overview.operationalStatus')}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {tab === 'business' && (
          <motion.div key="business" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            <BusinessHealthTab
              loading={loading} kpiArr={kpiArr} kpiClinics={kpiClinics} kpiPatients={kpiPatients} kpiNrr={kpiNrr}
              mrrData={mrrData} churnRegions={churnRegions} apiAlerts={apiAlerts} onAcknowledgeAlert={onAcknowledgeAlert}
              onRegionClick={setSelectedRegion} fmtArr={fmtArr}
            />
          </motion.div>
        )}
        {tab === 'operational' && (
          <motion.div key="operational" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            <OperationalStatusTab
              apiServers={apiServers} apiProcesses={apiProcesses} kpiSystemHealth={kpiSystemHealth} kpiActiveNow={kpiActiveNow}
              kpiDownloads={kpiDownloads} kpiDormant={kpiDormant} appStats={appStats} onGoSupport={onGoSupport}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Aplicamos la misma técnica al modal de Regions para que su backdrop cubra toda la página */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {selectedRegion && (
            <ChurnRegionModal key={selectedRegion} region={selectedRegion} onClose={() => setSelectedRegion(null)} />
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};