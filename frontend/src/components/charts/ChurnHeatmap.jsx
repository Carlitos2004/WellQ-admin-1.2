import React from 'react';
import { Globe, ChevronRight } from 'lucide-react';

// Convierte risk_level de la DB (cualquier capitalización) a badge legible
const getRiskLabel = (risk) => {
  switch (risk) {
    case 'high':   return 'High risk';
    case 'medium': return 'Medium risk';
    case 'low':    return 'Low risk';
    default:       return risk ? `${risk} risk` : 'Unknown';
  }
};

const getRiskBadgeStyle = (risk) => {
  switch (risk) {
    case 'high':   return 'bg-red-100 text-red-700';
    case 'medium': return 'bg-amber-100 text-amber-700';
    case 'low':    return 'bg-emerald-100 text-emerald-700';
    default:       return 'bg-slate-100 text-slate-500';
  }
};

const riskDotColors = {
  low:    'from-emerald-300 to-emerald-400 border-emerald-300',
  medium: 'from-amber-400 to-amber-500 border-amber-300',
  high:   'from-red-400 to-red-500 border-red-300',
};

export const ChurnHeatmap = ({ apiRegions, onRegionClick }) => {
  const hardcoded = [
    { name: 'Esperando conexión...', clinics: 0, risk: 'low', mrrLoss: 0 },
  ];

  const regions = apiRegions
    ? apiRegions.map((r) => ({
        name:    r.region ?? r.name ?? 'Sin nombre',
        clinics: r.clinics_at_risk ?? r.clinics ?? 0,
        // Normalizar a lowercase para que las comparaciones sean consistentes
        risk:    (r.risk_level ?? r.risk ?? 'low').toLowerCase(),
        mrrLoss: r.potential_mrr_loss ?? 0,
        // Guardar el objeto original para pasarlo al handler
        raw: r,
      }))
    : hardcoded;

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
            onClick={() => onRegionClick?.(r)}
          >
            {/* Dot de riesgo */}
            <div
              className={`w-4 h-4 rounded-full bg-gradient-to-br border flex-shrink-0 ${
                riskDotColors[r.risk] ?? riskDotColors.low
              }`}
            />

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-slate-800 truncate">{r.name}</div>
              <div className="text-xs text-slate-500">
                {r.clinics} {r.clinics === 1 ? 'clinic' : 'clinics'}
                {r.mrrLoss > 0
                  ? ` · MRR at risk: $${r.mrrLoss.toLocaleString()}`
                  : ''}
              </div>
            </div>

            {/* Badge de riesgo */}
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${getRiskBadgeStyle(r.risk)}`}
            >
              {getRiskLabel(r.risk)}
            </span>

            <ChevronRight
              size={16}
              className="text-slate-300 group-hover:text-slate-500 transition-colors flex-shrink-0"
            />
          </div>
        ))}
      </div>
    </div>
  );
};