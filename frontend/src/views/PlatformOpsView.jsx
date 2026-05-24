import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom'; // ← NUEVO
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DollarSign, Zap, Activity, ArrowDownRight, ArrowUpRight, 
  Server, X, Smartphone, Monitor, Globe, CheckCircle, AlertTriangle 
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { Skeleton } from '../components/ui';

// ─── Design Tokens para Platform Ops ───
const PLATFORM_META = {
  cost: {
    icon: DollarSign,
    color: 'text-emerald-500',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    ring: 'ring-emerald-500/20 dark:ring-emerald-500/20',
    border: 'border-emerald-200/50 dark:border-emerald-500/20',
    glow: 'from-emerald-500/10 to-transparent',
    trend: 'text-emerald-500 bg-emerald-500/10'
  },
  latency: {
    icon: Zap,
    color: 'text-wellq-blue dark:text-wellq-blue',
    bg: 'bg-wellq-blue/10 dark:bg-wellq-blue/10',
    ring: 'ring-wellq-blue/20 dark:ring-wellq-blue/20',
    border: 'border-wellq-blue/20 dark:border-wellq-blue/20',
    glow: 'from-wellq-blue/10 to-transparent',
    trend: 'text-wellq-blue bg-wellq-blue/10'
  },
  pose: {
    icon: Activity,
    color: 'text-wellq-cyan dark:text-wellq-cyan',
    bg: 'bg-wellq-cyan/10 dark:bg-wellq-cyan/10',
    ring: 'ring-wellq-cyan/20 dark:ring-wellq-cyan/20',
    border: 'border-wellq-cyan/20 dark:border-wellq-cyan/20',
    glow: 'from-wellq-cyan/10 to-transparent',
    trend: 'text-wellq-cyan bg-wellq-cyan/10'
  }
};

const APP_ICONS = {
  'patients': Smartphone,
  'tablet': Monitor,
  'web': Globe,
};

// ── Animaciones Base ──
const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

// ── ForceUpdateModal (CORREGIDO: Portal + scroll interno) ────────────────────
const ForceUpdateModal = ({ versions, onClose }) => {
  const { t } = useLanguage();
  const [minVersions, setMinVersions] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  const byAppType = versions.reduce((acc, v) => {
    const type = v.app_type ?? v.appType ?? 'Unknown';
    if (!acc[type]) acc[type] = [];
    acc[type].push(v.version);
    return acc;
  }, {});

  const handleSave = async () => {
    if (Object.keys(minVersions).length === 0) { onClose(); return; }
    setSaving(true);
    setError(null);
    try {
      await Promise.all(
        Object.entries(minVersions).map(([appType, version]) =>
          fetch('/api/analytics/versions/force-update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ appType, minVersion: version }),
          })
        )
      );
      setSaved(true);
      setTimeout(onClose, 1500);
    } catch (e) {
      setError(t('common.error'));
      setSaving(false);
    }
  };

  // Renderizado mediante portal directamente en document.body
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop con animación */}
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={onClose} 
      />
      
      {/* Modal con altura máxima y scroll interno */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative bg-white dark:bg-wellq-dark rounded-[24px] shadow-2xl w-full max-w-lg border border-wellq-gray/20 dark:border-white/10 overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Cabecera fija */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-wellq-gray/10 dark:border-white/5 bg-wellq-gray/3 dark:bg-white/[0.02] flex-shrink-0">
          <div>
            <h3 className="font-bold text-lg text-wellq-dark dark:text-white leading-tight">{t('platform.forceUpdateTitle')}</h3>
            <p className="text-xs font-medium text-wellq-gray mt-1">
              {t('platform.forceUpdateSub')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-wellq-gray/5 hover:bg-wellq-gray/10 dark:bg-white/5 dark:hover:bg-white/10 rounded-xl transition-colors"
          >
            <X size={18} className="text-wellq-gray" strokeWidth={2.5} />
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {saved ? (
              <motion.div 
                key="success"
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                className="flex flex-col items-center justify-center py-16 gap-4"
              >
                <div className="w-16 h-16 rounded-full bg-wellq-green/10 flex items-center justify-center ring-4 ring-wellq-green/5">
                  <CheckCircle size={32} className="text-wellq-green" />
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-wellq-dark dark:text-white">{t('platform.forceUpdateSaved')}</p>
                  <p className="text-sm font-medium text-wellq-gray mt-1">{t('platform.forceUpdateSavedSub')}</p>
                </div>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="p-6 space-y-4">
                  {Object.keys(byAppType).length === 0 ? (
                    <p className="text-sm font-medium text-wellq-gray text-center py-8">{t('platform.noVersionData')}</p>
                  ) : (
                    Object.entries(byAppType).map(([appType, appVersions]) => {
                      const Icon = APP_ICONS[appType.toLowerCase()] ?? Smartphone;
                      return (
                        <div
                          key={appType}
                          className="flex items-center gap-4 p-4 rounded-2xl bg-wellq-gray/5 dark:bg-white/[0.03] border border-transparent dark:border-white/5 hover:border-wellq-gray/20 transition-colors"
                        >
                          <div className="w-12 h-12 rounded-xl bg-wellq-cyan/10 flex items-center justify-center flex-shrink-0 ring-1 ring-wellq-cyan/20">
                            <Icon size={20} className="text-wellq-cyan" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-wellq-dark dark:text-white capitalize">{appType}</p>
                            <p className="text-xs font-medium text-wellq-gray mt-0.5">
                              {t('platform.activeVersions')}: {appVersions.join(', ')}
                            </p>
                          </div>
                          <div className="flex-shrink-0">
                            <label className="block text-[10px] font-bold text-wellq-gray uppercase tracking-wider mb-1.5">{t('platform.minVersion')}</label>
                            <select
                              value={minVersions[appType] || ''}
                              onChange={(e) => setMinVersions((prev) => ({ ...prev, [appType]: e.target.value }))}
                              className="px-3 py-2 text-sm font-semibold border border-wellq-gray/20 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-wellq-cyan bg-white dark:bg-wellq-dark dark:text-white cursor-pointer shadow-sm"
                            >
                              <option value="">{t('platform.noForce')}</option>
                              {appVersions.map((v) => (
                                <option key={v} value={v}>v{v}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })
                  )}

                  {error && (
                    <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 p-3.5 bg-red-50 dark:bg-red-500/10 rounded-xl border border-red-100 dark:border-red-500/20">
                      <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
                      <p className="text-xs font-semibold text-red-600 dark:text-red-400">{error}</p>
                    </motion.div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 px-6 py-5 border-t border-wellq-gray/10 dark:border-white/5 bg-wellq-gray/3 dark:bg-white/[0.02] flex-shrink-0">
                  <button
                    onClick={onClose}
                    className="px-5 py-2.5 rounded-xl text-sm font-bold text-wellq-gray hover:text-wellq-dark dark:hover:text-white hover:bg-wellq-gray/10 dark:hover:bg-white/5 transition-colors"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-wellq-cyan text-wellq-black rounded-xl text-sm font-bold hover:bg-wellq-cyan/90 transition-all disabled:opacity-50 active:scale-[0.98] shadow-sm shadow-wellq-cyan/20"
                  >
                    {saving ? (
                      <><div className="w-4 h-4 border-2 border-wellq-black/30 border-t-wellq-black rounded-full animate-spin" /> {t('common.loading')}</>
                    ) : (
                      t('platform.forceUpdateSave')
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>,
    document.body
  );
};

// ── App Version Distribution ──────────────────────────────────────────────────
const VERSION_COLORS = [
  'from-wellq-cyan to-wellq-blue',
  'from-wellq-green to-teal-400',
  'from-wellq-blue to-indigo-400',
  'from-amber-400 to-orange-400',
  'from-wellq-gray to-slate-400',
];

const AppVersionDistribution = () => {
  const { t } = useLanguage();
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [forceUpdateOpen, setForceUpdateOpen] = useState(false);

  useEffect(() => {
    const fetchVersions = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/analytics/versions');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setVersions(json.data ?? []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchVersions();
  }, []);

  return (
    <motion.div variants={itemVariants} className="bg-white dark:bg-wellq-dark rounded-2xl p-6 shadow-sm border border-wellq-gray/20 dark:border-wellq-gray/30 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-wellq-dark dark:text-white text-base tracking-tight">{t('platform.appVersionDistribution')}</h3>
        <button
          onClick={() => setForceUpdateOpen(true)}
          className="text-xs font-bold text-wellq-cyan bg-wellq-cyan/10 hover:bg-wellq-cyan/20 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
        >
          {t('platform.forceUpdateBtn')} <ArrowUpRight size={14} />
        </button>
      </div>

      <div className="flex-1">
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between"><Skeleton className="w-24 h-4" /><Skeleton className="w-12 h-4" /></div>
                <Skeleton className="w-full h-2.5 rounded-full" />
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-500/10 rounded-xl border border-red-100 dark:border-red-500/20">
            <AlertTriangle size={16} className="text-red-500" />
            <p className="text-sm font-medium text-red-600 dark:text-red-400">{t('platform.errorVersions')}: {error}</p>
          </div>
        )}

        {!loading && !error && versions.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-6">
            <Smartphone size={32} className="text-wellq-gray/30 dark:text-wellq-gray/20 mb-3" />
            <p className="text-sm font-medium text-wellq-gray dark:text-wellq-gray/60">{t('platform.noVersionsYet')}</p>
          </div>
        )}

        {!loading && !error && versions.length > 0 && (
          <div className="space-y-5">
            {versions.map((v, i) => (
              <div key={i} className="space-y-2 group">
                <div className="flex justify-between items-end">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-wellq-dark dark:text-white capitalize">
                      {v.app_type ?? v.appType}
                    </span>
                    <span className="text-xs font-semibold text-wellq-gray bg-wellq-gray/10 dark:bg-white/5 px-2 py-0.5 rounded-md">
                      v{v.version}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-wellq-gray dark:text-wellq-gray/70">
                      {(v.user_count ?? v.userCount ?? 0).toLocaleString()} {t('platform.users')}
                    </span>
                    <span className="text-sm font-black text-wellq-dark dark:text-white tabular-nums">{v.percentage}%</span>
                  </div>
                </div>
                <div className="h-2.5 bg-wellq-gray/10 dark:bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full bg-gradient-to-r ${VERSION_COLORS[i % VERSION_COLORS.length]}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${v.percentage}%` }}
                    transition={{ duration: 1, delay: i * 0.1, ease: "easeOut" }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal fuera del flujo normal (portal) */}
      <AnimatePresence>
        {forceUpdateOpen && (
          <ForceUpdateModal
            versions={versions}
            onClose={() => setForceUpdateOpen(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ── Main Component ──────────────────────────────────────────────────────────
export const PlatformOpsView = ({ apiCosts, apiLatency, apiPose, apiServers }) => {
  const { t } = useLanguage();

  return (
    <motion.div 
      className="space-y-6 font-sans"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* ── Top 3 KPI Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Cost Card */}
        <motion.div variants={itemVariants} className={`relative bg-white dark:bg-wellq-dark rounded-2xl p-6 shadow-sm border ${PLATFORM_META.cost.border} overflow-hidden group`}>
          <div className={`absolute top-0 left-0 right-0 h-24 bg-gradient-to-b ${PLATFORM_META.cost.glow} opacity-50 pointer-events-none`} />
          <div className="relative flex items-center justify-between mb-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${PLATFORM_META.cost.bg} ring-1 ${PLATFORM_META.cost.ring}`}>
              <PLATFORM_META.cost.icon size={18} className={PLATFORM_META.cost.color} strokeWidth={2.2} />
            </div>
            <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${PLATFORM_META.cost.trend}`}>
              <ArrowDownRight size={12} strokeWidth={2.5} /> 0%
            </span>
          </div>
          <div className="relative">
            <p className="text-xs font-bold text-wellq-gray uppercase tracking-wider mb-1">{t('platform.costPerSession')}</p>
            <p className="text-4xl font-black text-wellq-dark dark:text-white tabular-nums tracking-tight">
              {apiCosts?.totalCost != null ? `$${(apiCosts.totalCost / 1000).toFixed(3)}` : '$0.000'}
            </p>
          </div>
          {apiCosts?.breakdown && apiCosts.breakdown.length > 0 && (
            <div className="relative mt-5 pt-4 border-t border-wellq-gray/10 dark:border-white/5 space-y-2">
              {apiCosts.breakdown.map((b, i) => (
                <div key={i} className="flex justify-between items-center text-xs">
                  <span className="font-medium text-wellq-gray dark:text-wellq-gray/80 truncate max-w-[140px]">{b.model}</span>
                  <span className="font-bold text-wellq-dark dark:text-white">${b.cost}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Latency Card */}
        <motion.div variants={itemVariants} className={`relative bg-white dark:bg-wellq-dark rounded-2xl p-6 shadow-sm border ${PLATFORM_META.latency.border} overflow-hidden group`}>
          <div className={`absolute top-0 left-0 right-0 h-24 bg-gradient-to-b ${PLATFORM_META.latency.glow} opacity-50 pointer-events-none`} />
          <div className="relative flex items-center justify-between mb-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${PLATFORM_META.latency.bg} ring-1 ${PLATFORM_META.latency.ring}`}>
              <PLATFORM_META.latency.icon size={18} className={PLATFORM_META.latency.color} strokeWidth={2.2} />
            </div>
            <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-wellq-gray/10 text-wellq-gray">
              Live Avg
            </span>
          </div>
          <div className="relative">
            <p className="text-xs font-bold text-wellq-gray uppercase tracking-wider mb-1">{t('platform.aiLatency')}</p>
            {apiLatency?.metrics && apiLatency.metrics.length > 0 ? (
              <div className="space-y-2.5 mt-3">
                {apiLatency.metrics.map((m, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-wellq-gray/5 dark:bg-white/[0.02] border border-transparent dark:border-white/5">
                    <span className="text-xs font-semibold text-wellq-gray dark:text-wellq-gray/90 truncate max-w-[130px]">{m.service}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-wellq-dark dark:text-white tabular-nums">
                        {m.averageLatencyMs ?? m.average_latency_ms ?? '—'}<span className="text-[10px] text-wellq-gray font-bold">ms</span>
                      </span>
                      <span className="relative flex h-2.5 w-2.5">
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${m.status === 'healthy' ? 'bg-wellq-green' : 'bg-amber-500'}`}></span>
                        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${m.status === 'healthy' ? 'bg-wellq-green' : 'bg-amber-500'}`}></span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-4xl font-black text-wellq-dark dark:text-white tabular-nums tracking-tight mt-1">0<span className="text-lg text-wellq-gray font-bold">ms</span></p>
            )}
          </div>
        </motion.div>

        {/* Pose Analysis Card */}
        <motion.div variants={itemVariants} className={`relative bg-white dark:bg-wellq-dark rounded-2xl p-6 shadow-sm border ${PLATFORM_META.pose.border} overflow-hidden group`}>
          <div className={`absolute top-0 left-0 right-0 h-24 bg-gradient-to-b ${PLATFORM_META.pose.glow} opacity-50 pointer-events-none`} />
          <div className="relative flex items-center justify-between mb-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${PLATFORM_META.pose.bg} ring-1 ${PLATFORM_META.pose.ring}`}>
              <PLATFORM_META.pose.icon size={18} className={PLATFORM_META.pose.color} strokeWidth={2.2} />
            </div>
            <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${PLATFORM_META.pose.trend}`}>
              <ArrowUpRight size={12} strokeWidth={2.5} /> 0%
            </span>
          </div>
          <div className="relative">
            <p className="text-xs font-bold text-wellq-gray uppercase tracking-wider mb-1">{t('platform.poseAnalysis')}</p>
            <p className="text-4xl font-black text-wellq-dark dark:text-white tabular-nums tracking-tight">
              {apiPose?.overallSuccessRatePercentage != null ? `${apiPose.overallSuccessRatePercentage}` : '0'}<span className="text-2xl font-bold">%</span>
            </p>
          </div>
          {apiPose?.failureReasons?.length > 0 && (
            <div className="relative mt-5 pt-4 border-t border-wellq-gray/10 dark:border-white/5 space-y-2">
              {apiPose.failureReasons.slice(0, 2).map((r, i) => (
                <div key={i} className="flex justify-between items-center text-xs">
                  <span className="font-medium text-wellq-gray dark:text-wellq-gray/80 truncate flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-wellq-cyan" /> {r.reason}
                  </span>
                  <span className="font-bold text-wellq-cyan tabular-nums">{r.percentage}%</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

      </div>

      {/* ── Infra + App versions ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Infrastructure Servers */}
        <motion.div variants={itemVariants} className="bg-white dark:bg-wellq-dark rounded-2xl p-6 shadow-sm border border-wellq-gray/20 dark:border-wellq-gray/30 h-full">
          <div className="flex items-center gap-2 mb-6">
            <Server size={18} className="text-wellq-dark dark:text-white" />
            <h3 className="font-bold text-wellq-dark dark:text-white text-base tracking-tight">{t('platform.infrastructure')}</h3>
          </div>
          
          <div className="space-y-3">
            {(apiServers && apiServers.length > 0
              ? apiServers
              : [{ name: t('platform.waitingDatabase'), status: 'idle' }]
            ).map((s, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3.5 rounded-xl bg-wellq-gray/3 dark:bg-white/[0.02] border border-wellq-gray/5 dark:border-white/5 hover:border-wellq-gray/20 dark:hover:border-white/10 transition-colors group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-8 h-8 rounded-lg bg-white dark:bg-wellq-dark ring-1 ring-wellq-gray/10 dark:ring-white/10 flex items-center justify-center shadow-sm">
                    <Server size={14} className="text-wellq-gray dark:text-wellq-gray/70" />
                  </div>
                  <span className="text-sm font-bold text-wellq-dark dark:text-white/90">{s.name}</span>
                </div>
                <span
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                    s.status === 'healthy'
                      ? 'text-wellq-green bg-wellq-green/10'
                      : s.status === 'warning'
                      ? 'text-amber-500 bg-amber-500/10'
                      : 'text-wellq-gray bg-wellq-gray/10'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      s.status === 'healthy'
                        ? 'bg-wellq-green'
                        : s.status === 'warning'
                        ? 'bg-amber-500 animate-pulse'
                        : 'bg-wellq-gray/60'
                    }`}
                  />
                  {s.status ?? t('common.loading')}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* App Version Distribution Component */}
        <AppVersionDistribution />
      </div>
    </motion.div>
  );
};