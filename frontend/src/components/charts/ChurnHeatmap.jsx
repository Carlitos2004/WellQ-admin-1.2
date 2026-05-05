import React from 'react';
import { Globe, ChevronRight } from 'lucide-react';

export const ChurnHeatmap = ({ apiRegions }) => {
  const hardcoded = [{ name: 'Esperando conexión...', clinics: 0, risk: 'low' }];

  const regions = apiRegions
    ? apiRegions.map((r) => ({
        name: r.region ?? r.name ?? 'Esperando...',
        clinics: r.clinics_at_risk ?? r.clinics ?? 0,
        risk: (r.risk_level ?? r.risk ?? 'low').toLowerCase(),
        mrrLoss: r.potential_mrr_loss ?? 0,
      }))
    : hardcoded;

  const riskColors = {
    low: 'from-slate-200 to-slate-300 border-slate-300',
    medium: 'from-amber-400 to-amber-500 border-amber-300',
    high: 'from-red-400 to-red-500 border-red-300',
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold text-slate-900">Regional Churn Risk</h3>
          <p className="text-sm text-slate-400">AI-driven risk assessment by region</p>
        </div>
        <Globe size={20} className="text-slate-300" />
      </div>
      <div className="space-y-3">
        {regions.map((r, i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group"
          >
            <div
              className={`w-4 h-4 rounded-full bg-gradient-to-br border ${
                riskColors[r.risk] ?? riskColors.low
              }`}
            />
            <div className="flex-1">
              <div className="font-medium text-slate-800">{r.name}</div>
              <div className="text-xs text-slate-500">
                {r.clinics} clinics
                {r.mrrLoss ? ` · MRR at risk: $${r.mrrLoss.toLocaleString()}` : ''}
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-medium capitalize bg-slate-100 text-slate-500">
              {r.risk === 'low' ? 'Esperando...' : `${r.risk} risk`}
            </span>
            <ChevronRight
              size={16}
              className="text-slate-300 group-hover:text-slate-500 transition-colors"
            />
          </div>
        ))}
      </div>
    </div>
  );
};
