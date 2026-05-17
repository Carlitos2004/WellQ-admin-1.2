import React from 'react';
import { DollarSign, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { MRRChart } from '../components/charts/MRRChart';
import { ChurnHeatmap } from '../components/charts/ChurnHeatmap';
import { useLanguage } from '../contexts/LanguageContext';

export const FinancialsView = ({ mrrData, churnRegions }) => {
  const { t } = useLanguage();

  const breakdown = mrrData?.breakdown;
  const totalMrr = mrrData?.total_mrr ?? 0;

  const breakdownLabels = {
    new_business: t('financials.newBusiness'),
    expansion:    t('financials.expansion'),
    contraction:  t('financials.contraction'),
    churn:        t('financials.churnMrr'),
    retained:     t('financials.retained'),
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-6">
        <div className="bg-white dark:bg-wellq-dark rounded-2xl p-6 shadow-sm border border-wellq-gray/20 dark:border-wellq-gray/30">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-wellq-gray">{t('financials.totalMrr')}</span>
            <DollarSign size={18} className="text-wellq-gray/40 dark:text-wellq-gray/50" />
          </div>
          <div className="text-3xl font-bold text-wellq-dark dark:text-white">${totalMrr.toLocaleString()}</div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-wellq-green text-sm font-medium flex items-center gap-1">
              <ArrowUpRight size={14} /> {mrrData?.monthly_growth_percentage ?? 0}%
            </span>
            <span className="text-xs text-wellq-gray">{t('financials.vsLastMonth')}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-wellq-dark rounded-2xl p-6 shadow-sm border border-wellq-gray/20 dark:border-wellq-gray/30">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-wellq-gray">{t('financials.newBusiness')}</span>
            <TrendingUp size={18} className="text-wellq-green" />
          </div>
          <div className="text-3xl font-bold text-wellq-green">
            +${(breakdown?.new_business ?? 0).toLocaleString()}
          </div>
        </div>

        <div className="bg-white dark:bg-wellq-dark rounded-2xl p-6 shadow-sm border border-wellq-gray/20 dark:border-wellq-gray/30">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-wellq-gray">{t('financials.expansion')}</span>
            <ArrowUpRight size={18} className="text-wellq-cyan" />
          </div>
          <div className="text-3xl font-bold text-wellq-cyan">
            +${(breakdown?.expansion ?? 0).toLocaleString()}
          </div>
        </div>

        <div className="bg-white dark:bg-wellq-dark rounded-2xl p-6 shadow-sm border border-wellq-gray/20 dark:border-wellq-gray/30">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-wellq-gray">{t('financials.churnMrr')}</span>
            <TrendingDown size={18} className="text-red-400" />
          </div>
          <div className="text-3xl font-bold text-red-400">
            ${Math.abs(breakdown?.churn ?? 0).toLocaleString()}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <MRRChart apiBreakdown={breakdown} />
        <ChurnHeatmap apiRegions={churnRegions} />
      </div>

      {breakdown && (
        <div className="bg-white dark:bg-wellq-dark rounded-2xl p-6 shadow-sm border border-wellq-gray/20 dark:border-wellq-gray/30">
          <h3 className="font-semibold text-wellq-dark dark:text-white mb-4">{t('financials.mrrBreakdown')}</h3>
          <div className="space-y-3">
            {Object.entries(breakdown).map(([key, value]) => {
              const isNeg = value < 0;
              const safeTotal = totalMrr > 0 ? totalMrr : 1;
              return (
                <div key={key} className="flex items-center gap-4">
                  <span className="text-sm text-wellq-gray w-32">{breakdownLabels[key] ?? key}</span>
                  <div className="flex-1 h-2 bg-wellq-gray/10 dark:bg-wellq-dark/50 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-wellq-gray/20 dark:bg-wellq-gray/30"
                      style={{ width: `${Math.min((Math.abs(value) / safeTotal) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold w-20 text-right text-wellq-dark dark:text-white">
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