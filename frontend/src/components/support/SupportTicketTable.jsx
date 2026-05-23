import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, AlertCircle,
  Bug, CreditCard, Sparkles, MessageSquare,
  SlidersHorizontal, Clock, CheckCircle2, Send, X, ChevronDown,
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

// ─── Status & category tokens (Estilo PlatformOps) ───────────────────────────
const STATUS_STYLE = {
  Open: {
    badge: 'bg-amber-50 text-amber-600 border-amber-200/80 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
    dot:   'bg-amber-500',
    accent:'bg-amber-400',
    chip:  'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400',
    icon:  Clock,
    pulse: true,
  },
  Closed: {
    badge: 'bg-emerald-50 text-emerald-600 border-emerald-200/80 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
    dot:   'bg-emerald-500',
    accent:'bg-emerald-400',
    chip:  'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400',
    icon:  CheckCircle2,
    pulse: false,
  },
  Sent: {
    badge: 'bg-wellq-blue/10 text-wellq-blue border-wellq-blue/20 dark:bg-wellq-blue/10 dark:text-wellq-blue dark:border-wellq-blue/20',
    dot:   'bg-wellq-blue',
    accent:'bg-wellq-blue',
    chip:  'border-wellq-blue/30 bg-wellq-blue/10 text-wellq-blue dark:border-wellq-blue/20 dark:bg-wellq-blue/10 dark:text-wellq-blue',
    icon:  Send,
    pulse: false,
  },
};

const CATEGORY_META = {
  Bug:     { icon: Bug,           chip: 'border-red-200/80 bg-red-50 text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400' },
  Billing: { icon: CreditCard,    chip: 'border-purple-200/80 bg-purple-50 text-purple-600 dark:border-purple-500/20 dark:bg-purple-500/10 dark:text-purple-400' },
  Feature: { icon: Sparkles,      chip: 'border-indigo-200/80 bg-indigo-50 text-indigo-600 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400' },
  Request: { icon: MessageSquare, chip: 'border-wellq-gray/20 bg-wellq-gray/5 text-wellq-gray dark:border-white/10 dark:bg-white/5 dark:text-wellq-gray/80' },
};

const AVATAR_PALETTE = [
  { bg: 'bg-wellq-cyan/10 dark:bg-wellq-cyan/10',    text: 'text-wellq-cyan dark:text-wellq-cyan' },
  { bg: 'bg-wellq-blue/10 dark:bg-wellq-blue/10',    text: 'text-wellq-blue dark:text-wellq-blue' },
  { bg: 'bg-amber-100 dark:bg-amber-500/10',         text: 'text-amber-600 dark:text-amber-400' },
  { bg: 'bg-wellq-green/10 dark:bg-wellq-green/10',  text: 'text-wellq-green dark:text-wellq-green' },
  { bg: 'bg-red-50 dark:bg-red-500/10',              text: 'text-red-600 dark:text-red-400' },
  { bg: 'bg-indigo-50 dark:bg-indigo-500/10',        text: 'text-indigo-600 dark:text-indigo-400' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (iso) => {
  if (!iso) return '—';
  const d    = new Date(iso);
  const now  = new Date();
  const diff = now - d;
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  === 1) return 'Yesterday';
  if (days  <  7)  return `${days}d ago`;
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
};

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.substring(0, 2).toUpperCase();
};

const avatarFor = (name = '') => AVATAR_PALETTE[name.charCodeAt(0) % AVATAR_PALETTE.length];

// ─── Skeleton Row ─────────────────────────────────────────────────────────────
const SkeletonRow = ({ index }) => (
  <div className="flex items-center gap-4 px-5 py-4">
    <div className="w-10 h-10 rounded-xl bg-wellq-gray/10 dark:bg-white/5 animate-pulse flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <div
        className="h-3 rounded-full bg-wellq-gray/10 dark:bg-white/5 animate-pulse"
        style={{ width: `${40 + (index * 7) % 35}%` }}
      />
      <div
        className="h-2 rounded-full bg-wellq-gray/5 dark:bg-white/[0.02] animate-pulse"
        style={{ width: `${20 + (index * 5) % 18}%` }}
      />
    </div>
    <div className="hidden sm:block h-6 w-16 rounded-md bg-wellq-gray/10 dark:bg-white/5 animate-pulse" />
    <div className="h-6 w-18 rounded-full bg-wellq-gray/10 dark:bg-white/5 animate-pulse" />
    <div className="hidden md:block h-2 w-14 rounded-full bg-wellq-gray/10 dark:bg-white/5 animate-pulse" />
    <div className="w-4 h-4 rounded-sm bg-wellq-gray/5 dark:bg-white/[0.02] animate-pulse" />
  </div>
);

// ─── Chip ─────────────────────────────────────────────────────────────────────
const Chip = ({ icon: Icon, label, className, onClick, active, size = 'sm' }) => {
  const sizes = size === 'sm'
    ? 'px-3 py-1.5 text-[11px] gap-1.5'
    : 'px-4 py-2 text-xs gap-2';
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`inline-flex items-center font-bold tracking-wide rounded-lg border cursor-pointer select-none transition-all ${sizes} ${className}`}
    >
      {Icon && <Icon size={12} strokeWidth={2.5} />}
      {label}
    </motion.button>
  );
};

// ─── Filter Bar ───────────────────────────────────────────────────────────────
const FilterBar = ({ filters, clinics, onFilterChange }) => {
  const { t } = useLanguage();

  const OFF = 'border-wellq-gray/20 dark:border-white/10 bg-white dark:bg-wellq-dark text-wellq-gray hover:border-wellq-gray/40 dark:hover:border-white/20 hover:text-wellq-dark dark:hover:text-white';

  const STATUS_OPTIONS = [
    { value: 'Open',   label: t('support.statusOpen'),   icon: Clock,        on: STATUS_STYLE.Open.chip },
    { value: 'Closed', label: t('support.statusClosed'), icon: CheckCircle2, on: STATUS_STYLE.Closed.chip },
    { value: 'Sent',   label: t('support.statusSent'),   icon: Send,         on: STATUS_STYLE.Sent.chip },
  ];
  const CATEGORY_OPTIONS = [
    { value: 'Bug',     label: 'Bug',     icon: Bug,           on: CATEGORY_META.Bug.chip },
    { value: 'Billing', label: 'Billing', icon: CreditCard,    on: CATEGORY_META.Billing.chip },
    { value: 'Feature', label: 'Feature', icon: Sparkles,      on: CATEGORY_META.Feature.chip },
    { value: 'Request', label: 'Request', icon: MessageSquare, on: CATEGORY_META.Request.chip },
  ];

  const toggle = (key, val) =>
    onFilterChange?.({ ...filters, [key]: filters[key] === val ? undefined : val, page: 1 });

  const hasActive = !!(filters.status || filters.category || filters.clinic_id);

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {/* Icon label */}
      <div className="w-8 h-8 rounded-lg bg-wellq-gray/5 dark:bg-white/5 flex items-center justify-center ring-1 ring-wellq-gray/10 dark:ring-white/5 flex-shrink-0">
        <SlidersHorizontal size={14} className="text-wellq-dark dark:text-white" strokeWidth={2.2} />
      </div>

      {STATUS_OPTIONS.map(({ value, label, icon, on }) => {
        const active = filters.status === value;
        return (
          <Chip
            key={value}
            icon={icon}
            label={label}
            active={active}
            onClick={() => toggle('status', value)}
            className={active ? on : OFF}
          />
        );
      })}

      {/* Divider */}
      <span className="w-px h-5 bg-wellq-gray/10 dark:bg-white/10 mx-1 flex-shrink-0" />

      {CATEGORY_OPTIONS.map(({ value, label, icon, on }) => {
        const active = filters.category === value;
        return (
          <Chip
            key={value}
            icon={icon}
            label={label}
            active={active}
            onClick={() => toggle('category', value)}
            className={active ? on : OFF}
          />
        );
      })}

      {/* Clinic select */}
      {clinics.length > 0 && (
        <>
          <span className="w-px h-5 bg-wellq-gray/10 dark:bg-white/10 mx-1 flex-shrink-0" />
          <div className="relative">
            <select
              value={filters.clinic_id ?? ''}
              onChange={(e) =>
                onFilterChange?.({ ...filters, clinic_id: e.target.value || undefined, page: 1 })
              }
              className="appearance-none pl-3 pr-8 py-1.5 text-[11px] font-bold tracking-wide rounded-lg border border-wellq-gray/20 dark:border-white/10 bg-white dark:bg-wellq-dark text-wellq-gray focus:outline-none focus:ring-2 focus:ring-wellq-cyan focus:border-wellq-cyan cursor-pointer transition-all hover:border-wellq-gray/40 dark:hover:border-white/20 hover:text-wellq-dark dark:hover:text-white"
            >
              <option value="">{t('support.allClinics')}</option>
              {clinics.map((c) => (
                <option key={c.clinic_id} value={c.clinic_id}>{c.name}</option>
              ))}
            </select>
            <ChevronDown size={12} strokeWidth={2.5} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-wellq-gray" />
          </div>
        </>
      )}

      {/* Clear */}
      <AnimatePresence>
        {hasActive && (
          <motion.button
            key="clear"
            initial={{ opacity: 0, scale: 0.85, width: 0 }}
            animate={{ opacity: 1, scale: 1, width: 'auto' }}
            exit={{   opacity: 0, scale: 0.85, width: 0 }}
            onClick={() => onFilterChange?.({ page: 1 })}
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-wellq-gray hover:text-red-500 dark:hover:text-red-400 transition-colors ml-1 uppercase tracking-wider"
          >
            <X size={12} strokeWidth={2.5} />
            Clear
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Ticket Row ───────────────────────────────────────────────────────────────
const TicketRow = ({ ticket, index, onSelect }) => {
  const status  = STATUS_STYLE[ticket.status]    ?? STATUS_STYLE.Open;
  const cat     = CATEGORY_META[ticket.category] ?? CATEGORY_META.Request;
  const CatIcon = cat.icon ?? MessageSquare;
  const avatar  = avatarFor(ticket.reporter_name);

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0  }}
      whileHover={{ y: -2, transition: { duration: 0.2, ease: 'easeOut' } }} // Animación PlatformOps
      transition={{ duration: 0.25, delay: index * 0.028, ease: 'easeOut' }}
      onClick={() => onSelect?.(ticket)}
      className="group relative flex items-center gap-4 px-5 py-4 cursor-pointer bg-white dark:bg-wellq-dark hover:bg-wellq-gray/3 dark:hover:bg-white/[0.02] hover:shadow-md hover:z-10 transition-all rounded-xl border border-transparent hover:border-wellq-gray/10 dark:hover:border-white/5"
    >
      {/* Left accent line on hover (MANTENIDO) */}
      <span
        className={`absolute left-0 top-3 bottom-3 w-[3px] ${status.accent} rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity duration-200`}
      />

      {/* Avatar */}
      <div
        className={`w-10 h-10 rounded-xl ${avatar.bg} ${avatar.text} flex items-center justify-center text-xs font-black flex-shrink-0 ring-1 ring-wellq-gray/10 dark:ring-white/5 shadow-sm`}
        title={ticket.reporter_name}
      >
        {getInitials(ticket.reporter_name)}
      </div>

      {/* Title + meta */}
      <div className="flex-1 min-w-0 pr-4">
        <p className="text-sm font-bold text-wellq-dark dark:text-white leading-tight tracking-tight truncate group-hover:text-wellq-cyan transition-colors">
          {ticket.title}
        </p>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-[11px] font-semibold text-wellq-gray dark:text-wellq-gray/80 truncate max-w-[140px] uppercase tracking-wider">
            {ticket.reporter_name || '—'}
          </span>
          {ticket.clinic_name && (
            <>
              <span className="text-wellq-gray/40 dark:text-wellq-gray/30 text-xs">•</span>
              <span className="text-[11px] font-medium text-wellq-gray truncate max-w-[140px]">
                {ticket.clinic_name}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Category chip */}
      <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border flex-shrink-0 shadow-sm ${cat.chip}`}>
        <CatIcon size={12} strokeWidth={2.2} />
        {ticket.category}
      </div>

      {/* Status badge */}
      <div className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border flex-shrink-0 shadow-sm ${status.badge}`}>
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${status.dot} ${status.pulse ? 'animate-pulse' : ''}`} />
        {ticket.status}
      </div>

      {/* Date */}
      <span className="hidden md:block text-xs font-bold text-wellq-gray w-20 text-right flex-shrink-0 tabular-nums tracking-tight">
        {fmtDate(ticket.reported_at)}
      </span>

      {/* Arrow (MANTENIDO) */}
      <ChevronRight
        size={16}
        strokeWidth={2.5}
        className="text-wellq-gray/50 group-hover:text-wellq-dark dark:group-hover:text-white -translate-x-2 group-hover:translate-x-0 transition-all duration-200 flex-shrink-0 opacity-0 group-hover:opacity-100"
      />
    </motion.div>
  );
};

// ─── Empty State ──────────────────────────────────────────────────────────────
const EmptyState = ({ label }) => (
  <div className="flex flex-col items-center justify-center py-24 gap-3 relative overflow-hidden">
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-wellq-cyan/5 rounded-full blur-3xl pointer-events-none" />
    <div className="relative w-16 h-16 rounded-2xl bg-wellq-gray/5 dark:bg-white/5 border border-wellq-gray/10 dark:border-white/10 flex items-center justify-center ring-1 ring-wellq-gray/20 dark:ring-white/5 shadow-sm">
      <AlertCircle size={28} className="text-wellq-gray/40 dark:text-wellq-gray/50" strokeWidth={2} />
    </div>
    <p className="relative text-sm font-bold text-wellq-gray tracking-tight">{label}</p>
  </div>
);

// ─── Pagination ───────────────────────────────────────────────────────────────
const Pagination = ({ page, totalPages, total, pageSize, onPageChange, t }) => {
  const start = (page - 1) * pageSize + 1;
  const end   = Math.min(page * pageSize, total);

  // Build visible page numbers (at most 5, centered around current)
  const buildPages = () => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const delta = 2;
    const left  = Math.max(2, page - delta);
    const right = Math.min(totalPages - 1, page + delta);
    const pages = [1];
    if (left > 2) pages.push('…');
    for (let p = left; p <= right; p++) pages.push(p);
    if (right < totalPages - 1) pages.push('…');
    pages.push(totalPages);
    return pages;
  };

  const btnBase = 'flex items-center justify-center min-w-[32px] h-[32px] px-1 rounded-xl text-xs font-bold transition-all';
  const btnOff  = `${btnBase} text-wellq-gray hover:text-wellq-dark dark:hover:text-white hover:bg-wellq-gray/10 dark:hover:bg-white/10 bg-transparent`;
  const btnOn   = `${btnBase} bg-wellq-cyan text-wellq-dark shadow-sm shadow-wellq-cyan/20 ring-1 ring-wellq-cyan/50`;
  const btnNav  = `${btnBase} text-wellq-gray hover:bg-wellq-gray/10 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed bg-wellq-gray/5 dark:bg-white/5 border border-wellq-gray/10 dark:border-white/5`;

  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-wellq-gray/10 dark:border-white/5 bg-wellq-gray/3 dark:bg-white/[0.02]">
      <p className="text-xs font-semibold text-wellq-gray uppercase tracking-wider">
        {start}–{end} <span className="lowercase font-medium opacity-70">de</span> {total.toLocaleString()} {t('support.tickets')}
      </p>

      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange?.(page - 1)}
          disabled={page <= 1}
          className={btnNav}
          aria-label="Previous page"
        >
          <ChevronLeft size={16} strokeWidth={2.5} />
        </button>

        {buildPages().map((p, i) =>
          p === '…' ? (
            <span key={`ellipsis-${i}`} className="px-2 text-wellq-gray/50 text-xs font-bold select-none">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange?.(p)}
              className={p === page ? btnOn : btnOff}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange?.(page + 1)}
          disabled={page >= totalPages}
          className={btnNav}
          aria-label="Next page"
        >
          <ChevronRight size={16} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export const SupportTicketTable = ({
  tickets = [],
  total = 0,
  page = 1,
  pageSize = 20,
  loading = false,
  filters = {},
  clinics = [],
  onFilterChange,
  onPageChange,
  onSelectTicket,
}) => {
  const { t } = useLanguage();
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="bg-white dark:bg-wellq-dark rounded-2xl border border-wellq-gray/20 dark:border-white/5 overflow-visible shadow-sm">

      {/* Filter bar */}
      <div className="px-6 py-4 border-b border-wellq-gray/10 dark:border-white/5 bg-wellq-gray/3 dark:bg-white/[0.02] rounded-t-2xl">
        <FilterBar filters={filters} clinics={clinics} onFilterChange={onFilterChange} />
      </div>

      {/* Content */}
      <div className="flex flex-col py-2 px-2 divide-y divide-wellq-gray/5 dark:divide-white/5">
        {loading ? (
          Array.from({ length: 7 }).map((_, i) => <SkeletonRow key={i} index={i} />)
        ) : tickets.length === 0 ? (
          <EmptyState label={t('support.noTickets')} />
        ) : (
          tickets.map((ticket, idx) => (
            <TicketRow
              key={ticket.ticket_id}
              ticket={ticket}
              index={idx}
              onSelect={onSelectTicket}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="rounded-b-2xl overflow-hidden">
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={pageSize}
            onPageChange={onPageChange}
            t={t}
          />
        </div>
      )}
    </div>
  );
};