import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Bug, CreditCard, Sparkles, MessageSquare,
  Calendar, Building2, User, Mail, CheckCircle2,
  Clock, Send, ArrowRight, Hash, UserCheck,
  ChevronDown, Loader2, AlertCircle, UserCog,
} from 'lucide-react';
import { toast } from 'sonner';
import { fetchSupportTicket, fetchResponders, patchSupportTicket } from '../../api/client';
import { useLanguage } from '../../contexts/LanguageContext';

// ─── Design tokens ────────────────────────────────────────────────────────────
const STATUS_META = {
  Open: {
    badge:   'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700/40',
    banner:  'from-amber-400 to-orange-400',
    dot:     'bg-amber-500',
    icon:    Clock,
    pulse:   true,
  },
  Closed: {
    badge:   'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700/40',
    banner:  'from-emerald-400 to-teal-400',
    dot:     'bg-emerald-500',
    icon:    CheckCircle2,
    pulse:   false,
  },
  Sent: {
    badge:   'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700/40',
    banner:  'from-wellq-blue to-blue-400',
    dot:     'bg-wellq-blue',
    icon:    Send,
    pulse:   false,
  },
};

const CATEGORY_META = {
  Bug:     { icon: Bug,           cls: 'text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20' },
  Billing: { icon: CreditCard,    cls: 'text-purple-500 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20' },
  Feature: { icon: Sparkles,      cls: 'text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20' },
  Request: { icon: MessageSquare, cls: 'text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10' },
};

// Mapeo categoría → grupo de responders (ajusta los nombres según tu BD)
const CATEGORY_TO_GROUP = {
  Billing: 'Financiero',
  Bug:     'Técnico',
  Feature: 'Técnico',
  Request: 'General',
};

// ─── Formatters ────────────────────────────────────────────────────────────────
const fmtLong  = (iso) => iso
  ? new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : '—';

const fmtShort = (iso) => iso
  ? new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
  : null;

const fmtRelative = (iso) => {
  if (!iso) return null;
  const diff  = Date.now() - new Date(iso).getTime();
  const days  = Math.floor(diff / 86_400_000);
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return '1 day ago';
  if (days <  30) return `${days} days ago`;
  return null;
};

// ─── Drawer component ─────────────────────────────────────────────────────────
export const SupportTicketDrawer = ({ ticketId, onClose }) => {
  const { t } = useLanguage();

  const [ticket,     setTicket]     = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);

  // Acciones
  const [responders,    setResponders]    = useState([]);   // lista completa
  const [selectedResp,  setSelectedResp]  = useState('');   // id del responder elegido
  const [solution,      setSolution]      = useState('');
  const [saving,        setSaving]        = useState(false);
  const [actionError,   setActionError]   = useState(null);

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
    if (!ticketId) return;
    setLoading(true);
    setError(null);
    Promise.all([
      fetchSupportTicket(ticketId),
      fetchResponders().catch(() => ({ responders: [] })), // no bloquear si falla
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

  // Responders filtrados según categoría del ticket
  const filteredResponders = useCallback(() => {
    if (!ticket?.category || responders.length === 0) return responders;
    const targetGroup = CATEGORY_TO_GROUP[ticket.category];
    if (!targetGroup) return responders;
    const filtered = responders.filter((r) => r.group === targetGroup);
    return filtered.length > 0 ? filtered : responders; // fallback a todos si no hay match
  }, [ticket, responders]);

  // ── Acción central: llama PATCH y actualiza el ticket local ──────────────
  const handleAction = async (body, successMsg) => {
    setSaving(true);
    setActionError(null);
    try {
      const updated = await patchSupportTicket(ticketId, body);
      // Refrescamos el ticket completo para tener todos los campos actualizados
      const fresh = await fetchSupportTicket(ticketId);
      setTicket(fresh);
      setSolution(fresh?.solution ?? '');
      toast.success(successMsg);
    } catch (err) {
      const msg = err.message ?? 'Error al actualizar el ticket';
      setActionError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleTakeTicket = () => {
    if (!selectedResp && responders.length > 0) {
      setActionError('Selecciona un responder antes de tomar el ticket.');
      return;
    }
    const resp = responders.find((r) => r.id === selectedResp);
    handleAction(
      { status: 'Open', responder_id: selectedResp || undefined, responder_name: resp?.name },
      'Ticket tomado — ahora está Open',
    );
  };

  const handleReassign = () => {
    if (!selectedResp) {
      setActionError('Selecciona un responder para reasignar.');
      return;
    }
    const resp = responders.find((r) => r.id === selectedResp);
    handleAction(
      { responder_id: selectedResp, responder_name: resp?.name },
      'Ticket reasignado correctamente',
    );
  };

  const handleCloseTicket = () => {
    if (!solution.trim()) {
      setActionError('Escribe una solución antes de cerrar el ticket.');
      return;
    }
    const resp = responders.find((r) => r.id === selectedResp);
    handleAction(
      {
        status:         'Closed',
        solution:       solution.trim(),
        responder_id:   selectedResp || undefined,
        responder_name: resp?.name,
      },
      'Ticket cerrado correctamente',
    );
  };

  const status  = ticket ? (STATUS_META[ticket.status]     ?? STATUS_META.Open)    : null;
  const catMeta = ticket ? (CATEGORY_META[ticket.category] ?? CATEGORY_META.Request) : null;
  const CatIcon    = catMeta?.icon ?? MessageSquare;
  const StatusIcon = status?.icon  ?? Clock;

  const isClosed = ticket?.status === 'Closed';
  const isSent   = ticket?.status === 'Sent';
  const isOpen   = ticket?.status === 'Open';

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
        animate={{ x: 0,      opacity: 1 }}
        exit={{   x: '100%',  opacity: 0 }}
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

        {/* Body — scrolleable */}
        <div className="flex-1 overflow-y-auto overscroll-contain bg-white dark:bg-wellq-dark">

          {loading && (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-8 h-8 border-2 border-wellq-cyan/30 border-t-wellq-cyan rounded-full animate-spin" />
              <p className="text-xs font-bold text-wellq-gray uppercase tracking-widest">{t('common.loading', 'Loading...')}</p>
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
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.05, ease: 'easeOut' }}
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
                  <DetailRow icon={Building2} label={t('support.clinic')}    value={ticket.clinic_name ?? ticket.clinic_id} />
                  <DetailRow icon={User}      label={t('support.reporter')}  value={ticket.reporter_name ?? '—'} />
                  <DetailRow icon={Mail}      label={t('support.email')}     value={ticket.reporter_email ?? '—'} isEmail />
                  {ticket.responder_name && (
                    <DetailRow icon={UserCheck} label={t('support.responder')} value={ticket.responder_name} accent />
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
            </motion.div>
          )}
        </div>

        {/* ── Panel de acciones — sticky al fondo, solo si el ticket no está Closed ── */}
        {!loading && ticket && !isClosed && (
          <div className="flex-shrink-0 border-t border-wellq-gray/10 dark:border-white/5 bg-wellq-gray/3 dark:bg-white/[0.02] px-6 py-5 space-y-4">

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

            {/* Selector de responder (aparece en Sent y Open) */}
            {responders.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-wellq-gray flex items-center gap-1.5">
                  <UserCog size={11} strokeWidth={2.5} />
                  {isSent ? 'Asignar a' : 'Reasignar a'}
                  {ticket.category && (
                    <span className="ml-auto text-[9px] font-bold opacity-60 normal-case tracking-normal">
                      Equipo sugerido: {CATEGORY_TO_GROUP[ticket.category] ?? 'General'}
                    </span>
                  )}
                </label>
                <div className="relative">
                  <select
                    value={selectedResp}
                    onChange={(e) => { setSelectedResp(e.target.value); setActionError(null); }}
                    disabled={saving}
                    className="w-full appearance-none pl-4 pr-9 py-2.5 text-sm font-bold rounded-xl border border-wellq-gray/20 dark:border-white/10 bg-white dark:bg-wellq-dark text-wellq-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-wellq-cyan focus:border-wellq-cyan transition-all disabled:opacity-50"
                  >
                    <option value="">— Seleccionar responder —</option>
                    {filteredResponders().map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}{r.group ? ` (${r.group})` : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} strokeWidth={2.5} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-wellq-gray" />
                </div>
              </div>
            )}

            {/* Área de solución — solo en Open */}
            {isOpen && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-wellq-gray flex items-center gap-1.5">
                  <CheckCircle2 size={11} strokeWidth={2.5} />
                  Solución
                </label>
                <textarea
                  value={solution}
                  onChange={(e) => { setSolution(e.target.value); setActionError(null); }}
                  disabled={saving}
                  placeholder="Describe cómo se resolvió el problema…"
                  rows={3}
                  className="w-full resize-none px-4 py-3 text-sm font-medium rounded-xl border border-wellq-gray/20 dark:border-white/10 bg-white dark:bg-wellq-dark text-wellq-dark dark:text-white placeholder:text-wellq-gray/50 focus:outline-none focus:ring-2 focus:ring-wellq-cyan focus:border-wellq-cyan transition-all disabled:opacity-50"
                />
              </div>
            )}

            {/* Botones de acción */}
            <div className="flex gap-2.5">
              {/* Ticket en Sent → solo "Tomar ticket" */}
              {isSent && (
                <ActionButton
                  onClick={handleTakeTicket}
                  loading={saving}
                  icon={UserCheck}
                  label="Tomar ticket"
                  variant="primary"
                />
              )}

              {/* Ticket en Open → "Reasignar" + "Cerrar ticket" */}
              {isOpen && (
                <>
                  <ActionButton
                    onClick={handleReassign}
                    loading={saving}
                    icon={UserCog}
                    label="Reasignar"
                    variant="secondary"
                    disabled={!selectedResp}
                  />
                  <ActionButton
                    onClick={handleCloseTicket}
                    loading={saving}
                    icon={CheckCircle2}
                    label="Cerrar ticket"
                    variant="success"
                    disabled={!solution.trim()}
                  />
                </>
              )}
            </div>
          </div>
        )}

        {/* Mensaje si el ticket está Closed */}
        {!loading && ticket && isClosed && (
          <div className="flex-shrink-0 border-t border-wellq-gray/10 dark:border-white/5 bg-emerald-50/60 dark:bg-emerald-500/5 px-6 py-4">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={14} strokeWidth={2.5} />
              Ticket cerrado — no requiere acciones adicionales
            </div>
          </div>
        )}
      </motion.aside>
    </>,
    document.body
  );
};

// ─── Action Button ─────────────────────────────────────────────────────────────
const ActionButton = ({ onClick, loading, icon: Icon, label, variant, disabled }) => {
  const base = 'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed';
  const variants = {
    primary:   'bg-gradient-to-r from-wellq-blue to-wellq-cyan text-wellq-dark shadow-sm shadow-wellq-cyan/20 hover:shadow-md hover:shadow-wellq-cyan/30',
    secondary: 'bg-white dark:bg-wellq-dark border border-wellq-gray/20 dark:border-white/10 text-wellq-gray hover:text-wellq-dark dark:hover:text-white hover:bg-wellq-gray/5',
    success:   'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm shadow-emerald-500/20 hover:shadow-md hover:shadow-emerald-500/30',
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