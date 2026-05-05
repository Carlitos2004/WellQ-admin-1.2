import React from 'react';

export const MRRChart = ({ apiBreakdown }) => {
  const hardcoded = [
    { month: 'Esp.', new: 0, expansion: 0, churn: 0 },
    { month: 'Esp.', new: 0, expansion: 0, churn: 0 },
    { month: 'Esp.', new: 0, expansion: 0, churn: 0 },
    { month: 'Esp.', new: 0, expansion: 0, churn: 0 },
    { month: 'Esp.', new: 0, expansion: 0, churn: 0 },
    { month: 'Esp.', new: 0, expansion: 0, churn: 0 },
  ];

  const data = apiBreakdown
    ? [
        ...hardcoded.slice(0, 5),
        {
          month: 'Cur',
          new: apiBreakdown.new_business ?? 0,
          expansion: apiBreakdown.expansion ?? 0,
          churn: apiBreakdown.churn ?? 0,
        },
      ]
    : hardcoded;

  const maxVal = Math.max(...data.map((d) => (d.new || 0) + (d.expansion || 0)), 100);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold text-slate-900">MRR Growth vs. Churn</h3>
          <p className="text-sm text-slate-400">Monthly breakdown of revenue changes</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-500" /> New
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-indigo-500" /> Expansion
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-red-400" /> Churn
          </span>
        </div>
      </div>
      <div className="flex items-end gap-4 h-48">
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex flex-col-reverse gap-0.5" style={{ height: '160px' }}>
              <div
                className="w-full bg-emerald-500 rounded-t transition-all duration-500 hover:brightness-110"
                style={{ height: `${(d.new / maxVal) * 100}%` }}
              />
              <div
                className="w-full bg-indigo-500 rounded transition-all duration-500 hover:brightness-110"
                style={{ height: `${(d.expansion / maxVal) * 100}%` }}
              />
            </div>
            <div
              className="w-full bg-red-400 rounded-b transition-all duration-500 hover:brightness-110"
              style={{ height: `${(Math.abs(d.churn) / maxVal) * 40}px` }}
            />
            <span className="text-xs text-slate-400 mt-2">{d.month}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
