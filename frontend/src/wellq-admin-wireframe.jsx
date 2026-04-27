import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Building2, DollarSign, Cpu, BarChart3, Settings,
  Bell, Search, ChevronDown, ChevronRight, TrendingUp, TrendingDown,
  Users, Activity, AlertTriangle, CheckCircle, XCircle, Clock,
  MoreHorizontal, Filter, Download, Mail, Eye, ArrowUpRight, ArrowDownRight,
  Globe, Zap, Server, Smartphone, X, Calendar, RefreshCw,
  Database, Cloud, ToggleLeft, ToggleRight, Shield
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG API
// ─────────────────────────────────────────────────────────────────────────────
const API_BASE = 'http://localhost:8000';

const apiFetch = async (path) => {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTES BASE
// ─────────────────────────────────────────────────────────────────────────────

const Sparkline = ({ data, color = '#10b981', height = 24 }) => {
  const validData = data && data.length > 0 ? data : [0, 0, 0, 0, 0];
  const max = Math.max(...validData, 1);
  const min = Math.min(...validData);
  const range = max - min || 1;
  const width = 80;
  const points = validData.map((val, i) =>
    `${(i / (validData.length - 1)) * width},${height - ((val - min) / range) * (height - 4) - 2}`
  ).join(' ');
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline fill="none" stroke={color} strokeWidth="2" points={points} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const Skeleton = ({ className }) => (
  <div className={`animate-pulse bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%] rounded ${className}`}
       style={{ animation: 'shimmer 1.5s infinite' }} />
);

const KPICard = ({ title, value, trend, trendValue, sparkData, subtitle, loading }) => {
  const isPositive = trend === 'up';
  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <Skeleton className="h-4 w-24 mb-4" />
        <Skeleton className="h-10 w-32 mb-3" />
        <Skeleton className="h-3 w-20" />
      </div>
    );
  }
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md hover:border-slate-200 transition-all duration-300 group">
      <div className="flex items-start justify-between mb-2">
        <span className="text-sm font-medium text-slate-500 tracking-wide">{title}</span>
        <Sparkline data={sparkData} color={isPositive ? '#10b981' : '#ef4444'} />
      </div>
      <div className="flex items-baseline gap-3 mb-1">
        <span className="text-3xl font-bold text-slate-900 tracking-tight">{value}</span>
        <span className={`flex items-center gap-1 text-sm font-semibold ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
          {isPositive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
          {trendValue}
        </span>
      </div>
      <span className="text-xs text-slate-400">{subtitle}</span>
    </div>
  );
};

const HealthBadge = ({ score }) => {
  const getColor = (s) => {
    if (s >= 80) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (s >= 50) return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-red-100 text-red-700 border-red-200';
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getColor(score)}`}>
      {score}
    </span>
  );
};

const StatusBadge = ({ status }) => {
  const styles = {
    Active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Delinquent: 'bg-red-50 text-red-700 border-red-200',
    Onboarding: 'bg-blue-50 text-blue-700 border-blue-200',
    onboarding: 'bg-blue-50 text-blue-700 border-blue-200',
    Trial: 'bg-purple-50 text-purple-700 border-purple-200',
    'Esperando...': 'bg-slate-50 text-slate-700 border-slate-200',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${styles[status] || styles['Esperando...']}`}>
      {status}
    </span>
  );
};

const UtilizationBar = ({ used, total }) => {
  const pct = total > 0 ? (used / total) * 100 : 0;
  const color = pct >= 90 ? 'bg-red-500' : pct >= 75 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-500 font-medium whitespace-nowrap">{(used ?? 0).toLocaleString()}/{(total ?? 0).toLocaleString()}</span>
    </div>
  );
};

const SegmentedControl = ({ options, selected, onChange }) => (
  <div className="inline-flex p-1 bg-slate-100 rounded-lg">
    {options.map(opt => (
      <button
        key={opt}
        onClick={() => onChange(opt)}
        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
          selected === opt ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        {opt}
      </button>
    ))}
  </div>
);

const AlertItem = ({ icon: Icon, message, severity, title }) => {
  const colors = {
    critical: 'border-l-red-500 bg-red-50/50',
    high:     'border-l-red-500 bg-red-50/50',
    warning:  'border-l-amber-500 bg-amber-50/50',
    medium:   'border-l-amber-500 bg-amber-50/50',
    info:     'border-l-blue-500 bg-blue-50/50',
    low:      'border-l-blue-500 bg-blue-50/50',
  };
  const iconColors = {
    critical: 'text-red-500', high: 'text-red-500',
    warning:  'text-amber-500', medium: 'text-amber-500',
    info:     'text-blue-500', low: 'text-blue-500',
  };
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border-l-4 ${colors[severity] ?? colors.info} hover:brightness-95 transition-all cursor-pointer`}>
      <Icon size={18} className={iconColors[severity] ?? iconColors.info} />
      <div className="flex-1">
        {title && <div className="text-xs font-semibold text-slate-600 mb-0.5">{title}</div>}
        <span className="text-sm text-slate-900">{message}</span>
      </div>
      <ChevronRight size={16} className="text-slate-400" />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CLINIC ROW 
// ─────────────────────────────────────────────────────────────────────────────
const ClinicRow = ({ clinic, onSelect, selected, onImpersonate }) => (
  <tr
    className={`border-b border-slate-50 hover:bg-slate-50/80 transition-colors cursor-pointer ${selected ? 'bg-indigo-50/50' : ''}`}
    onClick={() => onSelect(clinic)}
  >
    <td className="py-4 px-4">
      <input type="checkbox" className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" onClick={e => e.stopPropagation()} />
    </td>
    <td className="py-4 px-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
          {(clinic.name ?? 'E').charAt(0)}
        </div>
        <div>
          <div className="font-semibold text-slate-900">{clinic.name ?? 'Esperando base de datos'}</div>
          <div className="text-xs text-slate-400">{clinic.clinic_id ?? clinic.id ?? 'Esperando...'}</div>
        </div>
      </div>
    </td>
    <td className="py-4 px-4">
      <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${
        (clinic.tier === 'Enterprise' || clinic.tier === 'enterprise') ? 'bg-purple-100 text-purple-700' :
        (clinic.tier === 'SMB' || clinic.tier === 'pro') ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
      }`}>
        {clinic.tier ?? 'Esperando...'}
      </span>
    </td>
    <td className="py-4 px-4"><StatusBadge status={clinic.status ?? 'Esperando...'} /></td>
    <td className="py-4 px-4 min-w-[180px]">
      <UtilizationBar
        used={clinic.patientsUsed ?? clinic.patient_count ?? 0}
        total={clinic.patientsLimit ?? 0}
      />
    </td>
    <td className="py-4 px-4"><HealthBadge score={clinic.healthScore ?? 0} /></td>
    <td className="py-4 px-4 text-sm text-slate-900">{clinic.lastLogin ?? 'Esperando conexión...'}</td>
    <td className="py-4 px-4">
      <div className="flex items-center gap-1">
        <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors" title="Manage">
          <Settings size={16} className="text-slate-400" />
        </button>
        <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors" title="View Invoices">
          <DollarSign size={16} className="text-slate-400" />
        </button>
        <button
          className="p-2 hover:bg-indigo-50 rounded-lg transition-colors group/imp"
          title="Impersonate"
          onClick={e => { e.stopPropagation(); onImpersonate && onImpersonate(clinic); }}
        >
          <Eye size={16} className="text-slate-400 group-hover/imp:text-indigo-500 transition-colors" />
        </button>
      </div>
    </td>
  </tr>
);

// ─────────────────────────────────────────────────────────────────────────────
// CLINIC DRAWER 
// ─────────────────────────────────────────────────────────────────────────────
const ClinicDrawer = ({ clinic, onClose }) => {
  const [subscription, setSubscription] = useState(null);
  const [license, setLicense]           = useState(null);
  const [usage, setUsage]               = useState(null);
  const [contact, setContact]           = useState(null);

  useEffect(() => {
    if (!clinic) return;
    const id = clinic.clinic_id ?? clinic.id;
    apiFetch(`/api/clinics/${id}/subscription`).then(d => setSubscription(d.subscription)).catch(() => {});
    apiFetch(`/api/clinics/${id}/license`).then(d => setLicense(d.licenses)).catch(() => {});
    apiFetch(`/api/clinics/${id}/usage`).then(d => setUsage(d.metrics)).catch(() => {});
    apiFetch(`/api/clinics/${id}/contact`).then(d => setContact(d)).catch(() => {});
  }, [clinic]);

  if (!clinic) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-[420px] bg-white shadow-2xl z-50 transform transition-transform duration-300 border-l border-slate-200">
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold">
              {(clinic.name ?? 'E').charAt(0)}
            </div>
            <div>
              <h2 className="font-bold text-lg text-slate-900">{clinic.name ?? 'Esperando base de datos'}</h2>
              <span className="text-sm text-slate-400">{clinic.clinic_id ?? clinic.id ?? 'Esperando...'}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-6">
          <section>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Contact Information</h3>
            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Decision Maker</span>
                <span className="text-sm font-medium text-slate-900">
                  {contact?.contact_info?.primary_name ?? 'Esperando conexión...'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Email</span>
                <span className="text-sm font-medium text-indigo-600">
                  {contact?.contact_info?.primary_email ?? `esperando@basededatos.com`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Phone</span>
                <span className="text-sm font-medium text-slate-900">
                  {contact?.contact_info?.primary_phone ?? '000000000'}
                </span>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Subscription Details</h3>
            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Plan</span>
                <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${
                  (subscription?.plan_name ?? clinic.tier) === 'Enterprise' || (subscription?.plan_name ?? '').includes('Enterprise')
                    ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'
                }`}>{subscription?.plan_name ?? clinic.tier ?? 'Esperando...'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Contract Value</span>
                <span className="text-sm font-bold text-slate-900">
                  {subscription ? `$${(subscription.mrr_value * 12).toLocaleString()}/yr` : '$0/yr'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Renewal Date</span>
                <span className="text-sm font-medium text-slate-900">
                  {subscription?.renews_at ? new Date(subscription.renews_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Esperando base de datos'}
                </span>
              </div>
              {subscription?.features_enabled?.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {subscription.features_enabled.map(f => (
                    <span key={f} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-xs rounded-full border border-indigo-100">{f}</span>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Usage Statistics</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100">
                <div className="text-2xl font-bold text-indigo-600">
                  {usage?.patient_sessions_completed?.toLocaleString() ?? '0'}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {usage ? 'Patient Sessions' : 'Esperando conexión...'}
                </div>
              </div>
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-100">
                <div className="text-2xl font-bold text-emerald-600">
                  {usage?.active_clinicians?.toLocaleString() ?? '0'}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {usage ? 'Active Clinicians' : 'Esperando conexión...'}
                </div>
              </div>
              {usage && (
                <>
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-100">
                    <div className="text-2xl font-bold text-amber-600">{(usage.ai_processing_minutes ?? 0).toLocaleString()}</div>
                    <div className="text-xs text-slate-500 mt-1">AI Minutes Used</div>
                  </div>
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
                    <div className="text-2xl font-bold text-slate-700">{(usage.api_calls ?? 0).toLocaleString()}</div>
                    <div className="text-xs text-slate-500 mt-1">API Calls</div>
                  </div>
                </>
              )}
            </div>
            {license && (
              <div className="mt-3 p-3 bg-slate-50 rounded-xl">
                <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                  <span>License Usage</span>
                  <span className="font-semibold text-slate-900">{license.currently_active?.toLocaleString() ?? 0} / {license.total_limit?.toLocaleString() ?? 0}</span>
                </div>
                <UtilizationBar used={license.currently_active ?? 0} total={license.total_limit ?? 0} />
                {license.warning_threshold_reached && (
                  <div className="flex items-center gap-1.5 text-amber-600 text-xs mt-2">
                    <AlertTriangle size={12} /> Warning threshold reached
                  </div>
                )}
              </div>
            )}
          </section>

          <section>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">AI Churn Prediction</h3>
            <div className={`rounded-xl p-4 border ${
              (clinic.healthScore ?? 0) >= 80 ? 'bg-emerald-50 border-emerald-200' :
              (clinic.healthScore ?? 0) >= 50 && clinic.healthScore !== 0 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {(clinic.healthScore ?? 0) >= 80 ? <CheckCircle size={18} className="text-emerald-600" /> :
                 (clinic.healthScore ?? 0) >= 50 && clinic.healthScore !== 0 ? <AlertTriangle size={18} className="text-amber-600" /> :
                 <AlertTriangle size={18} className="text-slate-400" />}
                <span className={`font-semibold ${
                  (clinic.healthScore ?? 0) >= 80 ? 'text-emerald-700' :
                  (clinic.healthScore ?? 0) >= 50 && clinic.healthScore !== 0 ? 'text-amber-700' : 'text-slate-500'
                }`}>
                  {clinic.healthScore ? 'Risk Assessment' : 'Esperando evaluación...'}
                </span>
              </div>
              <p className="text-sm text-slate-900">
                Esperando conexión con backend para predecir riesgo.
              </p>
            </div>
          </section>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50/50">
          <div className="flex gap-3">
            <button className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2">
              <Mail size={16} /> Contact Clinic
            </button>
            <button className="px-4 py-2.5 border border-slate-200 rounded-lg font-medium text-slate-700 hover:bg-slate-100 transition-colors">
              View Full Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MRR CHART
// ─────────────────────────────────────────────────────────────────────────────
const MRRChart = ({ apiBreakdown }) => {
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

  const maxVal = Math.max(...data.map(d => (d.new || 0) + (d.expansion || 0)), 100);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold text-slate-900">MRR Growth vs. Churn</h3>
          <p className="text-sm text-slate-400">Monthly breakdown of revenue changes</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500"></span> New</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-indigo-500"></span> Expansion</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-400"></span> Churn</span>
        </div>
      </div>
      <div className="flex items-end gap-4 h-48">
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex flex-col-reverse gap-0.5" style={{ height: '160px' }}>
              <div className="w-full bg-emerald-500 rounded-t transition-all duration-500 hover:brightness-110"
                   style={{ height: `${(d.new / maxVal) * 100}%` }} />
              <div className="w-full bg-indigo-500 rounded transition-all duration-500 hover:brightness-110"
                   style={{ height: `${(d.expansion / maxVal) * 100}%` }} />
            </div>
            <div className="w-full bg-red-400 rounded-b transition-all duration-500 hover:brightness-110"
                 style={{ height: `${(Math.abs(d.churn) / maxVal) * 40}px` }} />
            <span className="text-xs text-slate-400 mt-2">{d.month}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CHURN HEATMAP
// ─────────────────────────────────────────────────────────────────────────────
const ChurnHeatmap = ({ apiRegions }) => {
  const hardcoded = [
    { name: 'Esperando conexión...', clinics: 0, risk: 'low' }
  ];

  const regions = apiRegions
    ? apiRegions.map(r => ({
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
          <div key={i} className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group">
            <div className={`w-4 h-4 rounded-full bg-gradient-to-br border ${riskColors[r.risk] ?? riskColors.low}`} />
            <div className="flex-1">
              <div className="font-medium text-slate-800">{r.name}</div>
              <div className="text-xs text-slate-500">
                {r.clinics} clinics
                {r.mrrLoss ? ` · MRR at risk: $${r.mrrLoss.toLocaleString()}` : ''}
              </div>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize bg-slate-100 text-slate-500`}>
              {r.risk === 'low' ? 'Esperando...' : `${r.risk} risk`}
            </span>
            <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
          </div>
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PLATFORM OPS VIEW
// ─────────────────────────────────────────────────────────────────────────────
const PlatformOpsView = ({ apiCosts, apiLatency, apiPose }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-3 gap-6">
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
                  <span className={`w-2 h-2 rounded-full ${m.status === 'healthy' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="text-3xl font-bold text-slate-900">0ms</div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-slate-500 text-sm font-medium">Esperando conexión...</span>
            </div>
          </>
        )}
      </div>

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
          <div key={i} className="text-xs text-slate-500 mt-1 truncate">• {r.reason} ({r.percentage}%)</div>
        ))}
      </div>
    </div>

    <div className="grid grid-cols-2 gap-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-900 mb-4">Infrastructure Status</h3>
        <div className="space-y-3">
          {[
            { name: 'Esperando base de datos', status: 'idle' },
          ].map((s, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
              <div className="flex items-center gap-3">
                <Server size={16} className="text-slate-400" />
                <span className="text-sm text-slate-900">{s.name}</span>
              </div>
              <span className={`flex items-center gap-1.5 text-xs font-medium text-slate-500`}>
                <span className={`w-2 h-2 rounded-full bg-slate-300`} />
                Esperando...
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-900 mb-4">App Version Distribution</h3>
        <div className="space-y-3">
          {[
            { version: 'Esperando conexión...', pct: 0, color: 'bg-slate-300' },
          ].map((v, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-slate-900">{v.version}</span>
                <span className="text-slate-900 font-medium">{v.pct}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full ${v.color} rounded-full`} style={{ width: `${v.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
        <button className="mt-4 text-sm text-indigo-600 font-medium hover:text-indigo-700 flex items-center gap-1">
          View force update options <ChevronRight size={14} />
        </button>
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// OPERATIONAL STATUS VIEW
// ─────────────────────────────────────────────────────────────────────────────
const OperationalStatusView = ({ apiServers, apiProcesses }) => {
  const servers = apiServers ?? [
    { name: 'Esperando conexión...', status: 'idle', uptime: '0%', cpu: 0, memory: 0, region: 'N/A' }
  ];

  const processes = apiProcesses ?? [
    { name: 'Esperando conexión...', status: 'idle', jobs: 0, avgTime: '0s', pending: 0 }
  ];

  const normalizeServer = (s) => ({
    name: s.name,
    status: s.status === 'healthy' ? 'operational' : s.status,
    uptime: s.uptime,
    cpu: typeof s.cpu === 'string' ? parseInt(s.cpu) : (s.cpu ?? s.cpu_usage ? parseInt(s.cpu_usage) : 0),
    memory: typeof s.memory === 'number' ? s.memory : (s.ram_usage ? parseInt(s.ram_usage) : 0),
    region: s.region,
  });

  const normalizeProcess = (p) => ({
    name: p.name,
    status: p.status,
    jobs: p.queued_items ?? p.jobs ?? 0,
    avgTime: p.avgTime ?? '0s',
    pending: p.queued_items ?? p.pending ?? 0,
  });

  const normalizedServers = apiServers ? servers.map(normalizeServer) : servers;
  const normalizedProcesses = apiProcesses ? processes.map(normalizeProcess) : processes;

  const appUsage = {
    patientApp: { totalDownloads: 0, activeToday: 0, activeWeek: 0, activeMonth: 0, inactive: 0, version: { ios: 0, android: 0 } },
    clinicianTablet: { totalDownloads: 0, activeToday: 0, activeWeek: 0, activeMonth: 0, inactive: 0, version: { ios: 0, android: 0 } },
    webDashboard: { totalUsers: 0, activeToday: 0, activeWeek: 0, activeMonth: 0, inactive: 0 },
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'operational': case 'running': return 'text-emerald-600 bg-emerald-100';
      case 'degraded': case 'warning': return 'text-amber-600 bg-amber-100';
      case 'down': case 'error': case 'failed': return 'text-red-600 bg-red-100';
      case 'idle': return 'text-slate-500 bg-slate-100';
      case 'scheduled': case 'sleeping': return 'text-blue-600 bg-blue-100';
      default: return 'text-slate-500 bg-slate-100';
    }
  };

  const getStatusDot = (status) => {
    switch (status) {
      case 'operational': case 'running': case 'healthy': return 'bg-emerald-500';
      case 'degraded': case 'warning': return 'bg-amber-500 animate-pulse';
      case 'down': case 'error': case 'failed': return 'bg-red-500 animate-pulse';
      case 'idle': return 'bg-slate-400';
      case 'scheduled': case 'sleeping': return 'bg-blue-500';
      default: return 'bg-slate-400';
    }
  };

  const getLoadColor = (pct) => {
    if (pct === 0) return 'bg-slate-300';
    if (pct >= 85) return 'bg-red-500';
    if (pct >= 70) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-500">System Health</span>
            <div className="w-3 h-3 rounded-full bg-slate-300" />
          </div>
          <div className="text-3xl font-bold text-emerald-600">0.0%</div>
          <div className="text-xs text-slate-500 mt-1">Esperando conexión...</div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-500">Active Users Now</span>
            <Users size={18} className="text-slate-300" />
          </div>
          <div className="text-3xl font-bold text-indigo-600">0</div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-emerald-600 text-xs font-medium flex items-center gap-1">
              <ArrowUpRight size={12} /> 0%
            </span>
            <span className="text-xs text-slate-500">vs yesterday</span>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-500">Total Downloads</span>
            <Smartphone size={18} className="text-slate-300" />
          </div>
          <div className="text-3xl font-bold text-slate-900">0</div>
          <div className="text-xs text-slate-500 mt-1">Esperando base de datos</div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-500">Dormant Users</span>
            <Clock size={18} className="text-slate-300" />
          </div>
          <div className="text-3xl font-bold text-amber-600">0</div>
          <div className="text-xs text-slate-500 mt-1">Esperando base de datos</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-semibold text-slate-900">Server Infrastructure</h3>
            <p className="text-sm text-slate-400">Real-time server and database status</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {normalizedServers.map((server, i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition-all cursor-pointer group">
              <div className={`w-3 h-3 rounded-full ${getStatusDot(server.status)}`} />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-900 truncate">{server.name}</div>
                <div className="text-xs text-slate-500">{server.region} · {server.uptime} uptime</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xs text-slate-500">CPU</div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${getLoadColor(server.cpu)} rounded-full`} style={{ width: `${server.cpu}%` }} />
                    </div>
                    <span className="text-xs font-medium text-slate-900">{server.cpu}%</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500">MEM</div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${getLoadColor(server.memory)} rounded-full`} style={{ width: `${server.memory}%` }} />
                    </div>
                    <span className="text-xs font-medium text-slate-900">{server.memory}%</span>
                  </div>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-900">Background Processes</h3>
              <p className="text-sm text-slate-400">Workers and job queues</p>
            </div>
          </div>
          <div className="space-y-2">
            {normalizedProcesses.map((proc, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                <div className={`w-2 h-2 rounded-full ${getStatusDot(proc.status)}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900 truncate">{proc.name}</div>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${getStatusColor(proc.status)}`}>
                  {proc.status}
                </span>
                <div className="text-right text-xs text-slate-900 w-20">
                  <div>{(proc.jobs ?? 0).toLocaleString()} jobs</div>
                  <div className="text-slate-500">{(proc.pending ?? 0) > 0 ? `${proc.pending} pending` : 'No queue'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-900">App Usage Breakdown</h3>
              <p className="text-sm text-slate-400">Downloads vs active users</p>
            </div>
          </div>
          <div className="space-y-5">
            <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                    <Smartphone size={16} className="text-white" />
                  </div>
                  <span className="font-semibold text-slate-900">Patient App</span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-indigo-600">0</div>
                  <div className="text-xs text-slate-500">total downloads</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="bg-white/60 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-emerald-600">0</div>
                  <div className="text-xs text-slate-500">Active Today</div>
                </div>
                <div className="bg-white/60 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-blue-600">0</div>
                  <div className="text-xs text-slate-500">Active (30d)</div>
                </div>
                <div className="bg-white/60 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-amber-600">0</div>
                  <div className="text-xs text-slate-500">Inactive</div>
                </div>
              </div>
              <div className="h-2 bg-white/80 rounded-full overflow-hidden flex">
                <div className="bg-slate-300 h-full" style={{ width: `100%` }} />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
                    <Activity size={16} className="text-white" />
                  </div>
                  <span className="font-semibold text-slate-900">Clinician Tablet</span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-emerald-600">0</div>
                  <div className="text-xs text-slate-500">total downloads</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="bg-white/60 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-emerald-600">0</div>
                  <div className="text-xs text-slate-500">Active Today</div>
                </div>
                <div className="bg-white/60 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-blue-600">0</div>
                  <div className="text-xs text-slate-500">Active (30d)</div>
                </div>
                <div className="bg-white/60 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-amber-600">0</div>
                  <div className="text-xs text-slate-500">Inactive</div>
                </div>
              </div>
              <div className="h-2 bg-white/80 rounded-full overflow-hidden flex">
                <div className="bg-slate-300 h-full" style={{ width: `100%` }} />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center">
                    <LayoutDashboard size={16} className="text-white" />
                  </div>
                  <span className="font-semibold text-slate-900">Web Dashboard</span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-slate-900">0</div>
                  <div className="text-xs text-slate-500">registered users</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/60 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-emerald-600">0</div>
                  <div className="text-xs text-slate-500">Active Today</div>
                </div>
                <div className="bg-white/60 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-blue-600">0</div>
                  <div className="text-xs text-slate-500">Active (30d)</div>
                </div>
                <div className="bg-white/60 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-amber-600">0</div>
                  <div className="text-xs text-slate-500">Inactive</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// FINANCIALS VIEW
// ─────────────────────────────────────────────────────────────────────────────
const FinancialsView = ({ mrrData, churnRegions }) => {
  const breakdown = mrrData?.breakdown;
  const totalMrr  = mrrData?.total_mrr ?? 0;
  return (
    <div className="space-y-6">
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
          <div className="text-3xl font-bold text-emerald-600">+${(breakdown?.new_business ?? 0).toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-500">Expansion</span>
            <ArrowUpRight size={18} className="text-indigo-400" />
          </div>
          <div className="text-3xl font-bold text-indigo-600">+${(breakdown?.expansion ?? 0).toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-500">Churn MRR</span>
            <TrendingDown size={18} className="text-red-400" />
          </div>
          <div className="text-3xl font-bold text-red-500">${Math.abs(breakdown?.churn ?? 0).toLocaleString()}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <MRRChart apiBreakdown={breakdown} />
        <ChurnHeatmap apiRegions={churnRegions} />
      </div>

      {breakdown && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-900 mb-4">MRR Breakdown Detail</h3>
          <div className="space-y-3">
            {Object.entries(breakdown).map(([key, value]) => {
              const labels = { new_business: 'New Business', expansion: 'Expansion', contraction: 'Contraction', churn: 'Churn', retained: 'Retained' };
              const isNeg = value < 0;
              const safeTotal = totalMrr > 0 ? totalMrr : 1;
              return (
                <div key={key} className="flex items-center gap-4">
                  <span className="text-sm text-slate-600 w-32">{labels[key] ?? key}</span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full bg-slate-300`}
                         style={{ width: `${Math.min(Math.abs(value) / safeTotal * 100, 100)}%` }} />
                  </div>
                  <span className={`text-sm font-semibold w-20 text-right text-slate-900`}>
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

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS VIEW
// ─────────────────────────────────────────────────────────────────────────────
const AnalyticsView = ({ appStats, featureAdoption, adherence, cohorts, soapQuality, loading }) => {
  const patientApp = appStats?.patients;
  const tabletApp  = appStats?.tablet;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 col-span-2">
          <h3 className="font-semibold text-slate-900 mb-4">App Usage by Platform</h3>
          {loading ? <Skeleton className="h-32 w-full" /> : (
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Patient App — MAU', value: patientApp?.metrics?.monthly_active_users?.toLocaleString() ?? '0', color: 'text-indigo-600' },
                { label: 'Clinician Tablet — MAU', value: tabletApp?.metrics?.monthly_active_users?.toLocaleString() ?? '0', color: 'text-emerald-600' },
                { label: 'Avg session (patient)', value: `${patientApp?.metrics?.average_session_length_minutes ?? 0} min`, color: 'text-slate-900' },
                { label: 'Avg session (tablet)', value: `${tabletApp?.metrics?.average_session_length_minutes ?? 0} min`, color: 'text-slate-900' },
                { label: 'Crash-free (patient)', value: `${patientApp?.metrics?.crash_free_sessions_percentage ?? 0}%`, color: 'text-emerald-600' },
                { label: 'Crash-free (tablet)', value: `${tabletApp?.metrics?.crash_free_sessions_percentage ?? 0}%`, color: 'text-emerald-600' },
              ].map((item, i) => (
                <div key={i} className="bg-slate-50 rounded-xl p-4">
                  <div className="text-xs text-slate-500 mb-1">{item.label}</div>
                  <div className={`text-2xl font-bold ${item.color}`}>{item.value}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-900 mb-4">AI SOAP Quality</h3>
          {loading ? <Skeleton className="h-32 w-full" /> : (
            <>
              <div className="text-3xl font-bold text-emerald-600 mb-1">{soapQuality?.acceptance_rate_percentage ?? 0}%</div>
              <div className="text-xs text-slate-500 mb-3">Acceptance rate</div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Notes generated</span><span className="font-semibold text-slate-900">{(soapQuality?.total_notes_generated ?? 0).toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Require edits</span><span className="font-semibold text-amber-600">{soapQuality?.edits_required_percentage ?? 0}%</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Time saved</span><span className="font-semibold text-emerald-600">{soapQuality?.average_time_saved_minutes_per_note ?? 0} min/note</span></div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-900 mb-4">
          Feature Adoption <span className="text-xs font-normal text-slate-500 ml-2">Last 30 days</span>
        </h3>
        {loading ? <Skeleton className="h-24 w-full" /> : (
          <div className="space-y-4">
            {(featureAdoption?.data ?? [
              { feature_name: 'Esperando conexión con backend...', adoption_rate_percentage: 0, total_uses: 0, user_feedback_score: 0 }
            ]).map((f, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <span className="text-sm font-medium text-slate-900">{f.feature_name}</span>
                    <span className="ml-2 text-xs text-slate-500">{f.total_uses?.toLocaleString()} uses</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-amber-500">⭐ {f.user_feedback_score}</span>
                    <span className="text-sm font-bold text-indigo-600">{f.adoption_rate_percentage}%</span>
                  </div>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${f.adoption_rate_percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-900 mb-4">Global Exercise Adherence</h3>
          {loading ? <Skeleton className="h-32 w-full" /> : (
            <>
              <div className="text-4xl font-bold text-emerald-600 mb-1">{adherence?.overall_adherence_percentage ?? 0}%</div>
              <div className="text-xs text-slate-500 mb-4">Top drop-off: <span className="font-semibold text-red-500">{adherence?.top_dropping_point ?? 'Esperando...'}</span></div>
              <div className="space-y-2">
                {(adherence?.breakdown_by_week ?? [
                  { week: 'Week 1', adherence: 0 }
                ]).map((w, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 w-14">{w.week}</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${w.adherence}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-slate-900 w-10 text-right">{w.adherence}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-900 mb-4">Cohort Retention</h3>
          {loading ? <Skeleton className="h-32 w-full" /> : (
            <div className="space-y-4">
              {(cohorts?.data ?? [
                { cohort: 'Esperando...', users: 0, retention_by_month: { M1: 0, M2: 0, M3: 0, M4: 0 } }
              ]).map((c, i) => {
                const months = Object.entries(c.retention_by_month);
                return (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-slate-900">{c.cohort}</span>
                      <span className="text-xs text-slate-500">{c.users?.toLocaleString()} users</span>
                    </div>
                    <div className="flex gap-1">
                      {months.map(([m, pct], j) => (
                        <div key={j} className="flex-1 text-center">
                          <div className="h-8 rounded flex items-end justify-center" style={{ background: `rgba(99,102,241,${pct / 100})` }}>
                            <span className="text-xs font-semibold text-slate-900 pb-1">{pct}</span>
                          </div>
                          <span className="text-xs text-slate-500">{m}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS VIEW
// ─────────────────────────────────────────────────────────────────────────────
const SettingsView = ({ globalSettings, azureStatus, dbStatus, users, loading, onSaveSettings }) => {
  const [localSettings, setLocalSettings] = useState({});
  const toggleSetting = (key) => setLocalSettings(prev => ({ ...prev, [key]: !(localSettings[key] ?? globalSettings?.[key]) }));
  const hasChanges = Object.keys(localSettings).length > 0;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-900 mb-6">Global Platform Configuration</h3>
        {loading ? <Skeleton className="h-32 w-full" /> : (
          <div className="space-y-4">
            {[
              { key: 'maintenance_mode', label: 'Maintenance Mode', desc: 'Blocks clinic access to the system' },
              { key: 'enforce_2fa', label: 'Enforce 2FA', desc: 'Requires two-factor auth for all admins' },
            ].map(({ key, label, desc }) => {
              const val = localSettings[key] ?? globalSettings?.[key] ?? false;
              return (
                <div key={key} className="flex items-center justify-between p-4 rounded-xl bg-slate-50">
                  <div>
                    <div className="text-sm font-medium text-slate-900">{label}</div>
                    <div className="text-xs text-slate-500">{desc}</div>
                  </div>
                  <button onClick={() => toggleSetting(key)} className="flex items-center gap-2">
                    {val
                      ? <ToggleRight size={32} className="text-indigo-600" />
                      : <ToggleLeft size={32} className="text-slate-300" />}
                  </button>
                </div>
              );
            })}
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50">
              <div>
                <div className="text-sm font-medium text-slate-900">API Version</div>
                <div className="text-xs text-slate-500">Current backend version</div>
              </div>
              <span className="px-2.5 py-1 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full">{globalSettings?.api_version ?? '0.0.0'}</span>
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50">
              <div className="text-sm font-medium text-slate-900">Support Email</div>
              <span className="text-sm font-medium text-indigo-600">{globalSettings?.support_email ?? 'esperando@basededatos.com'}</span>
            </div>
            {hasChanges && (
              <button onClick={() => { onSaveSettings(localSettings); setLocalSettings({}); }}
                className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors">
                Save Changes
              </button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-4">
            <Cloud size={20} className="text-blue-500" />
            <h3 className="font-semibold text-slate-900">Azure Connection</h3>
          </div>
          {loading ? <Skeleton className="h-32 w-full" /> : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Status</span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700`}>
                  {azureStatus?.status ?? 'Esperando...'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Region</span>
                <span className="text-sm font-medium text-slate-900">{azureStatus?.region ?? 'Esperando conexión...'}</span>
              </div>
              {(azureStatus?.services ?? { key_vault: 'Esperando...', blob_storage: 'Esperando...', app_service: 'Esperando...' }) && Object.entries(azureStatus?.services ?? { key_vault: 'Esperando...', blob_storage: 'Esperando...', app_service: 'Esperando...' }).map(([svc, st]) => (
                <div key={svc} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <span className="text-xs text-slate-500 capitalize">{svc.replace(/_/g, ' ')}</span>
                  <span className={`flex items-center gap-1 text-xs font-medium text-slate-500`}>
                    <span className={`w-1.5 h-1.5 rounded-full bg-slate-300`} />
                    {st}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-4">
            <Database size={20} className="text-green-500" />
            <h3 className="font-semibold text-slate-900">Database</h3>
          </div>
          {loading ? <Skeleton className="h-32 w-full" /> : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Engine</span>
                <span className="text-sm font-medium text-slate-900">{dbStatus?.database ?? 'Esperando base de datos'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Status</span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700`}>
                  {dbStatus?.status ?? 'Esperando...'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Latency</span>
                <span className="text-sm font-bold text-emerald-600">{dbStatus?.latency_ms ?? 0} ms</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Collections</span>
                <span className="text-sm font-semibold text-slate-900">{dbStatus?.collections_count ?? 0}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Shield size={20} className="text-indigo-500" />
            <h3 className="font-semibold text-slate-900">System Users</h3>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
            + New User
          </button>
        </div>
        {loading ? <Skeleton className="h-24 w-full" /> : (
          <div className="space-y-2">
            {(users ?? [
              { user_id: 'USR-000', name: 'Esperando conexión...', role: 'N/A', status: 'Esperando...' }
            ]).map((u, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="w-9 h-9 rounded-full bg-slate-300 flex items-center justify-center text-white text-sm font-bold">
                  {(u.name ?? 'E').charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-900">{u.name}</div>
                  <div className="text-xs text-slate-500">{u.role}</div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700`}>
                  {u.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function WellQAdminConsole() {
  const [activeView, setActiveView]       = useState('overview');
  const [overviewTab, setOverviewTab]     = useState('business');
  const [clinicFilter, setClinicFilter]   = useState('All');
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [loading, setLoading]             = useState(true);
  const [dateRange, setDateRange]         = useState('30D');

  const [kpiArr,      setKpiArr]      = useState(null);
  const [kpiClinics,  setKpiClinics]  = useState(null);
  const [kpiPatients, setKpiPatients] = useState(null);
  const [kpiNrr,      setKpiNrr]      = useState(null);
  const [apiAlerts, setApiAlerts] = useState([]);

  const [apiClinics, setApiClinics]         = useState([]);
  const [clinicsLoading, setClinicsLoading] = useState(false);

  const [mrrData,      setMrrData]      = useState(null);
  const [churnRegions, setChurnRegions] = useState(null);

  const [apiServers,   setApiServers]   = useState(null);
  const [apiProcesses, setApiProcesses] = useState(null);
  const [apiCosts,     setApiCosts]     = useState(null);
  const [apiLatency,   setApiLatency]   = useState(null);
  const [apiPose,      setApiPose]      = useState(null);

  const [appStats,        setAppStats]       = useState({});
  const [featureAdoption,setFeatureAdoption]= useState(null);
  const [adherence,       setAdherence]      = useState(null);
  const [cohorts,         setCohorts]        = useState(null);
  const [soapQuality,     setSoapQuality]    = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const [globalSettings, setGlobalSettings] = useState(null);
  const [azureStatus,    setAzureStatus]    = useState(null);
  const [dbStatus,       setDbStatus]       = useState(null);
  const [sysUsers,       setSysUsers]       = useState(null);
  const [settingsLoading,setSettingsLoading]= useState(false);

  const hardcodedClinics = [
    { id: '000', name: 'Esperando base de datos', tier: 'Esperando...', status: 'Esperando...', patientsUsed: 0, patientsLimit: 0, healthScore: 0, lastLogin: 'Esperando...' }
  ];

  const clinics = apiClinics.length > 0 ? apiClinics : hardcodedClinics;

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1500); 
    Promise.allSettled([
      apiFetch('/api/kpis/arr'),          
      apiFetch('/api/kpis/clinics/active'), 
      apiFetch('/api/kpis/patients/total'), 
      apiFetch('/api/kpis/nrr'),            
      apiFetch('/api/alerts'),              
    ]).then(([arr, cls, pat, nrr, alt]) => {
      if (arr.status === 'fulfilled') setKpiArr(arr.value);
      if (cls.status === 'fulfilled') setKpiClinics(cls.value);
      if (pat.status === 'fulfilled') setKpiPatients(pat.value);
      if (nrr.status === 'fulfilled') setKpiNrr(nrr.value);
      if (alt.status === 'fulfilled') setApiAlerts(alt.value.data ?? []);
    });
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (activeView !== 'clinics') return;
    setClinicsLoading(true);
    apiFetch('/api/clinics') 
      .then(d => setApiClinics(d.data ?? []))
      .catch(() => {})
      .finally(() => setClinicsLoading(false));
  }, [activeView]);

  useEffect(() => {
    if (activeView !== 'financials') return;
    Promise.allSettled([
      apiFetch('/financials/mrr/breakdown'),        
      apiFetch('/financials/churn-risk/by-region'), 
    ]).then(([mrr, churn]) => {
      if (mrr.status   === 'fulfilled') setMrrData(mrr.value.data);
      if (churn.status === 'fulfilled') setChurnRegions(churn.value.data ?? []);
    });
  }, [activeView]);

  useEffect(() => {
    if (activeView !== 'platform') return;
    Promise.allSettled([
      apiFetch('/api/infrastructure/servers'),                
      apiFetch('/api/infrastructure/processes'),              
      apiFetch('/api/platform/ai/costs'),                     
      apiFetch('/api/platform/ai/latency'),                   
      apiFetch('/api/platform/ai/pose-analysis/success-rate'),
    ]).then(([srv, proc, costs, lat, pose]) => {
      if (srv.status   === 'fulfilled') setApiServers(srv.value.data ?? []);
      if (proc.status  === 'fulfilled') setApiProcesses(proc.value.data ?? []);
      if (costs.status === 'fulfilled') setApiCosts(costs.value);
      if (lat.status   === 'fulfilled') setApiLatency(lat.value);
      if (pose.status  === 'fulfilled') setApiPose(pose.value);
    });
  }, [activeView]);

  useEffect(() => {
    if (activeView !== 'analytics') return;
    setAnalyticsLoading(true);
    Promise.allSettled([
      apiFetch('/api/analytics/apps/patients'),    
      apiFetch('/api/analytics/apps/tablet'),      
      apiFetch('/api/analytics/features/adoption'),
      apiFetch('/api/analytics/adherence/global'), 
      apiFetch('/api/analytics/retention/cohorts'),
      apiFetch('/api/analytics/ai/soap-quality'),  
    ]).then(([pat, tab, feat, adh, coh, soap]) => {
      const s = {};
      if (pat.status  === 'fulfilled') s.patients = pat.value;
      if (tab.status  === 'fulfilled') s.tablet   = tab.value;
      setAppStats(s);
      if (feat.status === 'fulfilled') setFeatureAdoption(feat.value);
      if (adh.status  === 'fulfilled') setAdherence(adh.value);
      if (coh.status  === 'fulfilled') setCohorts(coh.value);
      if (soap.status === 'fulfilled') setSoapQuality(soap.value);
    }).finally(() => setAnalyticsLoading(false));
  }, [activeView]);

  useEffect(() => {
    if (activeView !== 'settings') return;
    setSettingsLoading(true);
    Promise.allSettled([
      apiFetch('/api/settings'),         
      apiFetch('/api/settings/azure'),   
      apiFetch('/api/settings/database'),
      apiFetch('/api/users'),            
    ]).then(([sett, azure, db, usrs]) => {
      if (sett.status  === 'fulfilled') setGlobalSettings(sett.value);
      if (azure.status === 'fulfilled') setAzureStatus(azure.value);
      if (db.status    === 'fulfilled') setDbStatus(db.value);
      if (usrs.status  === 'fulfilled') setSysUsers(usrs.value.data ?? []);
    }).finally(() => setSettingsLoading(false));
  }, [activeView]);

  const handleSaveSettings = async (updates) => {
    try {
      await fetch(`${API_BASE}/api/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      setGlobalSettings(prev => ({ ...prev, ...updates }));
    } catch (e) { console.error('Error saving settings:', e); }
  };

  const handleAcknowledgeAlert = async (alertId) => {
    try {
      await fetch(`${API_BASE}/api/alerts/${alertId}/acknowledge`, { method: 'POST' });
      setApiAlerts(prev => prev.filter(a => a.alert_id !== alertId));
    } catch (e) { console.error('Error acknowledging alert:', e); }
  };

  const handleImpersonate = async (clinic) => {
    const id = clinic.clinic_id ?? clinic.id;
    const reason = window.prompt(`Ingresa la razón para acceder a ${clinic.name} (mín. 10 caracteres):`);
    if (!reason || reason.length < 10) return;
    try {
      const res  = await fetch(`${API_BASE}/api/clinics/${id}/impersonate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`✅ Sesión de impersonación iniciada.\nSession ID: ${data.session_id}\nExpira: ${data.expires_at}`);
      }
    } catch (e) { console.error('Error impersonating:', e); }
  };

  const filteredClinics = clinics.filter(c => {
    if (clinicFilter === 'All') return true;
    if (clinicFilter === 'Active') return c.status === 'Active' || c.status === 'active';
    if (clinicFilter === 'At Risk') return (c.healthScore ?? 0) < 70 && (c.healthScore ?? 0) > 0;
    return true;
  });

  const fmtArr = (v) => {
    if (!v) return '$0'; 
    if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
    if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
    return `$${v}`;
  };
  const arrSpark = kpiArr?.trend_graph?.map(t => t.value) ?? [0, 0, 0, 0, 0, 0];

  const navItems = [
    { id: 'overview',  label: 'Overview',        icon: LayoutDashboard },
    { id: 'clinics',   label: 'Clinic Management',icon: Building2 },
    { id: 'financials',label: 'Financials',       icon: DollarSign },
    { id: 'platform',  label: 'Platform Ops',     icon: Cpu },
    { id: 'analytics', label: 'Product Analytics',icon: BarChart3 },
    { id: 'settings',  label: 'Settings',         icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap');
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      <aside className="w-64 bg-slate-900 text-white flex flex-col fixed h-full">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Activity size={22} className="text-white" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight">WellQ</span>
              <span className="text-xs text-slate-400 block">Admin Console</span>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4">
          {navItems.map(item => (
            <button key={item.id} onClick={() => setActiveView(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 transition-all duration-200 ${
                activeView === item.id ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}>
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-sm font-bold">JD</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">John Doe</div>
              <div className="text-xs text-slate-500 truncate">Super Admin</div>
            </div>
            <ChevronDown size={16} className="text-slate-500" />
          </div>
        </div>
      </aside>

      <main className="flex-1 ml-64">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
          <div className="flex items-center justify-between px-8 py-4">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-slate-900">
                {navItems.find(n => n.id === activeView)?.label}
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
                {['24H', '7D', '30D', 'QTD', 'YTD'].map(range => (
                  <button key={range} onClick={() => setDateRange(range)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                      dateRange === range ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}>{range}</button>
                ))}
              </div>
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Search clinics, invoices..."
                  className="pl-10 pr-4 py-2 bg-slate-100 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all" />
              </div>
              <button className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <Bell size={20} className="text-slate-600" />
                {apiAlerts.length > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
                )}
              </button>
              <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors" onClick={() => window.location.reload()}>
                <RefreshCw size={20} className="text-slate-600" />
              </button>
            </div>
          </div>
        </header>

        <div className="p-8">
          {activeView === 'overview' && (
            <div className="space-y-6">
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-fit">
                <button onClick={() => setOverviewTab('business')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                    overviewTab === 'business' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}>
                  <TrendingUp size={16} />
                  Business Health
                </button>
                <button onClick={() => setOverviewTab('operational')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                    overviewTab === 'operational' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}>
                  <Server size={16} />
                  Operational Status
                </button>
              </div>

              {overviewTab === 'business' && (
                <>
                  <div className="grid grid-cols-4 gap-6">
                    <KPICard
                      title="ARR"
                      value={fmtArr(kpiArr?.current_arr)}           
                      trend="up"
                      trendValue="+0%"
                      sparkData={arrSpark}
                      subtitle={kpiArr ? `MRR: ${fmtArr(kpiArr.current_arr / 12)}` : 'Esperando conexión...'}
                      loading={loading}
                    />
                    <KPICard
                      title="Active Clinics"
                      value={kpiClinics ? String(kpiClinics.total_active) : '0'}  
                      trend="up"
                      trendValue={kpiClinics ? `+${kpiClinics.new_clinics_month}` : '+0'}
                      sparkData={[0, 0, 0, 0, 0, kpiClinics?.total_active ?? 0]}
                      subtitle={kpiClinics ? `${kpiClinics.new_clinics_month} onboarded · ${kpiClinics.churned_clinics_month} churned` : '0 onboarded · 0 churned'}
                      loading={loading}
                    />
                    <KPICard
                      title="Total Patients"
                      value={kpiPatients ? kpiPatients.total_patients.toLocaleString() : '0'}  
                      trend="up"
                      trendValue={kpiPatients ? `+${kpiPatients.new_this_week} this week` : '+0%'}
                      sparkData={[0, 0, 0, 0, 0, kpiPatients?.total_patients ?? 0]}
                      subtitle={kpiPatients ? `${kpiPatients.active_in_treatment?.toLocaleString()} in treatment` : 'Avg 0 per clinic'}
                      loading={loading}
                    />
                    <KPICard
                      title="Net Revenue Retention"
                      value={kpiNrr ? `${kpiNrr.nrr_percentage}%` : '0%'}  
                      trend={kpiNrr?.nrr_percentage >= 100 ? 'up' : 'down'}
                      trendValue={kpiNrr ? `Exp: $${kpiNrr.expansion_mrr?.toLocaleString()}` : '+0%'}
                      sparkData={[0, 0, 0, 0, 0, kpiNrr?.nrr_percentage ?? 0]}
                      subtitle={kpiNrr?.status === 'healthy' ? 'Esperando datos...' : 'Esperando base de datos'}
                      loading={loading}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <MRRChart apiBreakdown={mrrData?.breakdown} />
                    <ChurnHeatmap apiRegions={churnRegions} />
                  </div>

                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-slate-900">
                        Needs Attention
                        {apiAlerts.length > 0 && (
                          <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-600 text-xs font-bold rounded-full">{apiAlerts.length}</span>
                        )}
                      </h3>
                      <span className="text-xs text-slate-400">Updated recently</span>
                    </div>
                    <div className="space-y-2">
                      {apiAlerts.length > 0
                        ? apiAlerts.map(alert => (
                            <div key={alert.alert_id} className="relative group">
                              <AlertItem
                                icon={alert.severity === 'high' || alert.severity === 'critical' ? AlertTriangle : Bell}
                                message={alert.message}
                                title={alert.title}
                                severity={alert.severity}
                              />
                              <button
                                onClick={() => handleAcknowledgeAlert(alert.alert_id)}
                                className="absolute right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-600 hover:bg-slate-50">
                                Mark read
                              </button>
                            </div>
                          ))
                        : (
                          <>
                            <AlertItem icon={AlertTriangle} message="Esperando conexión con backend..." severity="info" />
                            <AlertItem icon={Zap} message="Esperando base de datos..." severity="info" />
                          </>
                        )
                      }
                    </div>
                  </div>
                </>
              )}

              {overviewTab === 'operational' && (
                <OperationalStatusView apiServers={apiServers} apiProcesses={apiProcesses} />
              )}
            </div>
          )}

          {activeView === 'clinics' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <SegmentedControl options={['All', 'Active', 'At Risk', 'Churned']} selected={clinicFilter} onChange={setClinicFilter} />
                <div className="flex items-center gap-3">
                  <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 hover:bg-slate-50 transition-colors">
                    <Filter size={16} /> Filters
                  </button>
                  <button
                    onClick={() => apiFetch('/api/clinics/export?format=csv').then(d => window.open(d.download_url)).catch(() => {})}
                    className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 hover:bg-slate-50 transition-colors">
                    <Download size={16} /> Export
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
                    <Mail size={16} /> Bulk Email
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-100 sticky top-0">
                    <tr>
                      <th className="py-4 px-4 text-left w-12">
                        <input type="checkbox" className="rounded border-slate-300 text-indigo-600" />
                      </th>
                      <th className="py-4 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Clinic</th>
                      <th className="py-4 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Plan</th>
                      <th className="py-4 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="py-4 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">License Usage</th>
                      <th className="py-4 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Health</th>
                      <th className="py-4 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Last Login</th>
                      <th className="py-4 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clinicsLoading
                      ? [...Array(4)].map((_, i) => (
                          <tr key={i} className="border-b border-slate-50">
                            <td colSpan={8} className="py-3 px-4"><Skeleton className="h-8 w-full" /></td>
                          </tr>
                        ))
                      : filteredClinics.map(clinic => (
                          <ClinicRow
                            key={clinic.clinic_id ?? clinic.id}
                            clinic={clinic}
                            onSelect={setSelectedClinic}
                            selected={selectedClinic?.clinic_id === clinic.clinic_id || selectedClinic?.id === clinic.id}
                            onImpersonate={handleImpersonate}
                          />
                        ))
                    }
                  </tbody>
                </table>

                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                  <span className="text-sm text-slate-500">Showing {filteredClinics.length > 0 ? '1' : '0'}-{filteredClinics.length} of {filteredClinics.length} clinics</span>
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-500 hover:bg-white transition-colors disabled:opacity-50" disabled>Previous</button>
                    <button className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium">1</button>
                    <button className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 hover:bg-white transition-colors disabled:opacity-50" disabled>Next</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeView === 'platform' && (
            <PlatformOpsView apiCosts={apiCosts} apiLatency={apiLatency} apiPose={apiPose} />
          )}

          {activeView === 'financials' && (
            <FinancialsView mrrData={mrrData} churnRegions={churnRegions} />
          )}

          {activeView === 'analytics' && (
            <AnalyticsView
              appStats={appStats}
              featureAdoption={featureAdoption}
              adherence={adherence}
              cohorts={cohorts}
              soapQuality={soapQuality}
              loading={analyticsLoading}
            />
          )}

          {activeView === 'settings' && (
            <SettingsView
              globalSettings={globalSettings}
              azureStatus={azureStatus}
              dbStatus={dbStatus}
              users={sysUsers}
              loading={settingsLoading}
              onSaveSettings={handleSaveSettings}
            />
          )}

        </div>
      </main>

      {selectedClinic && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setSelectedClinic(null)} />
          <ClinicDrawer clinic={selectedClinic} onClose={() => setSelectedClinic(null)} />
        </>
      )}
    </div>
  );
}