import React from 'react';
import { Globe, ChevronRight } from 'lucide-react';

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
    case 'low':    return 'bg-wellq-green/10 text-wellq-green';
    default:       return 'bg-wellq-gray/10 text-wellq-dark dark:text-white';
  }
};

const riskDotColors = {
  low:    'from-wellq-green to-wellq-green/60 border-wellq-green',
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
        risk:    (r.risk_level ?? r.risk ?? 'low').toLowerCase(),
        mrrLoss: r.potential_mrr_loss ?? 0,
        raw: r,
      }))
    : hardcoded;

  return (
    <div className="bg-white dark:bg-wellq-dark rounded-2xl p-6 shadow-sm border border-wellq-gray/20 dark:border-wellq-gray/30">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold text-wellq-dark dark:text-white">Regional Churn Risk</h3>
          <p className="text-sm text-wellq-gray dark:text-wellq-gray/80">AI-driven risk assessment by region</p>
        </div>
        <Globe size={20} className="text-wellq-gray/40 dark:text-wellq-gray/50" />
      </div>

      <div className="space-y-3">
        {regions.map((r, i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-3 rounded-xl hover:bg-wellq-gray/5 dark:hover:bg-wellq-dark/50 transition-colors cursor-pointer group"
            onClick={() => onRegionClick?.(r)}
          >
            <div
              className={`w-4 h-4 rounded-full bg-gradient-to-br border flex-shrink-0 ${
                riskDotColors[r.risk] ?? riskDotColors.low
              }`}
            />

            <div className="flex-1 min-w-0">
              <div className="font-medium text-wellq-dark dark:text-white truncate">{r.name}</div>
              <div className="text-xs text-wellq-gray">
                {r.clinics} {r.clinics === 1 ? 'clinic' : 'clinics'}
                {r.mrrLoss > 0
                  ? ` · MRR at risk: $${r.mrrLoss.toLocaleString()}`
                  : ''}
              </div>
            </div>

            <span
              className={`px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${getRiskBadgeStyle(r.risk)}`}
            >
              {getRiskLabel(r.risk)}
            </span>

            <ChevronRight
              size={16}
              className="text-wellq-gray/40 dark:text-wellq-gray/50 group-hover:text-wellq-gray dark:group-hover:text-wellq-gray/80 transition-colors flex-shrink-0"
            />
          </div>
        ))}
      </div>
    </div>
  );
};