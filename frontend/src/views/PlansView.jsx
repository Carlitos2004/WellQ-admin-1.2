import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Smartphone, Building2, Activity, FileText, TrendingUp, Zap,
  HardDrive, Calendar, Download, Database, Headphones, Globe,
  DollarSign, Package, Plus, Trash2, GripVertical, Edit3, Copy,
  Archive, Save, Tag, Box, Layers, Search, X, CheckCircle,
  AlertCircle, Loader2, RefreshCw,
} from 'lucide-react';
import { SegmentedControl } from '../components/ui';

const API = 'http://localhost:8000';

// ─── Icon map (feature.icon viene como string desde la API) ───────────────────
const ICON_COMPONENTS = {
  Users, Smartphone, Building2, Activity, FileText, TrendingUp, Zap,
  HardDrive, Calendar, Download, Database, Headphones, Globe,
};
const getIcon = (iconStr) =>
  ICON_COMPONENTS[iconStr] || ICON_COMPONENTS[iconStr?.charAt(0)?.toUpperCase() + iconStr?.slice(1)] || Zap;

// ─── Colores por categoría ────────────────────────────────────────────────────
const CATEGORY_COLORS = {
  'Patients & Licenses':    { bg: 'bg-indigo-50',  text: 'text-indigo-700',  iconBg: 'bg-indigo-100',  iconText: 'text-indigo-600' },
  'AI Capabilities':        { bg: 'bg-purple-50',  text: 'text-purple-700',  iconBg: 'bg-purple-100',  iconText: 'text-purple-600' },
  'Storage & Data':         { bg: 'bg-emerald-50', text: 'text-emerald-700', iconBg: 'bg-emerald-100', iconText: 'text-emerald-600' },
  'Support & Integrations': { bg: 'bg-amber-50',   text: 'text-amber-700',   iconBg: 'bg-amber-100',   iconText: 'text-amber-600' },
};
const catColors = (cat) => CATEGORY_COLORS[cat] || CATEGORY_COLORS['Support & Integrations'];

const PLAN_TAG_COLORS = {
  purple: 'bg-purple-100 text-purple-700',
  blue:   'bg-blue-100 text-blue-700',
  indigo: 'bg-indigo-100 text-indigo-700',
  slate:  'bg-slate-100 text-slate-700',
};

// ─── API helpers ──────────────────────────────────────────────────────────────
const apiFetch = async (path, opts = {}) => {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

// ─── Hook: features ───────────────────────────────────────────────────────────
const useFeatures = () => {
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch('/api/features');
      setFeatures(data.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  return { features, loading, error, reload: load, setFeatures };
};

// ─── Hook: plans ─────────────────────────────────────────────────────────────
const usePlans = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch('/api/plans?includeArchived=false&pageSize=100');
      setPlans(data.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  return { plans, loading, error, reload: load };
};

// ─── Componentes de estado ────────────────────────────────────────────────────
const LoadingSpinner = ({ text = 'Cargando...' }) => (
  <div className="flex flex-col items-center justify-center py-24 gap-3">
    <Loader2 className="animate-spin text-indigo-500" size={32} />
    <p className="text-sm text-slate-500">{text}</p>
  </div>
);

const ErrorBanner = ({ message, onRetry }) => (
  <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
    <AlertCircle size={18} />
    <span className="flex-1 text-sm">Error al cargar datos: {message}</span>
    {onRetry && (
      <button onClick={onRetry} className="flex items-center gap-1 text-xs font-medium underline">
        <RefreshCw size={14} /> Reintentar
      </button>
    )}
  </div>
);

// ─── FeatureChip ──────────────────────────────────────────────────────────────
const FeatureChip = ({ feature, alreadyAdded }) => {
  const Icon = getIcon(feature.icon);
  const colors = catColors(feature.category);
  return (
    <div
      draggable={!alreadyAdded}
      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'copy'; e.dataTransfer.setData('text/plain', feature.id); }}
      className={`flex items-center gap-3 p-3 rounded-xl border bg-white transition-all select-none ${
        alreadyAdded
          ? 'opacity-50 cursor-not-allowed border-slate-100'
          : 'cursor-grab hover:border-indigo-300 hover:shadow-sm active:cursor-grabbing border-slate-200'
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
  const Icon = getIcon(feature.icon);
  const colors = catColors(feature.category);

  const renderInput = () => {
    if (feature.unitType === 'toggle') {
      const enabled = !!Number(limit);
      return (
        <button
          onClick={() => onChangeLimit(enabled ? 0 : 1)}
          className={`relative inline-flex items-center w-11 h-6 rounded-full transition-colors ${enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
        >
          <span className={`inline-block w-5 h-5 rounded-full bg-white shadow transform transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      );
    }
    if (feature.unitType === 'select') {
      return (
        <select
          value={limit}
          onChange={(e) => onChangeLimit(e.target.value)}
          className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        >
          {(feature.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    }
    return (
      <div className="flex items-center gap-2">
        <input
          type="number" min="0" value={limit}
          onChange={(e) => onChangeLimit(Number(e.target.value))}
          className="w-24 px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-right font-medium"
        />
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
      <button
        onClick={onRemove}
        className="p-2 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
        title="Remove"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
};

// ─── PlanBuilder ──────────────────────────────────────────────────────────────
const PlanBuilder = ({ plan, features, onSave, onCancel, saving }) => {
  const [draft, setDraft] = useState(plan);
  const [search, setSearch] = useState('');
  const [dragOver, setDragOver] = useState('');

  useEffect(() => { setDraft(plan); }, [plan]);

  const featuresById = Object.fromEntries(features.map((f) => [f.id, f]));
  const addedIds = new Set(draft.features.map((f) => f.featureId));

  const grouped = features
    .filter((f) =>
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.category.toLowerCase().includes(search.toLowerCase())
    )
    .reduce((acc, f) => {
      acc[f.category] = acc[f.category] || [];
      acc[f.category].push(f);
      return acc;
    }, {});

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const fid = e.dataTransfer.getData('text/plain');
    if (!fid || addedIds.has(fid)) return;
    const f = featuresById[fid]; if (!f) return;
    setDraft((d) => ({
      ...d,
      features: [...d.features, { featureId: fid, limit: f.defaultLimit ?? 0 }],
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1 min-w-0">
            <input
              type="text" value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="Plan name"
              className="w-full text-2xl font-bold text-slate-900 placeholder-slate-300 bg-transparent border-none focus:outline-none p-0 mb-2"
            />
            <input
              type="text" value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              placeholder="Short description"
              className="w-full text-sm text-slate-500 placeholder-slate-300 bg-transparent border-none focus:outline-none p-0"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={onCancel} className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">
              Cancel
            </button>
            <button
              onClick={() => onSave(draft)}
              disabled={!draft.name || draft.features.length === 0 || saving}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? 'Guardando...' : 'Save Plan'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Sidebar catálogo */}
        <aside className="col-span-4 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col" style={{ minHeight: '600px' }}>
          <div className="p-5 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900 mb-1">Feature Catalog</h3>
            <p className="text-xs text-slate-400 mb-3">Drag features into the plan canvas →</p>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text" value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search features..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4 space-y-5">
            {Object.entries(grouped).map(([category, items]) => {
              const colors = catColors(category);
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
            {features.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-8">No hay features disponibles</p>
            )}
          </div>
        </aside>

        {/* Canvas */}
        <section className="col-span-8 space-y-6">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`bg-white rounded-2xl shadow-sm border-2 transition-all ${dragOver ? 'border-indigo-400 border-dashed bg-indigo-50/30' : 'border-slate-100'}`}
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div>
                <h3 className="font-semibold text-slate-900">Plan Canvas</h3>
                <p className="text-xs text-slate-400">{draft.features.length} feature{draft.features.length !== 1 ? 's' : ''} included</p>
              </div>
              {draft.features.length > 0 && (
                <button
                  onClick={() => setDraft((d) => ({ ...d, features: [] }))}
                  className="text-xs text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1"
                >
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
                  const f = featuresById[pf.featureId];
                  if (!f) return null;
                  return (
                    <PlanFeatureRow
                      key={pf.featureId}
                      feature={f}
                      limit={pf.limit}
                      onChangeLimit={(v) => setDraft((d) => ({
                        ...d,
                        features: d.features.map((x) => x.featureId === pf.featureId ? { ...x, limit: v } : x),
                      }))}
                      onRemove={() => setDraft((d) => ({
                        ...d,
                        features: d.features.filter((x) => x.featureId !== pf.featureId),
                      }))}
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
                    <input
                      type="number" min="0" value={draft[key]}
                      onChange={(e) => setDraft((d) => ({ ...d, [key]: Number(e.target.value) }))}
                      className="w-full pl-7 pr-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-900"
                    />
                    {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">{suffix}</span>}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{hint}</p>
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Effective Date</label>
                <div className="relative">
                  <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="date" value={draft.effectiveDate || ''}
                    onChange={(e) => setDraft((d) => ({ ...d, effectiveDate: e.target.value }))}
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900"
                  />
                </div>
              </div>
            </div>
            <div className="mt-5 pt-5 border-t border-slate-100 grid grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100">
                <div className="text-xs text-slate-500 mb-1">First-year revenue (1 client)</div>
                <div className="text-2xl font-bold text-indigo-600">
                  ${((draft.setupPrice || 0) + (draft.monthlyPrice || 0) * 12).toLocaleString()}
                </div>
              </div>
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-100">
                <div className="text-xs text-slate-500 mb-1">ARR per client</div>
                <div className="text-2xl font-bold text-emerald-600">
                  ${((draft.monthlyPrice || 0) * 12).toLocaleString()}
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
const PlansLibrary = ({ plans, features, onEdit, onDuplicate, onArchive, onNew, loading, error, onReload }) => {
  const featuresById = Object.fromEntries(features.map((f) => [f.id, f]));

  if (loading) return <LoadingSpinner text="Cargando planes..." />;
  if (error) return <ErrorBanner message={error} onRetry={onReload} />;

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

      {plans.length === 0 && (
        <div className="py-24 text-center text-slate-400 text-sm">No hay planes. Crea el primero.</div>
      )}

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
                <span className="text-3xl font-bold text-slate-900">${(plan.monthlyPrice || 0).toLocaleString()}</span>
                <span className="text-sm text-slate-400">/mo</span>
                {plan.setupPrice > 0 && (
                  <span className="text-xs text-slate-400 ml-2">+ ${plan.setupPrice.toLocaleString()} setup</span>
                )}
              </div>
              <div className="border-t border-slate-100 pt-4 mb-4 flex-1">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Includes {plan.features.length} features
                </div>
                <div className="space-y-1.5 max-h-[140px] overflow-auto">
                  {plan.features.slice(0, 5).map((pf) => {
                    const f = featuresById[pf.featureId];
                    if (!f) return null;
                    return (
                      <div key={pf.featureId} className="flex items-center justify-between text-xs">
                        <span className="text-slate-600 truncate">{f.name}</span>
                        <span className="text-slate-400 font-medium ml-2 shrink-0">
                          {typeof pf.limit === 'number' ? pf.limit.toLocaleString() : pf.limit}
                          {f.unitType !== 'select' && f.unitType !== 'toggle' ? ` ${f.unit}` : ''}
                        </span>
                      </div>
                    );
                  })}
                  {plan.features.length > 5 && (
                    <div className="text-xs text-indigo-600 font-medium">+ {plan.features.length - 5} more</div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 pt-3 border-t border-slate-100">
                <button
                  onClick={() => onEdit(plan)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 rounded-lg text-xs font-medium transition-colors"
                >
                  <Edit3 size={14} /> Edit
                </button>
                <button
                  onClick={() => onDuplicate(plan)}
                  className="flex items-center justify-center px-3 py-2 hover:bg-slate-100 text-slate-500 rounded-lg transition-colors"
                  title="Duplicate"
                >
                  <Copy size={14} />
                </button>
                <button
                  onClick={() => onArchive(plan)}
                  className="flex items-center justify-center px-3 py-2 hover:bg-slate-100 text-slate-500 rounded-lg transition-colors"
                  title="Archive"
                >
                  <Archive size={14} />
                </button>
              </div>
            </div>
          );
        })}
        <button
          onClick={onNew}
          className="bg-white rounded-2xl border-2 border-dashed border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all p-6 flex flex-col items-center justify-center min-h-[400px] group"
        >
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
const FeatureCatalog = ({ features, loading, error, onReload, onDeleteFeature }) => {
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('All');
  const categories = ['All', ...new Set(features.map((f) => f.category))];

  const filtered = features.filter(
    (f) =>
      (cat === 'All' || f.category === cat) &&
      (f.name.toLowerCase().includes(search.toLowerCase()) ||
        f.description.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) return <LoadingSpinner text="Cargando features..." />;
  if (error) return <ErrorBanner message={error} onRetry={onReload} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Feature Catalog</h2>
          <p className="text-sm text-slate-500">All features available to drag into plans</p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-4">
        <SegmentedControl options={categories} selected={cat} onChange={setCat} />
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text" value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search features..."
            className="pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
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
              const Icon = getIcon(f.icon);
              const colors = catColors(f.category);
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
                  <td className="py-4 px-4">
                    <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${colors.bg} ${colors.text}`}>{f.category}</span>
                  </td>
                  <td className="py-4 px-4 text-sm text-slate-600">{f.unit}</td>
                  <td className="py-4 px-4">
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 capitalize">{f.unitType}</span>
                  </td>
                  <td className="py-4 px-4 text-sm text-slate-700 font-medium">
                    {typeof f.defaultLimit === 'number' ? f.defaultLimit.toLocaleString() : f.defaultLimit}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onDeleteFeature(f)}
                        className="p-2 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} className="text-slate-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan="6" className="py-16 text-center text-sm text-slate-400">
                  No hay features que coincidan con los filtros
                </td>
              </tr>
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
  const [editingPlan, setEditingPlan] = useState(null);
  const [saving, setSaving] = useState(false);

  const { features, loading: featLoading, error: featError, reload: reloadFeatures, setFeatures } = useFeatures();
  const { plans, loading: plansLoading, error: plansError, reload: reloadPlans } = usePlans();

  const newBlank = () => ({
    id: null,
    name: '',
    description: '',
    tagColor: 'slate',
    status: 'Draft',
    setupPrice: 0,
    monthlyPrice: 0,
    effectiveDate: new Date().toISOString().split('T')[0],
    features: [],
  });

  const startNew = () => { setEditingPlan(newBlank()); setTab('builder'); };
  const startEdit = (plan) => { setEditingPlan({ ...plan, features: [...plan.features] }); setTab('builder'); };

  const startDuplicate = async (plan) => {
    try {
      const res = await apiFetch(`/api/plans/${plan.id}/duplicate`, { method: 'POST', body: '{}' });
      if (res.error) { alert(res.error.message); return; }
      await reloadPlans();
      setEditingPlan({ ...res.data, features: [...(res.data.features || [])] });
      setTab('builder');
    } catch (e) {
      alert('Error al duplicar el plan');
    }
  };

  const archivePlan = async (plan) => {
    if (!confirm(`¿Archivar el plan "${plan.name}"?`)) return;
    try {
      const res = await apiFetch(`/api/plans/${plan.id}/archive`, { method: 'POST', body: '{}' });
      if (res.error) { alert(res.error.message); return; }
      await reloadPlans();
    } catch (e) {
      alert('Error al archivar el plan');
    }
  };

  const savePlan = async (draft) => {
    setSaving(true);
    try {
      const payload = {
        name: draft.name,
        description: draft.description,
        tagColor: draft.tagColor,
        setupPrice: draft.setupPrice,
        monthlyPrice: draft.monthlyPrice,
        effectiveDate: draft.effectiveDate,
        features: draft.features,
      };

      let res;
      if (draft.id) {
        // Editar existente
        res = await apiFetch(`/api/plans/${draft.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        // Crear nuevo
        res = await apiFetch('/api/plans', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      if (res.error) { alert(res.error.message); return; }
      await reloadPlans();
      setEditingPlan(null);
      setTab('library');
    } catch (e) {
      alert(`Error al guardar el plan: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const deleteFeature = async (feature) => {
    if (!confirm(`¿Archivar el feature "${feature.name}"?`)) return;
    try {
      await apiFetch(`/api/features/${feature.id}`, { method: 'DELETE' });
      setFeatures((fs) => fs.filter((f) => f.id !== feature.id));
    } catch (e) {
      alert('Error al eliminar el feature');
    }
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        {[
          { id: 'library', label: 'Plans Library', icon: Layers },
          { id: 'builder', label: 'Plan Builder', icon: Box },
          { id: 'catalog', label: 'Feature Catalog', icon: Tag },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => {
              if (id === 'builder' && !editingPlan) setEditingPlan(newBlank());
              if (id !== 'builder') setEditingPlan(null);
              setTab(id);
            }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
              tab === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {tab === 'library' && (
        <PlansLibrary
          plans={plans}
          features={features}
          onEdit={startEdit}
          onDuplicate={startDuplicate}
          onArchive={archivePlan}
          onNew={startNew}
          loading={plansLoading || featLoading}
          error={plansError || featError}
          onReload={() => { reloadPlans(); reloadFeatures(); }}
        />
      )}

      {tab === 'builder' && editingPlan && (
        <PlanBuilder
          plan={editingPlan}
          features={features}
          onSave={savePlan}
          onCancel={() => { setEditingPlan(null); setTab('library'); }}
          saving={saving}
        />
      )}

      {tab === 'catalog' && (
        <FeatureCatalog
          features={features}
          loading={featLoading}
          error={featError}
          onReload={reloadFeatures}
          onDeleteFeature={deleteFeature}
        />
      )}
    </div>
  );
};