import React from 'react';
import {
  TrendingUp, AlertTriangle, Bell, Zap, Server, Users, Smartphone,
  Clock, Activity, ArrowUpRight, ChevronRight, CheckCheck, Info,
  Tablet, Monitor,
} from 'lucide-react';
import { KPICard, AlertItem, SegmentedControl, Skeleton } from '../components/ui';
import { MRRChart } from '../components/charts/MRRChart';
import { ChurnHeatmap } from '../components/charts/ChurnHeatmap';

// ─── Operational Status helpers ───────────────────────────────────────────────
const getStatusDot = (status) => {
  switch (status) {
    case 'operational': case 'running': case 'healthy': return 'bg-emerald-500';
    case 'degraded': case 'warning': return 'bg-amber-500 animate-pulse';
    case 'down': case 'error': case 'failed': return 'bg-red-500 animate-pulse';
    case 'idle': return 'bg-slate-400';
    case 'scheduled': case 'sleeping': return 'bg-blue-500';
    default: return 'bg-slate-400';
  }
};

const getStatusColor = (status) => {
  switch (status) {
    case 'operational': case 'running': return 'text-emerald-600 bg-emerald-100';
    case 'degraded': case 'warning': return 'text-amber-600 bg-amber-100';
    case 'down': case 'error': case 'failed': return 'text-red-600 bg-red-100';
    case 'idle': return 'text-slate-500 bg-slate-100';
    case 'scheduled': case 'sleeping': return 'text-blue-600 bg-blue-100';
    default: return 'text-slate-500 bg-slate-100';
  }
};

const getLoadColor = (pct) => {
  if (pct === 0) return 'bg-slate-300';
  if (pct >= 85) return 'bg-red-500';
  if (pct >= 70) return 'bg-amber-500';
  return 'bg-emerald-500';
};

const getSeverityStyle = (severity) => {
  switch (severity) {
    case 'critical': return { bar: 'bg-red-500',    icon: 'text-red-500',    bg: 'bg-red-50',    border: 'border-red-100' };
    case 'high':     return { bar: 'bg-orange-400', icon: 'text-orange-400', bg: 'bg-orange-50', border: 'border-orange-100' };
    case 'medium':   return { bar: 'bg-amber-400',  icon: 'text-amber-400',  bg: 'bg-amber-50',  border: 'border-amber-100' };
    default:         return { bar: 'bg-blue-400',   icon: 'text-blue-400',   bg: 'bg-blue-50',   border: 'border-blue-100' };
  }
};

// ─── App Usage Breakdown ──────────────────────────────────────────────────────
const fmt = (n) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : (n ?? 0).toLocaleString();

const AppUsageBreakdown = ({ appStats }) => {
  const patients = appStats?.patients;
  const tablet   = appStats?.tablet;
  const web      = appStats?.web;

  const apps = [
    {
      label:       'Patient App',
      icon:        Smartphone,
      iconBg:      'bg-indigo-100',
      iconColor:   'text-indigo-600',
      total:       patients?.total_downloads   ?? 0,
      activeToday: patients?.active_today      ?? 0,
      active30d:   patients?.active_30d        ?? 0,
      inactive:    patients?.inactive_users    ?? 0,
      ios:         patients?.ios_downloads     ?? 0,
      android:     patients?.android_downloads ?? 0,
      registered:  0,
      isWeb:       false,
      barActive:   'bg-indigo-500',
      barInactive: 'bg-amber-400',
    },
    {
      label:       'Clinician Tablet',
      icon:        Tablet,
      iconBg:      'bg-emerald-100',
      iconColor:   'text-emerald-600',
      total:       tablet?.total_downloads   ?? 0,
      activeToday: tablet?.active_today      ?? 0,
      active30d:   tablet?.active_30d        ?? 0,
      inactive:    tablet?.inactive_users    ?? 0,
      ios:         tablet?.ios_downloads     ?? 0,
      android:     tablet?.android_downloads ?? 0,
      registered:  0,
      isWeb:       false,
      barActive:   'bg-emerald-500',
      barInactive: 'bg-amber-400',
    },
    {
      label:       'Web Dashboard',
      icon:        Monitor,
      iconBg:      'bg-slate-100',
      iconColor:   'text-slate-600',
      total:       0,
      activeToday: web?.active_today    ?? 0,
      active30d:   web?.active_30d      ?? 0,
      inactive:    web?.inactive_users  ?? 0,
      ios:         0,
      android:     0,
      registered:  web?.registered_users ?? 0,
      isWeb:       true,
      barActive:   'bg-slate-500',
      barInactive: 'bg-amber-400',
    },
  ];

  if (!patients && !tablet && !web) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="mb-5">
          <h3 className="font-semibold text-slate-900">App Usage Breakdown</h3>
          <p className="text-sm text-slate-400">Downloads vs active users</p>
        </div>
        <div className="flex flex-col items-center justify-center py-10 gap-2">
          <Smartphone size={28} className="text-slate-200" />
          <p className="text-sm text-slate-400">Esperando datos de la app…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <div className="mb-5">
        <h3 className="font-semibold text-slate-900">App Usage Breakdown</h3>
        <p className="text-sm text-slate-400">Downloads vs active users</p>
      </div>
      <div className="space-y-4">
        {apps.map((app, i) => {
          const Icon          = app.icon;
          const base          = app.isWeb ? app.registered : app.total;
          const activeRatio   = base > 0 ? Math.round((app.active30d / base) * 100) : 0;
          const inactiveRatio = base > 0 ? Math.round((app.inactive  / base) * 100) : 0;
          return (
            <div key={i} className="rounded-xl border border-slate-100 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg ${app.iconBg} flex items-center justify-center`}>
                    <Icon size={16} className={app.iconColor} />
                  </div>
                  <span className="font-medium text-slate-900 text-sm">{app.label}</span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-indigo-600">
                    {app.isWeb ? fmt(app.registered) : fmt(app.total)}
                  </span>
                  <p className="text-xs text-slate-400">
                    {app.isWeb ? 'registered users' : 'total downloads'}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-base font-bold text-emerald-600">{fmt(app.activeToday)}</p>
                  <p className="text-xs text-slate-400">Active Today</p>
                </div>
                <div>
                  <p className="text-base font-bold text-indigo-600">{fmt(app.active30d)}</p>
                  <p className="text-xs text-slate-400">Active (30d)</p>
                </div>
                <div>
                  <p className="text-base font-bold text-amber-500">{fmt(app.inactive)}</p>
                  <p className="text-xs text-slate-400">Inactive</p>
                </div>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden flex">
                <div className={`${app.barActive} h-full`}   style={{ width: `${activeRatio}%` }} />
                <div className={`${app.barInactive} h-full`} style={{ width: `${inactiveRatio}%` }} />
              </div>
              {!app.isWeb && (app.ios > 0 || app.android > 0) && (
                <div className="flex justify-between text-xs text-slate-400">
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

// ─── Business Health Tab ──────────────────────────────────────────────────────
const BusinessHealthTab = ({
  loading, kpiArr, kpiClinics, kpiPatients, kpiNrr,
  mrrData, churnRegions, apiAlerts, onAcknowledgeAlert,
  onRegionClick, fmtArr,
}) => {
  const arrSpark = kpiArr?.trend_graph?.map((t) => t.value) ?? [0, 0, 0, 0, 0, 0];

  return (
    <>
      <div className="grid grid-cols-4 gap-6">
        <KPICard
          title="ARR"
          value={fmtArr(kpiArr?.current_arr)}
          trend="up"
          trendValue="+0%"
          sparkData={arrSpark}
          subtitle={kpiArr ? `MRR: ${fmtArr(kpiArr.current_arr / 12)}` : 'Esperando conexión...'}
          loading={loading}
        />
        <KPICard
          title="Active Clinics"
          value={kpiClinics ? String(kpiClinics.total_active) : '0'}
          trend="up"
          trendValue={kpiClinics ? `+${kpiClinics.new_clinics_month}` : '+0'}
          sparkData={[0, 0, 0, 0, 0, kpiClinics?.total_active ?? 0]}
          subtitle={
            kpiClinics
              ? `${kpiClinics.new_clinics_month} onboarded · ${kpiClinics.churned_clinics_month} churned`
              : '0 onboarded · 0 churned'
          }
          loading={loading}
        />
        <KPICard
          title="Total Patients"
          value={kpiPatients ? kpiPatients.total_patients.toLocaleString() : '0'}
          trend="up"
          trendValue={kpiPatients ? `+${kpiPatients.new_this_week} this week` : '+0%'}
          sparkData={[0, 0, 0, 0, 0, kpiPatients?.total_patients ?? 0]}
          subtitle={
            kpiPatients
              ? `${kpiPatients.active_in_treatment?.toLocaleString()} in treatment`
              : 'Avg 0 per clinic'
          }
          loading={loading}
        />
        <KPICard
          title="Net Revenue Retention"
          value={kpiNrr ? `${kpiNrr.nrr_percentage}%` : '0%'}
          trend={kpiNrr?.nrr_percentage >= 100 ? 'up' : 'down'}
          trendValue={kpiNrr ? `Exp: $${kpiNrr.expansion_mrr?.toLocaleString()}` : '+0%'}
          sparkData={[0, 0, 0, 0, 0, kpiNrr?.nrr_percentage ?? 0]}
          subtitle={kpiNrr ? `Churn MRR: $${kpiNrr.churn_mrr?.toLocaleString()}` : 'Esperando base de datos'}
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <MRRChart />
        {/* onRegionClick: por ahora loguea la región; reemplazá con tu modal/drawer */}
        <ChurnHeatmap
          apiRegions={churnRegions}
          onRegionClick={onRegionClick}
        />
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-900">Needs Attention</h3>
            {apiAlerts.length > 0 && (
              <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-bold rounded-full">
                {apiAlerts.length}
              </span>
            )}
          </div>
          <span className="text-xs text-slate-400">Updated recently</span>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : apiAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <CheckCheck size={28} className="text-emerald-400" />
            <p className="text-sm font-medium text-slate-600">Todo en orden</p>
            <p className="text-xs text-slate-400">No hay alertas activas en este momento</p>
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
                    <p className="text-sm font-semibold text-slate-900 truncate">{alert.title}</p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{alert.message}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-md capitalize flex-shrink-0 ${
                    alert.severity === 'critical' ? 'bg-red-100 text-red-600' :
                    alert.severity === 'high'     ? 'bg-orange-100 text-orange-600' :
                    alert.severity === 'medium'   ? 'bg-amber-100 text-amber-600' :
                                                    'bg-blue-100 text-blue-600'
                  }`}>
                    {alert.severity}
                  </span>
                  <button
                    onClick={() => onAcknowledgeAlert(alert.alert_id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all flex-shrink-0 cursor-pointer"
                  >
                    <CheckCheck size={13} />
                    Mark read
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

// ─── Operational Status Tab ───────────────────────────────────────────────────
const OperationalStatusTab = ({
  apiServers, apiProcesses,
  kpiSystemHealth, kpiActiveNow, kpiDownloads, kpiDormant,
  appStats,
}) => {
  const servers = apiServers ?? [
    { name: 'Esperando conexión...', status: 'idle', uptime: '0%', cpu: 0, memory: 0, region: 'N/A' },
  ];
  const processes = apiProcesses ?? [
    { name: 'Esperando conexión...', status: 'idle', queued_items: 0 },
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
    ? (kpiSystemHealth.overall_status === 'optimal' ? 'text-emerald-600' : 'text-amber-500') : 'text-slate-400';
  const systemHealthSub = kpiSystemHealth
    ? `Latencia: ${kpiSystemHealth.latency_ms}ms` : 'Esperando conexión...';

  const activeNowValue = kpiActiveNow != null ? String(kpiActiveNow.active_now) : '—';
  const activeNowSub   = kpiActiveNow
    ? `Web: ${kpiActiveNow.platform_distribution.web_admin} · Mobile: ${kpiActiveNow.platform_distribution.mobile_clinician + kpiActiveNow.platform_distribution.mobile_patient}`
    : 'vs yesterday';

  const downloadsValue = kpiDownloads != null ? kpiDownloads.total_downloads.toLocaleString() : '—';
  const downloadsSub   = kpiDownloads
    ? `iOS: ${kpiDownloads.ios.toLocaleString()} · Android: ${kpiDownloads.android.toLocaleString()}`
    : 'Esperando base de datos';

  const dormantValue = kpiDormant != null ? String(kpiDormant.dormant_30d) : '—';
  const dormantSub   = kpiDormant
    ? `${kpiDormant.dormant_90d} inactivos 90d · ${kpiDormant.risk_of_churn_clinics} en riesgo`
    : 'Esperando base de datos';

  const cards = [
    { label: 'System Health',    value: systemHealthValue, icon: null,       color: systemHealthColor,  sub: systemHealthSub },
    { label: 'Active Users Now', value: activeNowValue,    icon: Users,      color: 'text-indigo-600',  sub: activeNowSub },
    { label: 'Total Downloads',  value: downloadsValue,    icon: Smartphone, color: 'text-slate-900',   sub: downloadsSub },
    { label: 'Dormant Users',    value: dormantValue,      icon: Clock,      color: 'text-amber-600',   sub: dormantSub },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-6">
        {cards.map(({ label, value, icon: Icon, color, sub }, i) => (
          <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-slate-500">{label}</span>
              {Icon ? <Icon size={18} className="text-slate-300" /> : <div className="w-3 h-3 rounded-full bg-slate-300" />}
            </div>
            <div className={`text-3xl font-bold ${color}`}>{value}</div>
            <div className="text-xs text-slate-500 mt-1">{sub}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="mb-6">
          <h3 className="font-semibold text-slate-900">Server Infrastructure</h3>
          <p className="text-sm text-slate-400">Real-time server and database status</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {servers.map(normalizeServer).map((server, i) => (
            <div
              key={i}
              className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition-all cursor-pointer group"
            >
              <div className={`w-3 h-3 rounded-full ${getStatusDot(server.status)}`} />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-900 truncate">{server.name}</div>
                <div className="text-xs text-slate-500">{server.region} · {server.uptime} uptime</div>
              </div>
              <div className="flex items-center gap-3">
                {['cpu', 'memory'].map((metric) => (
                  <div key={metric} className="text-right">
                    <div className="text-xs text-slate-500">{metric.toUpperCase().slice(0, 3)}</div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${getLoadColor(server[metric])} rounded-full`}
                          style={{ width: `${server[metric]}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-slate-900">{server[metric]}%</span>
                    </div>
                  </div>
                ))}
              </div>
              <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-900 mb-4">Background Processes</h3>
          <div className="space-y-2">
            {processes.map((proc, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div className={`w-2 h-2 rounded-full ${getStatusDot(proc.status)}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900 truncate">{proc.name}</div>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${getStatusColor(proc.status)}`}>
                  {proc.status}
                </span>
                <div className="text-right text-xs text-slate-900 w-20">
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

  // Handler para click en región del heatmap.
  // Por ahora loguea — reemplazá con tu modal/drawer/navigate cuando lo tengas.
  const handleRegionClick = (region) => {
    console.log('[ChurnHeatmap] región seleccionada:', region);
    // Ejemplo futuro:
    // navigate(`/clinic-management?region=${encodeURIComponent(region.name)}&risk=${region.risk}`);
    // o: setSelectedRegion(region); setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        <button
          onClick={() => setTab('business')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
            tab === 'business' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <TrendingUp size={16} /> Business Health
        </button>
        <button
          onClick={() => setTab('operational')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
            tab === 'operational' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
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