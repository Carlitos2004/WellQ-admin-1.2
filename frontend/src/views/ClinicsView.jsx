import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Filter, Download, Mail, X, Send, Loader2,
  Building2, Activity, TrendingDown, Users,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { Skeleton } from '../components/ui';
import { ClinicRow } from '../components/clinics/ClinicRow';
import { ClinicDrawer } from '../components/clinics/ClinicDrawer';
import { API_BASE } from '../api/client';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useLanguage } from '../contexts/LanguageContext';

// ─── Animaciones (idénticas a AnalyticsView) ─────────────────────────────────
const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

// ─── Datos de placeholder ─────────────────────────────────────────────────────
const HARDCODED_CLINICS = [
  {
    id: '000',
    name: 'Esperando base de datos',
    tier: 'Esperando...',
    status: 'Esperando...',
    patientsUsed: 0,
    patientsLimit: 0,
    healthScore: 0,
    lastLogin: 'Esperando...',
  },
];

// ─── BulkEmailModal ───────────────────────────────────────────────────────────
const BulkEmailModal = ({ onClose, clinicCount }) => {
  const { t } = useLanguage();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState(null);

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/notifications', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title:             subject,
          message:           message,
          channel:           'email',
          recipientClinicId: 'all',
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSent(true);
    } catch {
      setError(t('clinics.sendError'));
    } finally {
      setSending(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <motion.div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />
        <motion.div
          className="relative bg-white dark:bg-wellq-dark rounded-[24px] shadow-2xl w-full max-w-lg mx-4 overflow-hidden border border-wellq-gray/15 dark:border-white/10"
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1,    y: 0  }}
          exit={{   opacity: 0, scale: 0.96, y: 10  }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          {/* Brillo superior */}
          <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-wellq-cyan/8 to-transparent pointer-events-none" />

          <div className="relative flex items-center justify-between px-6 py-5 border-b border-wellq-gray/10 dark:border-white/5 bg-wellq-gray/3 dark:bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-wellq-cyan to-wellq-blue flex items-center justify-center shadow-md shadow-wellq-cyan/20">
                <Mail size={16} className="text-wellq-black" strokeWidth={2.2} />
              </div>
              <div>
                <h2 className="font-bold text-wellq-dark dark:text-white text-sm leading-tight">{t('clinics.bulkEmail')}</h2>
                <p className="text-xs font-medium text-wellq-gray mt-0.5">
                  {t('clinics.sendingTo')} <span className="font-black text-wellq-cyan">{clinicCount}</span> {t('clinics.clinic')}{clinicCount !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-wellq-gray/8 dark:hover:bg-white/8 rounded-xl transition-colors cursor-pointer">
              <X size={17} className="text-wellq-gray" strokeWidth={2.5} />
            </button>
          </div>

          {sent ? (
            <div className="flex flex-col items-center justify-center py-14 gap-3">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="w-16 h-16 rounded-full bg-wellq-green/10 border border-wellq-green/20 flex items-center justify-center"
              >
                <Send size={28} className="text-wellq-green" />
              </motion.div>
              <p className="font-bold text-wellq-dark dark:text-white">{t('clinics.emailSent')}</p>
              <p className="text-sm text-wellq-gray">{t('clinics.emailQueued')}</p>
              <button
                onClick={onClose}
                className="mt-2 px-5 py-2 bg-wellq-gray/10 dark:bg-wellq-dark/50 rounded-lg text-sm font-medium text-wellq-dark dark:text-white hover:bg-wellq-gray/20 dark:hover:bg-wellq-dark/80 transition-colors cursor-pointer"
              >
                {t('common.close')}
              </button>
            </div>
          ) : (
            <>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-wellq-gray uppercase tracking-wider mb-1.5">{t('clinics.subject')}</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder={t('clinics.subjectPlaceholder')}
                    className="w-full px-4 py-2.5 border border-wellq-gray/30 rounded-xl text-sm text-wellq-dark dark:text-white placeholder-wellq-gray/40 focus:outline-none focus:ring-2 focus:ring-wellq-cyan focus:border-transparent transition-all dark:bg-wellq-dark/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-wellq-gray uppercase tracking-wider mb-1.5">{t('clinics.message')}</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={t('clinics.messagePlaceholder')}
                    rows={5}
                    className="w-full px-4 py-2.5 border border-wellq-gray/30 rounded-xl text-sm text-wellq-dark dark:text-white placeholder-wellq-gray/40 focus:outline-none focus:ring-2 focus:ring-wellq-cyan focus:border-transparent transition-all resize-none dark:bg-wellq-dark/50"
                  />
                </div>
                {error && <p className="text-xs text-red-500">{error}</p>}
              </div>
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-wellq-gray/20 dark:border-wellq-gray/30 bg-wellq-gray/5 dark:bg-wellq-dark/50">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-wellq-gray/30 rounded-lg text-sm font-medium text-wellq-dark dark:text-white hover:bg-wellq-gray/10 dark:hover:bg-wellq-dark/40 transition-colors cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleSend}
                  disabled={sending || !subject.trim() || !message.trim()}
                  className="flex items-center gap-2 px-5 py-2 bg-wellq-cyan text-wellq-black rounded-lg text-sm font-medium hover:bg-wellq-cyan/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm shadow-wellq-cyan/20"
                >
                  {sending
                    ? <><Loader2 size={15} className="animate-spin" /> {t('clinics.sending')}</>
                    : <><Send size={15} /> {t('clinics.sendEmail')}</>
                  }
                </button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

// ─── KPI Summary Cards ────────────────────────────────────────────────────────
const KpiCard = ({ icon: Icon, label, value, colorClass, bgClass, borderClass, ringClass, barGradient, glowClass, pct }) => (
  <div className={`relative rounded-2xl border ${borderClass} bg-white dark:bg-wellq-dark p-5 overflow-hidden group transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5`}>
    {/* Top glow */}
    <div className={`absolute top-0 left-0 right-0 h-20 bg-gradient-to-b ${glowClass ?? 'from-transparent'} to-transparent opacity-60 pointer-events-none`} />
    <div className="relative flex items-start justify-between mb-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bgClass} ring-1 ${ringClass} shadow-sm transition-transform duration-200 group-hover:scale-105`}>
        <Icon size={17} className={colorClass} strokeWidth={2.2} />
      </div>
      <span className="text-[10px] font-bold bg-black/5 dark:bg-white/5 text-wellq-gray px-2.5 py-1 rounded-lg tracking-wider uppercase">Live</span>
    </div>
    <div className="relative">
      <p className="text-xs font-bold text-wellq-gray uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-3xl font-black ${colorClass} leading-none tabular-nums tracking-tight`}>{value}</p>
    </div>
    <div className="mt-4 h-1 bg-black/[0.05] dark:bg-white/[0.05] rounded-full overflow-hidden">
      <motion.div
        className={`h-full bg-gradient-to-r ${barGradient} rounded-full`}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.15 }}
      />
    </div>
  </div>
);

// ─── ClinicsView Principal ────────────────────────────────────────────────────
export const ClinicsView = ({ apiClinics, clinicsLoading, onImpersonate, onRefreshClinics }) => {
  const { t } = useLanguage();

  const [filter,         setFilter]         = useState('all');
  const [filterOpen,     setFilterOpen]     = useState(false);
  const [filterTier,     setFilterTier]     = useState('');
  const [filterStatus,   setFilterStatus]   = useState('');
  const filterRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const [selected,       setSelected]       = useState(null);
  const [settingsClinic, setSettingsClinic] = useState(null);
  const [invoiceClinic,  setInvoiceClinic]  = useState(null);
  const [bulkOpen,       setBulkOpen]       = useState(false);
  const [deleteTarget,   setDeleteTarget]   = useState(null);
  const [exportState, setExportState] = useState('idle'); // 'idle' | 'loading' | 'error'
  const [deleting,     setDeleting]     = useState(false);
  const [checkedIds,     setCheckedIds]     = useState(new Set());

  const clinics  = apiClinics.length > 0 ? apiClinics : HARDCODED_CLINICS;
  const filtered = clinics.filter((c) => {
    if (filter === 'active'  && !(c.status === 'Active'  || c.status === 'active'))  return false;
    if (filter === 'at_risk' && !((c.healthScore ?? 0) < 70 && (c.healthScore ?? 0) > 0)) return false;
    if (filter === 'churned' && !(c.status === 'churned' || c.status === 'Churned')) return false;
    if (filterTier   && c.tier   !== filterTier)   return false;
    if (filterStatus && c.status !== filterStatus) return false;
    return true;
  });

  const closeAll     = () => { setSelected(null); setSettingsClinic(null); setInvoiceClinic(null); };
  const activeDrawer = selected ?? settingsClinic ?? invoiceClinic;

  const allChecked  = filtered.length > 0 && filtered.every((c) => checkedIds.has(c.clinic_id ?? c.id));
  const someChecked = !allChecked && filtered.some((c) => checkedIds.has(c.clinic_id ?? c.id));

  const handleSelectAll = (e) => {
    if (e.target.checked) setCheckedIds(new Set(filtered.map((c) => c.clinic_id ?? c.id)));
    else                  setCheckedIds(new Set());
  };

  const handleCheck = (clinic, checked) => {
    const id = clinic.clinic_id ?? clinic.id;
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.clinic_id ?? deleteTarget.id;
    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/api/clinics/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setDeleteTarget(null);
      onRefreshClinics && onRefreshClinics();
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setDeleting(false);
    }
  };

  // KPIs derivados de la lista real
  const totalClinics  = clinics.length;
  const activeClinics = clinics.filter((c) => c.status === 'Active' || c.status === 'active').length;
  const atRiskClinics = clinics.filter((c) => (c.healthScore ?? 0) < 70 && (c.healthScore ?? 0) > 0).length;
  const totalPatients = clinics.reduce((acc, c) => acc + (c.patientsUsed ?? c.patient_count ?? 0), 0);

  return (
    <motion.div
      className="space-y-7 font-sans"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* ── KPI Cards ── */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 xl:grid-cols-4 gap-5">
        <KpiCard
          icon={Building2}
          label={t('clinics.totalClinics') ?? 'Total Clinics'}
          value={totalClinics}
          colorClass="text-wellq-cyan"
          bgClass="bg-wellq-cyan/10 dark:bg-wellq-cyan/10"
          borderClass="border-wellq-cyan/20 dark:border-wellq-cyan/30"
          ringClass="ring-wellq-cyan/20 dark:ring-wellq-cyan/10"
          barGradient="from-wellq-cyan to-wellq-blue"
          glowClass="from-wellq-cyan/10"
          pct={100}
        />
        <KpiCard
          icon={Activity}
          label={t('clinics.activeClinics') ?? 'Active Clinics'}
          value={activeClinics}
          colorClass="text-wellq-green"
          bgClass="bg-wellq-green/10 dark:bg-wellq-green/10"
          borderClass="border-wellq-green/20 dark:border-wellq-green/30"
          ringClass="ring-wellq-green/20 dark:ring-wellq-green/10"
          barGradient="from-wellq-green to-teal-400"
          glowClass="from-wellq-green/10"
          pct={totalClinics > 0 ? Math.round((activeClinics / totalClinics) * 100) : 0}
        />
        <KpiCard
          icon={TrendingDown}
          label={t('clinics.atRisk') ?? 'At Risk'}
          value={atRiskClinics}
          colorClass="text-amber-500 dark:text-amber-400"
          bgClass="bg-amber-500/10 dark:bg-amber-900/10"
          borderClass="border-amber-200/60 dark:border-amber-700/30"
          ringClass="ring-amber-200/60 dark:ring-amber-700/20"
          barGradient="from-amber-400 to-orange-400"
          glowClass="from-amber-400/10"
          pct={totalClinics > 0 ? Math.round((atRiskClinics / totalClinics) * 100) : 0}
        />
        <KpiCard
          icon={Users}
          label={t('clinics.totalPatients') ?? 'Total Patients'}
          value={totalPatients.toLocaleString()}
          colorClass="text-wellq-blue"
          bgClass="bg-wellq-blue/10 dark:bg-wellq-blue/10"
          borderClass="border-wellq-blue/20 dark:border-wellq-blue/30"
          ringClass="ring-wellq-blue/20 dark:ring-wellq-blue/10"
          barGradient="from-wellq-blue to-wellq-cyan"
          glowClass="from-wellq-blue/10"
          pct={80}
        />
      </motion.div>

      {/* ── Tabla principal ── */}
      <motion.div variants={itemVariants}>
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-5">
          {/* Tabs de filtro */}
          <div className="flex items-center gap-1 p-1 bg-wellq-gray/10 dark:bg-white/5 rounded-xl">
            {[
              { key: 'all',     label: t('clinics.all') },
              { key: 'active',  label: t('clinics.active') },
              { key: 'at_risk', label: t('clinics.atRisk') },
              { key: 'churned', label: t('clinics.churned') },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                  filter === key
                    ? 'bg-white dark:bg-wellq-dark shadow-sm text-wellq-dark dark:text-white'
                    : 'text-wellq-gray hover:text-wellq-dark dark:hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Acciones rápidas + Filtro avanzado */}
          <div className="flex items-center gap-2">
            {/* Export */}
            <button
              onClick={async () => {
                setExportState('loading');
                try {
                  const params = new URLSearchParams();
                  if (filterTier)   params.set('tier',   filterTier);
                  if (filterStatus) params.set('status', filterStatus);
                  const res = await fetch(`${API_BASE}/api/clinics/export?${params}`);
                  if (!res.ok) throw new Error(`HTTP ${res.status}`);
                  const blob = await res.blob();
                  const url  = URL.createObjectURL(blob);
                  const a    = document.createElement('a');
                  a.href     = url;
                  a.download = `clinicas_${new Date().toISOString().slice(0, 10)}.xlsx`;
                  a.click();
                  URL.revokeObjectURL(url);
                  setExportState('idle');
                } catch {
                  setExportState('error');
                  setTimeout(() => setExportState('idle'), 3000);
                }
              }}
              disabled={exportState === 'loading'}
              className={`flex items-center gap-2 px-3.5 py-2 border rounded-xl text-sm font-semibold transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                exportState === 'error'
                  ? 'border-red-400/50 text-red-400 bg-red-500/5'
                  : 'border-wellq-gray/30 dark:border-wellq-gray/20 text-wellq-dark dark:text-white hover:bg-wellq-gray/5 dark:hover:bg-white/5'
              }`}
            >
              {exportState === 'loading'
                ? <><Loader2 size={14} className="animate-spin" /> {t('clinics.export')}</>
                : exportState === 'error'
                ? <><X size={14} /> Export fallido</>
                : <><Download size={14} strokeWidth={2.2} /> {t('clinics.export')}</>
              }
            </button>

            {/* Filtro avanzado */}
            <div className="relative" ref={filterRef}>
            <button
              onClick={() => setFilterOpen((v) => !v)}
              className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                filterTier || filterStatus
                  ? 'border-wellq-cyan text-wellq-cyan bg-wellq-cyan/5'
                  : 'border-wellq-gray/30 dark:border-wellq-gray/20 text-wellq-dark dark:text-white hover:bg-wellq-gray/5 dark:hover:bg-white/5'
              }`}
            >
              <Filter size={15} strokeWidth={2.2} />
              {t('clinics.filters')}
              {(filterTier || filterStatus) && (
                <span className="ml-1 w-4 h-4 rounded-full bg-wellq-cyan text-wellq-black text-[10px] font-bold flex items-center justify-center">
                  {[filterTier, filterStatus].filter(Boolean).length}
                </span>
              )}
            </button>

            <AnimatePresence>
              {filterOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0,  scale: 1    }}
                  exit={{   opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 z-50 w-64 bg-white dark:bg-wellq-dark rounded-2xl shadow-2xl border border-wellq-gray/15 dark:border-wellq-gray/20 p-4 space-y-4"
                >
                  <div>
                    <label className="block text-xs font-bold text-wellq-gray uppercase tracking-wider mb-1.5">Tier</label>
                    <select
                      value={filterTier}
                      onChange={(e) => setFilterTier(e.target.value)}
                      className="w-full px-3 py-2 border border-wellq-gray/30 rounded-xl text-sm text-wellq-dark dark:text-white dark:bg-wellq-dark/80 focus:outline-none focus:ring-2 focus:ring-wellq-cyan"
                    >
                      <option value="">Todos</option>
                      <option value="trial">Trial</option>
                      <option value="smb">SMB</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-wellq-gray uppercase tracking-wider mb-1.5">Estado</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full px-3 py-2 border border-wellq-gray/30 rounded-xl text-sm text-wellq-dark dark:text-white dark:bg-wellq-dark/80 focus:outline-none focus:ring-2 focus:ring-wellq-cyan"
                    >
                      <option value="">Todos</option>
                      <option value="active">Active</option>
                      <option value="warning">Warning</option>
                      <option value="critical">Critical</option>
                      <option value="churned">Churned</option>
                    </select>
                  </div>
                  <div className="flex justify-between pt-1">
                    <button
                      onClick={() => { setFilterTier(''); setFilterStatus(''); }}
                      className="text-xs text-wellq-gray hover:text-wellq-dark dark:hover:text-white transition-colors cursor-pointer font-medium"
                    >
                      Limpiar filtros
                    </button>
                    <button
                      onClick={() => setFilterOpen(false)}
                      className="px-3 py-1.5 bg-wellq-cyan text-wellq-black rounded-lg text-xs font-bold cursor-pointer"
                    >
                      Aplicar
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

            {/* Bulk Email */}
            <button
              onClick={() => setBulkOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-wellq-cyan to-wellq-blue text-wellq-black rounded-xl text-sm font-bold hover:opacity-90 transition-all cursor-pointer shadow-md shadow-wellq-cyan/25"
            >
              <Mail size={14} strokeWidth={2.2} /> {t('clinics.bulkEmail')}
            </button>

          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white dark:bg-wellq-dark rounded-2xl shadow-sm border border-wellq-gray/15 dark:border-wellq-gray/20 overflow-hidden">
          <table className="w-full">
            <thead className="bg-wellq-gray/4 dark:bg-white/[0.02] border-b border-wellq-gray/15 dark:border-wellq-gray/20 sticky top-0">
              <tr>
                <th className="py-4 px-4 text-left w-12">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    ref={(el) => { if (el) el.indeterminate = someChecked; }}
                    onChange={handleSelectAll}
                    className="rounded border-wellq-gray/30 dark:border-wellq-gray/40 text-wellq-cyan cursor-pointer"
                  />
                </th>
                {[
                  t('clinics.columns.clinic'),
                  t('clinics.columns.plan'),
                  t('clinics.columns.status'),
                  t('clinics.columns.licenseUsage'),
                  t('clinics.columns.health'),
                  t('clinics.columns.lastLogin'),
                  t('clinics.columns.actions'),
                ].map((h) => (
                  <th key={h} className="py-4 px-4 text-left text-[10px] font-bold text-wellq-gray uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clinicsLoading
                ? [...Array(4)].map((_, i) => (
                    <tr key={i} className="border-b border-wellq-gray/10 dark:border-wellq-gray/30">
                      <td colSpan={8} className="py-3 px-4">
                        <Skeleton className="h-8 w-full" />
                      </td>
                    </tr>
                  ))
                : filtered.map((clinic, i) => (
                    <motion.tr
                      key={clinic.clinic_id ?? clinic.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03, duration: 0.25 }}
                      // ClinicRow renderiza su propio <tr>, así que envolvemos en fragment
                      // y pasamos el componente directamente:
                      style={{ display: 'contents' }}
                    >
                      <ClinicRow
                        clinic={clinic}
                        onSelect={setSelected}
                        selected={
                          selected?.clinic_id === clinic.clinic_id ||
                          selected?.id === clinic.id
                        }
                        checked={checkedIds.has(clinic.clinic_id ?? clinic.id)}
                        onCheck={handleCheck}
                        onImpersonate={setSelected}
                        onSettings={(c) => { closeAll(); setSettingsClinic(c); }}
                        onInvoices={(c) => { closeAll(); setInvoiceClinic(c); }}
                        onDelete={setDeleteTarget}
                      />
                    </motion.tr>
                  ))}
            </tbody>
          </table>

          {/* Footer paginación */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-wellq-gray/10 dark:border-white/5 bg-wellq-gray/3 dark:bg-white/[0.02]">
            <span className="text-xs font-semibold text-wellq-gray">
              {checkedIds.size > 0
                ? <><span className="font-black text-wellq-cyan">{checkedIds.size}</span> {t('clinics.selected')}{checkedIds.size !== 1 ? 's' : ''} {t('clinics.of')} {filtered.length}</>
                : <>{t('clinics.showing')} <span className="font-bold text-wellq-dark dark:text-white">{filtered.length > 0 ? '1' : '0'}–{filtered.length}</span> {t('clinics.of')} {filtered.length} {t('clinics.clinics')}</>
              }
            </span>
            <div className="flex items-center gap-1.5">
              <button className="p-1.5 border border-wellq-gray/20 dark:border-wellq-gray/20 rounded-lg text-sm font-medium text-wellq-gray hover:bg-white dark:hover:bg-white/5 transition-colors disabled:opacity-40 cursor-not-allowed" disabled>
                <ChevronLeft size={15} strokeWidth={2.2} />
              </button>
              <button className="w-8 h-8 bg-wellq-cyan text-wellq-black rounded-lg text-sm font-black">1</button>
              <button className="p-1.5 border border-wellq-gray/20 dark:border-wellq-gray/20 rounded-lg text-sm font-medium text-wellq-gray hover:bg-white dark:hover:bg-white/5 transition-colors disabled:opacity-40 cursor-not-allowed" disabled>
                <ChevronRight size={15} strokeWidth={2.2} />
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Drawer ── */}
      <AnimatePresence>
        {activeDrawer && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/55 z-[200]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeAll}
            />
            <ClinicDrawer
              clinic={activeDrawer}
              mode={settingsClinic ? 'settings' : invoiceClinic ? 'invoices' : 'overview'}
              onClose={closeAll}
            />
          </>
        )}
      </AnimatePresence>

      {bulkOpen && (
        <BulkEmailModal
          onClose={() => setBulkOpen(false)}
          clinicCount={filtered.length}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title={t('clinics.deleteTitle')}
        message={`${t('clinics.deleteMessage')} "${deleteTarget?.name}"? ${t('clinics.deleteWarning')}`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </motion.div>
  );
};