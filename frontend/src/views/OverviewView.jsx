import React from 'react';
import {
  TrendingUp, AlertTriangle, Bell, Zap, Server, Users, Smartphone,
  Clock, Activity, ArrowUpRight, ChevronRight, CheckCheck, Info,
  Tablet, Monitor,
} from 'lucide-react';
import { KPICard, AlertItem, SegmentedControl, Skeleton } from '../components/ui';
import { MRRChart } from '../components/charts/MRRChart';
import { ChurnHeatmap } from '../components/charts/ChurnHeatmap';
import { useLanguage } from '../contexts/LanguageContext';

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

// 🎨 NUEVA paleta de severidad basada en azules corporativos
const getSeverityStyle = (severity) => {
  switch (severity) {
    case 'critical':   // el más grave: azul intenso
      return {
        bar: 'bg-wellq-blue',
        icon: 'text-wellq-blue',
        bg: 'bg-wellq-blue/10 dark:bg-wellq-blue/20',
        border: 'border-wellq-blue/20 dark:border-wellq-blue/30',
        badge: 'bg-wellq-blue/10 dark:bg-wellq-blue/20 text-wellq-blue dark:text-wellq-blue'
      };
    case 'high':       // medio‑alto: cyan
      return {
        bar: 'bg-wellq-cyan',
        icon: 'text-wellq-cyan',
        bg: 'bg-wellq-cyan/10 dark:bg-wellq-cyan/20',
        border: 'border-wellq-cyan/20 dark:border-wellq-cyan/30',
        badge: 'bg-wellq-cyan/10 dark:bg-wellq-cyan/20 text-wellq-cyan dark:text-wellq-cyan'
      };
    case 'medium':     // medio: azul claro (wellq‑blue más bajo)
      return {
        bar: 'bg-wellq-blue/70',
        icon: 'text-wellq-blue/80',
        bg: 'bg-wellq-blue/5 dark:bg-wellq-blue/10',
        border: 'border-wellq-blue/10 dark:border-wellq-blue/20',
        badge: 'bg-wellq-blue/5 dark:bg-wellq-blue/10 text-wellq-blue/80 dark:text-wellq-blue/80'
      };
    default:           // info / low: gris wellq
      return {
        bar: 'bg-wellq-gray',
        icon: 'text-wellq-gray',
        bg: 'bg-wellq-gray/10 dark:bg-wellq-gray/10',
        border: 'border-wellq-gray/20 dark:border-wellq-gray/30',
        badge: 'bg-wellq-gray/10 dark:bg-wellq-gray/10 text-wellq-gray dark:text-wellq-gray'
      };
  }
};

// ─── App Usage Breakdown ──────────────────────────────────────────────────────
const fmt = (n) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : (n ?? 0).toLocaleString();

const AppUsageBreakdown = ({ appStats }) => {
  const { t } = useLanguage();  // ← agrega esto

  const patients = appStats?.patients;
  const tablet   = appStats?.tablet;
  const web      = appStats?.web;

  const apps = [
    {
      label:       t('overview.patientApp'),      // ← 'Patient App'
      icon:        Smartphone,
      iconBg:      'bg-wellq-cyan/20 dark:bg-wellq-cyan/20',
      iconColor:   'text-wellq-cyan dark:text-wellq-cyan',
      total:       patients?.total_downloads   ?? 0,
      activeToday: patients?.active_today      ?? 0,
      active30d:   patients?.active_30d        ?? 0,
      inactive:    patients?.inactive_users    ?? 0,
      ios:         patients?.ios_downloads     ?? 0,
      android:     patients?.android_downloads ?? 0,
      registered:  0,
      isWeb:       false,
      barActive:   'bg-wellq-cyan',
      barInactive: 'bg-amber-400',
    },
    {
      label:       t('overview.clinicianTablet'), // ← 'Clinician Tablet'
      icon:        Tablet,
      iconBg:      'bg-wellq-green/20 dark:bg-wellq-green/20',
      iconColor:   'text-wellq-green dark:text-wellq-green',
      total:       tablet?.total_downloads   ?? 0,
      activeToday: tablet?.active_today      ?? 0,
      active30d:   tablet?.active_30d        ?? 0,
      inactive:    tablet?.inactive_users    ?? 0,
      ios:         tablet?.ios_downloads     ?? 0,
      android:     tablet?.android_downloads ?? 0,
      registered:  0,
      isWeb:       false,
      barActive:   'bg-wellq-green',
      barInactive: 'bg-amber-400',
    },
    {
      label:       t('overview.webDashboard'),    // ← 'Web Dashboard'
      icon:        Monitor,
      iconBg:      'bg-wellq-gray/10 dark:bg-wellq-dark/50',
      iconColor:   'text-wellq-gray dark:text-wellq-gray/80',
      total:       0,
      activeToday: web?.active_today    ?? 0,
      active30d:   web?.active_30d      ?? 0,
      inactive:    web?.inactive_users  ?? 0,
      ios:         0,
      android:     0,
      registered:  web?.registered_users ?? 0,
      isWeb:       true,
      barActive:   'bg-wellq-dark',
      barInactive: 'bg-amber-400',
    },
  ];

  if (!patients && !tablet && !web) {
    return (
      <div className="bg-white dark:bg-wellq-dark rounded-2xl p-6 shadow-sm border border-wellq-gray/20 dark:border-wellq-gray/30">
        <div className="mb-5">
          <h3 className="font-semibold text-wellq-dark dark:text-white">{t('overview.appUsageBreakdown')}</h3>
          <p className="text-sm text-wellq-gray dark:text-wellq-gray/80">{t('overview.downloadsVsActive')}</p>
        </div>
        <div className="flex flex-col items-center justify-center py-10 gap-2">
          <Smartphone size={28} className="text-wellq-gray/30 dark:text-wellq-gray/40" />
          <p className="text-sm text-wellq-gray dark:text-wellq-gray/80">{t('overview.waitingAppData')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-wellq-dark rounded-2xl p-6 shadow-sm border border-wellq-gray/20 dark:border-wellq-gray/30">
      <div className="mb-5">
        <h3 className="font-semibold text-wellq-dark dark:text-white">App Usage Breakdown</h3>
        <p className="text-sm text-wellq-gray dark:text-wellq-gray/80">Downloads vs active users</p>
      </div>
      <div className="space-y-4">
        {apps.map((app, i) => {
          const Icon          = app.icon;
          const base          = app.isWeb ? app.registered : app.total;
          const activeRatio   = base > 0 ? Math.round((app.active30d / base) * 100) : 0;
          const inactiveRatio = base > 0 ? Math.round((app.inactive  / base) * 100) : 0;
          return (
            <div key={i} className="rounded-xl border border-wellq-gray/20 dark:border-wellq-gray/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg ${app.iconBg} flex items-center justify-center`}>
                    <Icon size={16} className={app.iconColor} />
                  </div>
                  <span className="font-medium text-wellq-dark dark:text-white text-sm">{app.label}</span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-wellq-cyan">
                    {app.isWeb ? fmt(app.registered) : fmt(app.total)}
                  </span>
                  <p className="text-xs text-wellq-gray">
                    {app.isWeb ? 'registered users' : 'total downloads'}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-base font-bold text-wellq-green">{fmt(app.activeToday)}</p>
                  <p className="text-xs text-wellq-gray">Active Today</p>
                </div>
                <div>
                  <p className="text-base font-bold text-wellq-cyan">{fmt(app.active30d)}</p>
                  <p className="text-xs text-wellq-gray">Active (30d)</p>
                </div>
                <div>
                  <p className="text-base font-bold text-amber-500">{fmt(app.inactive)}</p>
                  <p className="text-xs text-wellq-gray">Inactive</p>
                </div>
              </div>
              <div className="h-2 bg-wellq-gray/10 dark:bg-wellq-dark/50 rounded-full overflow-hidden flex">
                <div className={`${app.barActive} h-full`}   style={{ width: `${activeRatio}%` }} />
                <div className={`${app.barInactive} h-full`} style={{ width: `${inactiveRatio}%` }} />
              </div>
              {!app.isWeb && (app.ios > 0 || app.android > 0) && (
                <div className="flex justify-between text-xs text-wellq-gray">
                  <span>iOS: {fmt(app.ios)}</span>
                  <span>Android: {fmt(app.android)}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const BusinessHealthTab = ({
  loading, kpiArr, kpiClinics, kpiPatients, kpiNrr,
  mrrData, churnRegions, apiAlerts, onAcknowledgeAlert,
  onRegionClick, fmtArr,
}) => {
  const { t, tVal } = useLanguage(); // ← agrega esto
  const arrSpark = kpiArr?.trend_graph?.map((t) => t.value) ?? [0, 0, 0, 0, 0, 0];

  return (
    <>
      <div className="grid grid-cols-4 gap-6">
        <KPICard
          title={t('overview.arr')}
          value={fmtArr(kpiArr?.current_arr)}
          trend="up"
          trendValue="+0%"
          sparkData={arrSpark}
          subtitle={kpiArr ? `MRR: ${fmtArr(kpiArr.current_arr / 12)}` : t('overview.waitingConnection')}
          loading={loading}
        />
        <KPICard
          title={t('overview.activeClinics')}
          value={kpiClinics ? String(kpiClinics.total_active) : '0'}
          trend="up"
          trendValue={kpiClinics ? `+${kpiClinics.new_clinics_month}` : '+0'}
          sparkData={[0, 0, 0, 0, 0, kpiClinics?.total_active ?? 0]}
          subtitle={
            kpiClinics
              ? `${kpiClinics.new_clinics_month} ${t('overview.onboarded')} · ${kpiClinics.churned_clinics_month} ${t('overview.churned')}`
              : `0 ${t('overview.onboarded')} · 0 ${t('overview.churned')}`
          }
          loading={loading}
        />
        <KPICard
          title={t('overview.totalPatients')}
          value={kpiPatients ? kpiPatients.total_patients.toLocaleString() : '0'}
          trend="up"
          trendValue={kpiPatients ? `+${kpiPatients.new_this_week} ${t('overview.thisWeek')}` : '+0%'}
          sparkData={[0, 0, 0, 0, 0, kpiPatients?.total_patients ?? 0]}
          subtitle={
            kpiPatients
              ? `${kpiPatients.active_in_treatment?.toLocaleString()} ${t('overview.inTreatment')}`
              : t('overview.waitingConnection')
          }
          loading={loading}
        />
        <KPICard
          title={t('overview.nrr')}
          value={kpiNrr ? `${kpiNrr.nrr_percentage}%` : '0%'}
          trend={kpiNrr?.nrr_percentage >= 100 ? 'up' : 'down'}
          trendValue={kpiNrr ? `Exp: $${kpiNrr.expansion_mrr?.toLocaleString()}` : '+0%'}
          sparkData={[0, 0, 0, 0, 0, kpiNrr?.nrr_percentage ?? 0]}
          subtitle={kpiNrr ? `Churn MRR: $${kpiNrr.churn_mrr?.toLocaleString()}` : t('overview.waitingDatabase')}
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <MRRChart />
        <ChurnHeatmap apiRegions={churnRegions} onRegionClick={onRegionClick} />
      </div>

      <div className="bg-white dark:bg-wellq-dark rounded-2xl p-6 shadow-sm border border-wellq-gray/20 dark:border-wellq-gray/30">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-wellq-dark dark:text-white">{t('overview.needsAttention')}</h3>
            {apiAlerts.length > 0 && (
              <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold rounded-full">
                {apiAlerts.length}
              </span>
            )}
          </div>
          <span className="text-xs text-wellq-gray">{t('overview.updatedRecently')}</span>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-14 bg-wellq-gray/10 dark:bg-wellq-dark/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : apiAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <CheckCheck size={28} className="text-wellq-green" />
            <p className="text-sm font-medium text-wellq-dark dark:text-white">{t('overview.allInOrder')}</p>
            <p className="text-xs text-wellq-gray">{t('overview.noAlerts')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {apiAlerts.map((alert) => {
              const style = getSeverityStyle(alert.severity);
              return (
                <div
                  key={alert.alert_id}
                  className={`flex items-center gap-4 p-4 rounded-xl border ${style.border} ${style.bg} transition-all`}
                >
                  <div className={`w-1 h-10 rounded-full flex-shrink-0 ${style.bar}`} />
                  <AlertTriangle size={18} className={`flex-shrink-0 ${style.icon}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-wellq-dark dark:text-white truncate">{alert.title}</p>
                    <p className="text-xs text-wellq-gray dark:text-wellq-gray/80 truncate mt-0.5">{alert.message}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-md capitalize flex-shrink-0 ${style.badge}`}>
                    {tVal(alert.severity)}
                  </span>
                  <button
                    onClick={() => onAcknowledgeAlert(alert.alert_id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-wellq-dark border border-wellq-gray/20 dark:border-wellq-gray/30 rounded-lg text-xs font-medium text-wellq-dark dark:text-white hover:bg-wellq-gray/5 dark:hover:bg-wellq-dark/50 transition-all flex-shrink-0 cursor-pointer"
                  >
                    <CheckCheck size={13} />
                    {t('overview.markRead')}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};

const OperationalStatusTab = ({
  apiServers, apiProcesses,
  kpiSystemHealth, kpiActiveNow, kpiDownloads, kpiDormant,
  appStats,
}) => {
  const { t, tVal } = useLanguage(); // ← agrega esto

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
    cpu:    typeof s.cpu === 'string' ? parseInt(s.cpu) : (s.cpu ?? (s.cpu_usage ? parseInt(s.cpu_usage) : 0)),
    memory: typeof s.memory === 'number' ? s.memory : (s.ram_usage ? parseInt(s.ram_usage) : 0),
    region: s.region,
  });

  const systemHealthValue = kpiSystemHealth
    ? (kpiSystemHealth.overall_status === 'optimal' ? '100%' : '50%') : '—';
  const systemHealthColor = kpiSystemHealth
    ? (kpiSystemHealth.overall_status === 'optimal' ? 'text-wellq-green' : 'text-amber-400') : 'text-wellq-gray';
  const systemHealthSub = kpiSystemHealth
    ? `${t('settings.latency')}: ${kpiSystemHealth.latency_ms}ms` : t('overview.waitingConnection');

  const activeNowValue = kpiActiveNow != null ? String(kpiActiveNow.active_now) : '—';
  const activeNowSub   = kpiActiveNow
    ? `Web: ${kpiActiveNow.platform_distribution.web_admin} · Mobile: ${kpiActiveNow.platform_distribution.mobile_clinician + kpiActiveNow.platform_distribution.mobile_patient}`
    : t('overview.waitingConnection');

  const downloadsValue = kpiDownloads != null ? kpiDownloads.total_downloads.toLocaleString() : '—';
  const downloadsSub   = kpiDownloads
    ? `iOS: ${kpiDownloads.ios.toLocaleString()} · Android: ${kpiDownloads.android.toLocaleString()}`
    : t('overview.waitingDatabase');

  const dormantValue = kpiDormant != null ? String(kpiDormant.dormant_30d) : '—';
  const dormantSub   = kpiDormant
    ? `${kpiDormant.dormant_90d} ${t('overview.inactive')} 90d · ${kpiDormant.risk_of_churn_clinics} ${t('overview.churned')}`
    : t('overview.waitingDatabase');

  const cards = [
    { label: t('overview.systemHealth'),    value: systemHealthValue, icon: null,       color: systemHealthColor,               sub: systemHealthSub },
    { label: t('overview.activeUsersNow'),  value: activeNowValue,    icon: Users,      color: 'text-wellq-cyan',               sub: activeNowSub },
    { label: t('overview.totalDownloads'),  value: downloadsValue,    icon: Smartphone, color: 'text-wellq-dark dark:text-white', sub: downloadsSub },
    { label: t('overview.dormantUsers'),    value: dormantValue,      icon: Clock,      color: 'text-amber-500',                sub: dormantSub },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-6">
        {cards.map(({ label, value, icon: Icon, color, sub }, i) => (
          <div key={i} className="bg-white dark:bg-wellq-dark rounded-2xl p-6 shadow-sm border border-wellq-gray/20 dark:border-wellq-gray/30">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-wellq-gray">{label}</span>
              {Icon ? <Icon size={18} className="text-wellq-gray/40 dark:text-wellq-gray/50" /> : <div className="w-3 h-3 rounded-full bg-wellq-gray/40 dark:bg-wellq-gray/60" />}
            </div>
            <div className={`text-3xl font-bold ${color}`}>{value}</div>
            <div className="text-xs text-wellq-gray mt-1">{sub}</div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-wellq-dark rounded-2xl p-6 shadow-sm border border-wellq-gray/20 dark:border-wellq-gray/30">
        <div className="mb-6">
          <h3 className="font-semibold text-wellq-dark dark:text-white">{t('overview.serverInfrastructure')}</h3>
          <p className="text-sm text-wellq-gray">{t('overview.serverInfrastructureSub')}</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {servers.map(normalizeServer).map((server, i) => (
            <div
              key={i}
              className="flex items-center gap-4 p-4 rounded-xl border border-wellq-gray/20 dark:border-wellq-gray/30 hover:border-wellq-gray/30 dark:hover:border-wellq-gray/40 hover:bg-wellq-gray/5 dark:hover:bg-wellq-dark/50 transition-all cursor-pointer group"
            >
              <div className={`w-3 h-3 rounded-full ${getStatusDot(server.status)}`} />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-wellq-dark dark:text-white truncate">{server.name}</div>
                <div className="text-xs text-wellq-gray">{server.region} · {server.uptime} {t('overview.uptime')}</div>
              </div>
              <div className="flex items-center gap-3">
                {['cpu', 'memory'].map((metric) => (
                  <div key={metric} className="text-right">
                    <div className="text-xs text-wellq-gray">{metric.toUpperCase().slice(0, 3)}</div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-12 h-1.5 bg-wellq-gray/10 dark:bg-wellq-dark/50 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${getLoadColor(server[metric])} rounded-full`}
                          style={{ width: `${server[metric]}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-wellq-dark dark:text-white">{server[metric]}%</span>
                    </div>
                  </div>
                ))}
              </div>
              <ChevronRight size={16} className="text-wellq-gray/40 dark:text-wellq-gray/50 group-hover:text-wellq-gray dark:group-hover:text-wellq-gray/80 transition-colors" />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white dark:bg-wellq-dark rounded-2xl p-6 shadow-sm border border-wellq-gray/20 dark:border-wellq-gray/30">
          <h3 className="font-semibold text-wellq-dark dark:text-white mb-4">{t('overview.backgroundProcesses')}</h3>
          <div className="space-y-2">
            {processes.map((proc, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-wellq-gray/5 dark:hover:bg-wellq-dark/50 transition-colors"
              >
                <div className={`w-2 h-2 rounded-full ${getStatusDot(proc.status)}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-wellq-dark dark:text-white truncate">{proc.name}</div>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${getStatusColor(proc.status)}`}>
                  {tVal(proc.status)}
                </span>
                <div className="text-right text-xs text-wellq-dark dark:text-white w-20">
                  <div>{(proc.queued_items ?? 0).toLocaleString()} jobs</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <AppUsageBreakdown appStats={appStats} />
      </div>
    </div>
  );
};

// ─── Main export ──────────────────────────────────────────────────────────────
export const OverviewView = ({
  loading, kpiArr, kpiClinics, kpiPatients, kpiNrr,
  mrrData, churnRegions, apiAlerts, onAcknowledgeAlert,
  apiServers, apiProcesses, fmtArr,
  kpiSystemHealth, kpiActiveNow, kpiDownloads, kpiDormant,
  appStats,
}) => {
  const [tab, setTab] = React.useState('business');

  const handleRegionClick = (region) => {
    console.log('[ChurnHeatmap] región seleccionada:', region);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1 p-1 bg-wellq-gray/10 dark:bg-wellq-dark/60 rounded-xl w-fit">
        <button
          onClick={() => setTab('business')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
            tab === 'business' ? 'bg-white dark:bg-wellq-dark/80 text-wellq-dark dark:text-white shadow-sm' : 'text-wellq-gray hover:text-wellq-dark dark:hover:text-white'
          }`}
        >
          <TrendingUp size={16} /> Business Health
        </button>
        <button
          onClick={() => setTab('operational')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
            tab === 'operational' ? 'bg-white dark:bg-wellq-dark/80 text-wellq-dark dark:text-white shadow-sm' : 'text-wellq-gray hover:text-wellq-dark dark:hover:text-white'
          }`}
        >
          <Server size={16} /> Operational Status
        </button>
      </div>

      {tab === 'business' && (
        <BusinessHealthTab
          loading={loading}
          kpiArr={kpiArr}
          kpiClinics={kpiClinics}
          kpiPatients={kpiPatients}
          kpiNrr={kpiNrr}
          mrrData={mrrData}
          churnRegions={churnRegions}
          apiAlerts={apiAlerts}
          onAcknowledgeAlert={onAcknowledgeAlert}
          onRegionClick={handleRegionClick}
          fmtArr={fmtArr}
        />
      )}
      {tab === 'operational' && (
        <OperationalStatusTab
          apiServers={apiServers}
          apiProcesses={apiProcesses}
          kpiSystemHealth={kpiSystemHealth}
          kpiActiveNow={kpiActiveNow}
          kpiDownloads={kpiDownloads}
          kpiDormant={kpiDormant}
          appStats={appStats}
        />
      )}
    </div>
  );
};