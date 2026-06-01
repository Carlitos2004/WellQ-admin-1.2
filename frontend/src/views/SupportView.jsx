import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LifeBuoy, RefreshCw, AlertTriangle, CheckCircle2, Send, Zap, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { fetchSupportTickets, createSupportTicket } from '../api/client';
import { SupportTicketTable } from '../components/support/SupportTicketTable';
import { SupportTicketDrawer } from '../components/support/SupportTicketDrawer';
import { CreateTicketModal } from '../components/support/CreateTicketModal';
import { useLanguage } from '../contexts/LanguageContext';
import { Skeleton } from '../components/ui';

// ─── Design tokens ────────────────────────────────────────────────────────────
export const STATUS_META = {
  Open: {
    label:  'Open',
    icon:   AlertTriangle,
    ring:   'ring-amber-500/20 dark:ring-amber-500/10',
    border: 'border-amber-500/20 dark:border-amber-500/30',
    bg:     'bg-amber-500/5 dark:bg-amber-500/10',
    badge:  'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700/40',
    dot:    'bg-amber-500',
    bar:    'from-amber-400 to-orange-500',
    text:   'text-amber-500 dark:text-amber-400',
    pulse:  true,
  },
  Closed: {
    label:  'Closed',
    icon:   CheckCircle2,
    ring:   'ring-wellq-green/20 dark:ring-wellq-green/10',
    border: 'border-wellq-green/20 dark:border-wellq-green/30',
    bg:     'bg-wellq-green/5 dark:bg-wellq-green/10',
    badge:  'bg-wellq-green/10 text-wellq-green border-wellq-green/20 dark:bg-wellq-green/10 dark:text-wellq-green dark:border-wellq-green/20',
    dot:    'bg-wellq-green',
    bar:    'from-wellq-green to-teal-400',
    text:   'text-wellq-green',
    pulse:  false,
  },
  Sent: {
    label:  'Sent',
    icon:   Send,
    ring:   'ring-wellq-blue/20 dark:ring-wellq-blue/10',
    border: 'border-wellq-blue/20 dark:border-wellq-blue/30',
    bg:     'bg-wellq-blue/5 dark:bg-wellq-blue/10',
    badge:  'bg-wellq-blue/10 text-wellq-blue border-wellq-blue/20 dark:bg-wellq-blue/10 dark:text-wellq-blue dark:border-wellq-blue/20',
    dot:    'bg-wellq-blue',
    bar:    'from-wellq-blue to-indigo-400',
    text:   'text-wellq-blue',
    pulse:  false,
  },
};

export const CATEGORY_META = {
  Bug:     { color: 'text-red-500 dark:text-red-400',       bg: 'bg-red-50 dark:bg-red-500/10',           border: 'border-red-200/60 dark:border-red-500/20' },
  Billing: { color: 'text-wellq-cyan dark:text-wellq-cyan', bg: 'bg-wellq-cyan/10 dark:bg-wellq-cyan/10', border: 'border-wellq-cyan/20 dark:border-wellq-cyan/20' },
  Feature: { color: 'text-wellq-blue dark:text-wellq-blue', bg: 'bg-wellq-blue/10 dark:bg-wellq-blue/10', border: 'border-wellq-blue/20 dark:border-wellq-blue/20' },
  Request: { color: 'text-wellq-gray dark:text-wellq-gray', bg: 'bg-wellq-gray/10 dark:bg-wellq-gray/10', border: 'border-wellq-gray/20 dark:border-wellq-gray/30' },
};

// ─── Main view ────────────────────────────────────────────────────────────────
export const SupportView = ({ apiClinics = [] }) => {
  const { t } = useLanguage();

  const [tickets,    setTickets]    = useState([]);
  const [total,      setTotal]      = useState(0);
  const [counts,     setCounts]     = useState({ open: 0, closed: 0, sent: 0 }); // ← agregados del backend
  const [loading,    setLoading]    = useState(true);
  const [filters,    setFilters]    = useState({ page: 1, page_size: 20 });
  const [selected,   setSelected]   = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false); // ← modal de nuevo ticket

  const load = useCallback(async (f = filters) => {
    setLoading(true);
    try {
      const res = await fetchSupportTickets(f);
      setTickets(res?.data ?? []);
      setTotal(res?.total ?? 0);
      // Conteos globales que vienen del backend (no del array paginado)
      setCounts({
        open:   res?.open_count   ?? 0,
        closed: res?.closed_count ?? 0,
        sent:   res?.sent_count   ?? 0,
      });
    } catch (err) {
      toast.error(err.message ?? t('support.errorLoading'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(filters); }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh = async () => {
    setRefreshing(true);
    await load(filters);
    toast.success(t('support.refreshed'));
  };

  const handleFilterChange = (newFilters) => setFilters((prev) => ({ ...prev, ...newFilters }));
  const handlePageChange   = (newPage)    => setFilters((prev) => ({ ...prev, page: newPage }));

  // Cuando se cierra el drawer, refrescamos la lista para mostrar el estado actualizado
  const handleDrawerClose = (didUpdate = false) => {
    setSelected(null);
    if (didUpdate) load(filters);
  };

  // Tasa de resolución usando conteos globales del backend
  const totalGlobal  = counts.open + counts.closed + counts.sent;
  const resolveRate  = totalGlobal > 0 ? Math.round((counts.closed / totalGlobal) * 100) : 0;

  const containerVariants = {
    hidden: {},
    show:   { transition: { staggerChildren: 0.05 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show:   { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
  };

  return (
    <motion.div
      className="space-y-7 font-sans"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-wellq-blue to-wellq-cyan flex items-center justify-center shadow-md shadow-wellq-cyan/20 ring-1 ring-white/10">
              <LifeBuoy size={20} className="text-wellq-black" strokeWidth={2} />
            </div>
            <AnimatePresence>
              {counts.open > 0 && (
                <motion.span
                  key="badge"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white dark:ring-wellq-dark tabular-nums"
                >
                  {counts.open > 99 ? '99+' : counts.open}
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          <div>
            <h1 className="text-lg font-bold text-wellq-dark dark:text-white tracking-tight leading-none">
              {t('support.title')}
            </h1>
            <div className="mt-1">
              {loading ? (
                <Skeleton className="w-24 h-3.5 rounded" />
              ) : (
                <p className="text-[13px] font-medium text-wellq-gray dark:text-wellq-gray/80">
                  {total.toLocaleString()} {t('support.totalTickets')}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex items-center gap-2">
          {/* Nuevo ticket */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-wellq-blue to-wellq-cyan text-wellq-dark text-[13px] font-bold shadow-sm shadow-wellq-cyan/20 ring-1 ring-white/10 transition-all hover:shadow-md hover:shadow-wellq-cyan/30"
          >
            <Plus size={14} strokeWidth={2.5} />
            {t('support.newTicket', 'Nuevo ticket')}
          </motion.button>

          {/* Refresh */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleRefresh}
            disabled={refreshing}
            className="group flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-wellq-dark border border-wellq-gray/20 dark:border-[#1e293b] text-[13px] font-bold text-wellq-gray hover:text-wellq-dark dark:hover:text-white hover:bg-wellq-gray/5 dark:hover:bg-white/5 transition-all disabled:opacity-40 shadow-sm"
          >
            <RefreshCw
              size={13}
              strokeWidth={2.5}
              className={`transition-transform ${refreshing ? 'animate-spin' : 'group-hover:rotate-180 duration-500'}`}
            />
            {t('topbar.refresh')}
          </motion.button>
        </div>
      </motion.div>

      {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Usando counts.open/closed/sent en lugar del array paginado */}
        <MetricCard
          label={t('support.statusOpen')}
          count={counts.open}
          total={totalGlobal}
          meta={STATUS_META.Open}
          loading={loading}
        />
        <MetricCard
          label={t('support.statusClosed')}
          count={counts.closed}
          total={totalGlobal}
          meta={STATUS_META.Closed}
          loading={loading}
        />
        <MetricCard
          label={t('support.statusSent')}
          count={counts.sent}
          total={totalGlobal}
          meta={STATUS_META.Sent}
          loading={loading}
        />
        <ResolutionCard rate={resolveRate} loading={loading} />
      </motion.div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <motion.div
        variants={itemVariants}
        className="bg-white dark:bg-wellq-dark rounded-2xl shadow-sm border border-wellq-gray/20 dark:border-[#1e293b] overflow-hidden"
      >
        <SupportTicketTable
          tickets={tickets}
          total={total}
          page={filters.page ?? 1}
          pageSize={filters.page_size ?? 20}
          loading={loading}
          filters={filters}
          clinics={apiClinics}
          onFilterChange={handleFilterChange}
          onPageChange={handlePageChange}
          onSelectTicket={(ticket) => setSelected(ticket.ticket_id)}
        />
      </motion.div>

      {/* ── Drawer ─────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {selected && (
          <SupportTicketDrawer
            key={selected}
            ticketId={selected}
            onClose={handleDrawerClose}
          />
        )}
      </AnimatePresence>

      {/* ── Modal: Nuevo ticket ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showCreate && (
          <CreateTicketModal
            clinics={apiClinics}
            onClose={() => setShowCreate(false)}
            onCreated={() => {
              setShowCreate(false);
              load(filters);
              toast.success(t('support.ticketCreated', 'Ticket creado correctamente'));
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─── Metric Card ──────────────────────────────────────────────────────────────
const MetricCard = ({ label, count, total, meta, loading }) => {
  const Icon = meta.icon;
  const pct  = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <div className={`relative rounded-2xl border ${meta.border} ${meta.bg} p-5 overflow-hidden group transition-all duration-300 hover:shadow-md`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-white dark:bg-wellq-dark ring-1 ${meta.ring} shadow-sm transition-transform group-hover:scale-105`}>
          <Icon size={16} className={meta.text} strokeWidth={2.2} />
        </div>
        <span className="text-[10px] font-bold bg-black/5 dark:bg-white/5 text-wellq-gray px-2 py-0.5 rounded-md tracking-wider">
          {loading ? '—' : `${pct}%`}
        </span>
      </div>

      {loading ? (
        <Skeleton className="h-8 w-20 rounded-lg mb-1" />
      ) : (
        <p className={`text-[28px] font-black ${meta.text} leading-none tabular-nums mb-1 tracking-tight`}>
          {count.toLocaleString()}
        </p>
      )}

      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-wellq-gray dark:text-wellq-gray/90 truncate">
        {label}
      </p>

      <div className="mt-4 h-1.5 bg-black/[0.05] dark:bg-white/[0.05] rounded-full overflow-hidden">
        <motion.div
          className={`h-full bg-gradient-to-r ${meta.bar} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: loading ? '0%' : `${pct}%` }}
          transition={{ duration: 0.7, ease: 'easeOut', delay: 0.1 }}
        />
      </div>
    </div>
  );
};

// ─── Resolution Rate Card ─────────────────────────────────────────────────────
const ResolutionCard = ({ rate, loading }) => (
  <div className="relative bg-gradient-to-br from-white to-wellq-gray/5 dark:from-wellq-dark dark:to-white/[0.01] rounded-2xl p-5 shadow-sm border border-wellq-gray/20 dark:border-[#1e293b] overflow-hidden group hover:shadow-md transition-all duration-300">
    <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-wellq-cyan/10 to-transparent opacity-60 pointer-events-none" />

    <div className="relative flex items-start justify-between mb-4">
      <div className="w-9 h-9 rounded-xl bg-white dark:bg-wellq-dark flex items-center justify-center ring-1 ring-wellq-cyan/20 shadow-sm transition-transform group-hover:scale-105">
        <Zap size={16} className="text-wellq-cyan" strokeWidth={2.2} />
      </div>
      <span className="text-[10px] font-bold bg-wellq-cyan/10 text-wellq-cyan px-2 py-0.5 rounded-md tracking-wider">
        RATE
      </span>
    </div>

    {loading ? (
      <Skeleton className="h-8 w-24 rounded-lg mb-1 relative" />
    ) : (
      <div className="relative">
        <p className="text-[28px] font-black text-wellq-cyan leading-none tabular-nums mb-1 tracking-tight">
          {rate}<span className="text-xl font-bold">%</span>
        </p>
      </div>
    )}

    <p className="relative text-[11px] font-bold uppercase tracking-[0.08em] text-wellq-gray dark:text-wellq-gray/90">
      Resolution
    </p>

    <div className="relative mt-4 h-1.5 bg-black/[0.05] dark:bg-white/[0.05] rounded-full overflow-hidden">
      <motion.div
        className="h-full bg-gradient-to-r from-wellq-cyan to-wellq-blue rounded-full"
        initial={{ width: 0 }}
        animate={{ width: loading ? '0%' : `${rate}%` }}
        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.15 }}
      />
    </div>
  </div>
);