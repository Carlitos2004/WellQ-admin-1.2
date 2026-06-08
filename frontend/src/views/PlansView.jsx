import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Smartphone, Building2, Activity, FileText, TrendingUp, Zap,
  HardDrive, Calendar, Download, Database, Headphones, Globe,
  DollarSign, Package, Plus, Trash2, GripVertical, Edit3, Copy,
  Archive, Save, Tag, Box, Layers, Search, X, CheckCircle,
  AlertCircle, Loader2, RefreshCw, ChevronDown, CheckCircle2,
  AlertTriangle, RotateCcw,
} from 'lucide-react';
import { SegmentedControl } from '../components/ui';
import { useLanguage } from '../contexts/LanguageContext';
import { toast } from 'sonner';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { apiFetch } from '../api/client';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ─── Animaciones Base ─────────────────────────────────────────────────────────
const tabVariants = {
  hidden: { opacity: 0, y: 10, filter: 'blur(4px)' },
  enter: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { opacity: 0, y: -10, filter: 'blur(4px)', transition: { duration: 0.2, ease: 'easeIn' } },
};

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

// 🔧 Función auxiliar para parsear options de forma segura
const safeOptions = (options) => {
  if (Array.isArray(options)) return options;
  if (typeof options === 'string') {
    try {
      const parsed = JSON.parse(options);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

// ─── Icon map ─────────────────────────────────────────────────────────────────
const ICON_COMPONENTS = {
  Users, Smartphone, Building2, Activity, FileText, TrendingUp, Zap,
  HardDrive, Calendar, Download, Database, Headphones, Globe,
};
const getIcon = (iconStr) =>
  ICON_COMPONENTS[iconStr] || ICON_COMPONENTS[iconStr?.charAt(0)?.toUpperCase() + iconStr?.slice(1)] || Zap;

// ─── Colores por categoría ────────────────────────────────────────────────────
const CATEGORY_COLORS = {
  'Patients & Licenses':    { bg: 'bg-wellq-cyan/10', text: 'text-wellq-cyan', iconBg: 'bg-wellq-cyan/10 dark:bg-wellq-cyan/20', iconText: 'text-wellq-cyan' },
  'AI Capabilities':        { bg: 'bg-wellq-blue/10', text: 'text-wellq-blue', iconBg: 'bg-wellq-blue/10 dark:bg-wellq-blue/20', iconText: 'text-wellq-blue' },
  'Storage & Data':         { bg: 'bg-wellq-green/10', text: 'text-wellq-green', iconBg: 'bg-wellq-green/10 dark:bg-wellq-green/20', iconText: 'text-wellq-green' },
  'Support & Integrations': { bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', iconBg: 'bg-amber-100 dark:bg-amber-500/20', iconText: 'text-amber-600 dark:text-amber-400' },
};
const catColors = (cat) => CATEGORY_COLORS[cat] || CATEGORY_COLORS['Support & Integrations'];

const PLAN_TAG_COLORS = {
  purple: 'bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20',
  blue:   'bg-wellq-blue/10 text-wellq-blue border border-wellq-blue/20',
  indigo: 'bg-wellq-cyan/10 text-wellq-cyan border border-wellq-cyan/20',
  slate:  'bg-wellq-gray/10 text-wellq-dark dark:text-white border border-wellq-gray/20 dark:border-white/10',
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

// ─── Hook: planes activos ─────────────────────────────────────────────────────
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

// ─── Hook: planes archivados (NUEVO) ─────────────────────────────────────────
const useArchivedPlans = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch('/api/plans?includeArchived=true&status=archived&pageSize=100');
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
const LoadingSpinner = ({ text }) => (
  <div className="flex flex-col items-center justify-center py-24 gap-4">
    <div className="w-10 h-10 border-4 border-wellq-cyan/30 border-t-wellq-cyan rounded-full animate-spin" />
    <p className="text-sm font-medium text-wellq-gray">{text}</p>
  </div>
);

const ErrorBanner = ({ message, onRetry, errorLabel, retryLabel }) => (
  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-red-700 dark:text-red-400">
    <AlertCircle size={18} />
    <span className="flex-1 text-sm font-semibold">{errorLabel ?? 'Error'}: {message}</span>
    {onRetry && (
      <button onClick={onRetry} className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider hover:underline">
        <RefreshCw size={14} /> {retryLabel ?? 'Reintentar'}
      </button>
    )}
  </motion.div>
);


// ─── PlanActionOverlay ── Portal que cubre TODA la pantalla (sidebar incluida) ─
// Usa createPortal(content, document.body) para escapar de cualquier
// overflow/z-index del árbol de componentes padre. Mismo patrón que
// "Force Update Options" en AnalyticsView.
const PlanActionOverlay = ({ open, type, plan, onConfirm, onCancel }) => {
  const isDelete = type === 'delete';
  const activeClinics   = plan?.metrics?.activeClinics   ?? 0;
  const historicalClinics = plan?.metrics?.historicalClinics ?? 0;
  const arrAtRisk       = plan?.metrics?.arrAtRisk       ?? 0;

  // Hard delete solo permitido si el plan NUNCA fue asignado a ninguna clínica
  const canHardDelete = historicalClinics === 0;

  // Bloquear scroll del body mientras el overlay está abierto
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return createPortal(
    <AnimatePresence>
      {open && plan && (
        <motion.div
          key="plan-action-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            backgroundColor: 'rgba(0, 0, 0, 0.62)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
        >
          <motion.div
            initial={{ scale: 0.88, opacity: 0, y: 24 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.88, opacity: 0, y: 24 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            style={{ width: '100%', maxWidth: '420px', margin: '0 16px' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Card */}
            <div className={`rounded-2xl overflow-hidden shadow-[0_32px_64px_rgba(0,0,0,0.45)] bg-white dark:bg-[#111318] border ${
              isDelete
                ? 'border-red-200 dark:border-red-500/25'
                : 'border-amber-200 dark:border-amber-500/25'
            }`}>
              {/* Accent bar */}
              <div className={`h-1.5 w-full ${
                isDelete
                  ? 'bg-gradient-to-r from-red-600 to-red-400'
                  : 'bg-gradient-to-r from-amber-500 to-amber-400'
              }`} />

              <div className="p-6 space-y-5">
                {/* Header icon + title */}
                <div className="flex items-start gap-4">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                    isDelete
                      ? 'bg-red-50 dark:bg-red-500/10'
                      : 'bg-amber-50 dark:bg-amber-500/10'
                  }`}>
                    {isDelete
                      ? <Trash2 size={19} className="text-red-500" />
                      : <Archive size={19} className="text-amber-500" />
                    }
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-black text-wellq-dark dark:text-white leading-tight">
                      {isDelete ? 'Eliminar permanentemente' : 'Archivar plan'}
                    </h3>
                    <p className="text-sm font-semibold text-wellq-gray mt-0.5 truncate max-w-[260px]">
                      "{plan?.name}"
                    </p>
                  </div>
                </div>

                {/* Impact metrics panel */}
                {(activeClinics > 0 || (isDelete && historicalClinics > 0)) && (
                  <div className={`rounded-xl overflow-hidden border ${
                    isDelete
                      ? 'border-red-100 dark:border-red-500/20'
                      : 'border-amber-100 dark:border-amber-500/20'
                  }`}>
                    <div className={`px-4 py-2 text-[10px] font-bold uppercase tracking-wider ${
                      isDelete
                        ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'
                        : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    }`}>
                      Impacto detectado
                    </div>
                    <div className="px-4 py-3.5 space-y-3 bg-white dark:bg-white/[0.015]">
                      {activeClinics > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2 text-sm font-semibold text-wellq-dark dark:text-white">
                            <AlertTriangle size={13} className={isDelete ? 'text-red-400' : 'text-amber-400'} />
                            Clínicas activas en este plan
                          </span>
                          <span className={`text-sm font-black tabular-nums ${
                            isDelete ? 'text-red-500' : 'text-amber-500'
                          }`}>
                            {activeClinics}
                          </span>
                        </div>
                      )}
                      {arrAtRisk > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-wellq-dark dark:text-white">
                            ARR en riesgo
                          </span>
                          <span className="text-sm font-black tabular-nums text-red-500 dark:text-red-400">
                            ${arrAtRisk.toLocaleString()}
                          </span>
                        </div>
                      )}
                      {isDelete && historicalClinics > 0 && (
                        <div className="flex items-center justify-between border-t border-wellq-gray/10 dark:border-white/5 pt-3">
                          <span className="text-sm font-semibold text-wellq-dark dark:text-white">
                            Historial total (activas + pasadas)
                          </span>
                          <span className="text-sm font-black tabular-nums text-wellq-gray">
                            {historicalClinics}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Explanation text */}
                <p className="text-sm font-medium text-wellq-gray dark:text-wellq-gray/80 leading-relaxed">
                  {isDelete
                    ? !canHardDelete
                      ? `Este plan tiene ${historicalClinics} asignación${historicalClinics !== 1 ? 'es' : ''} en clínicas (activas o históricas). Para preservar el audit trail financiero, no se puede eliminar. Usa "Archivar".`
                      : 'Esta acción es irreversible. El plan y toda su configuración serán eliminados permanentemente de la base de datos.'
                    : activeClinics > 0
                      ? `Las ${activeClinics} clínicas actualmente en este plan no se verán afectadas de inmediato, pero deberán ser migradas a otro plan.`
                      : 'El plan dejará de estar disponible para nuevas asignaciones. Las clínicas no se verán afectadas.'
                  }
                </p>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={onCancel}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-wellq-gray/20 dark:border-white/10 text-sm font-bold text-wellq-gray hover:text-wellq-dark dark:hover:text-white hover:bg-wellq-gray/5 dark:hover:bg-white/5 transition-colors"
                  >
                    Cancelar
                  </button>

                  {isDelete && !canHardDelete ? (
                    // Bloqueado: hay historial → mostrar botón deshabilitado
                    <div className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-wellq-gray/40 dark:text-white/20 bg-wellq-gray/5 dark:bg-white/[0.02] cursor-not-allowed select-none border border-wellq-gray/10 dark:border-white/5">
                      <AlertTriangle size={14} />
                      Eliminar (bloqueado)
                    </div>
                  ) : (
                    <button
                      onClick={onConfirm}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.97] shadow-lg ${
                        isDelete
                          ? 'bg-red-500 hover:bg-red-600 shadow-red-500/25'
                          : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/25'
                      }`}
                    >
                      {isDelete
                        ? <><Trash2 size={15} /> Eliminar plan</>
                        : <><Archive size={15} /> Archivar plan</>
                      }
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};


// ─── FeatureChip ──────────────────────────────────────────────────────────────
const FeatureChip = ({ feature, alreadyAdded }) => {
  const Icon = getIcon(feature.icon);
  const colors = catColors(feature.category);
  return (
    <div
      draggable={!alreadyAdded}
      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'copy'; e.dataTransfer.setData('text/plain', feature.id); }}
      className={`flex items-center gap-3 p-3 rounded-xl border bg-white dark:bg-white/[0.02] transition-all select-none ${
        alreadyAdded
          ? 'opacity-40 cursor-not-allowed border-wellq-gray/10 dark:border-white/5'
          : 'cursor-grab hover:border-wellq-cyan hover:shadow-md dark:hover:border-wellq-cyan/50 active:cursor-grabbing border-wellq-gray/20 dark:border-white/10 group'
      }`}
    >
      <GripVertical size={14} className={`shrink-0 ${alreadyAdded ? 'text-wellq-gray/20' : 'text-wellq-gray/40 group-hover:text-wellq-cyan transition-colors'}`} />
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors.iconBg} ring-1 ring-black/5 dark:ring-white/5`}>
        <Icon size={16} className={colors.iconText} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-wellq-dark dark:text-white truncate">{feature.name}</div>
        <div className="text-[10px] font-medium uppercase tracking-wider text-wellq-gray truncate mt-0.5">{feature.unit}</div>
      </div>
      {alreadyAdded && <CheckCircle size={16} className="text-wellq-green shrink-0" />}
    </div>
  );
};

// ─── PlanFeatureRow ───────────────────────────────────────────────────────────
const PlanFeatureRow = ({ feature, limit, onChangeLimit, onRemove }) => {
  const { t } = useLanguage();
  const Icon = getIcon(feature.icon);
  const colors = catColors(feature.category);

  const renderInput = () => {
    if (feature.unitType === 'toggle') {
      const enabled = !!Number(limit);
      return (
        <button
          onClick={() => onChangeLimit(enabled ? 0 : 1)}
          className={`relative inline-flex items-center w-11 h-6 rounded-full transition-colors ${enabled ? 'bg-wellq-cyan' : 'bg-wellq-gray/30 dark:bg-wellq-gray/50'}`}
        >
          <span className={`inline-block w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      );
    }
    if (feature.unitType === 'select') {
      const opts = safeOptions(feature.options);
      return (
        <select
          value={limit}
          onChange={(e) => onChangeLimit(e.target.value)}
          className="px-3 py-1.5 text-sm font-semibold border border-wellq-gray/20 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-wellq-cyan bg-white dark:bg-wellq-dark dark:text-white cursor-pointer shadow-sm"
        >
          {opts.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    }
    return (
      <div className="flex items-center gap-2">
        <input
          type="number" min="0" value={limit}
          onChange={(e) => onChangeLimit(Number(e.target.value))}
          className="w-24 px-3 py-1.5 text-sm border border-wellq-gray/20 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-wellq-cyan text-right font-bold bg-white dark:bg-wellq-dark dark:text-white shadow-sm"
        />
        <span className="text-[10px] font-bold uppercase tracking-wider text-wellq-gray whitespace-nowrap min-w-[64px]">{feature.unit}</span>
      </div>
    );
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="flex items-center gap-3 p-3 bg-white dark:bg-white/[0.02] rounded-2xl border border-wellq-gray/20 dark:border-white/5 hover:border-wellq-gray/30 dark:hover:border-white/10 transition-all group">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors.iconBg} ring-1 ring-black/5 dark:ring-white/5`}>
        <Icon size={18} className={colors.iconText} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-wellq-dark dark:text-white">{feature.name}</div>
        <div className="text-[11px] font-medium text-wellq-gray truncate mt-0.5">{feature.description}</div>
      </div>
      {renderInput()}
      <button
        onClick={onRemove}
        className="p-2.5 rounded-xl text-wellq-gray/40 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
        title={t('plans.remove')}
      >
        <Trash2 size={16} />
      </button>
    </motion.div>
  );
};


// ─── ArchivedPlanCard (NUEVO) ─────────────────────────────────────────────────
const ArchivedPlanCard = ({ plan, onRestore }) => {
  const activeClinics = plan.metrics?.activeClinics ?? 0;
  const arrAtRisk     = plan.metrics?.arrAtRisk ?? 0;
  const hasActive     = activeClinics > 0;

  const archivedDate = plan.archivedAt
    ? new Date(plan.archivedAt).toLocaleDateString('es-CL', {
        day: 'numeric', month: 'short', year: 'numeric',
      })
    : '—';

  return (
    <motion.div
      variants={itemVariants}
      className="flex flex-col bg-white dark:bg-wellq-dark rounded-[20px] border border-wellq-gray/15 dark:border-white/[0.06] hover:border-wellq-gray/25 dark:hover:border-white/10 transition-all duration-300 overflow-hidden group"
    >
      {/* Top grayscale bar — visual cue de "inactivo" */}
      <div className="h-0.5 w-full bg-gradient-to-r from-wellq-gray/20 via-wellq-gray/10 to-transparent" />

      <div className="p-5 flex flex-col flex-1">
        {/* Name + status badge */}
        <div className="flex items-start justify-between mb-3 gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-black text-wellq-dark dark:text-white/70 truncate">{plan.name}</h3>
            {plan.description && (
              <p className="text-[11px] font-medium text-wellq-gray mt-0.5 line-clamp-1">{plan.description}</p>
            )}
          </div>
          <span className="shrink-0 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-wellq-gray/10 dark:bg-white/[0.05] text-wellq-gray/60 dark:text-white/30 border border-wellq-gray/10 dark:border-white/5">
            Archived
          </span>
        </div>

        {/* Price + Archived date row */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-wellq-gray/10 dark:border-white/5">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-wellq-dark dark:text-white/50 tabular-nums">
              ${(plan.monthlyPrice || 0).toLocaleString()}
            </span>
            <span className="text-xs font-bold text-wellq-gray">/mo</span>
          </div>
          <div className="text-right">
            <div className="text-[9px] font-bold text-wellq-gray uppercase tracking-wider">Archived el</div>
            <div className="text-xs font-bold text-wellq-gray dark:text-white/40 mt-0.5">{archivedDate}</div>
          </div>
        </div>

        {/* Metrics */}
        <div className="space-y-2 flex-1 mb-4">
          {/* Clínicas aún en este plan */}
          <div className={`flex items-center justify-between px-3 py-2.5 rounded-xl ${
            hasActive
              ? 'bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/15'
              : 'bg-wellq-gray/5 dark:bg-white/[0.02] border border-wellq-gray/10 dark:border-white/5'
          }`}>
            <div className="flex items-center gap-2">
              {hasActive && <AlertTriangle size={12} className="text-amber-500 shrink-0" />}
              <span className={`text-xs font-bold ${
                hasActive ? 'text-amber-700 dark:text-amber-400' : 'text-wellq-gray'
              }`}>
                Clínicas aún en este plan
              </span>
            </div>
            <span className={`text-sm font-black tabular-nums ${
              hasActive ? 'text-amber-600 dark:text-amber-400' : 'text-wellq-gray'
            }`}>
              {activeClinics}
            </span>
          </div>

          {/* ARR en riesgo */}
          {arrAtRisk > 0 ? (
            <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/15">
              <span className="text-xs font-bold text-red-700 dark:text-red-400">ARR en riesgo</span>
              <span className="text-sm font-black tabular-nums text-red-600 dark:text-red-400">
                ${arrAtRisk.toLocaleString()}
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-wellq-gray/5 dark:bg-white/[0.02] border border-wellq-gray/10 dark:border-white/5">
              <span className="text-xs font-bold text-wellq-gray">ARR en riesgo</span>
              <span className="text-sm font-black tabular-nums text-wellq-gray">$0</span>
            </div>
          )}
        </div>

        {/* Restore button */}
        <button
          onClick={() => onRestore(plan)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-wellq-gray/5 dark:bg-white/[0.03] hover:bg-wellq-green/10 dark:hover:bg-wellq-green/10 text-wellq-gray hover:text-wellq-green dark:hover:text-wellq-green rounded-xl text-sm font-bold transition-all active:scale-[0.98] border border-wellq-gray/10 dark:border-white/5"
        >
          <RotateCcw size={14} strokeWidth={2.5} />
          Restaurar plan
        </button>
      </div>
    </motion.div>
  );
};


// ─── ArchivedPlansView (NUEVO) ────────────────────────────────────────────────
const ArchivedPlansView = ({ plans, loading, error, onReload, onRestore }) => {
  const totalArchived     = plans.length;
  const totalActiveClinics = plans.reduce((s, p) => s + (p.metrics?.activeClinics ?? 0), 0);
  const totalArrAtRisk    = plans.reduce((s, p) => s + (p.metrics?.arrAtRisk ?? 0), 0);

  if (loading) return (
    <motion.div variants={tabVariants} initial="hidden" animate="enter" exit="exit">
      <LoadingSpinner text="Cargando planes archivados…" />
    </motion.div>
  );
  if (error) return <ErrorBanner message={error} onRetry={onReload} />;

  return (
    <motion.div key="archivados" variants={tabVariants} initial="hidden" animate="enter" exit="exit" className="space-y-6">
      {/* Section header */}
      <div>
        <h2 className="text-lg font-bold text-wellq-dark dark:text-white">Planes en desuso</h2>
        <p className="text-sm font-medium text-wellq-gray dark:text-wellq-gray/80">
          Planes archivados — visibilidad del impacto operativo y financiero
        </p>
      </div>

      {/* KPI bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total archivados */}
        <div className="bg-white dark:bg-wellq-dark rounded-2xl p-5 border border-wellq-gray/15 dark:border-white/[0.06]">
          <div className="text-[10px] font-bold uppercase tracking-wider text-wellq-gray mb-2">
            Planes archivados
          </div>
          <div className="text-3xl font-black text-wellq-dark dark:text-white tabular-nums">{totalArchived}</div>
        </div>

        {/* Clínicas afectadas */}
        <div className={`rounded-2xl p-5 border transition-colors ${
          totalActiveClinics > 0
            ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20'
            : 'bg-white dark:bg-wellq-dark border-wellq-gray/15 dark:border-white/[0.06]'
        }`}>
          <div className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${
            totalActiveClinics > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-wellq-gray'
          }`}>
            Clínicas con plan obsoleto
          </div>
          <div className={`text-3xl font-black tabular-nums ${
            totalActiveClinics > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-wellq-dark dark:text-white'
          }`}>
            {totalActiveClinics}
          </div>
        </div>

        {/* ARR en riesgo */}
        <div className={`rounded-2xl p-5 border transition-colors ${
          totalArrAtRisk > 0
            ? 'bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20'
            : 'bg-white dark:bg-wellq-dark border-wellq-gray/15 dark:border-white/[0.06]'
        }`}>
          <div className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${
            totalArrAtRisk > 0 ? 'text-red-600 dark:text-red-400' : 'text-wellq-gray'
          }`}>
            ARR en riesgo
          </div>
          <div className={`text-3xl font-black tabular-nums ${
            totalArrAtRisk > 0 ? 'text-red-600 dark:text-red-400' : 'text-wellq-dark dark:text-white'
          }`}>
            ${totalArrAtRisk.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Grid de planes archivados / Empty state */}
      {plans.length === 0 ? (
        <div className="py-28 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-wellq-gray/10 dark:bg-white/[0.04] flex items-center justify-center mb-4">
            <Archive size={26} className="text-wellq-gray/30 dark:text-white/15" />
          </div>
          <p className="text-base font-bold text-wellq-dark dark:text-white">Sin planes archivados</p>
          <p className="text-sm font-medium text-wellq-gray mt-1">Los planes que archives aparecerán aquí</p>
        </div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
        >
          {plans.map((plan) => (
            <ArchivedPlanCard key={plan.id} plan={plan} onRestore={onRestore} />
          ))}
        </motion.div>
      )}
    </motion.div>
  );
};


// ─── PlanBuilder ──────────────────────────────────────────────────────────────
const PlanBuilder = ({ plan, features, onSave, onCancel, saving }) => {
  const { t, tVal } = useLanguage();
  const [draft, setDraft] = useState(plan);
  const [search, setSearch] = useState('');
  const [dragOver, setDragOver] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState({});

  const toggleCategory = (category) =>
    setCollapsedCategories((prev) => ({ ...prev, [category]: !prev[category] }));

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

  const handlePriceChange = (key, rawValue) => {
    if (rawValue === '' || rawValue === null || rawValue === undefined) {
      setDraft((d) => ({ ...d, [key]: '' }));
      return;
    }
    const num = Number(rawValue);
    if (!isNaN(num)) {
      setDraft((d) => ({ ...d, [key]: num }));
    }
  };

  return (
    <motion.div key="builder" variants={tabVariants} initial="hidden" animate="enter" exit="exit" className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-wellq-dark rounded-2xl p-6 shadow-sm border border-wellq-gray/20 dark:border-white/10">
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1 min-w-0">
            <input
              type="text" value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder={t('plans.planNamePlaceholder')}
              className="w-full text-2xl font-black text-wellq-dark dark:text-white placeholder-wellq-gray/30 bg-transparent border-none focus:outline-none p-0 mb-2 tracking-tight"
            />
            <input
              type="text" value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              placeholder={t('plans.planDescPlaceholder')}
              className="w-full text-sm font-medium text-wellq-gray dark:text-wellq-gray/80 placeholder-wellq-gray/40 bg-transparent border-none focus:outline-none p-0"
            />
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button onClick={onCancel} className="px-5 py-2.5 rounded-xl text-sm font-bold text-wellq-gray hover:text-wellq-dark dark:hover:text-white hover:bg-wellq-gray/10 dark:hover:bg-white/5 transition-colors">
              {t('common.cancel')}
            </button>
            <button
              onClick={() => onSave(draft)}
              disabled={!draft.name || draft.features.length === 0 || saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-wellq-cyan text-wellq-black rounded-xl text-sm font-bold hover:bg-wellq-cyan/90 transition-all disabled:opacity-50 shadow-sm active:scale-95"
            >
              {saving ? <div className="w-4 h-4 border-2 border-wellq-black/30 border-t-wellq-black rounded-full animate-spin" /> : <Save size={16} />}
              {saving ? t('plans.saving') : t('plans.savePlan')}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sidebar catálogo */}
        <aside className="lg:col-span-4 bg-white dark:bg-wellq-dark rounded-2xl shadow-sm border border-wellq-gray/20 dark:border-white/10 flex flex-col" style={{ minHeight: '600px' }}>
          <div className="p-5 border-b border-wellq-gray/10 dark:border-white/5 bg-wellq-gray/3 dark:bg-white/[0.02]">
            <h3 className="font-bold text-wellq-dark dark:text-white">{t('plans.featureCatalog')}</h3>
            <p className="text-[11px] font-medium text-wellq-gray mt-0.5 mb-4">{t('plans.dragHint')}</p>
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-wellq-gray/50" />
              <input
                type="text" value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('plans.searchFeatures')}
                className="w-full pl-9 pr-4 py-2.5 text-sm font-semibold bg-white dark:bg-white/[0.02] border border-wellq-gray/20 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-wellq-cyan dark:text-white shadow-inner"
              />
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4 space-y-3">
            {Object.entries(grouped).map(([category, items]) => {
              const colors = catColors(category);
              const isCollapsed = !!collapsedCategories[category];
              const addedCount = items.filter((f) => addedIds.has(f.id)).length;
              return (
                <div key={category} className="rounded-2xl border border-wellq-gray/15 dark:border-white/5 overflow-hidden bg-white dark:bg-white/[0.01]">
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-wellq-gray/5 dark:hover:bg-white/[0.02] transition-colors text-left"
                  >
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${colors.bg} ${colors.text}`}>
                      {tVal(category)}
                    </span>
                    <span className="text-xs font-bold text-wellq-gray flex-1">{items.length}</span>
                    {addedCount > 0 && (
                      <span className="text-[10px] font-bold text-wellq-cyan bg-wellq-cyan/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        {addedCount} added
                      </span>
                    )}
                    <ChevronDown
                      size={14}
                      className={`text-wellq-gray/60 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`}
                    />
                  </button>
                  <AnimatePresence>
                    {!isCollapsed && (
                      <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                        <div className="px-3 pb-3 space-y-2 pt-1">
                          {items.map((f) => <FeatureChip key={f.id} feature={f} alreadyAdded={addedIds.has(f.id)} />)}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
            {features.length === 0 && (
              <p className="text-xs font-medium text-wellq-gray text-center py-8">{t('plans.noFeaturesAvailable')}</p>
            )}
          </div>
        </aside>

        {/* Canvas */}
        <section className="lg:col-span-8 space-y-6 flex flex-col">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`flex-1 bg-white dark:bg-wellq-dark rounded-2xl shadow-sm border-2 transition-all duration-300 flex flex-col ${dragOver ? 'border-wellq-cyan border-dashed bg-wellq-cyan/5 ring-4 ring-wellq-cyan/10' : 'border-wellq-gray/20 dark:border-white/10'}`}
          >
            <div className="flex items-center justify-between p-5 border-b border-wellq-gray/10 dark:border-white/5 bg-wellq-gray/3 dark:bg-white/[0.02] rounded-t-2xl">
              <div>
                <h3 className="font-bold text-wellq-dark dark:text-white">{t('plans.planCanvas')}</h3>
                <p className="text-[11px] font-medium text-wellq-gray mt-0.5">{draft.features.length} {draft.features.length !== 1 ? t('plans.featuresIncluded') : t('plans.featureIncluded')}</p>
              </div>
              {draft.features.length > 0 && (
                <button
                  onClick={() => setDraft((d) => ({ ...d, features: [] }))}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-wellq-gray hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors flex items-center gap-1.5"
                >
                  <X size={14} strokeWidth={2.5} /> {t('plans.clearAll')}
                </button>
              )}
            </div>
            <div className="p-5 space-y-2.5 flex-1 overflow-auto min-h-[300px]">
              {draft.features.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center opacity-60">
                  <div className="w-16 h-16 rounded-2xl bg-wellq-gray/10 dark:bg-white/5 flex items-center justify-center mb-4">
                    <Package size={28} className="text-wellq-gray dark:text-wellq-gray/60" />
                  </div>
                  <p className="text-sm font-bold text-wellq-dark dark:text-white">{t('plans.canvasEmpty')}</p>
                  <p className="text-xs font-medium text-wellq-gray mt-1">{t('plans.canvasEmptySub')}</p>
                </div>
              ) : (
                <AnimatePresence>
                  {draft.features.map((pf) => {
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
                  })}
                </AnimatePresence>
              )}
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-white dark:bg-wellq-dark rounded-2xl p-6 shadow-sm border border-wellq-gray/20 dark:border-white/10">
            <h3 className="font-bold text-wellq-dark dark:text-white mb-5 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-wellq-gray/10 dark:bg-white/5 flex items-center justify-center">
                <DollarSign size={16} className="text-wellq-dark dark:text-white" />
              </div>
              {t('plans.pricing')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                { label: t('plans.setupPrice'), key: 'setupPrice', suffix: '', prefix: '$', hint: t('plans.setupPriceHint') },
                { label: t('plans.monthlyPrice'), key: 'monthlyPrice', suffix: '/mo', prefix: '$', hint: t('plans.monthlyPriceHint') },
              ].map(({ label, key, suffix, prefix, hint }) => (
                <div key={key}>
                  <label className="block text-[10px] font-bold text-wellq-gray uppercase tracking-wider mb-2">{label}</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-wellq-dark dark:text-white font-bold">{prefix}</span>
                    <input
                      type="number"
                      min="0"
                      value={draft[key] === 0 ? '' : draft[key]}
                      onChange={(e) => handlePriceChange(key, e.target.value)}
                      className="w-full pl-8 pr-12 py-3 bg-wellq-gray/5 dark:bg-white/[0.02] border border-wellq-gray/20 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-wellq-cyan font-black text-wellq-dark dark:text-white shadow-inner"
                    />
                    {suffix && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-wellq-gray text-xs font-bold">{suffix}</span>}
                  </div>
                  <p className="text-[10px] font-medium text-wellq-gray mt-1.5">{hint}</p>
                </div>
              ))}
              <div>
                <label className="block text-[10px] font-bold text-wellq-gray uppercase tracking-wider mb-2">{t('plans.effectiveDate')}</label>
                <div className="relative">
                  <Calendar size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-wellq-gray/50" />
                  <input
                    type="date" value={draft.effectiveDate || ''}
                    onChange={(e) => setDraft((d) => ({ ...d, effectiveDate: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3 bg-wellq-gray/5 dark:bg-white/[0.02] border border-wellq-gray/20 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-wellq-cyan font-bold text-wellq-dark dark:text-white shadow-inner appearance-none cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Financial Projection Cards */}
            <div className="mt-6 pt-6 border-t border-wellq-gray/10 dark:border-white/5 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative bg-gradient-to-br from-wellq-cyan/5 to-wellq-blue/5 dark:from-wellq-cyan/10 dark:to-wellq-blue/10 rounded-2xl p-5 border border-wellq-cyan/20 overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-wellq-cyan/10 to-transparent opacity-50" />
                <div className="text-[10px] font-bold uppercase tracking-wider text-wellq-cyan/70 dark:text-wellq-cyan mb-1">{t('plans.firstYearRevenue')}</div>
                <div className="text-3xl font-black text-wellq-cyan tabular-nums tracking-tight">
                  ${((draft.setupPrice || 0) + (draft.monthlyPrice || 0) * 12).toLocaleString()}
                </div>
              </div>
              <div className="relative bg-gradient-to-br from-wellq-green/5 to-wellq-green/10 dark:from-wellq-green/10 dark:to-wellq-green/20 rounded-2xl p-5 border border-wellq-green/20 overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-wellq-green/10 to-transparent opacity-50" />
                <div className="text-[10px] font-bold uppercase tracking-wider text-wellq-green/70 dark:text-wellq-green mb-1">{t('plans.arrPerClient')}</div>
                <div className="text-3xl font-black text-wellq-green tabular-nums tracking-tight">
                  ${((draft.monthlyPrice || 0) * 12).toLocaleString()}
                </div>
              </div>
              <div className="relative bg-wellq-gray/5 dark:bg-white/[0.02] rounded-2xl p-5 border border-wellq-gray/10 dark:border-white/5 overflow-hidden">
                <div className="text-[10px] font-bold uppercase tracking-wider text-wellq-gray mb-1">{t('plans.featuresIncludedLabel')}</div>
                <div className="text-3xl font-black text-wellq-dark dark:text-white tabular-nums tracking-tight">{draft.features.length}</div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </motion.div>
  );
};


// ─── PlansLibrary ─────────────────────────────────────────────────────────────
const PlansLibrary = ({ plans, features, onEdit, onDuplicate, onArchive, onDelete, onNew, loading, error, onReload }) => {
  const { t, tVal } = useLanguage();
  const featuresById = Object.fromEntries(features.map((f) => [f.id, f]));

  if (loading) return <motion.div variants={tabVariants} initial="hidden" animate="enter" exit="exit"><LoadingSpinner text={t('plans.loadingPlans')} /></motion.div>;
  if (error) return <ErrorBanner message={error} onRetry={onReload} errorLabel={t('common.error')} retryLabel={t('common.retry')} />;

  return (
    <motion.div key="library" variants={tabVariants} initial="hidden" animate="enter" exit="exit" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-wellq-dark dark:text-white">{t('plans.library')}</h2>
          <p className="text-sm font-medium text-wellq-gray dark:text-wellq-gray/80">{t('plans.librarySub')}</p>
        </div>
        <button onClick={onNew} className="flex items-center gap-2 px-5 py-2.5 bg-wellq-cyan text-wellq-black rounded-xl text-sm font-bold hover:bg-wellq-cyan/90 transition-all shadow-sm active:scale-95">
          <Plus size={16} strokeWidth={2.5} /> {t('plans.newPlan')}
        </button>
      </div>

      {plans.length === 0 && (
        <div className="py-24 text-center text-wellq-gray text-sm font-medium">{t('plans.noPlans')}</div>
      )}

      <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const tagColor = PLAN_TAG_COLORS[plan.tagColor] || PLAN_TAG_COLORS.slate;
          return (
            <motion.div variants={itemVariants} key={plan.id} className="bg-white dark:bg-wellq-dark rounded-[24px] p-6 shadow-sm border border-wellq-gray/20 dark:border-white/10 hover:shadow-lg dark:hover:border-white/20 transition-all duration-300 flex flex-col group relative overflow-hidden">
              <div className="flex items-start justify-between mb-4 relative z-10">
                <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${tagColor}`}>{plan.name}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-wellq-gray flex items-center gap-1.5 bg-wellq-gray/10 dark:bg-white/5 px-2.5 py-1 rounded-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-wellq-green" /> {tVal(plan.status)}
                </span>
              </div>
              <h3 className="text-2xl font-black text-wellq-dark dark:text-white mb-2 tracking-tight relative z-10">{plan.name}</h3>
              <p className="text-sm font-medium text-wellq-gray mb-5 min-h-[40px] relative z-10">{plan.description}</p>

              <div className="flex items-baseline gap-1 mb-6 relative z-10">
                <span className="text-4xl font-black text-wellq-dark dark:text-white tracking-tight">${(plan.monthlyPrice || 0).toLocaleString()}</span>
                <span className="text-sm font-bold text-wellq-gray">/{t('plans.mo')}</span>
                {plan.setupPrice > 0 && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-wellq-gray ml-2 bg-wellq-gray/10 px-2 py-0.5 rounded-md">
                    + ${(plan.setupPrice).toLocaleString()} {t('plans.setup')}
                  </span>
                )}
              </div>

              <div className="border-t border-wellq-gray/10 dark:border-white/5 pt-5 mb-5 flex-1 relative z-10">
                <div className="text-[10px] font-bold text-wellq-gray uppercase tracking-wider mb-3">
                  {t('plans.includes')} {plan.features.length} {t('plans.features')}
                </div>
                <div className="space-y-2 pr-2">
                  {plan.features.slice(0, 5).map((pf) => {
                    const f = featuresById[pf.featureId];
                    if (!f) return null;
                    return (
                      <div key={pf.featureId} className="flex items-center justify-between text-xs font-medium">
                        <span className="text-wellq-dark dark:text-white/90 flex items-center gap-2 truncate">
                          <CheckCircle2 size={12} className="text-wellq-cyan shrink-0" /> {f.name}
                        </span>
                        <span className="text-wellq-gray ml-2 shrink-0 font-bold">
                          {typeof pf.limit === 'number' ? pf.limit.toLocaleString() : pf.limit}
                          {f.unitType !== 'select' && f.unitType !== 'toggle' ? ` ${f.unit}` : ''}
                        </span>
                      </div>
                    );
                  })}
                  {plan.features.length > 5 && (
                    <div className="text-[10px] font-bold uppercase tracking-wider text-wellq-cyan bg-wellq-cyan/10 inline-block px-2 py-0.5 rounded-md mt-2">
                      + {plan.features.length - 5} {t('plans.more')}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-wellq-gray/10 dark:border-white/5 relative z-10">
                <button
                  onClick={() => onEdit(plan)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-wellq-gray/5 hover:bg-wellq-cyan/10 text-wellq-dark hover:text-wellq-cyan rounded-xl text-xs font-bold transition-colors dark:bg-white/[0.03] dark:text-white dark:hover:text-wellq-cyan dark:hover:bg-wellq-cyan/10"
                >
                  <Edit3 size={14} /> {t('plans.edit')}
                </button>
                <button
                  onClick={() => onDuplicate(plan)}
                  className="p-2.5 bg-wellq-gray/5 hover:bg-wellq-gray/10 text-wellq-gray rounded-xl transition-colors dark:bg-white/[0.03] dark:hover:bg-white/10"
                  title={t('plans.duplicate')}
                >
                  <Copy size={16} />
                </button>
                <button
                  onClick={() => onArchive(plan)}
                  className="p-2.5 bg-wellq-gray/5 hover:bg-amber-500/10 text-wellq-gray hover:text-amber-500 rounded-xl transition-colors dark:bg-white/[0.03] dark:hover:bg-amber-500/20"
                  title={t('plans.archive')}
                >
                  <Archive size={16} />
                </button>
                <button
                  onClick={() => onDelete(plan)}
                  className="p-2.5 bg-wellq-gray/5 hover:bg-red-500/10 text-wellq-gray hover:text-red-500 rounded-xl transition-colors dark:bg-white/[0.03] dark:hover:bg-red-500/20"
                  title={t('plans.delete') ?? 'Delete permanently'}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </motion.div>
          );
        })}
        <motion.button
          variants={itemVariants}
          onClick={onNew}
          className="bg-wellq-gray/3 dark:bg-white/[0.01] rounded-[24px] border-2 border-dashed border-wellq-gray/20 dark:border-white/10 hover:border-wellq-cyan hover:bg-wellq-cyan/5 transition-all p-6 flex flex-col items-center justify-center min-h-[400px] group active:scale-[0.98]"
        >
          <div className="w-16 h-16 rounded-[20px] bg-white dark:bg-wellq-dark border border-wellq-gray/10 dark:border-white/5 shadow-sm group-hover:bg-wellq-cyan/10 group-hover:border-wellq-cyan/20 flex items-center justify-center mb-4 transition-colors">
            <Plus size={28} className="text-wellq-gray group-hover:text-wellq-cyan transition-colors" />
          </div>
          <span className="text-base font-bold text-wellq-dark dark:text-white">{t('plans.createNewPlan')}</span>
          <span className="text-xs font-medium text-wellq-gray mt-1">{t('plans.startBlankCanvas')}</span>
        </motion.button>
      </motion.div>
    </motion.div>
  );
};


// ─── FeatureCatalog ───────────────────────────────────────────────────────────
const FeatureCatalog = ({ features, loading, error, onReload, onDeleteFeature }) => {
  const { t, tVal } = useLanguage();
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('All');

  const CATEGORY_MAP = {
    'All':                    t('clinics.all'),
    'Support & Integrations': t('values.support_integrations'),
    'Patients & Licenses':    t('values.patients_licenses'),
    'AI Capabilities':        t('values.ai_capabilities'),
    'Storage & Data':         t('values.storage_data'),
  };
  const translateCategory = (c) => CATEGORY_MAP[c] ?? c;
  const categories = ['All', ...new Set(features.map((f) => f.category))];
  const categoriesLabels = categories.map((c) => CATEGORY_MAP[c] ?? c);

  const filtered = features.filter(
    (f) =>
      (cat === 'All' || f.category === cat) &&
      (f.name.toLowerCase().includes(search.toLowerCase()) ||
        f.description.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) return <motion.div variants={tabVariants} initial="hidden" animate="enter" exit="exit"><LoadingSpinner text={t('plans.loadingFeatures')} /></motion.div>;
  if (error) return <ErrorBanner message={error} onRetry={onReload} errorLabel={t('common.error')} retryLabel={t('common.retry')} />;

  return (
    <motion.div key="catalog" variants={tabVariants} initial="hidden" animate="enter" exit="exit" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-wellq-dark dark:text-white">{t('plans.catalog')}</h2>
          <p className="text-sm font-medium text-wellq-gray">{t('plans.catalogSub')}</p>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <SegmentedControl
          options={categoriesLabels}
          selected={CATEGORY_MAP[cat] ?? cat}
          onChange={(label) => {
            const original = categories.find((c) => (CATEGORY_MAP[c] ?? c) === label);
            setCat(original ?? label);
          }}
        />
        <div className="relative w-full sm:w-auto">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-wellq-gray/50" />
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={t('plans.searchFeatures')}
            className="w-full sm:w-72 pl-10 pr-4 py-2.5 text-sm font-semibold bg-white dark:bg-wellq-dark border border-wellq-gray/20 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-wellq-cyan dark:text-white shadow-sm"
          />
        </div>
      </div>
      <div className="bg-white dark:bg-wellq-dark rounded-2xl shadow-sm border border-wellq-gray/20 dark:border-white/10 overflow-hidden">
        <div className="overflow-x-auto overflow-y-hidden" style={{ minHeight: '500px' }}>
          <table className="w-full">
            <thead className="bg-wellq-gray/5 dark:bg-white/[0.02] border-b border-wellq-gray/10 dark:border-white/5">
              <tr>
                {[t('plans.colFeature'), t('plans.colCategory'), t('plans.colUnit'), t('plans.colType'), t('plans.colDefault'), t('plans.colActions')].map((h) => (
                  <th key={h} className="py-4 px-5 text-left text-[10px] font-bold text-wellq-gray uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <motion.tbody initial="hidden" animate="show" variants={containerVariants}>
              {filtered.map((f) => {
                const Icon = getIcon(f.icon);
                const colors = catColors(f.category);
                return (
                  <motion.tr variants={itemVariants} key={f.id} className="border-b border-wellq-gray/10 dark:border-white/5 hover:bg-wellq-gray/3 dark:hover:bg-white/[0.01] transition-colors group">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors.iconBg} ring-1 ring-black/5 dark:ring-white/5 flex-shrink-0`}>
                          <Icon size={18} className={colors.iconText} />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-wellq-dark dark:text-white truncate">{f.name}</div>
                          <div className="text-[11px] font-medium text-wellq-gray max-w-sm truncate mt-0.5">{f.description}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${colors.bg} ${colors.text}`}>
                        {translateCategory(f.category)}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-sm font-semibold text-wellq-gray">{f.unit}</td>
                    <td className="py-4 px-5">
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-wellq-gray/10 text-wellq-gray dark:bg-white/5 dark:text-white/80">{f.unitType}</span>
                    </td>
                    <td className="py-4 px-5 text-sm text-wellq-dark dark:text-white font-black tabular-nums">
                      {typeof f.defaultLimit === 'number' ? f.defaultLimit.toLocaleString() : f.defaultLimit}
                    </td>
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => onDeleteFeature(f)} className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 text-wellq-gray/50 hover:text-red-500 rounded-xl transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="6" className="py-16 text-center text-sm font-medium text-wellq-gray">
                    {t('plans.noFeaturesMatch')}
                  </td>
                </tr>
              )}
            </motion.tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};


// ─── PlansView ─────────────────────────────────────────────────────────────────
export const PlansView = () => {
  const { t } = useLanguage();
  const [tab, setTab] = useState('library');
  const [editingPlan, setEditingPlan] = useState(null);
  const [saving, setSaving] = useState(false);

  // ── Overlay state — archive / delete (usan PlanActionOverlay) ────────────
  const [confirmArchive,     setConfirmArchive]     = useState({ open: false, plan: null });
  const [confirmDeletePlan,  setConfirmDeletePlan]  = useState({ open: false, plan: null });
  // ── ConfirmDialog state — feature deletion (less critical) ────────────────
  const [confirmDeleteFeat,  setConfirmDeleteFeat]  = useState({ open: false, feature: null });

  const { features, loading: featLoading, error: featError, reload: reloadFeatures, setFeatures } = useFeatures();
  const { plans, loading: plansLoading, error: plansError, reload: reloadPlans } = usePlans();

  // ── Planes archivados (NUEVO) ─────────────────────────────────────────────
  const {
    plans:   archivedPlans,
    loading: archivedLoading,
    error:   archivedError,
    reload:  reloadArchivedPlans,
  } = useArchivedPlans();

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

  const startNew  = () => { setEditingPlan(newBlank()); setTab('builder'); };
  const startEdit = (plan) => { setEditingPlan({ ...plan, features: [...plan.features] }); setTab('builder'); };

  const startDuplicate = async (plan) => {
    try {
      const res = await apiFetch(`/api/plans/${plan.id}/duplicate`, { method: 'POST', body: '{}' });
      if (res.error) { toast.error(res.error.message); return; }
      await reloadPlans();
      setEditingPlan({ ...res.data, features: [...(res.data.features || [])] });
      setTab('builder');
    } catch (e) {
      if (e.status === 403) return;
      toast.error(t('plans.errorDuplicate'));
    }
  };

  // ── Archive ──────────────────────────────────────────────────────────────
  const archivePlan   = (plan) => setConfirmArchive({ open: true, plan });

  const doArchivePlan = async () => {
    const plan = confirmArchive.plan;
    setConfirmArchive({ open: false, plan: null });
    try {
      const res = await apiFetch(`/api/plans/${plan.id}/archive`, { method: 'POST', body: '{}' });
      if (res.error) { toast.error(res.error.message); return; }
      await reloadPlans();
      await reloadArchivedPlans(); // refrescar tab archivados
      toast.success(t('plans.archivedSuccess').replace('{{name}}', plan.name));
    } catch (e) {
      if (e.status === 403) return;
      toast.error(t('plans.errorArchive'));
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────────
  const deletePlan   = (plan) => setConfirmDeletePlan({ open: true, plan });

  const doDeletePlan = async () => {
    const plan = confirmDeletePlan.plan;
    setConfirmDeletePlan({ open: false, plan: null });
    try {
      const res = await apiFetch(`/api/plans/${plan.id}`, { method: 'DELETE' });
      // ── ANTES: no existía este chequeo → error silencioso ─────────────────
      // ── AHORA: si el backend devuelve {error:{...}}, mostramos el mensaje ─
      if (res.error) { toast.error(res.error.message); return; }
      await reloadPlans();
      toast.success(`"${plan.name}" eliminado permanentemente`);
    } catch (e) {
      if (e.status === 403) return;
      toast.error('Error al eliminar el plan');
    }
  };

  // ── Restore (no necesita confirmación — acción no destructiva) ────────────
  const doRestorePlan = async (plan) => {
    try {
      const res = await apiFetch(`/api/plans/${plan.id}/restore`, { method: 'POST', body: '{}' });
      if (res.error) { toast.error(res.error.message); return; }
      await reloadPlans();
      await reloadArchivedPlans();
      toast.success(`"${plan.name}" restaurado exitosamente`);
    } catch (e) {
      if (e.status === 403) return;
      toast.error('Error al restaurar el plan');
    }
  };

  // ── Save plan ────────────────────────────────────────────────────────────
  const savePlan = async (draft) => {
    setSaving(true);
    try {
      const payload = {
        name: draft.name,
        description: draft.description,
        tagColor: draft.tagColor,
        setupPrice: Number(draft.setupPrice) || 0,
        monthlyPrice: Number(draft.monthlyPrice) || 0,
        effectiveDate: draft.effectiveDate,
        features: draft.features,
      };

      let res;
      if (draft.id) {
        res = await apiFetch(`/api/plans/${draft.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        res = await apiFetch('/api/plans', { method: 'POST', body: JSON.stringify(payload) });
      }

      if (res.error) { toast.error(res.error.message); return; }
      await reloadPlans();
      setEditingPlan(null);
      setTab('library');
      toast.success(t('plans.savedSuccess'));
    } catch (e) {
      if (e.status === 403) return;
      toast.error(t('plans.errorSave'));
    } finally {
      setSaving(false);
    }
  };

  // ── Delete feature ───────────────────────────────────────────────────────
  const deleteFeature   = (feature) => setConfirmDeleteFeat({ open: true, feature });

  const doDeleteFeature = async () => {
    const feature = confirmDeleteFeat.feature;
    setConfirmDeleteFeat({ open: false, feature: null });
    try {
      await apiFetch(`/api/features/${feature.id}`, { method: 'DELETE' });
      setFeatures((fs) => fs.filter((f) => f.id !== feature.id));
      toast.success(t('plans.featureDeleted').replace('{{name}}', feature.name));
    } catch (e) {
      if (e.status === 403) return;
      toast.error(t('plans.errorDeleteFeature'));
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 font-sans" style={{ minHeight: '85vh' }}>
      {/* Tab navigation */}
      <div className="flex items-center gap-1.5 p-1.5 bg-wellq-gray/5 dark:bg-white/[0.03] border border-wellq-gray/10 dark:border-white/5 shadow-inner rounded-xl w-fit">
        {[
          { id: 'library',    label: t('plans.library'),  icon: Layers },
          { id: 'builder',    label: t('plans.builder'),  icon: Box    },
          { id: 'catalog',    label: t('plans.catalog'),  icon: Tag    },
          { id: 'archivados', label: 'Archived',        icon: Archive },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => {
              if (id === 'builder' && !editingPlan) setEditingPlan(newBlank());
              if (id !== 'builder') setEditingPlan(null);
              setTab(id);
            }}
            className={`relative flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition-all duration-200 ${
              tab === id
                ? 'bg-white dark:bg-wellq-dark text-wellq-dark dark:text-white shadow-sm ring-1 ring-wellq-gray/10 dark:ring-white/10'
                : 'text-wellq-gray hover:text-wellq-dark dark:hover:text-white'
            }`}
          >
            <Icon size={16} strokeWidth={2.5} />
            {label}
            {/* Badge contador en tab archived */}
            {id === 'archivados' && archivedPlans.length > 0 && (
              <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-black tabular-nums bg-wellq-gray/15 dark:bg-white/10 text-wellq-gray dark:text-white/60">
                {archivedPlans.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {tab === 'library' && (
          <PlansLibrary
            plans={plans}
            features={features}
            onEdit={startEdit}
            onDuplicate={startDuplicate}
            onArchive={archivePlan}
            onDelete={deletePlan}
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
        {tab === 'archivados' && (
          <ArchivedPlansView
            plans={archivedPlans}
            loading={archivedLoading}
            error={archivedError}
            onReload={reloadArchivedPlans}
            onRestore={doRestorePlan}
          />
        )}
      </AnimatePresence>

      {/* ── PlanActionOverlay — archive (portal a document.body, blur total) ── */}
      <PlanActionOverlay
        open={confirmArchive.open}
        type="archive"
        plan={confirmArchive.plan}
        onConfirm={doArchivePlan}
        onCancel={() => setConfirmArchive({ open: false, plan: null })}
      />

      {/* ── PlanActionOverlay — delete permanente (portal a document.body) ─── */}
      <PlanActionOverlay
        open={confirmDeletePlan.open}
        type="delete"
        plan={confirmDeletePlan.plan}
        onConfirm={doDeletePlan}
        onCancel={() => setConfirmDeletePlan({ open: false, plan: null })}
      />

      {/* ── ConfirmDialog — eliminar feature (menos crítico, ok con dialog) ── */}
      <ConfirmDialog
        open={confirmDeleteFeat.open}
        title={t('plans.deleteFeatureTitle')}
        message={t('plans.deleteFeatureMessage').replace('{{name}}', confirmDeleteFeat.feature?.name ?? '')}
        onConfirm={doDeleteFeature}
        onCancel={() => setConfirmDeleteFeat({ open: false, feature: null })}
      />
    </div>
  );
};