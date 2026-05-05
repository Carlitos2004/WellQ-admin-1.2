import React from 'react';
import { DollarSign, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { MRRChart } from '../components/charts/MRRChart';
import { ChurnHeatmap } from '../components/charts/ChurnHeatmap';

export const FinancialsView = ({ mrrData, churnRegions }) => {
  const breakdown = mrrData?.breakdown;
  const totalMrr = mrrData?.total_mrr ?? 0;

  return (
    <div className="space-y-6">
      {/* Top KPIs */}
      <div className="grid grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-500">Total MRR</span>
            <DollarSign size={18} className="text-slate-300" />
          </div>
          <div className="text-3xl font-bold text-slate-900">${totalMrr.toLocaleString()}</div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-emerald-600 text-sm font-medium flex items-center gap-1">
              <ArrowUpRight size={14} /> {mrrData?.monthly_growth_percentage ?? 0}%
            </span>
            <span className="text-xs text-slate-500">vs last month</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-500">New Business</span>
            <TrendingUp size={18} className="text-emerald-400" />
          </div>
          <div className="text-3xl font-bold text-emerald-600">
            +${(breakdown?.new_business ?? 0).toLocaleString()}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-500">Expansion</span>
            <ArrowUpRight size={18} className="text-indigo-400" />
          </div>
          <div className="text-3xl font-bold text-indigo-600">
            +${(breakdown?.expansion ?? 0).toLocaleString()}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-500">Churn MRR</span>
            <TrendingDown size={18} className="text-red-400" />
          </div>
          <div className="text-3xl font-bold text-red-500">
            ${Math.abs(breakdown?.churn ?? 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        <MRRChart apiBreakdown={breakdown} />
        <ChurnHeatmap apiRegions={churnRegions} />
      </div>

      {/* Breakdown detail */}
      {breakdown && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-900 mb-4">MRR Breakdown Detail</h3>
          <div className="space-y-3">
            {Object.entries(breakdown).map(([key, value]) => {
              const labels = {
                new_business: 'New Business',
                expansion: 'Expansion',
                contraction: 'Contraction',
                churn: 'Churn',
                retained: 'Retained',
              };
              const isNeg = value < 0;
              const safeTotal = totalMrr > 0 ? totalMrr : 1;
              return (
                <div key={key} className="flex items-center gap-4">
                  <span className="text-sm text-slate-600 w-32">{labels[key] ?? key}</span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-slate-300"
                      style={{
                        width: `${Math.min((Math.abs(value) / safeTotal) * 100, 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-semibold w-20 text-right text-slate-900">
                    {isNeg ? '-' : '+'}${Math.abs(value).toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
