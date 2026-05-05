import React from 'react';
import { DollarSign, Zap, Activity, ArrowDownRight, ArrowUpRight, Server } from 'lucide-react';

export const PlatformOpsView = ({ apiCosts, apiLatency, apiPose, apiServers }) => (
  <div className="space-y-6">
    {/* Top 3 cards */}
    <div className="grid grid-cols-3 gap-6">
      {/* Cost */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-slate-500">Cost Per Session</span>
          <DollarSign size={18} className="text-slate-300" />
        </div>
        <div className="text-3xl font-bold text-slate-900">
          {apiCosts ? `$${(apiCosts.total_cost / 1000).toFixed(3)}` : '$0.000'}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-emerald-600 text-sm font-medium flex items-center gap-1">
            <ArrowDownRight size={14} /> 0%
          </span>
          <span className="text-xs text-slate-400">vs last month</span>
        </div>
        {apiCosts?.breakdown && (
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

      {/* Latency */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-slate-500">AI Latency (p99)</span>
          <Zap size={18} className="text-slate-300" />
        </div>
        {apiLatency ? (
          <div className="space-y-2">
            {apiLatency.metrics?.map((m, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-xs text-slate-500 truncate max-w-[130px]">{m.service}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-slate-900">{m.average_latency_ms}ms</span>
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

      {/* Pose */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-slate-500">Pose Analysis Success</span>
          <Activity size={18} className="text-slate-300" />
        </div>
        <div className="text-3xl font-bold text-slate-900">
          {apiPose ? `${apiPose.overall_success_rate_percentage}%` : '0%'}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-emerald-600 text-sm font-medium flex items-center gap-1">
            <ArrowUpRight size={14} /> 0%
          </span>
          <span className="text-xs text-slate-400">vs last month</span>
        </div>
        {apiPose?.failure_reasons?.slice(0, 2).map((r, i) => (
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

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-900 mb-4">App Version Distribution</h3>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-slate-900">Esperando conexión...</span>
              <span className="text-slate-900 font-medium">0%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="bg-slate-300 h-full" style={{ width: '0%' }} />
            </div>
          </div>
        </div>
        <button className="mt-4 text-sm text-indigo-600 font-medium hover:text-indigo-700 flex items-center gap-1">
          View force update options
        </button>
      </div>
    </div>
  </div>
);
