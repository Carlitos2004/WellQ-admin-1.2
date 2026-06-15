import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, AlertCircle,
  Bug, CreditCard, Sparkles, MessageSquare,
  SlidersHorizontal, Clock, CheckCircle2, Send, X, ChevronDown,
  User, Tag, Building, Users
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

// ─── Status & category tokens ─────────────────────────────────────────────────
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

const UNASSIGNED_RESPONDER_FILTER = '__unassigned';

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

// FIX: default param '= ""' no protege contra null, solo contra undefined
const avatarFor = (name) => AVATAR_PALETTE[(name?.charCodeAt(0) ?? 0) % AVATAR_PALETTE.length];

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

// ─── Clases comunes para scrollbar custom (dark-mode friendly) ────────────────
const SCROLLBAR_CLASSES = [
  '[&::-webkit-scrollbar]:w-1',
  '[&::-webkit-scrollbar-track]:bg-transparent',
  '[&::-webkit-scrollbar-thumb]:rounded-full',
  '[&::-webkit-scrollbar-thumb]:bg-wellq-gray/25',
  'dark:[&::-webkit-scrollbar-thumb]:bg-white/10',
  '[&::-webkit-scrollbar-thumb:hover]:bg-wellq-gray/40',
  'dark:[&::-webkit-scrollbar-thumb:hover]:bg-white/20',
].join(' ');

// ─── Filter Bar ───────────────────────────────────────────────────────────────
const FilterBar = ({
  filters,
  clinics,
  onFilterChange,
  categories = [],
  responders = [],
}) => {
  const { t } = useLanguage();

  const [catPanelOpen,    setCatPanelOpen]    = useState(false);
  const [teamPanelOpen,   setTeamPanelOpen]   = useState(false);
  const [clinicPanelOpen, setClinicPanelOpen] = useState(false);
  const catButtonRef    = useRef(null);
  const catPanelRef     = useRef(null);
  const teamButtonRef   = useRef(null);
  const teamPanelRef    = useRef(null);
  const clinicButtonRef = useRef(null);
  const clinicPanelRef  = useRef(null);
  const [catPanelPos,    setCatPanelPos]    = useState({ top: 0, right: 0 });
  const [teamPanelPos,   setTeamPanelPos]   = useState({ top: 0, left: 0 });
  const [clinicPanelPos, setClinicPanelPos] = useState({ top: 0, left: 0 });

  // Cerrar al hacer clic afuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        catPanelOpen &&
        catPanelRef.current    && !catPanelRef.current.contains(e.target) &&
        catButtonRef.current   && !catButtonRef.current.contains(e.target)
      ) setCatPanelOpen(false);

      if (
        clinicPanelOpen &&
        clinicPanelRef.current  && !clinicPanelRef.current.contains(e.target) &&
        clinicButtonRef.current && !clinicButtonRef.current.contains(e.target)
      ) setClinicPanelOpen(false);

      if (
        teamPanelOpen &&
        teamPanelRef.current    && !teamPanelRef.current.contains(e.target) &&
        teamButtonRef.current   && !teamButtonRef.current.contains(e.target)
      ) setTeamPanelOpen(false);
    };
    if (catPanelOpen || clinicPanelOpen || teamPanelOpen)
      document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [catPanelOpen, clinicPanelOpen, teamPanelOpen]);

  // Cerrar al hacer scroll fuera del panel
  useEffect(() => {
    const handleScroll = (e) => {
      if (
        catPanelRef.current?.contains(e.target) ||
        clinicPanelRef.current?.contains(e.target) ||
        teamPanelRef.current?.contains(e.target)
      ) return;
      if (catPanelOpen)    setCatPanelOpen(false);
      if (teamPanelOpen)   setTeamPanelOpen(false);
      if (clinicPanelOpen) setClinicPanelOpen(false);
    };
    if (catPanelOpen || clinicPanelOpen || teamPanelOpen)
      window.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    return () => window.removeEventListener('scroll', handleScroll, { capture: true });
  }, [catPanelOpen, clinicPanelOpen, teamPanelOpen]);

  const handleToggleCatPanel = () => {
    if (!catPanelOpen && catButtonRef.current) {
      const rect = catButtonRef.current.getBoundingClientRect();
      setCatPanelPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    }
    if (clinicPanelOpen) setClinicPanelOpen(false);
    if (teamPanelOpen) setTeamPanelOpen(false);
    setCatPanelOpen(v => !v);
  };

  const handleToggleTeamPanel = () => {
    if (!teamPanelOpen && teamButtonRef.current) {
      const rect = teamButtonRef.current.getBoundingClientRect();
      setTeamPanelPos({ top: rect.bottom + 8, left: rect.left });
    }
    if (catPanelOpen) setCatPanelOpen(false);
    if (clinicPanelOpen) setClinicPanelOpen(false);
    setTeamPanelOpen(v => !v);
  };

  const handleToggleClinicPanel = () => {
    if (!clinicPanelOpen && clinicButtonRef.current) {
      const rect = clinicButtonRef.current.getBoundingClientRect();
      setClinicPanelPos({ top: rect.bottom + 8, left: rect.left });
    }
    if (catPanelOpen) setCatPanelOpen(false);
    if (teamPanelOpen) setTeamPanelOpen(false);
    setClinicPanelOpen(v => !v);
  };

  const OFF              = 'border-wellq-gray/20 dark:border-white/10 bg-white dark:bg-wellq-dark text-wellq-gray hover:border-wellq-gray/40 dark:hover:border-white/20 hover:text-wellq-dark dark:hover:text-white';
  const DEFAULT_CAT_ON   = 'border-wellq-blue/30 bg-wellq-blue/10 text-wellq-blue dark:border-wellq-blue/20 dark:bg-wellq-blue/10 dark:text-wellq-blue';
  const DEFAULT_TEAM_ON  = 'border-indigo-300 bg-indigo-50 text-indigo-600 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400';
  const DEFAULT_CLINIC_ON= 'border-wellq-cyan/30 bg-wellq-cyan/10 text-wellq-cyan dark:border-wellq-cyan/20 dark:bg-wellq-cyan/10 dark:text-wellq-cyan';

  const STATUS_OPTIONS = [
    { value: 'Open',   label: t('support.statusOpen'),   icon: Clock,        on: STATUS_STYLE.Open.chip },
    { value: 'Closed', label: t('support.statusClosed'), icon: CheckCircle2, on: STATUS_STYLE.Closed.chip },
    { value: 'Sent',   label: t('support.statusSent'),   icon: Send,         on: STATUS_STYLE.Sent.chip },
  ];

  const CATEGORY_OPTIONS = categories.length > 0
    ? categories.map((cat) => ({
        value: cat.name,
        label: cat.name,
        icon:  CATEGORY_META[cat.name]?.icon ?? MessageSquare,
        on:    CATEGORY_META[cat.name]?.chip ?? DEFAULT_CAT_ON,
      }))
    : [
        { value: 'Bug',     label: 'Bug',     icon: Bug,           on: CATEGORY_META.Bug.chip },
        { value: 'Billing', label: 'Billing', icon: CreditCard,    on: CATEGORY_META.Billing.chip },
        { value: 'Feature', label: 'Feature', icon: Sparkles,      on: CATEGORY_META.Feature.chip },
      { value: 'Request', label: 'Request', icon: MessageSquare, on: CATEGORY_META.Request.chip },
      ];

  const RESPONDER_OPTIONS = responders
    .map((responder) => ({
      value: responder.id || responder.responder_id,
      label: responder.name,
      team: responder.team || responder.group,
      user: responder.user || responder.username,
    }))
    .filter((responder) => responder.value && responder.label)
    .sort((a, b) => a.label.localeCompare(b.label));

  const toggle = (key, val) =>
    onFilterChange?.({ ...filters, [key]: filters[key] === val ? undefined : val, page: 1 });

  const hasActive          = !!(filters.status || filters.category || filters.responder_id || filters.responder_team || filters.clinic_id);
  const activeCatOption    = CATEGORY_OPTIONS.find(o => o.value === filters.category);
  const activeResponderOption = RESPONDER_OPTIONS.find(o => o.value === filters.responder_id);
  const activeResponderLabel  = filters.responder_id === UNASSIGNED_RESPONDER_FILTER
    ? t('support.unassigned')
    : activeResponderOption?.label;
  const activeClinicOption = clinics.find(c => c.clinic_id === filters.clinic_id);

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {/* Ícono de filtro */}
      <div className="w-8 h-8 rounded-lg bg-wellq-gray/5 dark:bg-white/5 flex items-center justify-center ring-1 ring-wellq-gray/10 dark:ring-white/5 flex-shrink-0">
        <SlidersHorizontal size={14} className="text-wellq-dark dark:text-white" strokeWidth={2.2} />
      </div>

      {/* Status chips */}
      {STATUS_OPTIONS.map(({ value, label, icon, on }) => (
        <Chip
          key={value}
          icon={icon}
          label={label}
          active={filters.status === value}
          onClick={() => toggle('status', value)}
          className={filters.status === value ? on : OFF}
        />
      ))}

      <span className="w-px h-5 bg-wellq-gray/10 dark:bg-white/10 mx-1 flex-shrink-0" />

      {/* ── PANEL DE CATEGORÍA ── */}
      <div className="relative flex-shrink-0">
        <motion.button
          ref={catButtonRef}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleToggleCatPanel}
          className={`inline-flex items-center font-bold tracking-wide rounded-lg border cursor-pointer select-none transition-all px-3 py-1.5 text-[11px] gap-1.5 ${
            filters.category ? (activeCatOption?.on ?? DEFAULT_CAT_ON) : OFF
          }`}
        >
          <Tag size={11} strokeWidth={2.5} />
          {activeCatOption ? activeCatOption.label : t('support.category')}
          <ChevronDown
            size={10}
            strokeWidth={2.5}
            className={`transition-transform duration-200 ${catPanelOpen ? 'rotate-180' : ''}`}
          />
        </motion.button>

        {createPortal(
          <AnimatePresence>
            {catPanelOpen && (
              <motion.div
                ref={catPanelRef}
                key="cat-panel"
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0,  scale: 1 }}
                exit={{   opacity: 0, y: -8,  scale: 0.96 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                style={{ top: catPanelPos.top, right: catPanelPos.right }}
                className="fixed z-[200] bg-white dark:bg-wellq-dark border border-wellq-gray/20 dark:border-white/10 rounded-2xl shadow-xl overflow-hidden min-w-[200px] max-h-[240px] flex flex-col"
              >
                <div className="px-4 pt-3.5 pb-2 border-b border-wellq-gray/10 dark:border-white/5 flex-shrink-0">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-wellq-gray/70">
                    {t('support.filterByCategory')}
                  </p>
                </div>
                <div className={`flex-1 min-h-0 flex flex-col gap-1 p-2 overflow-y-auto ${SCROLLBAR_CLASSES}`}>
                  {CATEGORY_OPTIONS.map(({ value, label, icon: CatIcon, on }) => {
                    const active = filters.category === value;
                    return (
                      <button
                        key={value}
                        onClick={() => { toggle('category', value); setCatPanelOpen(false); }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-bold text-left w-full border transition-all ${
                          active ? on : OFF
                        }`}
                      >
                        <CatIcon size={11} strokeWidth={2.5} />
                        <span className="flex-1">{label}</span>
                        {active && <CheckCircle2 size={10} strokeWidth={2.5} className="flex-shrink-0 opacity-80" />}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
      </div>

      {/* ── PANEL DE CLÍNICAS ── */}
      <span className="w-px h-5 bg-wellq-gray/10 dark:bg-white/10 mx-1 flex-shrink-0" />

      <div className="relative flex-shrink-0">
        <motion.button
          ref={teamButtonRef}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleToggleTeamPanel}
          className={`inline-flex items-center font-bold tracking-wide rounded-lg border cursor-pointer select-none transition-all px-3 py-1.5 text-[11px] gap-1.5 ${
            filters.responder_id ? DEFAULT_TEAM_ON : OFF
          }`}
        >
          <Users size={11} strokeWidth={2.5} />
          <span className="max-w-[150px] truncate">
            {activeResponderLabel || t('support.responderFilter')}
          </span>
          <ChevronDown
            size={10}
            strokeWidth={2.5}
            className={`transition-transform duration-200 ${teamPanelOpen ? 'rotate-180' : ''}`}
          />
        </motion.button>

        {createPortal(
          <AnimatePresence>
            {teamPanelOpen && (
              <motion.div
                ref={teamPanelRef}
                key="team-panel"
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0,  scale: 1 }}
                exit={{   opacity: 0, y: -8,  scale: 0.96 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                style={{ top: teamPanelPos.top, left: teamPanelPos.left }}
                className="fixed z-[200] bg-white dark:bg-wellq-dark border border-wellq-gray/20 dark:border-white/10 rounded-2xl shadow-xl overflow-hidden min-w-[250px] max-h-[300px] flex flex-col"
              >
                <div className="px-4 pt-3.5 pb-2 border-b border-wellq-gray/10 dark:border-white/5 flex-shrink-0">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-wellq-gray/70">
                    {t('support.filterByResponder')}
                  </p>
                </div>

                <div className={`flex-1 min-h-0 flex flex-col gap-1 p-2 overflow-y-auto ${SCROLLBAR_CLASSES}`}>
                  <button
                    onClick={() => { onFilterChange?.({ ...filters, responder_id: undefined, responder_team: undefined, page: 1 }); setTeamPanelOpen(false); }}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-bold text-left w-full border transition-all ${
                      !filters.responder_id ? DEFAULT_TEAM_ON : OFF
                    }`}
                  >
                    <span className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0 ring-1 ring-wellq-gray/10 dark:ring-white/5">
                      <Users size={11} strokeWidth={2.5} />
                    </span>
                    <span className="flex-1">{t('support.allResponders')}</span>
                    {!filters.responder_id && (
                      <CheckCircle2 size={10} strokeWidth={2.5} className="flex-shrink-0 opacity-80" />
                    )}
                  </button>

                  <button
                    onClick={() => { onFilterChange?.({ ...filters, responder_id: UNASSIGNED_RESPONDER_FILTER, responder_team: undefined, page: 1 }); setTeamPanelOpen(false); }}
                    className={`flex items-start gap-2.5 px-3 py-2 rounded-xl text-[11px] font-bold text-left w-full border transition-all ${
                      filters.responder_id === UNASSIGNED_RESPONDER_FILTER ? DEFAULT_TEAM_ON : OFF
                    }`}
                  >
                    <span className="w-6 h-6 rounded-lg bg-wellq-gray/10 dark:bg-white/10 text-wellq-gray flex items-center justify-center flex-shrink-0 ring-1 ring-wellq-gray/10 dark:ring-white/5">
                      <Send size={11} strokeWidth={2.5} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block">{t('support.unassigned')}</span>
                      <span className="block mt-0.5 text-[10px] font-semibold normal-case tracking-normal text-wellq-gray/70">
                        {t('support.unassignedTicketsHint')}
                      </span>
                    </span>
                    {filters.responder_id === UNASSIGNED_RESPONDER_FILTER && (
                      <CheckCircle2 size={10} strokeWidth={2.5} className="flex-shrink-0 opacity-80 mt-1" />
                    )}
                  </button>

                  {RESPONDER_OPTIONS.length > 0 && (
                    <div className="my-1 h-px bg-wellq-gray/10 dark:bg-white/5" />
                  )}

                  {RESPONDER_OPTIONS.map(({ value, label, team, user }) => {
                    const active = filters.responder_id === value;
                    return (
                      <motion.button
                        key={value}
                        whileHover={{ x: 2 }}
                        transition={{ duration: 0.15 }}
                        onClick={() => { onFilterChange?.({ ...filters, responder_id: value, responder_team: undefined, page: 1 }); setTeamPanelOpen(false); }}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-bold text-left w-full border transition-all ${
                          active ? DEFAULT_TEAM_ON : OFF
                        }`}
                      >
                        <span className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0 ring-1 ring-wellq-gray/10 dark:ring-white/5">
                          <User size={11} strokeWidth={2.5} />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block truncate">{label}</span>
                          <span className="block mt-0.5 text-[10px] font-semibold normal-case tracking-normal text-wellq-gray/70">
                            {team || t('common.general')}{user ? ` - ${user}` : ''}
                          </span>
                        </span>
                        {active && <CheckCircle2 size={10} strokeWidth={2.5} className="flex-shrink-0 opacity-80" />}
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
      </div>

      {clinics.length > 0 && (
        <>
          <span className="w-px h-5 bg-wellq-gray/10 dark:bg-white/10 mx-1 flex-shrink-0" />
          <div className="relative flex-shrink-0">
            <motion.button
              ref={clinicButtonRef}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleToggleClinicPanel}
              className={`inline-flex items-center font-bold tracking-wide rounded-lg border cursor-pointer select-none transition-all px-3 py-1.5 text-[11px] gap-1.5 ${
                filters.clinic_id ? DEFAULT_CLINIC_ON : OFF
              }`}
            >
              <Building size={11} strokeWidth={2.5} />
              {activeClinicOption ? activeClinicOption.name : t('support.allClinics')}
              <ChevronDown
                size={10}
                strokeWidth={2.5}
                className={`transition-transform duration-200 ${clinicPanelOpen ? 'rotate-180' : ''}`}
              />
            </motion.button>

            {createPortal(
              <AnimatePresence>
                {clinicPanelOpen && (
                  <motion.div
                    ref={clinicPanelRef}
                    key="clinic-panel"
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0,  scale: 1 }}
                    exit={{   opacity: 0, y: -8,  scale: 0.96 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    style={{ top: clinicPanelPos.top, left: clinicPanelPos.left }}
                    className="fixed z-[200] bg-white dark:bg-wellq-dark border border-wellq-gray/20 dark:border-white/10 rounded-2xl shadow-xl overflow-hidden min-w-[220px] max-h-[260px] flex flex-col"
                  >
                    <div className="px-4 pt-3.5 pb-2 border-b border-wellq-gray/10 dark:border-white/5 flex-shrink-0">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-wellq-gray/70">
                        {t('support.filterByClinic')}
                      </p>
                    </div>

                    <div className={`flex-1 min-h-0 flex flex-col gap-1 p-2 overflow-y-auto ${SCROLLBAR_CLASSES}`}>

                      {/* Opción "Todas" */}
                      <button
                        onClick={() => { onFilterChange?.({ ...filters, clinic_id: undefined, page: 1 }); setClinicPanelOpen(false); }}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-bold text-left w-full border transition-all ${
                          !filters.clinic_id ? DEFAULT_CLINIC_ON : OFF
                        }`}
                      >
                        <span className="w-6 h-6 rounded-lg bg-wellq-cyan/10 dark:bg-wellq-cyan/10 text-wellq-cyan flex items-center justify-center flex-shrink-0 ring-1 ring-wellq-gray/10 dark:ring-white/5">
                          <Building size={11} strokeWidth={2.5} />
                        </span>
                        <span className="flex-1">{t('support.allClinics')}</span>
                        {!filters.clinic_id && (
                          <CheckCircle2 size={10} strokeWidth={2.5} className="flex-shrink-0 opacity-80" />
                        )}
                      </button>

                      {/* Lista de clínicas con avatar de iniciales */}
                      {clinics.map((c) => {
                        const active   = filters.clinic_id === c.clinic_id;
                        const color    = avatarFor(c.name);
                        const initials = c.name
                          ? c.name.trim().split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
                          : '?';
                        return (
                          <motion.button
                            key={c.clinic_id}
                            whileHover={{ x: 2 }}
                            transition={{ duration: 0.15 }}
                            onClick={() => { onFilterChange?.({ ...filters, clinic_id: c.clinic_id, page: 1 }); setClinicPanelOpen(false); }}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-bold text-left w-full border transition-all ${
                              active ? DEFAULT_CLINIC_ON : OFF
                            }`}
                          >
                            <span
                              className={`w-6 h-6 rounded-lg ${color.bg} ${color.text} text-[9px] font-black flex items-center justify-center flex-shrink-0 ring-1 ring-wellq-gray/10 dark:ring-white/5`}
                            >
                              {initials}
                            </span>
                            <span className="flex-1 truncate">{c.name}</span>
                            {active && (
                              <CheckCircle2 size={10} strokeWidth={2.5} className="flex-shrink-0 opacity-80" />
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>,
              document.body
            )}
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
            onClick={() => {
              onFilterChange?.({
                status: undefined,
                category: undefined,
                responder_id: undefined,
                responder_team: undefined,
                clinic_id: undefined,
                page: 1,
              });
              setCatPanelOpen(false);
              setTeamPanelOpen(false);
              setClinicPanelOpen(false);
            }}
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-wellq-gray hover:text-red-500 dark:hover:text-red-400 transition-colors ml-1 uppercase tracking-wider"
          >
            <X size={12} strokeWidth={2.5} />
            {t('common.clear')}
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
  // FIX: avatarFor ya maneja null/undefined sin explotar
  const avatar  = avatarFor(ticket.reporter_name);

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0  }}
      whileHover={{ y: -2, transition: { duration: 0.2, ease: 'easeOut' } }}
      transition={{ duration: 0.25, delay: index * 0.028, ease: 'easeOut' }}
      onClick={() => onSelect?.(ticket)}
      className="group relative flex items-center gap-4 px-5 py-4 cursor-pointer bg-white dark:bg-wellq-dark hover:bg-wellq-gray/3 dark:hover:bg-white/[0.02] hover:shadow-md hover:z-10 transition-all rounded-xl border border-transparent hover:border-wellq-gray/10 dark:hover:border-white/5"
    >
      <span
        className={`absolute left-0 top-3 bottom-3 w-[3px] ${status.accent} rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity duration-200`}
      />

      <div
        className={`w-10 h-10 rounded-xl ${avatar.bg} ${avatar.text} flex items-center justify-center text-xs font-black flex-shrink-0 ring-1 ring-wellq-gray/10 dark:ring-white/5 shadow-sm`}
        title={ticket.reporter_name}
      >
        {getInitials(ticket.reporter_name)}
      </div>

      <div className="flex-1 min-w-0 pr-4">
        <p className="text-sm font-bold text-wellq-dark dark:text-white leading-tight tracking-tight truncate group-hover:text-wellq-cyan transition-colors">
          {ticket.title}
        </p>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
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
          {ticket.responder_name && (
            <>
              <span className="text-wellq-gray/40 dark:text-wellq-gray/30 text-xs">•</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-wellq-blue dark:text-wellq-blue/80 truncate max-w-[120px]">
                <User size={10} strokeWidth={2.5} className="flex-shrink-0" />
                {ticket.responder_name}
              </span>
            </>
          )}
          {ticket.responder_team && (
            <>
              <span className="text-wellq-gray/40 dark:text-wellq-gray/30 text-xs">-</span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-wider max-w-[120px] truncate">
                <Users size={9} strokeWidth={2.5} className="flex-shrink-0" />
                {ticket.responder_team}
              </span>
            </>
          )}
        </div>
      </div>

      <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border flex-shrink-0 shadow-sm ${cat.chip}`}>
        <CatIcon size={12} strokeWidth={2.2} />
        {ticket.category}
      </div>

      <div className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border flex-shrink-0 shadow-sm ${status.badge}`}>
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${status.dot} ${status.pulse ? 'animate-pulse' : ''}`} />
        {ticket.status}
      </div>

      <span className="hidden md:block text-xs font-bold text-wellq-gray w-20 text-right flex-shrink-0 tabular-nums tracking-tight">
        {fmtDate(ticket.reported_at)}
      </span>

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
        {start}–{end} <span className="lowercase font-medium opacity-70">{t('support.of')}</span> {total.toLocaleString()} {t('support.tickets')}
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
  categories = [],
  responders = [],
  onFilterChange,
  onPageChange,
  onSelectTicket,
}) => {
  const { t } = useLanguage();
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="bg-white dark:bg-wellq-dark rounded-2xl border border-wellq-gray/20 dark:border-white/5 overflow-visible shadow-sm">

      <div className="px-6 py-4 border-b border-wellq-gray/10 dark:border-white/5 bg-wellq-gray/3 dark:bg-white/[0.02] rounded-t-2xl">
        <FilterBar
          filters={filters}
          clinics={clinics}
          onFilterChange={onFilterChange}
          categories={categories}
          responders={responders}
        />
      </div>

      {/* FIX: min-h-[320px] garantiza espacio para que el dropdown no se corte
              aunque haya pocos tickets en la lista */}
      <div className="flex flex-col py-2 px-2 divide-y divide-wellq-gray/5 dark:divide-white/5 min-h-[320px]">
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
