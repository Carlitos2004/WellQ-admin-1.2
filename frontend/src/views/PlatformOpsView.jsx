import React, { useEffect, useState } from 'react';
import { DollarSign, Zap, Activity, ArrowDownRight, ArrowUpRight, Server, X, Smartphone, Monitor, Globe, CheckCircle, AlertTriangle } from 'lucide-react';

// ── ForceUpdateModal ─────────────────────────────────────────────────────────
const ForceUpdateModal = ({ versions, onClose }) => {
  const [minVersions, setMinVersions] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  // Agrupar versiones por app_type
  const byAppType = versions.reduce((acc, v) => {
    const type = v.app_type ?? v.appType ?? 'Unknown';
    if (!acc[type]) acc[type] = [];
    acc[type].push(v.version);
    return acc;
  }, {});

  const APP_ICONS = {
    'patients': Smartphone,
    'tablet': Monitor,
    'web': Globe,
  };

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
      setError('Error al guardar. Intenta de nuevo.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-wellq-dark rounded-2xl shadow-xl w-full max-w-lg mx-4 border border-wellq-gray/20 dark:border-wellq-gray/30 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-wellq-gray/20 dark:border-wellq-gray/30">
          <div>
            <h3 className="font-bold text-wellq-dark dark:text-white">Force Update Options</h3>
            <p className="text-xs text-wellq-gray mt-0.5">
              Establece la versión mínima requerida por app
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-wellq-gray/10 dark:hover:bg-wellq-dark/50 rounded-lg transition-colors"
          >
            <X size={18} className="text-wellq-gray" />
          </button>
        </div>

        {/* Success state */}
        {saved ? (
          <div className="flex flex-col items-center justify-center py-14 gap-3">
            <div className="w-14 h-14 rounded-full bg-wellq-green/10 flex items-center justify-center">
              <CheckCircle size={24} className="text-wellq-green" />
            </div>
            <p className="font-semibold text-wellq-dark dark:text-white">¡Configuración guardada!</p>
            <p className="text-sm text-wellq-gray">Las versiones mínimas han sido actualizadas.</p>
          </div>
        ) : (
          <>
            <div className="p-6 space-y-4">
              {Object.keys(byAppType).length === 0 ? (
                <p className="text-sm text-wellq-gray text-center py-8">No hay datos de versiones disponibles.</p>
              ) : (
                Object.entries(byAppType).map(([appType, appVersions]) => {
                  const Icon = APP_ICONS[appType.toLowerCase()] ?? Smartphone;
                  return (
                    <div
                      key={appType}
                      className="flex items-center gap-4 p-4 rounded-xl bg-wellq-gray/5 dark:bg-wellq-dark/50 border border-wellq-gray/10 dark:border-wellq-gray/30"
                    >
                      <div className="w-10 h-10 rounded-xl bg-wellq-cyan/10 flex items-center justify-center flex-shrink-0">
                        <Icon size={18} className="text-wellq-cyan" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-wellq-dark dark:text-white capitalize">{appType}</p>
                        <p className="text-xs text-wellq-gray">
                          Versiones activas: {appVersions.join(', ')}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <label className="block text-xs text-wellq-gray mb-1">Versión mínima</label>
                        <select
                          value={minVersions[appType] || ''}
                          onChange={(e) => setMinVersions((prev) => ({ ...prev, [appType]: e.target.value }))}
                          className="px-3 py-1.5 text-sm border border-wellq-gray/30 dark:border-wellq-gray/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-wellq-cyan bg-white dark:bg-wellq-dark dark:text-white"
                        >
                          <option value="">Sin forzar</option>
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
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
                  <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-wellq-gray/20 dark:border-wellq-gray/30 bg-wellq-gray/5 dark:bg-wellq-dark/50">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-wellq-gray/30 rounded-lg text-sm font-medium text-wellq-dark dark:text-white hover:bg-wellq-gray/10 dark:hover:bg-wellq-dark/40 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-wellq-cyan text-wellq-black rounded-lg text-sm font-medium hover:bg-wellq-cyan/80 transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <><div className="w-4 h-4 border-2 border-wellq-black border-t-transparent rounded-full animate-spin" /> Guardando...</>
                ) : (
                  'Guardar configuración'
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ── App Version Distribution (fetches /api/analytics/versions) ──────────────
const VERSION_COLORS = [
  'bg-wellq-cyan',
  'bg-wellq-green',
  'bg-wellq-blue',
  'bg-wellq-cyan/70',
  'bg-wellq-gray/50',
];

const AppVersionDistribution = () => {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // ── Estado para el modal de force update ─────────────────────────────────
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
    <div className="bg-white dark:bg-wellq-dark rounded-2xl p-6 shadow-sm border border-wellq-gray/20 dark:border-wellq-gray/30">
      <h3 className="font-semibold text-wellq-dark dark:text-white mb-4">App Version Distribution</h3>

      {loading && (
        <div className="flex items-center gap-2 py-6 justify-center">
          <div className="w-5 h-5 border-2 border-wellq-cyan border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-wellq-gray dark:text-wellq-gray/80">Cargando versiones…</span>
        </div>
      )}

      {!loading && error && (
        <p className="text-sm text-red-400 py-4">Error al cargar: {error}</p>
      )}

      {!loading && !error && versions.length === 0 && (
        <p className="text-sm text-wellq-gray dark:text-wellq-gray/80 py-4">Sin datos de versiones aún.</p>
      )}

      {!loading && !error && versions.length > 0 && (
        <div className="space-y-3">
          {versions.map((v, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-wellq-dark dark:text-white font-medium">
                  {v.app_type ?? v.appType}{' '}
                  <span className="text-wellq-gray dark:text-wellq-gray/80 font-normal">v{v.version}</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-wellq-gray dark:text-wellq-gray/80">
                    {(v.user_count ?? v.userCount ?? 0).toLocaleString()} usuarios
                  </span>
                  <span className="text-wellq-dark dark:text-white font-semibold">{v.percentage}%</span>
                </div>
              </div>
              <div className="h-2 bg-wellq-gray/10 dark:bg-wellq-dark/50 rounded-full overflow-hidden">
                <div
                  className={`${VERSION_COLORS[i % VERSION_COLORS.length]} h-full rounded-full transition-all duration-700`}
                  style={{ width: `${v.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Botón que ahora abre el modal */}
      <button
        onClick={() => setForceUpdateOpen(true)}
        className="mt-4 text-sm text-wellq-cyan font-medium hover:text-wellq-cyan/80 dark:hover:text-wellq-cyan/60 flex items-center gap-1 transition-colors"
      >
        View force update options
      </button>

      {/* Modal de force update */}
      {forceUpdateOpen && (
        <ForceUpdateModal
          versions={versions}
          onClose={() => setForceUpdateOpen(false)}
        />
      )}
    </div>
  );
};

// ── Main component ───────────────────────────────────────────────────────────
export const PlatformOpsView = ({ apiCosts, apiLatency, apiPose, apiServers }) => (
  <div className="space-y-6">
    {/* Top 3 cards */}
    <div className="grid grid-cols-3 gap-6">

      {/* Cost — backend devuelve "totalCost" en camelCase */}
      <div className="bg-white dark:bg-wellq-dark rounded-2xl p-6 shadow-sm border border-wellq-gray/20 dark:border-wellq-gray/30">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-wellq-gray dark:text-wellq-gray/80">Cost Per Session</span>
          <DollarSign size={18} className="text-wellq-gray/40 dark:text-wellq-gray/50" />
        </div>
        <div className="text-3xl font-bold text-wellq-dark dark:text-white">
          {apiCosts?.totalCost != null
            ? `$${(apiCosts.totalCost / 1000).toFixed(3)}`
            : '$0.000'}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-wellq-green text-sm font-medium flex items-center gap-1">
            <ArrowDownRight size={14} /> 0%
          </span>
          <span className="text-xs text-wellq-gray dark:text-wellq-gray/80">vs last month</span>
        </div>
        {apiCosts?.breakdown && apiCosts.breakdown.length > 0 && (
          <div className="mt-3 space-y-1 border-t border-wellq-gray/10 dark:border-wellq-gray/30 pt-3">
            {apiCosts.breakdown.map((b, i) => (
              <div key={i} className="flex justify-between text-xs text-wellq-gray dark:text-wellq-gray/80">
                <span className="truncate max-w-[120px]">{b.model}</span>
                <span className="font-medium text-wellq-dark dark:text-white">${b.cost}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Latency — backend devuelve "averageLatencyMs" en camelCase */}
      <div className="bg-white dark:bg-wellq-dark rounded-2xl p-6 shadow-sm border border-wellq-gray/20 dark:border-wellq-gray/30">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-wellq-gray dark:text-wellq-gray/80">AI Latency (p99)</span>
          <Zap size={18} className="text-wellq-gray/40 dark:text-wellq-gray/50" />
        </div>
        {apiLatency?.metrics && apiLatency.metrics.length > 0 ? (
          <div className="space-y-2">
            {apiLatency.metrics.map((m, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-xs text-wellq-gray dark:text-wellq-gray/80 truncate max-w-[130px]">{m.service}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-wellq-dark dark:text-white">
                    {m.averageLatencyMs ?? m.average_latency_ms ?? '—'}ms
                  </span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      m.status === 'healthy' ? 'bg-wellq-green' : 'bg-wellq-blue animate-pulse'
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-3xl font-bold text-wellq-dark dark:text-white">0ms</div>
        )}
      </div>

      {/* Pose — backend devuelve "overallSuccessRatePercentage" y "failureReasons" en camelCase */}
      <div className="bg-white dark:bg-wellq-dark rounded-2xl p-6 shadow-sm border border-wellq-gray/20 dark:border-wellq-gray/30">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-wellq-gray dark:text-wellq-gray/80">Pose Analysis Success</span>
          <Activity size={18} className="text-wellq-gray/40 dark:text-wellq-gray/50" />
        </div>
        <div className="text-3xl font-bold text-wellq-dark dark:text-white">
          {apiPose?.overallSuccessRatePercentage != null
            ? `${apiPose.overallSuccessRatePercentage}%`
            : '0%'}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-wellq-green text-sm font-medium flex items-center gap-1">
            <ArrowUpRight size={14} /> 0%
          </span>
          <span className="text-xs text-wellq-gray dark:text-wellq-gray/80">vs last month</span>
        </div>
        {apiPose?.failureReasons?.slice(0, 2).map((r, i) => (
          <div key={i} className="text-xs text-wellq-gray dark:text-wellq-gray/80 mt-1 truncate">
            • {r.reason} ({r.percentage}%)
          </div>
        ))}
      </div>
    </div>

    {/* Infra + App versions */}
    <div className="grid grid-cols-2 gap-6">
      <div className="bg-white dark:bg-wellq-dark rounded-2xl p-6 shadow-sm border border-wellq-gray/20 dark:border-wellq-gray/30">
        <h3 className="font-semibold text-wellq-dark dark:text-white mb-4">Infrastructure Status</h3>
        <div className="space-y-3">
          {(apiServers && apiServers.length > 0
            ? apiServers
            : [{ name: 'Esperando base de datos', status: 'idle' }]
          ).map((s, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-2 border-b border-wellq-gray/10 dark:border-wellq-gray/30 last:border-0"
            >
              <div className="flex items-center gap-3">
                <Server size={16} className="text-wellq-gray dark:text-wellq-gray/80" />
                <span className="text-sm text-wellq-dark dark:text-white">{s.name}</span>
              </div>
              <span
                className={`flex items-center gap-1.5 text-xs font-medium ${
                  s.status === 'healthy'
                    ? 'text-wellq-green'
                    : s.status === 'warning'
                    ? 'text-wellq-blue'
                    : 'text-wellq-gray dark:text-wellq-gray/80'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    s.status === 'healthy'
                      ? 'bg-wellq-green'
                      : s.status === 'warning'
                      ? 'bg-amber-500 animate-pulse'
                      : 'bg-wellq-gray/40 dark:bg-wellq-gray/60'
                  }`}
                />
                {s.status ?? 'Esperando...'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* App Version Distribution — con modal de force update */}
      <AppVersionDistribution />
    </div>
  </div>
);