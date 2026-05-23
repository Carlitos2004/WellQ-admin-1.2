import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Bug, CreditCard, Sparkles, MessageSquare,
  Calendar, Building2, User, Mail, CheckCircle2,
  Clock, Send, ArrowRight, Hash, ExternalLink,
} from 'lucide-react';
import { fetchSupportTicket } from '../../api/client';
import { useLanguage } from '../../contexts/LanguageContext';

// ─── Design tokens (Estilo PlatformOps) ──────────────────────────────────────
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

// ─── Formatters ────────────────────────────────────────────────────────────────
const fmtLong = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CL', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const fmtShort = (iso) => {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('es-CL', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

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
  const [ticket,  setTicket]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Keyboard close
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Fetch ticket
  useEffect(() => {
    if (!ticketId) return;
    setLoading(true);
    setError(null);
    fetchSupportTicket(ticketId)
      .then(setTicket)
      .catch((err) => setError(err.message ?? 'Error loading ticket'))
      .finally(() => setLoading(false));
  }, [ticketId]);

  const status  = ticket ? (STATUS_META[ticket.status]    ?? STATUS_META.Open)    : null;
  const catMeta = ticket ? (CATEGORY_META[ticket.category] ?? CATEGORY_META.Request) : null;
  const CatIcon    = catMeta?.icon ?? MessageSquare;
  const StatusIcon = status?.icon  ?? Clock;

  return createPortal(
    <>
      {/* Backdrop (Actualizado con blur estilo PlatformOps) */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
        className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
        onClick={onClose}
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
        {/* Top color banner */}
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
                {/* ID + Status row */}
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
            onClick={onClose}
            className="p-2 rounded-xl text-wellq-gray hover:text-wellq-dark dark:hover:text-white hover:bg-wellq-gray/10 dark:hover:bg-white/10 transition-colors flex-shrink-0 mt-1 cursor-pointer"
            aria-label="Close"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain bg-white dark:bg-wellq-dark">

          {/* Loading state */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-8 h-8 border-2 border-wellq-cyan/30 border-t-wellq-cyan rounded-full animate-spin" />
              <p className="text-xs font-bold text-wellq-gray uppercase tracking-widest">{t('common.loading', 'Loading...')}</p>
            </div>
          )}

          {/* Error state */}
          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center ring-1 ring-red-200 dark:ring-red-500/20">
                <X size={20} className="text-red-500" strokeWidth={2.5} />
              </div>
              <p className="text-sm font-bold text-red-500 tracking-tight">{error}</p>
            </div>
          )}

          {/* Ticket body */}
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

              {/* Solution */}
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
                  <DetailRow icon={Building2} label={t('support.clinic')}   value={ticket.clinic_name ?? ticket.clinic_id} />
                  <DetailRow icon={User}      label={t('support.reporter')} value={ticket.reporter_name ?? '—'} />
                  <DetailRow icon={Mail}      label={t('support.email')}    value={ticket.reporter_email ?? '—'} isEmail />
                  {ticket.responder_name && (
                    <DetailRow icon={User}    label={t('support.responder')} value={ticket.responder_name} accent />
                  )}
                </div>
              </Section>

              {/* Timeline */}
              <Section label="Timeline">
                <div className="space-y-0 relative mt-2">
                  {/* Vertical connector */}
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
      </motion.aside>
    </>,
    document.body
  );
};

// ─── Section wrapper ──────────────────────────────────────────────────────────
const Section = ({ label, children, accent }) => {
  const labelCls = accent === 'emerald'
    ? 'text-emerald-600/70 dark:text-emerald-500/70'
    : 'text-wellq-gray';

  return (
    <div className="space-y-3">
      <p className={`text-[10px] font-bold uppercase tracking-widest ${labelCls}`}>
        {label}
      </p>
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
      <span className="text-xs font-semibold text-wellq-gray flex-shrink-0 uppercase tracking-wider">
        {label}
      </span>
      <span className={`text-sm font-bold text-right truncate max-w-[200px] tracking-tight ${
        accent ? 'text-wellq-cyan dark:text-wellq-cyan' : 'text-wellq-dark dark:text-white'
      }`}>
        {isEmail && value !== '—' ? (
          <a
            href={`mailto:${value}`}
            className="hover:text-wellq-cyan transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            {value}
          </a>
        ) : value}
      </span>
    </div>
  </div>
);

// ─── Timeline item ────────────────────────────────────────────────────────────
const TimelineItem = ({ Icon, label, dateShort, dateLong, relative, dotColor, active }) => (
  <div className="relative flex items-start gap-4 pb-6 last:pb-0">
    {/* Dot */}
    <div className={`relative z-10 w-[32px] h-[32px] rounded-full bg-white dark:bg-wellq-dark border-2 ${
      active
        ? `border-white dark:border-wellq-dark ${dotColor} ring-2 ring-white dark:ring-wellq-dark`
        : 'border-wellq-gray/20 dark:border-white/10'
    } flex items-center justify-center flex-shrink-0 shadow-sm`}>
      <Icon
        size={14}
        strokeWidth={2.5}
        className={active ? `text-white` : 'text-wellq-gray/50'}
      />
    </div>

    <div className="pt-0.5 min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-widest text-wellq-gray mb-1">
        {label}
      </p>
      <p className="text-sm font-black text-wellq-dark dark:text-white tracking-tight">
        {dateShort ?? dateLong}
        {relative && (
          <span className="ml-2 text-xs font-semibold text-wellq-gray/80 uppercase tracking-wider">
            {relative}
          </span>
        )}
      </p>
      <p className="text-xs font-medium text-wellq-gray mt-1">{dateLong}</p>
    </div>
  </div>
);