import { useEffect, useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Bug, CreditCard, Sparkles, MessageSquare,
  Building2, User, Mail, CheckCircle2,
  Clock, Send, ArrowRight, Hash, UserCheck,
  ChevronDown, Loader2, AlertCircle, UserCog, Trash2,
  Info, Settings,
} from 'lucide-react';
import { toast } from 'sonner';
import { fetchSupportTicket, fetchSupportResponders, patchSupportTicket, deleteSupportTicket } from '../../api/client';
import { useLanguage } from '../../contexts/LanguageContext';

// ─── Design tokens ────────────────────────────────────────────────────────────
const STATUS_META = {
  Open: {
    badge:   'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700/40',
    banner:  'from-amber-400 to-orange-400',
    dot:     'bg-amber-500',
    icon:    Clock,
    pulse:   true,
  },
  Closed: {
    badge:   'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700/40',
    banner:  'from-emerald-400 to-teal-400',
    dot:     'bg-emerald-500',
    icon:    CheckCircle2,
    pulse:   false,
  },
  Sent: {
    badge:   'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700/40',
    banner:  'from-wellq-blue to-blue-400',
    dot:     'bg-wellq-blue',
    icon:    Send,
    pulse:   false,
  },
};

const CATEGORY_META = {
  Bug:     { icon: Bug,           cls: 'text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20' },
  Billing: { icon: CreditCard,    cls: 'text-purple-500 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20' },
  Feature: { icon: Sparkles,      cls: 'text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20' },
  Request: { icon: MessageSquare, cls: 'text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10' },
};

// Fallback hardcodeado — se usa sólo si no se reciben categorías dinámicas desde la API
const CATEGORY_TO_GROUP_FALLBACK = {
  Billing: 'Financiero',
  Bug:     'Técnico',
  Feature: 'Técnico',
  Request: 'General',
};

// ─── Formatters ────────────────────────────────────────────────────────────────
const fmtLong  = (iso) => iso
  ? new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : '—';

const fmtShort = (iso) => iso
  ? new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
  : null;

const fmtRelative = (iso) => {
  if (!iso) return null;
  const diff  = Date.now() - new Date(iso).getTime();
  const days  = Math.floor(diff / 86_400_000);
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return '1 day ago';
  if (days <  30) return `${days} days ago`;
  return null;
};

// ─── Drawer component ─────────────────────────────────────────────────────────
export const SupportTicketDrawer = ({ ticketId, onClose, onUpdated, categories = [], canManageTickets = false }) => {
  const { t } = useLanguage();

  const [ticket,      setTicket]     = useState(null);
  const [loading,     setLoading]    = useState(true);
  const [error,       setError]      = useState(null);

  // Acciones
  const [responders,   setResponders]   = useState([]);
  const [selectedResp, setSelectedResp] = useState('');
  const [solution,     setSolution]     = useState('');
  const [saving,       setSaving]       = useState(false);
  const [actionError,  setActionError]  = useState(null);

  // Eliminar ticket
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting,      setDeleting]      = useState(false);

  // Tab navigation
  const [activeTab, setActiveTab] = useState('info');

  const isClosed = ticket?.status === 'Closed';
  const isSent   = ticket?.status === 'Sent';
  const isOpen   = ticket?.status === 'Open';

  // Evitar quedar en una pestaña inexistente al cerrar el ticket
  useEffect(() => {
    if ((!canManageTickets || isClosed) && activeTab === 'gestionar') {
      setActiveTab('info');
    }
    if (!canManageTickets && activeTab === 'avanzado') {
      setActiveTab('info');
    }
  }, [activeTab, canManageTickets, isClosed]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Keyboard close
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Fetch ticket y responders en paralelo
  useEffect(() => {
    setActiveTab('info');
    if (!ticketId) return;
    setLoading(true);
    setError(null);
    Promise.all([
      fetchSupportTicket(ticketId),
      fetchSupportResponders().catch(() => ({ responders: [] })), // no bloquear si falla
    ])
      .then(([tk, resp]) => {
        setTicket(tk);
        setSolution(tk?.solution ?? '');
        setSelectedResp(tk?.responder_id ?? '');
        setResponders(resp?.responders ?? []);
      })
      .catch((err) => setError(err.message ?? 'Error loading ticket'))
      .finally(() => setLoading(false));
  }, [ticketId]);

  // ── Mapeo categoría → grupo
  const categoryToGroup = useMemo(() => {
    if (!categories || categories.length === 0) return CATEGORY_TO_GROUP_FALLBACK;
    const dynamic = categories.reduce((acc, cat) => {
      if (cat.name && cat.team) acc[cat.name] = cat.team;
      return acc;
    }, {});
    return Object.keys(dynamic).length > 0 ? dynamic : CATEGORY_TO_GROUP_FALLBACK;
  }, [categories]);

  // ── Responder actualmente asignado
  const assignedResponder = useMemo(() => {
    if (!ticket?.responder_id || responders.length === 0) return null;
    return responders.find((r) => r.id === ticket.responder_id) ?? null;
  }, [ticket?.responder_id, responders]);

  // ── Equipo sugerido para el ticket actual (para resaltarlo en el select)
  const suggestedTeam = useMemo(() => {
    if (!ticket?.category) return null;
    return categoryToGroup[ticket.category] ?? null;
  }, [ticket?.category, categoryToGroup]);

  // Agrupa TODOS los responders por equipo — sin filtrar ni ocultar ninguno
  const respondersByTeam = useMemo(() => {
    return responders.reduce((acc, r) => {
      const group = r.group || 'General';
      if (!acc[group]) acc[group] = [];
      acc[group].push(r);
      return acc;
    }, {});
  }, [responders]);

  // Equipo sugerido al inicio; el resto en orden alfabético
  const sortedTeams = useMemo(() => {
    return Object.keys(respondersByTeam).sort((a, b) => {
      if (suggestedTeam) {
        if (a === suggestedTeam) return -1;
        if (b === suggestedTeam) return  1;
      }
      return a.localeCompare(b);
    });
  }, [respondersByTeam, suggestedTeam]);

  // ── Acción central
  const handleAction = async (body, successMsg) => {
    if (!canManageTickets) return;
    setSaving(true);
    setActionError(null);
    try {
      await patchSupportTicket(ticketId, body);
      const fresh = await fetchSupportTicket(ticketId);
      setTicket(fresh);
      setSolution(fresh?.solution ?? '');
      setSelectedResp(fresh?.responder_id ?? '');
      toast.success(successMsg);
      onUpdated?.();
    } catch (err) {
      const msg = err.message ?? t('support.errorUpdateTicket');
      setActionError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleTakeTicket = () => {
    if (!selectedResp && responders.length > 0) {
      setActionError(t('support.selectResponderBeforeTaking'));
      return;
    }
    const resp = responders.find((r) => r.id === selectedResp);
    handleAction(
      { status: 'Open', responder_id: selectedResp || undefined, responder_name: resp?.name },
      t('support.ticketTaken'),
    );
  };

  const handleReassign = () => {
    if (!selectedResp) {
      setActionError(t('support.selectResponderBeforeReassigning'));
      return;
    }
    const resp = responders.find((r) => r.id === selectedResp);
    handleAction(
      { responder_id: selectedResp, responder_name: resp?.name },
      t('support.ticketReassigned'),
    );
  };

  const handleCloseTicket = () => {
    if (!solution.trim()) {
      setActionError(t('support.solutionRequired'));
      return;
    }
    const resp = responders.find((r) => r.id === selectedResp);
    handleAction(
      {
        status:         'Closed',
        solution:       solution.trim(),
        responder_id:   selectedResp || undefined,
        responder_name: resp?.name,
      },
      t('support.ticketClosed'),
    );
  };

  const handleDelete = async () => {
    if (!canManageTickets) return;
    setDeleting(true);
    try {
      await deleteSupportTicket(ticketId);
      toast.success(t('support.ticketDeleted'));
      onUpdated?.();
      onClose(true);
    } catch (err) {
      toast.error(err.message ?? t('support.errorDeleteTicket'));
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  const status  = ticket ? (STATUS_META[ticket.status]     ?? STATUS_META.Open)     : null;
  const catMeta = ticket ? (CATEGORY_META[ticket.category] ?? CATEGORY_META.Request) : null;
  const CatIcon    = catMeta?.icon ?? MessageSquare;
  const StatusIcon = status?.icon  ?? Clock;

  return createPortal(
    <>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
        className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
        onClick={() => onClose(false)}
        aria-hidden="true"
      />

      {/* Panel */}
      <motion.aside
        key="panel"
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0,      opacity: 1 }}
        exit={{   x: '100%',  opacity: 0 }}
        transition={{ type: 'spring', stiffness: 340, damping: 34, mass: 0.9 }}
        className="fixed right-0 top-0 h-full w-full max-w-[460px] z-[110] flex flex-col bg-white dark:bg-wellq-dark shadow-2xl border-l border-wellq-gray/20 dark:border-white/10 font-sans"
        aria-label="Ticket details"
        role="dialog"
      >
        {/* Color banner */}
        {ticket && (
          <div className={`h-[3px] w-full bg-gradient-to-r ${status.banner} flex-shrink-0 opacity-90`} />
        )}

        {/* Header */}
        <div className="flex items-start gap-3 px-6 py-5 border-b border-wellq-gray/10 dark:border-white/5 bg-wellq-gray/3 dark:bg-white/[0.02] flex-shrink-0">
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="space-y-3 pt-1">
                <div className="h-3 w-24 bg-wellq-gray/10 dark:bg-white/10 rounded-full animate-pulse" />
                <div className="h-4 w-3/4 bg-wellq-gray/20 dark:bg-white/20 rounded-full animate-pulse" />
              </div>
            ) : ticket ? (
              <>
                <div className="flex items-center gap-2.5 mb-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-wellq-gray">
                    <Hash size={10} strokeWidth={2.5} />
                    {ticket.ticket_id}
                  </span>
                  <ArrowRight size={10} strokeWidth={2.5} className="text-wellq-gray/50" />
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border shadow-sm ${status.badge}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${status.dot} ${status.pulse ? 'animate-pulse' : ''}`} />
                    <StatusIcon size={10} strokeWidth={2.5} />
                    {ticket.status}
                  </span>
                </div>
                <h2 className="text-lg font-black text-wellq-dark dark:text-white leading-tight tracking-tight">
                  {ticket.title}
                </h2>
              </>
            ) : null}
          </div>

          <button
            onClick={() => onClose(false)}
            className="p-2 rounded-xl text-wellq-gray hover:text-wellq-dark dark:hover:text-white hover:bg-wellq-gray/10 dark:hover:bg-white/10 transition-colors flex-shrink-0 mt-1 cursor-pointer"
            aria-label="Close"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        {/* ── Tab bar dinámico ── */}
        {!loading && ticket && (
          <div className="flex-shrink-0 flex items-end gap-0 px-6 border-b border-wellq-gray/10 dark:border-white/5 bg-white dark:bg-wellq-dark">
            {[
              { id: 'info',      label: t('support.tabInfo'),      Icon: Info },
              ...(canManageTickets && !isClosed ? [{ id: 'gestionar', label: t('support.tabManage'), Icon: Settings }] : []),
              ...(canManageTickets ? [{ id: 'avanzado', label: t('support.tabAdvanced'), Icon: AlertCircle }] : []),
            ].map(({ id, label, Icon: TabIcon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`relative flex items-center gap-1.5 py-3.5 px-1 mr-7 text-[11px] font-bold uppercase tracking-widest transition-colors cursor-pointer ${
                  activeTab === id
                    ? id === 'avanzado'
                        ? 'text-red-500 dark:text-red-400'
                        : 'text-wellq-dark dark:text-white'
                    : 'text-wellq-gray/50 hover:text-wellq-gray dark:hover:text-white/60'
                }`}
              >
                <TabIcon size={11} strokeWidth={2.5} />
                {label}
                {/* Urgency dot on Gestionar when ticket is Sent */}
                {id === 'gestionar' && isSent && activeTab !== 'gestionar' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                )}
                {activeTab === id && (
                  <motion.div
                    layoutId="tab-indicator"
                    className={`absolute bottom-0 left-0 right-0 h-[2px] rounded-t-full ${
                      id === 'avanzado'
                        ? 'bg-red-500 dark:bg-red-400'
                        : 'bg-wellq-dark dark:bg-white' // ACÁ ESTÁ EL CAMBIO: Color minimalista en lugar del degradado celeste
                    }`}
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Body — scrolleable */}
        <div className="flex-1 overflow-y-auto overscroll-contain bg-white dark:bg-wellq-dark [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full dark:[&::-webkit-scrollbar-thumb]:bg-white/10">

          {loading && (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-8 h-8 border-2 border-wellq-cyan/30 border-t-wellq-cyan rounded-full animate-spin" />
              <p className="text-xs font-bold text-wellq-gray uppercase tracking-widest">{t('common.loading')}</p>
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center ring-1 ring-red-200 dark:ring-red-500/20">
                <X size={20} className="text-red-500" strokeWidth={2.5} />
              </div>
              <p className="text-sm font-bold text-red-500 tracking-tight">{error}</p>
            </div>
          )}

          {!loading && ticket && (
            <AnimatePresence mode="wait">

              {/* ══════════════════════════════════════════════════════════════
                  INFO TAB — visible when activeTab === 'info'
                ══════════════════════════════════════════════════════════════ */}
              {(activeTab === 'info') && (
                <motion.div
                  key="tab-info"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="px-6 py-6 space-y-8"
                >
                  {/* Category pill */}
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider border shadow-sm ${catMeta.cls}`}>
                    <CatIcon size={12} strokeWidth={2.5} />
                    {ticket.category}
                  </div>

                  {/* Description */}
                  {ticket.description && (
                    <Section label={t('support.description')}>
                      <div className="bg-wellq-gray/5 dark:bg-white/[0.02] rounded-xl p-5 border border-wellq-gray/10 dark:border-white/5 shadow-sm">
                        <p className="text-sm font-medium text-wellq-dark dark:text-white/90 leading-relaxed whitespace-pre-wrap tracking-tight">
                          {ticket.description}
                        </p>
                      </div>
                    </Section>
                  )}

                  {/* Solution — solo lectura si ya existe */}
                  {ticket.solution && (
                    <Section label={t('support.solution')} accent="emerald">
                      <div className="bg-emerald-50/80 dark:bg-emerald-500/5 rounded-xl p-5 border border-emerald-200/70 dark:border-emerald-500/20 shadow-sm">
                        <div className="flex items-start gap-3">
                          <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0 mt-0.5" strokeWidth={2.2} />
                          <p className="text-sm font-bold text-emerald-900 dark:text-emerald-400 leading-relaxed whitespace-pre-wrap tracking-tight">
                            {ticket.solution}
                          </p>
                        </div>
                      </div>
                    </Section>
                  )}

                  {/* Details grid */}
                  <Section label="Details">
                    <div className="rounded-xl border border-wellq-gray/10 dark:border-white/5 overflow-hidden divide-y divide-wellq-gray/10 dark:divide-white/5 bg-wellq-gray/3 dark:bg-white/[0.02]">
                      <DetailRow icon={Building2} label={t('support.clinic')}   value={ticket.clinic_name ?? ticket.clinic_id} />
                      <DetailRow icon={User}      label={t('support.reporter')} value={ticket.reporter_name ?? '—'} />
                      <DetailRow icon={Mail}      label={t('support.email')}    value={ticket.reporter_email ?? '—'} isEmail />
                      {ticket.responder_name && (
                        <DetailRow icon={UserCheck} label={t('support.responder')} value={ticket.responder_name} accent />
                      )}
                      {assignedResponder?.email && (
                        <DetailRow
                          icon={Mail}
                          label={t('support.responderEmail')}
                          value={assignedResponder.email}
                          isEmail
                          accent
                        />
                      )}
                    </div>
                  </Section>

                  {/* Timeline */}
                  <Section label="Timeline">
                    <div className="space-y-0 relative mt-2">
                      {ticket.closed_at && (
                        <div className="absolute left-[15px] top-[30px] bottom-[30px] w-[2px] bg-wellq-gray/10 dark:bg-white/10 rounded-full" />
                      )}
                      <TimelineItem
                        Icon={StatusIcon}
                        label={t('support.reportedAt')}
                        dateShort={fmtShort(ticket.reported_at)}
                        dateLong={fmtLong(ticket.reported_at)}
                        relative={fmtRelative(ticket.reported_at)}
                        dotColor={status.dot}
                        active
                      />
                      {ticket.closed_at && (
                        <TimelineItem
                          Icon={CheckCircle2}
                          label={t('support.closedAt')}
                          dateShort={fmtShort(ticket.closed_at)}
                          dateLong={fmtLong(ticket.closed_at)}
                          relative={fmtRelative(ticket.closed_at)}
                          dotColor="bg-emerald-500"
                          active
                        />
                      )}
                    </div>
                  </Section>

                  {/* ── Closed-only blocks (banner) ── */}
                  {isClosed && (
                    <div className="flex items-center gap-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-500/5 border border-emerald-200/70 dark:border-emerald-500/20 px-5 py-4">
                      <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0" strokeWidth={2.5} />
                      <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {t('support.ticketClosedReadOnly')}
                      </p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ══════════════════════════════════════════════════════════════
                  GESTIONAR TAB — only when ticket is open/sent
                ══════════════════════════════════════════════════════════════ */}
              {canManageTickets && activeTab === 'gestionar' && !isClosed && (
                <motion.div
                  key="tab-gestionar"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                >
                  {/* Form fields — scrollable region */}
                  <div className="px-6 pt-6 pb-4 space-y-5">

                    {/* Error de acción */}
                    <AnimatePresence>
                      {actionError && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="flex items-center gap-2 text-xs font-bold text-red-500 bg-red-50 dark:bg-red-500/10 border border-red-200/60 dark:border-red-500/20 rounded-xl px-4 py-2.5"
                        >
                          <AlertCircle size={14} strokeWidth={2.5} className="flex-shrink-0" />
                          {actionError}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Selector de responder */}
                    {responders.length > 0 && (
                      <div className="rounded-xl border border-wellq-gray/10 dark:border-white/5 bg-wellq-gray/3 dark:bg-white/[0.02] p-5 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-wellq-gray flex items-center gap-1.5">
                            <UserCog size={11} strokeWidth={2.5} />
                            {isSent ? t('support.assignTo') : t('support.reassignTo')}
                          </label>
                          {ticket.category && (
                            <span className="text-[9px] font-bold text-wellq-gray/50 tracking-normal bg-wellq-gray/10 dark:bg-white/5 px-2 py-0.5 rounded-md">
                              {t('support.suggestedTeam')}: {categoryToGroup[ticket.category] ?? t('common.general')}
                            </span>
                          )}
                        </div>
                        <CustomResponderSelect
                          value={selectedResp}
                          onChange={(id) => { setSelectedResp(id); setActionError(null); }}
                          disabled={saving}
                          sortedTeams={sortedTeams}
                          respondersByTeam={respondersByTeam}
                          suggestedTeam={suggestedTeam}
                          placeholder={t('support.selectResponder')}
                        />
                      </div>
                    )}

                    {/* Área de solución — solo en Open */}
                    {isOpen && (
                      <div className="rounded-xl border border-wellq-gray/10 dark:border-white/5 bg-wellq-gray/3 dark:bg-white/[0.02] p-5 space-y-3">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-wellq-gray flex items-center gap-1.5">
                          <CheckCircle2 size={11} strokeWidth={2.5} />
                          {t('support.solution')}
                        </label>
                        <textarea
                          value={solution}
                          onChange={(e) => { setSolution(e.target.value); setActionError(null); }}
                          disabled={saving}
                          placeholder={t('support.solutionPlaceholder')}
                          rows={5}
                          className="w-full resize-none px-4 py-3 text-sm font-medium rounded-xl border border-wellq-gray/20 dark:border-white/10 bg-white dark:bg-wellq-dark text-wellq-dark dark:text-white placeholder:text-wellq-gray/50 focus:outline-none focus:ring-2 focus:ring-wellq-cyan focus:border-wellq-cyan transition-all disabled:opacity-50"
                        />
                      </div>
                    )}
                  </div>

                  {/* ── Botones de acción — sticky al fondo del scroll area ── */}
                  <div className="sticky bottom-0 bg-white dark:bg-wellq-dark border-t border-wellq-gray/10 dark:border-white/5 px-6 py-4">
                    <div className="flex gap-2.5">
                      {isSent && (
                        <ActionButton
                          onClick={handleTakeTicket}
                          loading={saving}
                          icon={UserCheck}
                          label={t('support.takeTicket')}
                          variant="primary"
                        />
                      )}
                      {isOpen && (
                        <>
                          <ActionButton
                            onClick={handleReassign}
                            loading={saving}
                            icon={UserCog}
                            label={t('support.reassign')}
                            variant="secondary"
                            disabled={!selectedResp}
                          />
                          <ActionButton
                            onClick={handleCloseTicket}
                            loading={saving}
                            icon={CheckCircle2}
                            label={t('support.closeTicket')}
                            variant="success"
                            disabled={!solution.trim()}
                          />
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ══════════════════════════════════════════════════════════════
                  AVANZADO TAB — Siempre visible, contiene Danger Zone
                ══════════════════════════════════════════════════════════════ */}
              {canManageTickets && activeTab === 'avanzado' && (
                <motion.div
                  key="tab-avanzado"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="px-6 py-6 space-y-6"
                >
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-wellq-dark dark:text-white tracking-tight">
                      {t('support.advancedOptions')}
                    </h3>
                    <p className="text-xs font-medium text-wellq-gray leading-relaxed">
                      {t('support.advancedOptionsDesc')}
                    </p>
                  </div>

                  <DangerZone
                    confirmDelete={confirmDelete}
                    setConfirmDelete={setConfirmDelete}
                    deleting={deleting}
                    onDelete={handleDelete}
                    t={t}
                  />
                </motion.div>
              )}

            </AnimatePresence>
          )}
        </div>
      </motion.aside>
    </>,
    document.body
  );
};

// ─── Action Button ─────────────────────────────────────────────────────────────
const ActionButton = ({ onClick, loading, icon: Icon, label, variant, disabled }) => {
  const base = 'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed';
  const variants = {
    primary:   'bg-gradient-to-r from-wellq-blue to-wellq-cyan text-wellq-dark shadow-sm shadow-wellq-cyan/20 hover:shadow-md hover:shadow-wellq-cyan/30',
    secondary: 'bg-white dark:bg-wellq-dark border border-wellq-gray/20 dark:border-white/10 text-wellq-gray hover:text-wellq-dark dark:hover:text-white hover:bg-wellq-gray/5',
    success:   'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm shadow-emerald-500/20 hover:shadow-md hover:shadow-emerald-500/30',
  };

  return (
    <motion.button
      whileHover={!disabled && !loading ? { scale: 1.02 } : {}}
      whileTap={!disabled && !loading ? { scale: 0.97 } : {}}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]}`}
    >
      {loading
        ? <Loader2 size={14} strokeWidth={2.5} className="animate-spin" />
        : <Icon size={14} strokeWidth={2.5} />
      }
      {label}
    </motion.button>
  );
};

// ─── Section wrapper ──────────────────────────────────────────────────────────
const Section = ({ label, children, accent }) => {
  const labelCls = accent === 'emerald'
    ? 'text-emerald-600/70 dark:text-emerald-500/70'
    : 'text-wellq-gray';
  return (
    <div className="space-y-3">
      <p className={`text-[10px] font-bold uppercase tracking-widest ${labelCls}`}>{label}</p>
      {children}
    </div>
  );
};

// ─── Detail row ───────────────────────────────────────────────────────────────
const DetailRow = ({ icon: Icon, label, value, accent, isEmail }) => (
  <div className="flex items-center gap-4 px-5 py-3.5 hover:bg-wellq-gray/5 dark:hover:bg-white/[0.04] transition-colors group">
    <div className="w-8 h-8 rounded-lg bg-white dark:bg-wellq-dark flex items-center justify-center flex-shrink-0 ring-1 ring-wellq-gray/20 dark:ring-white/10 shadow-sm">
      <Icon size={14} className="text-wellq-gray dark:text-wellq-gray/80" strokeWidth={2.2} />
    </div>
    <div className="flex-1 flex items-center justify-between gap-4 min-w-0">
      <span className="text-xs font-semibold text-wellq-gray flex-shrink-0 uppercase tracking-wider">{label}</span>
      <span className={`text-sm font-bold text-right truncate max-w-[200px] tracking-tight ${accent ? 'text-wellq-cyan dark:text-wellq-cyan' : 'text-wellq-dark dark:text-white'}`}>
        {isEmail && value !== '—'
          ? <a href={`mailto:${value}`} className="hover:text-wellq-cyan transition-colors" onClick={(e) => e.stopPropagation()}>{value}</a>
          : value
        }
      </span>
    </div>
  </div>
);

// ─── Timeline item ────────────────────────────────────────────────────────────
const TimelineItem = ({ Icon, label, dateShort, dateLong, relative, dotColor, active }) => (
  <div className="relative flex items-start gap-4 pb-6 last:pb-0">
    <div className={`relative z-10 w-[32px] h-[32px] rounded-full bg-white dark:bg-wellq-dark border-2 ${
      active ? `border-white dark:border-wellq-dark ${dotColor} ring-2 ring-white dark:ring-wellq-dark` : 'border-wellq-gray/20 dark:border-white/10'
    } flex items-center justify-center flex-shrink-0 shadow-sm`}>
      <Icon size={14} strokeWidth={2.5} className={active ? 'text-white' : 'text-wellq-gray/50'} />
    </div>
    <div className="pt-0.5 min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-widest text-wellq-gray mb-1">{label}</p>
      <p className="text-sm font-black text-wellq-dark dark:text-white tracking-tight">
        {dateShort ?? dateLong}
        {relative && (
          <span className="ml-2 text-xs font-semibold text-wellq-gray/80 uppercase tracking-wider">{relative}</span>
        )}
      </p>
      <p className="text-xs font-medium text-wellq-gray mt-1">{dateLong}</p>
    </div>
  </div>
);

// ─── Danger Zone ──────────────────────────────────────────────────────────────
const DangerZone = ({ confirmDelete, setConfirmDelete, deleting, onDelete, t }) => {
  return (
    <div className="rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50/50 dark:bg-red-500/5 p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Trash2 size={16} className="text-red-500" strokeWidth={2.5} />
        <h3 className="text-sm font-bold text-red-600 dark:text-red-400">{t('support.dangerZone')}</h3>
      </div>
      <p className="text-xs font-medium text-red-600/80 dark:text-red-400/80 leading-relaxed">
        {t('support.deleteTicketWarning')}
      </p>
      <AnimatePresence mode="wait">
        {!confirmDelete ? (
          <motion.div
            key="btn-delete"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="pt-2"
          >
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold bg-white dark:bg-wellq-dark border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
            >
              {t('support.deleteTicket')}
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="confirm-actions"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="pt-2 flex gap-2"
          >
            <button
              onClick={() => setConfirmDelete(false)}
              disabled={deleting}
              className="flex-1 px-4 py-2.5 rounded-xl text-[13px] font-bold bg-wellq-gray/10 dark:bg-white/10 text-wellq-dark dark:text-white hover:bg-wellq-gray/20 dark:hover:bg-white/20 transition-colors disabled:opacity-50"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={onDelete}
              disabled={deleting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold bg-red-500 text-white hover:bg-red-600 transition-colors shadow-sm shadow-red-500/20 disabled:opacity-50"
            >
              {deleting ? <Loader2 size={14} strokeWidth={2.5} className="animate-spin" /> : <Trash2 size={14} strokeWidth={2.5} />}
              {t('support.confirmDeleteTicket')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
// ─── Helpers ──────────────────────────────────────────────────────────────────
const getInitials = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

// ─── CustomResponderSelect ────────────────────────────────────────────────────
const CustomResponderSelect = ({
  value,
  onChange,
  disabled,
  sortedTeams,
  respondersByTeam,
  suggestedTeam,
  placeholder = 'Seleccionar…',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Flatten all responders to find the currently selected one
  const allResponders = useMemo(
    () => sortedTeams.flatMap((team) => respondersByTeam[team] ?? []),
    [sortedTeams, respondersByTeam],
  );
  const selectedResponder = allResponders.find((r) => r.id === value) ?? null;

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const handleSelect = (id) => {
    onChange(id);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">

      {/* ── Trigger ── */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((o) => !o)}
        className={`w-full flex items-center gap-2.5 pl-3 pr-3 py-2.5 rounded-xl border bg-white dark:bg-wellq-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
          isOpen
            ? 'border-wellq-cyan ring-2 ring-wellq-cyan/25 shadow-sm shadow-wellq-cyan/10'
            : 'border-wellq-gray/20 dark:border-white/10 hover:border-wellq-gray/40 dark:hover:border-white/20'
        }`}
      >
        {/* Avatar */}
        {selectedResponder ? (
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-wellq-cyan to-wellq-blue flex items-center justify-center flex-shrink-0 text-[9px] font-black text-wellq-dark shadow-sm">
            {getInitials(selectedResponder.name)}
          </div>
        ) : (
          <div className="w-6 h-6 rounded-full bg-wellq-gray/10 dark:bg-white/10 flex items-center justify-center flex-shrink-0">
            <User size={11} strokeWidth={2.5} className="text-wellq-gray/60 dark:text-white/30" />
          </div>
        )}

        {/* Label */}
        <span className={`flex-1 text-left text-sm truncate ${
          selectedResponder
            ? 'font-bold text-wellq-dark dark:text-white'
            : 'font-medium text-wellq-gray/50 dark:text-white/25'
        }`}>
          {selectedResponder ? selectedResponder.name : placeholder}
        </span>

        {/* Animated chevron */}
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.18, ease: 'easeInOut' }}
          className="flex-shrink-0 ml-1"
        >
          <ChevronDown size={14} strokeWidth={2.5} className="text-wellq-gray/60 dark:text-white/30" />
        </motion.div>
      </button>

      {/* ── Floating panel ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{   opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            className="absolute z-50 mt-1.5 w-full max-h-[272px] overflow-y-auto rounded-xl border border-wellq-gray/15 dark:border-white/[0.08] bg-white dark:bg-wellq-dark shadow-2xl shadow-black/10 dark:shadow-black/50 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-wellq-gray/20 dark:[&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full"
          >
            {/* Placeholder / clear row */}
            <button
              type="button"
              onClick={() => handleSelect('')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors rounded-t-xl ${
                !value
                  ? 'bg-wellq-gray/5 dark:bg-white/[0.04] text-wellq-gray font-bold'
                  : 'text-wellq-gray/50 dark:text-white/25 font-semibold hover:bg-wellq-gray/5 dark:hover:bg-white/[0.03]'
              }`}
            >
              <div className="w-6 h-6 rounded-full bg-wellq-gray/10 dark:bg-white/10 flex items-center justify-center flex-shrink-0">
                <User size={11} strokeWidth={2.5} className="text-wellq-gray/50 dark:text-white/30" />
              </div>
              <span className="flex-1 text-left">{placeholder}</span>
              {!value && <CheckCircle2 size={12} strokeWidth={2.5} className="text-wellq-gray/50 flex-shrink-0" />}
            </button>

            <div className="h-px bg-wellq-gray/10 dark:bg-white/5 mx-2 my-0.5" />

            {/* Teams + responders */}
            {sortedTeams.map((team, idx) => (
              <div key={team} className={idx > 0 ? 'mt-0.5' : ''}>

                {/* Team header */}
                <div className="flex items-center gap-2 px-3 pt-2.5 pb-1">
                  <span className="text-[9px] font-black uppercase tracking-[0.1em] text-wellq-gray/50 dark:text-white/25">
                    {team}
                  </span>
                  {suggestedTeam === team && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wide bg-wellq-cyan/10 text-wellq-cyan border border-wellq-cyan/25 leading-none">
                      ★ Recomendado
                    </span>
                  )}
                </div>

                {/* Responders */}
                {(respondersByTeam[team] ?? []).map((r) => {
                  const isSelected = value === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => handleSelect(r.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-[7px] transition-colors ${
                        isSelected
                          ? 'bg-wellq-cyan/10 dark:bg-wellq-cyan/10'
                          : 'hover:bg-wellq-gray/5 dark:hover:bg-white/[0.04]'
                      }`}
                    >
                      {/* Avatar */}
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-black ${
                        isSelected
                          ? 'bg-gradient-to-br from-wellq-cyan to-wellq-blue text-wellq-dark shadow-sm'
                          : 'bg-wellq-gray/10 dark:bg-white/[0.08] text-wellq-gray dark:text-white/60'
                      }`}>
                        {getInitials(r.name)}
                      </div>

                      {/* Name */}
                      <span className={`flex-1 text-left text-[13px] tracking-tight truncate ${
                        isSelected
                          ? 'font-black text-wellq-cyan'
                          : 'font-bold text-wellq-dark dark:text-white/90'
                      }`}>
                        {r.name}
                      </span>

                      {/* Check icon (solo si está seleccionado) */}
                      {isSelected && (
                        <CheckCircle2 size={13} strokeWidth={2.5} className="text-wellq-cyan flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))}

            <div className="h-1.5" /> {/* bottom padding */}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};