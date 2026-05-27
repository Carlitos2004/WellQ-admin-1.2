import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  LayoutDashboard, Building2, DollarSign, BarChart3,
  Settings, Server, Package, Bell, Search, ChevronDown,
  Activity, RefreshCw, PanelLeftClose, PanelLeftOpen,
  Trash2, X, Megaphone, Mail, Smartphone, CheckCircle, Clock,
  LogOut, Moon, Sun, LifeBuoy,
} from 'lucide-react';
import { toast } from 'sonner';

import { apiFetch, API_BASE } from './api/client';
import { OverviewView }    from './views/OverviewView';
import { ClinicsView }     from './views/ClinicsView';
import { FinancialsView }  from './views/FinancialsView';
import { PlatformOpsView } from './views/PlatformOpsView';
import { AnalyticsView }   from './views/AnalyticsView';
import { PlansView }       from './views/PlansView';
import { SettingsView }    from './views/SettingsView';
import { SupportView }     from './views/SupportView';

import LoginPage from "./components/login/LoginPage";

import { logout as authLogout, getStoredUser } from './services/auth';

import { useLanguage } from './contexts/LanguageContext';
import { useTheme }    from './contexts/ThemeContext';

const SIDEBAR_W   = 256;
const SIDEBAR_COL = 64;

const NAV_KEYS = [
  { id: 'overview',   key: 'overview',   icon: LayoutDashboard },
  { id: 'clinics',    key: 'clinics',    icon: Building2 },
  { id: 'plans',      key: 'plans',      icon: Package },
  { id: 'financials', key: 'financials', icon: DollarSign },
  { id: 'platform',   key: 'platform',   icon: Server },
  { id: 'analytics',  key: 'analytics',  icon: BarChart3 },
  { id: 'support',    key: 'support',    icon: LifeBuoy },
  { id: 'settings',   key: 'settings',   icon: Settings },
];

// ✅ clinics removido — no necesita filtro de fechas
const VIEWS_WITH_DATERANGE = ['overview', 'financials', 'platform', 'analytics'];

const getDateRangeFromPeriod = (period) => {
  const now = new Date();
  const end = now.toISOString().split('T')[0];
  let start = new Date();

  switch (period) {
    case '24H':
      start.setDate(now.getDate() - 1);
      break;
    case '7D':
      start.setDate(now.getDate() - 7);
      break;
    case '30D':
      start.setDate(now.getDate() - 30);
      break;
    case 'QTD': {
      const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
      start = new Date(now.getFullYear(), quarterStartMonth, 1);
      break;
    }
    case 'YTD':
      start = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      start.setDate(now.getDate() - 30);
  }
  return {
    start_date: start.toISOString().split('T')[0],
    end_date: end,
  };
};

const fmtArr = (val) => {
  if (!val) return '$0';
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000)     return `$${(val / 1_000).toFixed(0)}K`;
  return `$${val}`;
};

const fmtDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const CHANNEL_ICON = {
  email:    Mail,
  sms:      Smartphone,
  in_app:   Megaphone,
  push:     Bell,
};

const STATUS_STYLE = {
  sent:     { color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle },
  pending:  { color: 'text-amber-600',   bg: 'bg-amber-50',   icon: Clock },
  failed:   { color: 'text-red-500',     bg: 'bg-red-50',     icon: X },
};

// ── Metadatos por vista para el Topbar header ────────────────────────────────
const VIEW_META = {
  overview:   { icon: LayoutDashboard, gradient: 'from-[#2cb7e4] to-[#16f8f9]',  sub: 'Resumen general y estado' },
  clinics:    { icon: Building2,       gradient: 'from-[#16f8f9] to-[#1fed92]', sub: 'Gestión de clínicas activas' },
  plans:      { icon: Package,         gradient: 'from-[#2cb7e4] to-[#16f8f9]',  sub: 'Planes y suscripciones' },
  financials: { icon: DollarSign,      gradient: 'from-[#1fed92] to-[#16f8f9]', sub: 'MRR, churn y finanzas' },
  platform:   { icon: Server,          gradient: 'from-[#2cb7e4] to-[#16f8f9]',  sub: 'Infraestructura y costos AI' },
  analytics:  { icon: BarChart3,       gradient: 'from-[#2cb7e4] to-[#16f8f9]',  sub: 'Adopción y calidad del sistema' },
  support:    { icon: LifeBuoy,        gradient: 'from-[#16f8f9] to-[#1fed92]', sub: 'Gestión de tickets' },
  settings:   { icon: Settings,        gradient: 'from-[#8c9299] to-[#2cb7e4]',  sub: 'Configuración global' },
};

// ── Notification Panel ───────────────────────────────────────────────────────
const NotificationPanel = ({ onClose }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);
  const [deletingId, setDeletingId]       = useState(null);
  const panelRef = useRef(null);

  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        setLoading(true);
        // ✨ AQUÍ AGREGAMOS ${API_BASE} ✨
        const res  = await fetch(`${API_BASE}/api/notifications?limit=30`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setNotifications(json.data ?? []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchNotifs();
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      // ✨ AQUÍ TAMBIÉN AGREGAMOS ${API_BASE} ✨
      const res = await fetch(`${API_BASE}/api/notifications/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error('Error al eliminar notificación:', err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full mt-2 w-96 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-slate-100 dark:border-gray-700 z-50 overflow-hidden"
      style={{ maxHeight: '520px', display: 'flex', flexDirection: 'column', animation: 'fadeSlideDown 220ms cubic-bezier(0.22,1,0.36,1) both' }}
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-gray-700">
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Notificaciones</h3>
          <p className="text-xs text-slate-400 mt-0.5">Historial de mensajes enviados</p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <X size={16} className="text-slate-400 dark:text-gray-500" />
        </button>
      </div>

      <div className="overflow-y-auto flex-1">
        {loading && (
          <div className="flex items-center justify-center py-12 gap-2">
            <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-slate-400">Cargando…</span>
          </div>
        )}

        {!loading && error && (
          <p className="text-sm text-red-400 text-center py-8">Error: {error}</p>
        )}

        {!loading && !error && notifications.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <Bell size={28} className="text-slate-200 dark:text-gray-600" />
            <p className="text-sm text-slate-400 dark:text-gray-500">Sin notificaciones</p>
          </div>
        )}

        {!loading && !error && notifications.map((n) => {
          const ChannelIcon = CHANNEL_ICON[n.channel] ?? Megaphone;
          const statusStyle = STATUS_STYLE[n.status] ?? STATUS_STYLE.pending;
          const StatusIcon  = statusStyle.icon;

          return (
            <div
              key={n.id}
              className="flex gap-3 px-5 py-3.5 border-b border-slate-50 dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors group"
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                <ChannelIcon size={15} className="text-indigo-500 dark:text-indigo-400" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{n.title}</p>
                  <button
                    onClick={() => handleDelete(n.id)}
                    disabled={deletingId === n.id}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-all flex-shrink-0"
                    title="Eliminar"
                  >
                    {deletingId === n.id
                      ? <div className="w-3.5 h-3.5 border border-red-300 border-t-transparent rounded-full animate-spin" />
                      : <Trash2 size={13} className="text-red-400" />
                    }
                  </button>
                </div>
                <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5 line-clamp-2">{n.message}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`flex items-center gap-1 text-xs font-medium ${statusStyle.color} ${statusStyle.bg} px-1.5 py-0.5 rounded-md`}>
                    <StatusIcon size={10} />
                    {n.status}
                  </span>
                  <span className="text-xs text-slate-300 dark:text-gray-600">·</span>
                  <span className="text-xs text-slate-400 dark:text-gray-500">{fmtDate(n.createdAt)}</span>
                  {n.recipientClinicId && n.recipientClinicId !== 'all' && (
                    <>
                      <span className="text-xs text-slate-300 dark:text-gray-600">·</span>
                      <span className="text-xs text-slate-400 dark:text-gray-500 truncate max-w-[80px]">{n.recipientClinicId}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!loading && !error && notifications.length > 0 && (
        <div className="px-5 py-3 border-t border-slate-100 dark:border-gray-700 bg-slate-50 dark:bg-gray-800">
          <p className="text-xs text-slate-400 dark:text-gray-500 text-center">
            {notifications.length} notificación{notifications.length !== 1 ? 'es' : ''}
          </p>
        </div>
      )}
    </div>
  );
};

// ── ProfileDropdown ──────────────────────────────────────────────────────────
const ProfileDropdown = ({ onGoSettings, onClose, onLogout, theme, toggleTheme, above = false, toRight = false }) => {
  const dropRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const posStyle = toRight
    ? { position: 'fixed', left: SIDEBAR_COL + 8, bottom: 16 }
    : above
      ? { position: 'absolute', bottom: '100%', left: 0, marginBottom: 8 }
      : { position: 'absolute', top: '100%', right: 0, marginTop: 8 };

  const btnBase = {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 16px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
    textAlign: 'left',
  };

  const FONT = "'Poppins', 'Inter', ui-sans-serif, system-ui, sans-serif";

  return (
    <div
      ref={dropRef}
      style={{
        ...posStyle,
        width: 220,
        background: 'linear-gradient(180deg, #13202f 0%, #0f1a27 100%)',
        borderRadius: 14,
        border: '1px solid rgba(22,248,249,0.12)',
        boxShadow: '0 16px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(22,248,249,0.04)',
        zIndex: 9999,
        overflow: 'hidden',
        paddingTop: 6,
        paddingBottom: 6,
        fontFamily: FONT,
        animation: 'fadeScaleIn 200ms cubic-bezier(0.22,1,0.36,1) both',
      }}
    >
      {/* Settings */}
      <button
        onClick={() => { onGoSettings(); onClose(); }}
        style={{ ...btnBase, color: '#e2e8f0', fontFamily: FONT }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(22,248,249,0.06)'; e.currentTarget.style.color = '#fff'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#e2e8f0'; }}
      >
        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(100,116,139,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Settings size={14} style={{ color: '#94a3b8' }} />
        </div>
        <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 500 }}>Settings</span>
      </button>

      {/* Theme toggle */}
      <button
        onClick={() => { toggleTheme(); onClose(); }}
        style={{ ...btnBase, color: '#e2e8f0', fontFamily: FONT }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(22,248,249,0.06)'; e.currentTarget.style.color = '#fff'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#e2e8f0'; }}
      >
        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(100,116,139,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {theme === 'dark'
            ? <Sun size={14} style={{ color: '#94a3b8' }} />
            : <Moon size={14} style={{ color: '#94a3b8' }} />}
        </div>
        <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 500 }}>
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </span>
      </button>

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(22,248,249,0.08)', margin: '6px 12px' }} />

      {/* Log out */}
      <button
        onClick={() => { onLogout(); onClose(); }}
        style={{ ...btnBase, color: '#fca5a5', fontFamily: FONT }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(239,68,68,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <LogOut size={14} style={{ color: '#f87171' }} />
        </div>
        <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600 }}>Log out</span>
      </button>
    </div>
  );
};

// ── Sidebar ──────────────────────────────────────────────────────────────────
const Sidebar = ({
  open, setOpen, view, setView, visibleW, NAV,
  unreadAlerts, profileOpen, setProfileOpen,
  currentUser, theme, toggleTheme, handleLogout,
  tooltip, setTooltip,
}) => (
  <aside
    style={{
      width:         `${visibleW}px`,
      transition:    'width 300ms cubic-bezier(0.4,0,0.2,1)',
      zIndex:        50,
      display:       'flex',
      flexDirection: 'column',
      background:    'linear-gradient(180deg, #0f1c2e 0%, #0b1420 60%, #0a1118 100%)',
      borderRight:   '1px solid rgba(22,248,249,0.06)',
      flexShrink:    0,
      willChange:    'width',
      overflow:      'hidden',
    }}
  >
    <div style={{
      display:      'flex',
      alignItems:   'center',
      padding:      '0 16px',
      borderBottom: '1px solid rgba(22,248,249,0.06)',
      height:       '72px',
      boxSizing:    'border-box',
    }}>
      <div style={{
        maxWidth:   open ? '200px' : '0px',
        opacity:    open ? 1 : 0,
        overflow:   'hidden',
        transition: 'all 300ms cubic-bezier(0.4,0,0.2,1)',
        whiteSpace: 'nowrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12, flexShrink: 0,
            background: 'linear-gradient(135deg,#16f8f9,#2cb7e4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 16px rgba(22,248,249,0.3)',
            animation: 'glowPulse 3s ease-in-out infinite',
          }}>
            <Activity size={22} color="#000" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 18, color: 'white', lineHeight: 1.2 }}>WellQ</p>
            <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Admin Console</p>
          </div>
        </div>
      </div>

      <button
        onClick={() => setOpen((o) => !o)}
        title={open ? 'Colapsar menú' : 'Expandir menú'}
        style={{
          background:     'transparent',
          border:         'none',
          cursor:         'pointer',
          padding:        6,
          borderRadius:   8,
          color:          '#64748b',
          flexShrink:     0,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          marginLeft:     'auto',
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
      >
        {open ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
      </button>
    </div>

    <nav style={{
      flex:          1,
      overflowY:     'auto',
      overflowX:     'hidden',
      padding:       '16px 12px',
      display:       'flex',
      flexDirection: 'column',
      gap:           4,
    }}>
      {NAV.map(({ id, label, icon: Icon }) => {
        const active = view === id;
        return (
          <button
            key={id}
            onClick={() => setView(id)}
            onMouseEnter={(e) => {
              if (!active) {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                e.currentTarget.style.color = 'white';
              }
              if (!open) {
                const rect = e.currentTarget.getBoundingClientRect();
                setTooltip({ id, top: rect.top + rect.height / 2 });
              }
            }}
            onMouseLeave={(e) => {
              if (!active) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#94a3b8';
              }
              setTooltip({ id: null, top: 0 });
            }}
            style={{
              boxSizing:      'border-box',
              width:          '100%',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'flex-start',
              padding:        '11px 10px',
              borderRadius:   12,
              border:         'none',
              cursor:         'pointer',
              background:     active ? 'rgba(22,248,249,0.08)' : 'transparent',
              color:          active ? '#16f8f9' : '#94a3b8',
              transition:     'background 150ms, color 150ms',
              textAlign:      'left',
              minHeight:      44,
              position:       'relative',
              overflow:       'hidden',
            }}
          >
            {/* Indicador izquierdo animado */}
            <span style={{
              position:     'absolute',
              left:         0,
              top:          '50%',
              transform:    active ? 'translateY(-50%) scaleY(1)' : 'translateY(-50%) scaleY(0)',
              width:        3,
              height:       22,
              borderRadius: '0 3px 3px 0',
              background:   'linear-gradient(180deg,#16f8f9,#2cb7e4)',
              boxShadow:    active ? '0 0 8px rgba(22,248,249,0.6)' : 'none',
              animation:    active ? 'indicatorGlow 2s ease-in-out infinite' : 'none',
              transition:   'transform 200ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 200ms',
              transformOrigin: 'center',
            }} />

            <Icon
              size={20}
              style={{
                flexShrink: 0,
                margin: '0 2px',
                color: active ? '#16f8f9' : 'inherit',
                filter: active ? 'drop-shadow(0 0 6px rgba(22,248,249,0.5))' : 'none',
                transition: 'color 150ms, filter 150ms',
              }}
            />

            <div style={{
              display:    'flex',
              alignItems: 'center',
              maxWidth:   open ? '200px' : '0px',
              opacity:    open ? 1 : 0,
              overflow:   'hidden',
              transition: 'all 300ms cubic-bezier(0.4,0,0.2,1)',
              whiteSpace: 'nowrap',
              marginLeft: open ? 14 : 0,
            }}>
              <span style={{ fontSize: 14, fontWeight: active ? 600 : 500, color: active ? '#16f8f9' : 'inherit' }}>{label}</span>

              {id === 'overview' && unreadAlerts > 0 && (
                <span style={{
                  marginLeft:     12,
                  flexShrink:     0,
                  minWidth:       20,
                  height:         20,
                  padding:        '0 6px',
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  background:     '#ef4444',
                  color:          'white',
                  fontSize:       11,
                  fontWeight:     700,
                  borderRadius:   999,
                  animation:      'badgeNum 2s ease-in-out infinite',
                }}>
                  {unreadAlerts}
                </span>
              )}
            </div>

            {!open && id === 'overview' && unreadAlerts > 0 && (
              <span style={{
                position:     'absolute',
                top:          8,
                right:        8,
                width:        8,
                height:       8,
                background:   '#ef4444',
                borderRadius: '50%',
                animation:    'badgeDot 2s ease-in-out infinite',
              }} />
            )}
          </button>
        );
      })}
    </nav>

    <div style={{
      padding:    '16px 12px',
      borderTop:  '1px solid rgba(22,248,249,0.06)',
      marginTop:  'auto',
      position:   'relative',
    }}>
      {profileOpen === 'sidebar' && (
        <ProfileDropdown
          onGoSettings={() => { setView('settings'); }}
          onClose={() => setProfileOpen(null)}
          onLogout={handleLogout}
          theme={theme}
          toggleTheme={toggleTheme}
          above={open}
          toRight={!open}
        />
      )}

      <button
        onClick={() => setProfileOpen((p) => p === 'sidebar' ? null : 'sidebar')}
        style={{
          width:          '100%',
          display:        'flex',
          alignItems:     'center',
          background:     'transparent',
          border:         'none',
          cursor:         'pointer',
          padding:        0,
          borderRadius:   8,
        }}
      >
        <div style={{
          width:          38,
          height:         38,
          borderRadius:   '50%',
          flexShrink:     0,
          background:     'linear-gradient(135deg,#34d399,#14b8a6)',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          color:          'white',
          fontSize:       13,
          fontWeight:     700,
        }}>
          {currentUser?.full_name
            ? (() => {
                const parts = currentUser.full_name.trim().split(' ');
                return parts.length >= 2
                  ? (parts[0][0] + parts[1][0]).toUpperCase()
                  : currentUser.full_name.substring(0, 2).toUpperCase();
              })()
            : '?'
          }
        </div>

        <div style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          flex:           open ? 1 : 0,
          maxWidth:       open ? '200px' : '0px',
          opacity:        open ? 1 : 0,
          overflow:       'hidden',
          transition:     'all 300ms cubic-bezier(0.4,0,0.2,1)',
          whiteSpace:     'nowrap',
          marginLeft:     open ? 12 : 0,
          minWidth:       0,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'white' }}>{currentUser?.full_name ?? 'Usuario'}</p>
            <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>{currentUser?.role?.replace('_', ' ') ?? 'Admin'}</p>
          </div>
          <ChevronDown
            size={16}
            color="#64748b"
            style={{
              flexShrink:  0,
              marginLeft:  12,
              transform:   profileOpen === 'sidebar' ? 'rotate(180deg)' : 'rotate(0deg)',
              transition:  'transform 200ms',
            }}
          />
        </div>
      </button>
    </div>

    {!open && tooltip.id && (
      <div
        style={{
          position:       'fixed',
          left:           SIDEBAR_COL + 12,
          top:            tooltip.top,
          transform:      'translateY(-50%)',
          padding:        '7px 14px',
          background:     '#13202f',
          color:          'white',
          fontSize:       13,
          fontWeight:     500,
          fontFamily:     "'Poppins', 'Inter', ui-sans-serif, system-ui, sans-serif",
          borderRadius:   10,
          border:         '1px solid rgba(22,248,249,0.15)',
          whiteSpace:     'nowrap',
          pointerEvents:  'none',
          zIndex:         9999,
          boxShadow:      '0 4px 16px rgba(0,0,0,0.4)',
          animation:      'fadeSlideRight 150ms ease-out both',
        }}
      >
        {NAV.find((n) => n.id === tooltip.id)?.label}
        {tooltip.id === 'overview' && unreadAlerts > 0 && (
          <span style={{
            marginLeft:   6,
            padding:      '1px 5px',
            background:   '#ef4444',
            borderRadius: 999,
            fontSize:     11,
            fontWeight:   700,
          }}>
            {unreadAlerts}
          </span>
        )}
      </div>
    )}
  </aside>
);

// ── Topbar Unificado ─────────────────────────────────────────────────────────
const Topbar = ({
  view, dateRange, setDateRange, searchQuery, setSearchQuery,
  refreshing, unreadAlerts, bellOpen, setBellOpen,
  profileOpen, setProfileOpen, fetchAll, currentUser,
  theme, toggleTheme, setView, handleLogout, t,
}) => {
  const showDateRange = VIEWS_WITH_DATERANGE.includes(view);
  const meta = VIEW_META[view] ?? VIEW_META.overview;
  const ViewIcon = meta.icon;

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : name.substring(0, 2).toUpperCase();
  };

  return (
    <header className="h-[72px] bg-[#0f1c2e] border-b border-[rgba(22,248,249,0.06)] z-40 flex-shrink-0">
      <div className="flex items-center justify-between px-8 h-full gap-4">
        
        {/* Título unificado: Misma altura (72px), letra text-2xl y color blanco */}
        <div key={view} className="flex items-center gap-4 min-w-0 anim-topbar">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center shadow-lg shadow-[#16f8f9]/20 flex-shrink-0`}>
            <ViewIcon size={20} className="text-black" strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <h1 className="text-1xl font-bold text-white whitespace-nowrap">
              {t(`sidebar.${view}`)}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {showDateRange && (
            <div className="flex items-center gap-1 bg-[#1e293b] rounded-lg p-1 border border-[#334155]/50">
              {['24H', '7D', '30D', 'QTD', 'YTD'].map((r) => (
                <button
                  key={r}
                  onClick={() => setDateRange(r)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                    dateRange === r
                      ? 'bg-[#0f172a] text-[#16f8f9] shadow-sm border border-[#16f8f9]/30'
                      : 'text-[#94a3b8] hover:text-white'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          )}

          {/* Search Input Adaptado al Fondo Oscuro */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('topbar.searchPlaceholder')}
              className="pl-9 pr-4 py-2 bg-[#1e293b] rounded-lg text-sm w-56 focus:outline-none focus:ring-2 focus:ring-[#16f8f9]/50 focus:bg-[#0f172a] transition-all text-white placeholder:text-[#94a3b8]/60 border border-[#1e293b] focus:border-[#16f8f9]/30"
            />
          </div>

          <button
            onClick={() => {
              fetchAll(dateRange);
              toast.success('Datos actualizados');
            }}
            className="p-2 hover:bg-[#1e293b] rounded-lg transition-colors topbar-btn"
            title={t('topbar.refresh')}
          >
            <RefreshCw size={18} className={`text-[#94a3b8] hover:text-white ${refreshing ? 'animate-spin text-[#16f8f9]' : ''}`} />
          </button>

          <div className="relative">
            <button
              onClick={() => setBellOpen((o) => !o)}
              className="relative p-2 hover:bg-[#1e293b] rounded-lg transition-colors topbar-btn"
              title={t('topbar.notifications')}
            >
              <Bell size={18} className="text-[#94a3b8] hover:text-white" />
              {unreadAlerts > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-[#0f172a] anim-badge-dot" />
              )}
            </button>
            {bellOpen && <NotificationPanel onClose={() => setBellOpen(false)} />}
          </div>

          <div className="relative">
            <button
              onClick={() => setProfileOpen((p) => p === 'topbar' ? null : 'topbar')}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#1e293b] transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#16f8f9] to-[#2cb7e4] flex items-center justify-center text-black text-xs font-bold shadow-md">
                {getInitials(currentUser?.full_name)}
              </div>
              <ChevronDown
                size={14}
                className="text-[#94a3b8] transition-transform"
                style={{ transform: profileOpen === 'topbar' ? 'rotate(180deg)' : 'rotate(0deg)' }}
              />
            </button>
            {profileOpen === 'topbar' && (
              <ProfileDropdown
                onGoSettings={() => { setView('settings'); }}
                onClose={() => setProfileOpen(null)}
                onLogout={handleLogout}
                theme={theme}
                toggleTheme={toggleTheme}
                above={false}
              />
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

// ── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!localStorage.getItem("wellq_access_token")
  );
  const [currentUser, setCurrentUser] = useState(() => getStoredUser());

  const { t } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  const NAV = useMemo(() => NAV_KEYS.map(item => ({
    ...item,
    label: t(`sidebar.${item.key}`),
  })), [t]);

  const [view,        setView]        = useState('overview');
  const [open,        setOpen]        = useState(true);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [dateRange,   setDateRange]   = useState('30D');
  const [bellOpen,    setBellOpen]    = useState(false);
  const [profileOpen, setProfileOpen] = useState(null);
  const [tooltip,     setTooltip]     = useState({ id: null, top: 0 });

  const [kpiArr,          setKpiArr]          = useState(null);
  const [kpiClinics,      setKpiClinics]      = useState(null);
  const [kpiPatients,     setKpiPatients]     = useState(null);
  const [kpiNrr,          setKpiNrr]          = useState(null);
  const [mrrData,         setMrrData]         = useState(null);
  const [churnRegions,    setChurnRegions]    = useState([]);
  const [apiAlerts,       setApiAlerts]       = useState([]);
  const [unreadAlerts,    setUnreadAlerts]    = useState(0);
  const [apiClinics,      setApiClinics]      = useState([]);
  const [clinicsLoading,  setClinicsLoading]  = useState(false);
  const [apiServers,      setApiServers]      = useState([]);
  const [apiProcesses,    setApiProcesses]    = useState([]);
  const [apiCosts,        setApiCosts]        = useState(null);
  const [apiLatency,      setApiLatency]      = useState(null);
  const [apiPose,         setApiPose]         = useState(null);
  const [appStats,        setAppStats]        = useState({});
  const [featureAdoption, setFeatureAdoption] = useState(null);
  const [adherence,       setAdherence]       = useState(null);
  const [cohorts,         setCohorts]         = useState(null);
  const [soapQuality,     setSoapQuality]     = useState(null);
  const [globalSettings,  setGlobalSettings]  = useState(null);
  const [azureStatus,     setAzureStatus]     = useState(null);
  const [dbStatus,        setDbStatus]        = useState(null);
  const [systemUsers,     setSystemUsers]     = useState([]);
  const [kpiSystemHealth, setKpiSystemHealth] = useState(null);
  const [kpiActiveNow,    setKpiActiveNow]    = useState(null);
  const [kpiDownloads,    setKpiDownloads]    = useState(null);
  const [kpiDormant,      setKpiDormant]      = useState(null);

  // ✅ Estado del search
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = async () => {
    try {
      await authLogout();
    } catch {
      localStorage.removeItem("wellq_access_token");
      localStorage.removeItem("wellq_refresh_token");
      localStorage.removeItem("wellq_user");
    }
    setCurrentUser(null);
    setIsAuthenticated(false);
    toast.success("Sesión cerrada correctamente");
  };

  const fetchAll = useCallback(async (range = dateRange) => {
    setRefreshing(true);
    const { start_date, end_date } = getDateRangeFromPeriod(range);
    const withDates = (url) => `${url}?start_date=${start_date}&end_date=${end_date}`;
    const safe = (p) => p.catch(() => null);

    const results = await Promise.allSettled([
      safe(apiFetch(withDates('/api/dashboard/arr'))),
      safe(apiFetch(withDates('/api/dashboard/clinics/active'))),
      safe(apiFetch(withDates('/api/dashboard/patients/total'))),
      safe(apiFetch(withDates('/api/dashboard/nrr'))),
      safe(apiFetch(withDates('/api/financials/mrr/breakdown'))),
      safe(apiFetch(withDates('/api/financials/churn-risk/by-region'))),
      safe(apiFetch('/api/alerts')),
      safe(apiFetch('/api/clinics')),
      safe(apiFetch('/api/infrastructure/servers')),
      safe(apiFetch('/api/infrastructure/processes')),
      safe(apiFetch('/api/platform/ai/costs')),
      safe(apiFetch('/api/platform/ai/latency')),
      safe(apiFetch('/api/platform/ai/pose-analysis/success-rate')),
      safe(apiFetch('/api/analytics/apps/patients')),
      safe(apiFetch('/api/analytics/apps/tablet')),
      safe(apiFetch('/api/analytics/apps/web')),
      safe(apiFetch('/api/analytics/features/adoption')),
      safe(apiFetch('/api/analytics/adherence/global')),
      safe(apiFetch('/api/analytics/retention/cohorts')),
      safe(apiFetch('/api/analytics/ai/soap-quality')),
      safe(apiFetch('/api/settings')),
      safe(apiFetch('/api/settings/azure')),
      safe(apiFetch('/api/settings/database')),
      safe(apiFetch('/api/users')),
      safe(apiFetch(withDates('/api/dashboard/system-health'))),
      safe(apiFetch(withDates('/api/dashboard/users/active-now'))),
      safe(apiFetch(withDates('/api/dashboard/downloads/total'))),
      safe(apiFetch(withDates('/api/dashboard/users/dormant'))),
    ]);

    const v = (i) => results[i].value;

    if (v(0))        setKpiArr(v(0));
    if (v(1))        setKpiClinics(v(1));
    if (v(2))        setKpiPatients(v(2));
    if (v(3))        setKpiNrr(v(3));
    if (v(4)?.data)  setMrrData(v(4).data);
    if (v(5)?.data)  setChurnRegions(v(5).data);
    if (v(6)?.data) {
      setApiAlerts(v(6).data);
      setUnreadAlerts(v(6).unread_count ?? v(6).data.length);
    }
    if (v(7)?.data)  setApiClinics(v(7).data);
    if (v(8)?.data)  setApiServers(v(8).data);
    if (v(9)?.data)  setApiProcesses(v(9).data);
    if (v(10))       setApiCosts(v(10));
    if (v(11))       setApiLatency(v(11));
    if (v(12))       setApiPose(v(12));
    const stats = {};
    if (v(13)) stats.patients = v(13);
    if (v(14)) stats.tablet   = v(14);
    if (v(15)) stats.web      = v(15);
    setAppStats(stats);
    if (v(16))       setFeatureAdoption(v(16));
    if (v(17))       setAdherence(v(17));
    if (v(18))       setCohorts(v(18));
    if (v(19))       setSoapQuality(v(19));
    if (v(20))       setGlobalSettings(v(20));
    if (v(21))       setAzureStatus(v(21));
    if (v(22))       setDbStatus(v(22));
    if (v(23)?.data) setSystemUsers(v(23).data);
    if (v(24))       setKpiSystemHealth(v(24));
    if (v(25))       setKpiActiveNow(v(25));
    if (v(26))       setKpiDownloads(v(26));
    if (v(27))       setKpiDormant(v(27));

    setLoading(false);
    setRefreshing(false);
  }, [dateRange]);

  useEffect(() => {
    fetchAll(dateRange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loading) {
      fetchAll(dateRange);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  const handleImpersonate = async (clinic, data) => {
    if (data?.success) {
      toast.success(`✅ Sesión iniciada en ${clinic.name}`);
    }
  };

  const handleAckAlert = (alertId) => {
    fetch(`${API_BASE}/api/alerts/${alertId}/acknowledge`, { method: 'POST' })
      .then(() => {
        setApiAlerts((prev) => prev.filter((a) => a.alert_id !== alertId));
        setUnreadAlerts((n) => Math.max(0, n - 1));
      }).catch(() => {});
  };

  const handleSaveSettings = (changes) => {
    fetch(`${API_BASE}/api/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(changes),
    }).then((r) => r.json())
      .then((d) => setGlobalSettings((prev) => ({ ...prev, ...d })))
      .catch(() => {});
  };

  const handleRefreshUsers = async () => {
    try {
      const data = await apiFetch('/api/users');
      if (data?.data) setSystemUsers(data.data);
    } catch (err) {
      console.error('Error al refrescar usuarios', err);
    }
  };

  const visibleW = open ? SIDEBAR_W : SIDEBAR_COL;

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={() => {
      setCurrentUser(getStoredUser());
      setIsAuthenticated(true);
    }} />;
  }

  const renderView = () => {
    switch (view) {
      case 'overview':
        return (
          <OverviewView
            loading={loading}
            kpiArr={kpiArr}
            kpiClinics={kpiClinics}
            kpiPatients={kpiPatients}
            kpiNrr={kpiNrr}
            mrrData={mrrData}
            churnRegions={churnRegions}
            apiAlerts={apiAlerts}
            onAcknowledgeAlert={handleAckAlert}
            apiServers={apiServers}
            apiProcesses={apiProcesses}
            fmtArr={fmtArr}
            kpiSystemHealth={kpiSystemHealth}
            kpiActiveNow={kpiActiveNow}
            kpiDownloads={kpiDownloads}
            kpiDormant={kpiDormant}
            appStats={appStats}
            onGoSupport={() => setView('support')}
          />
        );
      case 'clinics':
        return (
          <ClinicsView
            searchQuery={searchQuery}
            apiClinics={apiClinics}
            clinicsLoading={clinicsLoading}
            onImpersonate={handleImpersonate}
            onRefreshClinics={async () => {
              const res = await apiFetch('/api/clinics');
              if (res?.data) setApiClinics(res.data);
            }}
          />
        );
      case 'financials':
        return <FinancialsView mrrData={mrrData} churnRegions={churnRegions} />;
      case 'platform':
        return (
          <PlatformOpsView
            apiCosts={apiCosts}
            apiLatency={apiLatency}
            apiPose={apiPose}
            apiServers={apiServers}
            apiProcesses={apiProcesses}
          />
        );
      case 'analytics':
        return (
          <AnalyticsView
            appStats={appStats}
            featureAdoption={featureAdoption}
            adherence={adherence}
            cohorts={cohorts}
            soapQuality={soapQuality}
            loading={loading}
          />
        );
      case 'plans':
        return <PlansView />;
      case 'support':
        return (
          <SupportView
            apiClinics={apiClinics}
          />
        );
      case 'settings':
        return (
          <SettingsView
            globalSettings={globalSettings}
            azureStatus={azureStatus}
            dbStatus={dbStatus}
            users={systemUsers}
            loading={loading}
            onSaveSettings={handleSaveSettings}
            onRefreshUsers={handleRefreshUsers}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div
      className="flex h-screen w-full bg-slate-50 overflow-hidden dark:bg-[#070b12]"
    >
      <style>{`
        @keyframes shimmer        { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes fadeSlideUp    { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeSlideDown  { from{opacity:0;transform:translateY(-10px) scale(0.98)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes fadeScaleIn    { from{opacity:0;transform:scale(0.94) translateY(-6px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes fadeSlideRight { from{opacity:0;transform:translateX(-10px)} to{opacity:1;transform:translateX(0)} }
        @keyframes topbarEntrance { from{opacity:0;transform:translateX(-14px)} to{opacity:1;transform:translateX(0)} }
        @keyframes glowPulse      { 0%,100%{box-shadow:0 0 16px rgba(22,248,249,0.3)} 50%{box-shadow:0 0 32px rgba(22,248,249,0.75),0 0 56px rgba(22,248,249,0.25)} }
        @keyframes badgeDot       { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.4);opacity:0.7} }
        @keyframes badgeNum       { 0%,100%{transform:scale(1)} 50%{transform:scale(1.15)} }
        @keyframes indicatorGlow  { 0%,100%{box-shadow:0 0 8px rgba(22,248,249,0.6)} 50%{box-shadow:0 0 18px rgba(22,248,249,1),0 0 30px rgba(22,248,249,0.4)} }

        /* ── Scrollbar sutil — dark mode safe ── */
        .main-scroll::-webkit-scrollbar { width: 4px; }
        .main-scroll::-webkit-scrollbar-track { background: transparent; }
        .main-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.06); border-radius: 99px; }
        .main-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }
        .main-scroll { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.06) transparent; }

        /* ── Transición de vistas ── */
        .anim-view { animation: fadeSlideUp 280ms cubic-bezier(0.22,1,0.36,1) both; }

        /* ── Topbar título ── */
        .anim-topbar { animation: topbarEntrance 260ms cubic-bezier(0.22,1,0.36,1) both; }

        /* ── Badge dot pulsante ── */
        .anim-badge-dot { animation: badgeDot 2s ease-in-out infinite; }
        .anim-badge-num { animation: badgeNum 2s ease-in-out infinite; }

        /* ── Hover scale en botones topbar ── */
        .topbar-btn { transition: transform 150ms ease, background 150ms ease; }
        .topbar-btn:hover { transform: scale(1.1); }
      `}</style>

      <Sidebar
        open={open}
        setOpen={setOpen}
        view={view}
        setView={setView}
        visibleW={visibleW}
        NAV={NAV}
        unreadAlerts={unreadAlerts}
        profileOpen={profileOpen}
        setProfileOpen={setProfileOpen}
        currentUser={currentUser}
        theme={theme}
        toggleTheme={toggleTheme}
        handleLogout={handleLogout}
        tooltip={tooltip}
        setTooltip={setTooltip}
      />

      <div className="flex-1 flex flex-col min-w-0 relative bg-slate-50 overflow-hidden dark:bg-[#070b12]">
        <Topbar
          view={view}
          dateRange={dateRange}
          setDateRange={setDateRange}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          refreshing={refreshing}
          unreadAlerts={unreadAlerts}
          bellOpen={bellOpen}
          setBellOpen={setBellOpen}
          profileOpen={profileOpen}
          setProfileOpen={setProfileOpen}
          fetchAll={fetchAll}
          currentUser={currentUser}
          theme={theme}
          toggleTheme={toggleTheme}
          setView={setView}
          handleLogout={handleLogout}
          t={t}
        />
        <main className="flex-1 overflow-y-auto overflow-x-hidden relative main-scroll">
          <div key={view} className="p-8 anim-view">
            {renderView()}
          </div>
        </main>
      </div>
    </div>
  );
}