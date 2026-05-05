import React, { useState } from 'react';
import {
  Users, Smartphone, Building2, Activity, FileText, TrendingUp, Zap,
  HardDrive, Calendar, Download, Database, Headphones, Globe,
  DollarSign, Package, Plus, Trash2, GripVertical, Edit3, Copy,
  Archive, Save, Tag, Box, Layers, Search, X, CheckCircle
} from 'lucide-react';
import { SegmentedControl } from '../components/ui';

// ─── Constants ────────────────────────────────────────────────────────────────
const DEFAULT_FEATURES = [
  { id: 'feat-patients',   category: 'Patients & Licenses',    icon: Users,      name: 'Active Patients',      unit: 'patients',     unitType: 'number', defaultLimit: 500,    description: 'Maximum number of concurrent active patients' },
  { id: 'feat-clinicians', category: 'Patients & Licenses',    icon: Users,      name: 'Clinician Seats',      unit: 'seats',        unitType: 'number', defaultLimit: 5,      description: 'Number of clinician licenses included' },
  { id: 'feat-tablets',    category: 'Patients & Licenses',    icon: Smartphone, name: 'Tablet Devices',       unit: 'devices',      unitType: 'number', defaultLimit: 3,      description: 'Connected clinician tablet devices' },
  { id: 'feat-locations',  category: 'Patients & Licenses',    icon: Building2,  name: 'Clinic Locations',     unit: 'locations',    unitType: 'number', defaultLimit: 1,      description: 'Number of physical locations under one account' },
  { id: 'feat-pose',       category: 'AI Capabilities',        icon: Activity,   name: 'Pose Analysis',        unit: 'sessions/mo',  unitType: 'number', defaultLimit: 1000,   description: 'AI-powered movement & pose analysis sessions' },
  { id: 'feat-soap',       category: 'AI Capabilities',        icon: FileText,   name: 'SOAP Note Generation', unit: 'notes/mo',     unitType: 'number', defaultLimit: 500,    description: 'Auto-generated clinical SOAP notes' },
  { id: 'feat-churn',      category: 'AI Capabilities',        icon: TrendingUp, name: 'Churn Prediction',     unit: 'enabled',      unitType: 'toggle', defaultLimit: 1,      description: 'AI-driven patient/clinic churn risk insights' },
  { id: 'feat-video',      category: 'AI Capabilities',        icon: Zap,        name: 'Video Processing',     unit: 'minutes/mo',   unitType: 'number', defaultLimit: 600,    description: 'Cloud video session processing minutes' },
  { id: 'feat-storage',    category: 'Storage & Data',         icon: HardDrive,  name: 'Cloud Storage',        unit: 'GB',           unitType: 'number', defaultLimit: 100,    description: 'Patient records and media storage' },
  { id: 'feat-retention',  category: 'Storage & Data',         icon: Calendar,   name: 'Data Retention',       unit: 'months',       unitType: 'number', defaultLimit: 24,     description: 'How long historical records are kept' },
  { id: 'feat-exports',    category: 'Storage & Data',         icon: Download,   name: 'Data Exports',         unit: 'exports/mo',   unitType: 'number', defaultLimit: 10,     description: 'Bulk data export operations per month' },
  { id: 'feat-backup',     category: 'Storage & Data',         icon: Database,   name: 'Daily Backups',        unit: 'enabled',      unitType: 'toggle', defaultLimit: 1,      description: 'Automated encrypted daily backups' },
  { id: 'feat-support',    category: 'Support & Integrations', icon: Headphones, name: 'Support Tier',         unit: 'level',        unitType: 'select', options: ['Email', 'Business Hours', '24/7 Priority'], defaultLimit: 'Email', description: 'Customer support response level' },
  { id: 'feat-ehr',        category: 'Support & Integrations', icon: Globe,      name: 'EHR Integration',      unit: 'integrations', unitType: 'number', defaultLimit: 1,      description: 'Connections to external EHR systems' },
  { id: 'feat-api',        category: 'Support & Integrations', icon: Zap,        name: 'API Rate Limit',       unit: 'req/min',      unitType: 'number', defaultLimit: 60,     description: 'Public API requests per minute' },
  { id: 'feat-webhooks',   category: 'Support & Integrations', icon: Globe,      name: 'Webhooks',             unit: 'enabled',      unitType: 'toggle', defaultLimit: 0,      description: 'Real-time event webhooks' },
];

const DEFAULT_PLANS = [
  { id: 'plan-trial', name: 'Trial', tagColor: 'purple', status: 'Active', description: '14-day free evaluation tier', setupPrice: 0, monthlyPrice: 0, effectiveDate: '2026-01-01', features: [{ featureId: 'feat-patients', limit: 50 }, { featureId: 'feat-clinicians', limit: 2 }, { featureId: 'feat-pose', limit: 100 }, { featureId: 'feat-storage', limit: 5 }, { featureId: 'feat-support', limit: 'Email' }] },
  { id: 'plan-smb', name: 'SMB', tagColor: 'blue', status: 'Active', description: 'Small & medium clinics', setupPrice: 500, monthlyPrice: 299, effectiveDate: '2026-01-01', features: [{ featureId: 'feat-patients', limit: 500 }, { featureId: 'feat-clinicians', limit: 5 }, { featureId: 'feat-tablets', limit: 3 }, { featureId: 'feat-pose', limit: 1000 }, { featureId: 'feat-soap', limit: 500 }, { featureId: 'feat-storage', limit: 100 }, { featureId: 'feat-retention', limit: 24 }, { featureId: 'feat-support', limit: 'Business Hours' }, { featureId: 'feat-api', limit: 60 }] },
  { id: 'plan-enterprise', name: 'Enterprise', tagColor: 'indigo', status: 'Active', description: 'Multi-location and hospital networks', setupPrice: 5000, monthlyPrice: 1999, effectiveDate: '2026-01-01', features: [{ featureId: 'feat-patients', limit: 5000 }, { featureId: 'feat-clinicians', limit: 50 }, { featureId: 'feat-tablets', limit: 30 }, { featureId: 'feat-locations', limit: 10 }, { featureId: 'feat-pose', limit: 20000 }, { featureId: 'feat-soap', limit: 10000 }, { featureId: 'feat-churn', limit: 1 }, { featureId: 'feat-video', limit: 12000 }, { featureId: 'feat-storage', limit: 2000 }, { featureId: 'feat-retention', limit: 84 }, { featureId: 'feat-exports', limit: 200 }, { featureId: 'feat-backup', limit: 1 }, { featureId: 'feat-support', limit: '24/7 Priority' }, { featureId: 'feat-ehr', limit: 5 }, { featureId: 'feat-api', limit: 600 }, { featureId: 'feat-webhooks', limit: 1 }] },
];

const CATEGORY_COLORS = {
  'Patients & Licenses':    { bg: 'bg-indigo-50',  text: 'text-indigo-700',  iconBg: 'bg-indigo-100',  iconText: 'text-indigo-600' },
  'AI Capabilities':        { bg: 'bg-purple-50',  text: 'text-purple-700',  iconBg: 'bg-purple-100',  iconText: 'text-purple-600' },
  'Storage & Data':         { bg: 'bg-emerald-50', text: 'text-emerald-700', iconBg: 'bg-emerald-100', iconText: 'text-emerald-600' },
  'Support & Integrations': { bg: 'bg-amber-50',   text: 'text-amber-700',   iconBg: 'bg-amber-100',   iconText: 'text-amber-600' },
};

const PLAN_TAG_COLORS = {
  purple: 'bg-purple-100 text-purple-700',
  blue:   'bg-blue-100 text-blue-700',
  indigo: 'bg-indigo-100 text-indigo-700',
  slate:  'bg-slate-100 text-slate-700',
};

// ─── FeatureChip ──────────────────────────────────────────────────────────────
const FeatureChip = ({ feature, alreadyAdded }) => {
  const Icon = feature.icon;
  const colors = CATEGORY_COLORS[feature.category] || CATEGORY_COLORS['Patients & Licenses'];
  return (
    <div
      draggable={!alreadyAdded}
      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'copy'; e.dataTransfer.setData('text/plain', feature.id); }}
      className={`flex items-center gap-3 p-3 rounded-xl border bg-white transition-all select-none ${
        alreadyAdded ? 'opacity-50 cursor-not-allowed border-slate-100' : 'cursor-grab hover:border-indigo-300 hover:shadow-sm active:cursor-grabbing border-slate-200'
      }`}
    >
      <GripVertical size={14} className="text-slate-300 shrink-0" />
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors.iconBg}`}>
        <Icon size={16} className={colors.iconText} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-slate-800 truncate">{feature.name}</div>
        <div className="text-xs text-slate-400 truncate">{feature.unit}</div>
      </div>
      {alreadyAdded && <CheckCircle size={14} className="text-emerald-500 shrink-0" />}
    </div>
  );
};

// ─── PlanFeatureRow ───────────────────────────────────────────────────────────
const PlanFeatureRow = ({ feature, limit, onChangeLimit, onRemove }) => {
  const Icon = feature.icon;
  const colors = CATEGORY_COLORS[feature.category] || CATEGORY_COLORS['Patients & Licenses'];

  const renderInput = () => {
    if (feature.unitType === 'toggle') {
      const enabled = !!Number(limit);
      return (
        <button onClick={() => onChangeLimit(enabled ? 0 : 1)}
          className={`relative inline-flex items-center w-11 h-6 rounded-full transition-colors ${enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}>
          <span className={`inline-block w-5 h-5 rounded-full bg-white shadow transform transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      );
    }
    if (feature.unitType === 'select') {
      return (
        <select value={limit} onChange={(e) => onChangeLimit(e.target.value)}
          className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
          {feature.options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    }
    return (
      <div className="flex items-center gap-2">
        <input type="number" min="0" value={limit} onChange={(e) => onChangeLimit(Number(e.target.value))}
          className="w-24 px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-right font-medium" />
        <span className="text-xs text-slate-400 whitespace-nowrap min-w-[64px]">{feature.unit}</span>
      </div>
    );
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-all group">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colors.iconBg}`}>
        <Icon size={16} className={colors.iconText} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-slate-800">{feature.name}</div>
        <div className="text-xs text-slate-400 truncate">{feature.description}</div>
      </div>
      {renderInput()}
      <button onClick={onRemove}
        className="p-2 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
        title="Remove">
        <Trash2 size={16} />
      </button>
    </div>
  );
};

// ─── PlanBuilder ──────────────────────────────────────────────────────────────
const PlanBuilder = ({ plan, features, onSave, onCancel }) => {
  const [draft, setDraft] = useState(plan);
  const [search, setSearch] = useState('');
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => { setDraft(plan); }, [plan]);

  const featuresById = Object.fromEntries(features.map((f) => [f.id, f]));
  const addedIds = new Set(draft.features.map((f) => f.featureId));

  const grouped = features
    .filter((f) => f.name.toLowerCase().includes(search.toLowerCase()) || f.category.toLowerCase().includes(search.toLowerCase()))
    .reduce((acc, f) => { acc[f.category] = acc[f.category] || []; acc[f.category].push(f); return acc; }, {});

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const fid = e.dataTransfer.getData('text/plain');
    if (!fid || addedIds.has(fid)) return;
    const f = featuresById[fid]; if (!f) return;
    setDraft((d) => ({ ...d, features: [...d.features, { featureId: fid, limit: f.defaultLimit }] }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1 min-w-0">
            <input type="text" value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="Plan name" className="w-full text-2xl font-bold text-slate-900 placeholder-slate-300 bg-transparent border-none focus:outline-none p-0 mb-2" />
            <input type="text" value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              placeholder="Short description" className="w-full text-sm text-slate-500 placeholder-slate-300 bg-transparent border-none focus:outline-none p-0" />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={onCancel} className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
            <button onClick={() => onSave(draft)} disabled={!draft.name || draft.features.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
              <Save size={16} /> Save Plan
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Catalog sidebar */}
        <aside className="col-span-4 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col" style={{ minHeight: '600px' }}>
          <div className="p-5 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900 mb-1">Feature Catalog</h3>
            <p className="text-xs text-slate-400 mb-3">Drag features into the plan canvas →</p>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search features..." className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4 space-y-5">
            {Object.entries(grouped).map(([category, items]) => {
              const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS['Patients & Licenses'];
              return (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${colors.bg} ${colors.text}`}>{category}</span>
                    <span className="text-xs text-slate-400">{items.length}</span>
                  </div>
                  <div className="space-y-2">
                    {items.map((f) => <FeatureChip key={f.id} feature={f} alreadyAdded={addedIds.has(f.id)} />)}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Canvas */}
        <section className="col-span-8 space-y-6">
          <div onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop}
            className={`bg-white rounded-2xl shadow-sm border-2 transition-all ${dragOver ? 'border-indigo-400 border-dashed bg-indigo-50/30' : 'border-slate-100'}`}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div>
                <h3 className="font-semibold text-slate-900">Plan Canvas</h3>
                <p className="text-xs text-slate-400">{draft.features.length} feature{draft.features.length !== 1 ? 's' : ''} included</p>
              </div>
              {draft.features.length > 0 && (
                <button onClick={() => setDraft((d) => ({ ...d, features: [] }))}
                  className="text-xs text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1">
                  <X size={14} /> Clear all
                </button>
              )}
            </div>
            <div className="p-5 space-y-2 min-h-[300px]">
              {draft.features.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mb-3">
                    <Package size={26} className="text-indigo-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-600">Drag features here to build your plan</p>
                  <p className="text-xs text-slate-400 mt-1">Each feature comes with a configurable usage limit</p>
                </div>
              ) : (
                draft.features.map((pf) => {
                  const f = featuresById[pf.featureId]; if (!f) return null;
                  return (
                    <PlanFeatureRow key={pf.featureId} feature={f} limit={pf.limit}
                      onChangeLimit={(v) => setDraft((d) => ({ ...d, features: d.features.map((x) => x.featureId === pf.featureId ? { ...x, limit: v } : x) }))}
                      onRemove={() => setDraft((d) => ({ ...d, features: d.features.filter((x) => x.featureId !== pf.featureId) }))}
                    />
                  );
                })
              )}
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <DollarSign size={18} className="text-slate-400" /> Pricing & Activation
            </h3>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Setup Price', key: 'setupPrice', suffix: '', prefix: '$', hint: 'One-time onboarding fee' },
                { label: 'Monthly Price', key: 'monthlyPrice', suffix: '/mo', prefix: '$', hint: 'Recurring subscription' },
              ].map(({ label, key, suffix, prefix, hint }) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{label}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{prefix}</span>
                    <input type="number" min="0" value={draft[key]}
                      onChange={(e) => setDraft((d) => ({ ...d, [key]: Number(e.target.value) }))}
                      className="w-full pl-7 pr-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-900" />
                    {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">{suffix}</span>}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{hint}</p>
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Effective Date</label>
                <div className="relative">
                  <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="date" value={draft.effectiveDate}
                    onChange={(e) => setDraft((d) => ({ ...d, effectiveDate: e.target.value }))}
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900" />
                </div>
              </div>
            </div>
            <div className="mt-5 pt-5 border-t border-slate-100 grid grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100">
                <div className="text-xs text-slate-500 mb-1">First-year revenue (1 client)</div>
                <div className="text-2xl font-bold text-indigo-600">
                  ${(draft.setupPrice + draft.monthlyPrice * 12).toLocaleString()}
                </div>
              </div>
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-100">
                <div className="text-xs text-slate-500 mb-1">ARR per client</div>
                <div className="text-2xl font-bold text-emerald-600">
                  ${(draft.monthlyPrice * 12).toLocaleString()}
                </div>
              </div>
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
                <div className="text-xs text-slate-500 mb-1">Features included</div>
                <div className="text-2xl font-bold text-slate-700">{draft.features.length}</div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

// ─── PlansLibrary ─────────────────────────────────────────────────────────────
const PlansLibrary = ({ plans, features, onEdit, onDuplicate, onArchive, onNew }) => {
  const featuresById = Object.fromEntries(features.map((f) => [f.id, f]));
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Plans Library</h2>
          <p className="text-sm text-slate-500">All plans available for new and existing clinics</p>
        </div>
        <button onClick={onNew} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
          <Plus size={16} /> New Plan
        </button>
      </div>
      <div className="grid grid-cols-3 gap-6">
        {plans.map((plan) => {
          const tagColor = PLAN_TAG_COLORS[plan.tagColor] || PLAN_TAG_COLORS.slate;
          return (
            <div key={plan.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-all flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${tagColor}`}>{plan.name}</span>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {plan.status}
                </span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-1">{plan.name}</h3>
              <p className="text-sm text-slate-500 mb-4 min-h-[40px]">{plan.description}</p>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-3xl font-bold text-slate-900">${plan.monthlyPrice.toLocaleString()}</span>
                <span className="text-sm text-slate-400">/mo</span>
                {plan.setupPrice > 0 && <span className="text-xs text-slate-400 ml-2">+ ${plan.setupPrice.toLocaleString()} setup</span>}
              </div>
              <div className="border-t border-slate-100 pt-4 mb-4 flex-1">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Includes {plan.features.length} features</div>
                <div className="space-y-1.5 max-h-[140px] overflow-auto">
                  {plan.features.slice(0, 5).map((pf) => {
                    const f = featuresById[pf.featureId]; if (!f) return null;
                    return (
                      <div key={pf.featureId} className="flex items-center justify-between text-xs">
                        <span className="text-slate-600 truncate">{f.name}</span>
                        <span className="text-slate-400 font-medium ml-2 shrink-0">
                          {typeof pf.limit === 'number' ? pf.limit.toLocaleString() : pf.limit} {f.unitType !== 'select' && f.unitType !== 'toggle' ? f.unit : ''}
                        </span>
                      </div>
                    );
                  })}
                  {plan.features.length > 5 && <div className="text-xs text-indigo-600 font-medium">+ {plan.features.length - 5} more</div>}
                </div>
              </div>
              <div className="flex items-center gap-1 pt-3 border-t border-slate-100">
                <button onClick={() => onEdit(plan)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 rounded-lg text-xs font-medium transition-colors">
                  <Edit3 size={14} /> Edit
                </button>
                <button onClick={() => onDuplicate(plan)} className="flex items-center justify-center px-3 py-2 hover:bg-slate-100 text-slate-500 rounded-lg transition-colors" title="Duplicate">
                  <Copy size={14} />
                </button>
                <button onClick={() => onArchive(plan)} className="flex items-center justify-center px-3 py-2 hover:bg-slate-100 text-slate-500 rounded-lg transition-colors" title="Archive">
                  <Archive size={14} />
                </button>
              </div>
            </div>
          );
        })}
        <button onClick={onNew} className="bg-white rounded-2xl border-2 border-dashed border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all p-6 flex flex-col items-center justify-center min-h-[400px] group">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 group-hover:bg-indigo-100 flex items-center justify-center mb-3 transition-colors">
            <Plus size={26} className="text-slate-400 group-hover:text-indigo-600" />
          </div>
          <span className="text-sm font-semibold text-slate-700">Create new plan</span>
          <span className="text-xs text-slate-400 mt-1">Start from a blank canvas</span>
        </button>
      </div>
    </div>
  );
};

// ─── FeatureCatalog ───────────────────────────────────────────────────────────
const FeatureCatalog = ({ features, onAdd, onEdit, onDelete }) => {
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('All');
  const categories = ['All', ...new Set(features.map((f) => f.category))];
  const filtered = features.filter(
    (f) =>
      (cat === 'All' || f.category === cat) &&
      (f.name.toLowerCase().includes(search.toLowerCase()) || f.description.toLowerCase().includes(search.toLowerCase()))
  );
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Feature Catalog</h2>
          <p className="text-sm text-slate-500">All features available to drag into plans</p>
        </div>
        <button onClick={onAdd} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
          <Plus size={16} /> Add Feature
        </button>
      </div>
      <div className="flex items-center justify-between gap-4">
        <SegmentedControl options={categories} selected={cat} onChange={setCat} />
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search features..."
            className="pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              {['Feature', 'Category', 'Unit', 'Type', 'Default', 'Actions'].map((h) => (
                <th key={h} className="py-4 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((f) => {
              const Icon = f.icon;
              const colors = CATEGORY_COLORS[f.category] || CATEGORY_COLORS['Patients & Licenses'];
              return (
                <tr key={f.id} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colors.iconBg}`}>
                        <Icon size={16} className={colors.iconText} />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">{f.name}</div>
                        <div className="text-xs text-slate-400 max-w-md truncate">{f.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4"><span className={`px-2.5 py-1 rounded-md text-xs font-medium ${colors.bg} ${colors.text}`}>{f.category}</span></td>
                  <td className="py-4 px-4 text-sm text-slate-600">{f.unit}</td>
                  <td className="py-4 px-4"><span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 capitalize">{f.unitType}</span></td>
                  <td className="py-4 px-4 text-sm text-slate-700 font-medium">{typeof f.defaultLimit === 'number' ? f.defaultLimit.toLocaleString() : f.defaultLimit}</td>
                  <td className="py-4 px-4">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => onEdit(f)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors"><Edit3 size={16} className="text-slate-400" /></button>
                      <button onClick={() => onDelete(f)} className="p-2 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors"><Trash2 size={16} className="text-slate-400" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan="6" className="py-16 text-center text-sm text-slate-400">No features match the current filters</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Main export ──────────────────────────────────────────────────────────────
export const PlansView = () => {
  const [tab, setTab] = useState('library');
  const [features, setFeatures] = useState(DEFAULT_FEATURES);
  const [plans, setPlans] = useState(DEFAULT_PLANS);
  const [editingPlan, setEditingPlan] = useState(null);

  const newBlank = () => ({
    id: `plan-${Date.now()}`, name: '', description: '', tagColor: 'slate', status: 'Draft',
    setupPrice: 0, monthlyPrice: 0, effectiveDate: new Date().toISOString().split('T')[0], features: [],
  });

  const startNew = () => { setEditingPlan(newBlank()); setTab('builder'); };
  const startEdit = (plan) => { setEditingPlan({ ...plan, features: [...plan.features] }); setTab('builder'); };
  const startDuplicate = (plan) => { setEditingPlan({ ...plan, id: `plan-${Date.now()}`, name: `${plan.name} (Copy)`, status: 'Draft', features: [...plan.features] }); setTab('builder'); };
  const archivePlan = (plan) => setPlans((ps) => ps.map((p) => p.id === plan.id ? { ...p, status: 'Archived' } : p));
  const savePlan = (draft) => {
    setPlans((ps) => { const exists = ps.find((p) => p.id === draft.id); return exists ? ps.map((p) => p.id === draft.id ? draft : p) : [...ps, { ...draft, status: 'Active' }]; });
    setEditingPlan(null); setTab('library');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        {[
          { id: 'library', label: 'Plans Library', icon: Layers },
          { id: 'builder', label: 'Plan Builder', icon: Box },
          { id: 'catalog', label: 'Feature Catalog', icon: Tag },
        ].map(({ id, label, icon: Icon }) => (
          <button key={id}
            onClick={() => { if (id === 'builder' && !editingPlan) setEditingPlan(newBlank()); if (id !== 'builder') setEditingPlan(null); setTab(id); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${tab === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {tab === 'library' && <PlansLibrary plans={plans} features={features} onEdit={startEdit} onDuplicate={startDuplicate} onArchive={archivePlan} onNew={startNew} />}
      {tab === 'builder' && editingPlan && <PlanBuilder plan={editingPlan} features={features} onSave={savePlan} onCancel={() => { setEditingPlan(null); setTab('library'); }} />}
      {tab === 'catalog' && (
        <FeatureCatalog features={features}
          onAdd={() => alert('Open feature creation modal')}
          onEdit={(f) => alert(`Edit feature: ${f.name}`)}
          onDelete={(f) => { if (confirm(`Delete "${f.name}"?`)) setFeatures((fs) => fs.filter((x) => x.id !== f.id)); }}
        />
      )}
    </div>
  );
};

// Fix: useEffect import needed in PlanBuilder
import { useEffect } from 'react';
