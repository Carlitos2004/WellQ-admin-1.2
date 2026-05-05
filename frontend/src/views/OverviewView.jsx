import React from 'react';
import {
  TrendingUp, AlertTriangle, Bell, Zap, Server, Users, Smartphone,
  Clock, Activity, LayoutDashboard, ArrowUpRight, ChevronRight
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

// ─── Sub-views ────────────────────────────────────────────────────────────────
const BusinessHealthTab = ({
  loading, kpiArr, kpiClinics, kpiPatients, kpiNrr,
  mrrData, churnRegions, apiAlerts, onAcknowledgeAlert, fmtArr,
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
          subtitle={kpiNrr?.status === 'healthy' ? 'Esperando datos...' : 'Esperando base de datos'}
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <MRRChart apiBreakdown={mrrData?.breakdown} />
        <ChurnHeatmap apiRegions={churnRegions} />
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">
            Needs Attention
            {apiAlerts.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-600 text-xs font-bold rounded-full">
                {apiAlerts.length}
              </span>
            )}
          </h3>
          <span className="text-xs text-slate-400">Updated recently</span>
        </div>
        <div className="space-y-2">
          {apiAlerts.length > 0
            ? apiAlerts.map((alert) => (
                <div key={alert.alert_id} className="relative group">
                  <AlertItem
                    icon={
                      alert.severity === 'high' || alert.severity === 'critical'
                        ? AlertTriangle
                        : Bell
                    }
                    message={alert.message}
                    title={alert.title}
                    severity={alert.severity}
                  />
                  <button
                    onClick={() => onAcknowledgeAlert(alert.alert_id)}
                    className="absolute right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-600 hover:bg-slate-50"
                  >
                    Mark read
                  </button>
                </div>
              ))
            : (
              <>
                <AlertItem icon={AlertTriangle} message="Esperando conexión con backend..." severity="info" />
                <AlertItem icon={Zap} message="Esperando base de datos..." severity="info" />
              </>
            )}
        </div>
      </div>
    </>
  );
};

const OperationalStatusTab = ({ apiServers, apiProcesses }) => {
  const servers = apiServers ?? [
    { name: 'Esperando conexión...', status: 'idle', uptime: '0%', cpu: 0, memory: 0, region: 'N/A' },
  ];
  const processes = apiProcesses ?? [
    { name: 'Esperando conexión...', status: 'idle', queued_items: 0 },
  ];

  const normalizeServer = (s) => ({
    name: s.name,
    status: s.status === 'healthy' ? 'operational' : s.status,
    uptime: s.uptime,
    cpu: typeof s.cpu === 'string' ? parseInt(s.cpu) : (s.cpu ?? (s.cpu_usage ? parseInt(s.cpu_usage) : 0)),
    memory: typeof s.memory === 'number' ? s.memory : (s.ram_usage ? parseInt(s.ram_usage) : 0),
    region: s.region,
  });

  return (
    <div className="space-y-6">
      {/* Top KPIs */}
      <div className="grid grid-cols-4 gap-6">
        {[
          { label: 'System Health', value: '0.0%', icon: null, color: 'text-emerald-600', sub: 'Esperando conexión...' },
          { label: 'Active Users Now', value: '0', icon: Users, color: 'text-indigo-600', sub: 'vs yesterday' },
          { label: 'Total Downloads', value: '0', icon: Smartphone, color: 'text-slate-900', sub: 'Esperando base de datos' },
          { label: 'Dormant Users', value: '0', icon: Clock, color: 'text-amber-600', sub: 'Esperando base de datos' },
        ].map(({ label, value, icon: Icon, color, sub }, i) => (
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

      {/* Servers */}
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

      {/* Processes */}
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
    </div>
  );
};

// ─── Main export ─────────────────────────────────────────────────────────────
export const OverviewView = ({
  loading, kpiArr, kpiClinics, kpiPatients, kpiNrr,
  mrrData, churnRegions, apiAlerts, onAcknowledgeAlert,
  apiServers, apiProcesses, fmtArr,
}) => {
  const [tab, setTab] = React.useState('business');

  return (
    <div className="space-y-6">
      {/* Tab switcher */}
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
          fmtArr={fmtArr}
        />
      )}
      {tab === 'operational' && (
        <OperationalStatusTab apiServers={apiServers} apiProcesses={apiProcesses} />
      )}
    </div>
  );
};
