import React, { useEffect, useState } from 'react';

const formatCurrency = (val) => {
  if (val >= 1000) return `$${(val / 1000).toFixed(1)}k`;
  return `$${val}`;
};

export const MRRChart = () => {
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/financials/mrr/snapshots');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setSnapshots(json.data ?? []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const latest = snapshots[snapshots.length - 1] ?? null;
  const totalMRR = latest?.total_mrr ?? 0;
  const growth   = latest?.monthly_growth_percentage ?? null;
  const churn    = latest?.churn ?? 0;

  const maxVal = Math.max(
    ...snapshots.map((d) => (d.new_business ?? 0) + (d.expansion ?? 0)),
    100
  );

  return (
    <div className="bg-white dark:bg-wellq-dark rounded-2xl p-6 shadow-sm border border-wellq-gray/20 dark:border-wellq-gray/30">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold text-wellq-dark dark:text-white">MRR Growth vs. Churn</h3>
          <p className="text-sm text-wellq-gray">Monthly breakdown of revenue changes</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-wellq-green" /> New
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-wellq-cyan" /> Expansion
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-red-400" /> Churn
          </span>
        </div>
      </div>

      {!loading && !error && latest && (
        <div className="flex items-center gap-6 mb-5">
          <div>
            <p className="text-xs text-wellq-gray mb-0.5">MRR Total</p>
            <p className="text-xl font-bold text-wellq-dark dark:text-white">{formatCurrency(totalMRR)}</p>
          </div>
          {growth !== null && (
            <div>
              <p className="text-xs text-wellq-gray mb-0.5">Crecimiento mensual</p>
              <p className={`text-xl font-bold ${growth >= 0 ? 'text-wellq-green' : 'text-red-500'}`}>
                {growth >= 0 ? '+' : ''}{growth.toFixed(1)}%
              </p>
            </div>
          )}
          <div>
            <p className="text-xs text-wellq-gray mb-0.5">Churn</p>
            <p className="text-xl font-bold text-red-400">
              {formatCurrency(Math.abs(churn))}
            </p>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center h-48">
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-wellq-cyan border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-wellq-gray">Cargando datos…</span>
          </div>
        </div>
      )}

      {!loading && error && (
        <div className="flex items-center justify-center h-48">
          <p className="text-sm text-red-400">Error al cargar: {error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="flex items-end gap-2 h-48 overflow-x-auto">
          {snapshots.map((d, i) => (
            <div key={i} className="flex-1 min-w-[40px] flex flex-col items-center gap-1">
              <div className="relative group w-full">
                <div className="absolute -top-16 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-10 pointer-events-none">
                  <div className="bg-wellq-dark text-white text-xs rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-lg">
                    <div className="text-wellq-green">New: {formatCurrency(d.new_business ?? 0)}</div>
                    <div className="text-wellq-cyan">Exp: {formatCurrency(d.expansion ?? 0)}</div>
                    <div className="text-red-400">Churn: {formatCurrency(Math.abs(d.churn ?? 0))}</div>
                  </div>
                  <div className="w-2 h-2 bg-wellq-dark rotate-45 -mt-1" />
                </div>

                <div className="w-full flex flex-col-reverse gap-0.5" style={{ height: '160px' }}>
                  <div
                    className="w-full rounded-t transition-all duration-700 bg-wellq-green hover:brightness-110"
                    style={{ height: `${((d.new_business ?? 0) / maxVal) * 100}%` }}
                  />
                  <div
                    className="w-full rounded transition-all duration-700 bg-wellq-cyan hover:brightness-110"
                    style={{ height: `${((d.expansion ?? 0) / maxVal) * 100}%` }}
                  />
                </div>
              </div>

              <div
                className="w-full rounded-b transition-all duration-700 bg-red-400 hover:brightness-110"
                style={{ height: `${(Math.abs(d.churn ?? 0) / maxVal) * 40}px` }}
              />

              <span className="text-xs mt-2 text-wellq-gray font-medium">
                {d.period_month}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};