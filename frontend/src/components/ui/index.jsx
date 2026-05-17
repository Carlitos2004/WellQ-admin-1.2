import React from 'react';
import { ArrowUpRight, ArrowDownRight, ChevronRight } from 'lucide-react';

export const Sparkline = ({ data, color = '#10b981', height = 24 }) => {
  const validData = data && data.length > 0 ? data : [0, 0, 0, 0, 0];
  const max = Math.max(...validData, 1);
  const min = Math.min(...validData);
  const range = max - min || 1;
  const width = 80;
  const points = validData
    .map((val, i) =>
      `${(i / (validData.length - 1)) * width},${height - ((val - min) / range) * (height - 4) - 2}`
    )
    .join(' ');
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        points={points}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export const Skeleton = ({ className }) => (
  <div
    className={`animate-pulse bg-gradient-to-r from-wellq-gray/20 via-wellq-gray/10 to-wellq-gray/20 bg-[length:200%_100%] rounded ${className}`}
    style={{ animation: 'shimmer 1.5s infinite' }}
  />
);

export const KPICard = ({ title, value, trend, trendValue, sparkData, subtitle, loading }) => {
  const isPositive = trend === 'up';
  if (loading) {
    return (
      <div className="bg-white dark:bg-wellq-dark rounded-2xl p-6 shadow-sm border border-wellq-gray/20 dark:border-wellq-gray/30">
        <Skeleton className="h-4 w-24 mb-4" />
        <Skeleton className="h-10 w-32 mb-3" />
        <Skeleton className="h-3 w-20" />
      </div>
    );
  }
  return (
    <div className="bg-white dark:bg-wellq-dark rounded-2xl p-6 shadow-sm border border-wellq-gray/20 dark:border-wellq-gray/30 hover:shadow-md hover:border-wellq-cyan/30 dark:hover:border-wellq-cyan/40 transition-all duration-300 group">
      <div className="flex items-start justify-between mb-2">
        <span className="text-sm font-medium text-wellq-gray dark:text-wellq-gray/80 tracking-wide">{title}</span>
        <Sparkline data={sparkData} color={isPositive ? '#1fed92' : '#ef4444'} />
      </div>
      <div className="flex items-baseline gap-3 mb-1">
        <span className="text-3xl font-bold text-wellq-dark dark:text-white tracking-tight">{value}</span>
        <span
          className={`flex items-center gap-1 text-sm font-semibold ${
            isPositive ? 'text-wellq-green' : 'text-red-500'
          }`}
        >
          {isPositive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
          {trendValue}
        </span>
      </div>
      <span className="text-xs text-wellq-gray dark:text-wellq-gray/80">{subtitle}</span>
    </div>
  );
};

export const HealthBadge = ({ score }) => {
  const getColor = (s) => {
    if (s >= 80) return 'bg-wellq-green/10 text-wellq-green border-wellq-green/20';
    if (s >= 50) return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-red-100 text-red-700 border-red-200';
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getColor(score)}`}
    >
      {score}
    </span>
  );
};

export const StatusBadge = ({ status }) => {
  const styles = {
    Active: 'bg-wellq-green/10 text-wellq-green border-wellq-green/20',
    active: 'bg-wellq-green/10 text-wellq-green border-wellq-green/20',
    Delinquent: 'bg-red-50 text-red-700 border-red-200',
    Onboarding: 'bg-wellq-cyan/10 text-wellq-cyan border-wellq-cyan/20',
    onboarding: 'bg-wellq-cyan/10 text-wellq-cyan border-wellq-cyan/20',
    Trial: 'bg-purple-50 text-purple-700 border-purple-200',
    'Esperando...': 'bg-wellq-gray/10 text-wellq-dark dark:text-white border-wellq-gray/20',
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
        styles[status] || styles['Esperando...']
      }`}
    >
      {status}
    </span>
  );
};

export const UtilizationBar = ({ used, total }) => {
  const pct = total > 0 ? (used / total) * 100 : 0;
  const color =
    pct >= 90 ? 'bg-red-500' : pct >= 75 ? 'bg-amber-500' : 'bg-wellq-green';
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-wellq-gray/10 dark:bg-wellq-dark/50 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-wellq-gray dark:text-wellq-gray/80 font-medium whitespace-nowrap">
        {(used ?? 0).toLocaleString()}/{(total ?? 0).toLocaleString()}
      </span>
    </div>
  );
};

export const SegmentedControl = ({ options, selected, onChange }) => (
  <div className="inline-flex p-1 bg-wellq-gray/10 dark:bg-wellq-dark/60 rounded-lg">
    {options.map((opt) => (
      <button
        key={opt}
        onClick={() => onChange(opt)}
        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
          selected === opt
            ? 'bg-white dark:bg-wellq-dark/80 text-wellq-dark dark:text-white shadow-sm'
            : 'text-wellq-gray dark:text-wellq-gray/80 hover:text-wellq-dark dark:hover:text-white'
        }`}
      >
        {opt}
      </button>
    ))}
  </div>
);

export const AlertItem = ({ icon: Icon, message, severity, title }) => {
  const colors = {
    critical: 'border-l-red-500 bg-red-50/50 dark:bg-red-900/20',
    high: 'border-l-red-500 bg-red-50/50 dark:bg-red-900/20',
    warning: 'border-l-amber-500 bg-amber-50/50 dark:bg-amber-900/20',
    medium: 'border-l-amber-500 bg-amber-50/50 dark:bg-amber-900/20',
    info: 'border-l-blue-500 bg-blue-50/50 dark:bg-blue-900/20',
    low: 'border-l-blue-500 bg-blue-50/50 dark:bg-blue-900/20',
  };
  const iconColors = {
    critical: 'text-red-500',
    high: 'text-red-500',
    warning: 'text-amber-500',
    medium: 'text-amber-500',
    info: 'text-blue-500',
    low: 'text-blue-500',
  };
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border-l-4 ${
        colors[severity] ?? colors.info
      } hover:brightness-95 transition-all cursor-pointer`}
    >
      <Icon size={18} className={iconColors[severity] ?? iconColors.info} />
      <div className="flex-1">
        {title && (
          <div className="text-xs font-semibold text-wellq-dark dark:text-white mb-0.5">{title}</div>
        )}
        <span className="text-sm text-wellq-dark dark:text-white">{message}</span>
      </div>
      <ChevronRight size={16} className="text-wellq-gray dark:text-wellq-gray/80" />
    </div>
  );
};