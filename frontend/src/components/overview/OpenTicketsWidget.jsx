/**
 * OpenTicketsWidget.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Widget "Tickets abiertos" para el tab Operational Status de OverviewView.
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { LifeBuoy, ArrowRight, Bug, CreditCard, Sparkles, MessageSquare } from 'lucide-react';
import { fetchSupportTickets } from '../../api/client';
import { useLanguage } from '../../contexts/LanguageContext';
import useHasPermission from '../../hooks/useHasPermission';

// ─── Diseño de Categorías (Estilo PlatformOps tokens) ────────────────────────
const CATEGORY_STYLE = {
  Bug: {
    icon: Bug,
    color: 'text-red-500 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-500/10',
    ring: 'ring-red-200 dark:ring-red-500/20'
  },
  Billing: {
    icon: CreditCard,
    color: 'text-purple-500 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-500/10',
    ring: 'ring-purple-200 dark:ring-purple-500/20'
  },
  Feature: {
    icon: Sparkles,
    color: 'text-indigo-500 dark:text-indigo-400',
    bg: 'bg-indigo-50 dark:bg-indigo-500/10',
    ring: 'ring-indigo-200 dark:ring-indigo-500/20'
  },
  Request: {
    icon: MessageSquare,
    color: 'text-slate-500 dark:text-slate-400',
    bg: 'bg-slate-50 dark:bg-white/5',
    ring: 'ring-slate-200 dark:ring-white/10'
  },
};

// ── Componente ───────────────────────────────────────────────────────────────
export const OpenTicketsWidget = ({ onGoSupport }) => {
  const { t } = useLanguage();
  const canViewTickets = useHasPermission('tickets.view');   // RBAC: oculta el widget si el rol no ve tickets
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!canViewTickets) { setLoading(false); return; }
    fetchSupportTickets({ status: 'Open', page_size: 5, page: 1 })
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [canViewTickets]);

  if (!canViewTickets) return null;

  const tickets = data?.data ?? [];
  const total   = data?.total ?? 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="relative bg-white dark:bg-wellq-dark rounded-2xl p-6 shadow-sm border border-wellq-gray/20 dark:border-white/5 overflow-hidden group"
    >
      {/* Subtle Glow */}
      {total > 0 && <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-amber-500/10 to-transparent opacity-50 pointer-events-none" />}

      {/* Header */}
      <div className="relative flex items-center justify-between mb-6 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center ring-1 ring-amber-200 dark:ring-amber-500/20 shadow-sm">
            <LifeBuoy size={18} className="text-amber-600 dark:text-amber-400" strokeWidth={2.2} />
          </div>
          <div>
            <h3 className="font-bold text-base text-wellq-dark dark:text-white tracking-tight">
              {t('overview.openTickets') ?? 'Tickets abiertos'}
            </h3>
            {!loading && (
              <p className="text-xs font-medium text-wellq-gray dark:text-wellq-gray/80 mt-0.5">
                {total} {t('overview.total') ?? 'total'}
              </p>
            )}
          </div>
        </div>

        {/* KPI badge (Estilo Status) */}
        {!loading && total > 0 && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700/40">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            {total}
          </span>
        )}
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-3 relative z-10">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-wellq-gray/5 dark:bg-white/[0.02] border border-wellq-gray/10 dark:border-white/5 animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && tickets.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 gap-3 relative z-10">
          <div className="w-12 h-12 rounded-xl bg-wellq-gray/5 dark:bg-white/5 flex items-center justify-center ring-1 ring-wellq-gray/20 dark:ring-white/10 shadow-sm">
            <LifeBuoy size={20} className="text-wellq-gray/40 dark:text-wellq-gray/50" />
          </div>
          <p className="text-sm font-medium text-wellq-gray dark:text-wellq-gray/60">
            {t('overview.noOpenTickets') ?? 'Sin tickets abiertos'}
          </p>
        </div>
      )}

      {/* Lista de Tickets */}
      {!loading && tickets.length > 0 && (
        <div className="space-y-2.5 relative z-10">
          {tickets.map((ticket, i) => {
            const style = CATEGORY_STYLE[ticket.category] ?? CATEGORY_STYLE.Request;
            const CatIcon = style.icon;

            return (
              <motion.div
                key={ticket.ticket_id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                whileHover={{ y: -2, transition: { duration: 0.2 } }} // <-- Efecto de "levantarse un poquito" añadido aquí
                transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 25 }}
                className="flex items-center gap-3 p-3.5 rounded-xl bg-wellq-gray/5 dark:bg-white/[0.02] border border-transparent dark:border-white/5 hover:border-wellq-gray/20 dark:hover:border-white/10 hover:shadow-md transition-all cursor-pointer group"
                onClick={onGoSupport}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ring-1 shadow-sm ${style.bg} ${style.ring}`}>
                  <CatIcon size={14} className={style.color} strokeWidth={2.2} />
                </div>
                
                <div className="flex-1 min-w-0 pr-2">
                  {/* Se eliminó el "group-hover:text-wellq-cyan" para que el texto se mantenga neutro */}
                  <p className="text-sm font-bold text-wellq-dark dark:text-white truncate tracking-tight transition-colors">
                    {ticket.title}
                  </p>
                  <p className="text-xs font-medium text-wellq-gray dark:text-wellq-gray/80 truncate mt-0.5">
                    {ticket.clinic_name ?? ticket.clinic_id}
                  </p>
                </div>

                <div className="flex-shrink-0 text-wellq-gray opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0 group-hover:text-wellq-dark dark:group-hover:text-white">
                  <ArrowRight size={14} />
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Botón Ver Todos */}
      {!loading && onGoSupport && (
        <button
          onClick={onGoSupport}
          className="mt-4 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold text-wellq-dark dark:text-white bg-wellq-gray/5 dark:bg-white/5 border border-wellq-gray/10 dark:border-white/10 hover:bg-wellq-gray/10 dark:hover:bg-white/10 transition-all active:scale-[0.98] relative z-10"
        >
          {t('overview.viewAllTickets') ?? 'Ver todos los tickets'}
          <ArrowRight size={14} />
        </button>
      )}
    </motion.div>
  );
};