import React, { useEffect, useState } from 'react';
import { DollarSign, Zap, Activity, ArrowDownRight, ArrowUpRight, Server } from 'lucide-react';
 
// ── App Version Distribution (fetches /api/analytics/versions) ──────────────
const VERSION_COLORS = [
  'bg-indigo-500',
  'bg-emerald-500',
  'bg-amber-400',
  'bg-rose-400',
  'bg-slate-300',
];
 
const AppVersionDistribution = () => {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
 
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
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <h3 className="font-semibold text-slate-900 mb-4">App Version Distribution</h3>
 
      {loading && (
        <div className="flex items-center gap-2 py-6 justify-center">
          <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-400">Cargando versiones…</span>
        </div>
      )}
 
      {!loading && error && (
        <p className="text-sm text-red-400 py-4">Error al cargar: {error}</p>
      )}
 
      {!loading && !error && versions.length === 0 && (
        <p className="text-sm text-slate-400 py-4">Sin datos de versiones aún.</p>
      )}
 
      {!loading && !error && versions.length > 0 && (
        <div className="space-y-3">
          {versions.map((v, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-slate-700 font-medium">
                  {v.app_type ?? v.appType}{' '}
                  <span className="text-slate-400 font-normal">v{v.version}</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">
                    {(v.user_count ?? v.userCount ?? 0).toLocaleString()} usuarios
                  </span>
                  <span className="text-slate-900 font-semibold">{v.percentage}%</span>
                </div>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`${VERSION_COLORS[i % VERSION_COLORS.length]} h-full rounded-full transition-all duration-700`}
                  style={{ width: `${v.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
 
      <button className="mt-4 text-sm text-indigo-600 font-medium hover:text-indigo-700 flex items-center gap-1">
        View force update options
      </button>
    </div>
  );
};
 
// ── Main component ───────────────────────────────────────────────────────────
export const PlatformOpsView = ({ apiCosts, apiLatency, apiPose, apiServers }) => (
  <div className="space-y-6">
    {/* Top 3 cards */}
    <div className="grid grid-cols-3 gap-6">

      {/* Cost — backend devuelve "totalCost" en camelCase */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-slate-500">Cost Per Session</span>
          <DollarSign size={18} className="text-slate-300" />
        </div>
        <div className="text-3xl font-bold text-slate-900">
          {apiCosts?.totalCost != null
            ? `$${(apiCosts.totalCost / 1000).toFixed(3)}`
            : '$0.000'}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-emerald-600 text-sm font-medium flex items-center gap-1">
            <ArrowDownRight size={14} /> 0%
          </span>
          <span className="text-xs text-slate-400">vs last month</span>
        </div>
        {apiCosts?.breakdown && apiCosts.breakdown.length > 0 && (
          <div className="mt-3 space-y-1 border-t border-slate-50 pt-3">
            {apiCosts.breakdown.map((b, i) => (
              <div key={i} className="flex justify-between text-xs text-slate-500">
                <span className="truncate max-w-[120px]">{b.model}</span>
                <span className="font-medium text-slate-900">${b.cost}</span>
              </div>
            ))}
          </div>
        )}
      </div>
 
      {/* Latency — backend devuelve "averageLatencyMs" en camelCase */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-slate-500">AI Latency (p99)</span>
          <Zap size={18} className="text-slate-300" />
        </div>
        {apiLatency?.metrics && apiLatency.metrics.length > 0 ? (
          <div className="space-y-2">
            {apiLatency.metrics.map((m, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-xs text-slate-500 truncate max-w-[130px]">{m.service}</span>
                <div className="flex items-center gap-1.5">
                  {/* ✅ camelCase: averageLatencyMs */}
                  <span className="text-sm font-bold text-slate-900">
                    {m.averageLatencyMs ?? m.average_latency_ms ?? '—'}ms
                  </span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      m.status === 'healthy' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-3xl font-bold text-slate-900">0ms</div>
        )}
      </div>
 
      {/* Pose — backend devuelve "overallSuccessRatePercentage" y "failureReasons" en camelCase */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-slate-500">Pose Analysis Success</span>
          <Activity size={18} className="text-slate-300" />
        </div>
        <div className="text-3xl font-bold text-slate-900">
          {/* ✅ camelCase: overallSuccessRatePercentage */}
          {apiPose?.overallSuccessRatePercentage != null
            ? `${apiPose.overallSuccessRatePercentage}%`
            : '0%'}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-emerald-600 text-sm font-medium flex items-center gap-1">
            <ArrowUpRight size={14} /> 0%
          </span>
          <span className="text-xs text-slate-400">vs last month</span>
        </div>
        {/* ✅ camelCase: failureReasons */}
        {apiPose?.failureReasons?.slice(0, 2).map((r, i) => (
          <div key={i} className="text-xs text-slate-500 mt-1 truncate">
            • {r.reason} ({r.percentage}%)
          </div>
        ))}
      </div>
    </div>
 
    {/* Infra + App versions */}
    <div className="grid grid-cols-2 gap-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-900 mb-4">Infrastructure Status</h3>
        <div className="space-y-3">
          {(apiServers && apiServers.length > 0
            ? apiServers
            : [{ name: 'Esperando base de datos', status: 'idle' }]
          ).map((s, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0"
            >
              <div className="flex items-center gap-3">
                <Server size={16} className="text-slate-400" />
                <span className="text-sm text-slate-900">{s.name}</span>
              </div>
              <span
                className={`flex items-center gap-1.5 text-xs font-medium ${
                  s.status === 'healthy'
                    ? 'text-emerald-600'
                    : s.status === 'warning'
                    ? 'text-amber-600'
                    : 'text-slate-500'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    s.status === 'healthy'
                      ? 'bg-emerald-500'
                      : s.status === 'warning'
                      ? 'bg-amber-500 animate-pulse'
                      : 'bg-slate-300'
                  }`}
                />
                {s.status ?? 'Esperando...'}
              </span>
            </div>
          ))}
        </div>
      </div>
 
      {/* App Version Distribution — ahora con datos reales */}
      <AppVersionDistribution />
    </div>
  </div>
);