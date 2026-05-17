import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  LayoutDashboard, Building2, DollarSign, BarChart3,
  Settings, Server, Package, Bell, Search, ChevronDown,
  Activity, RefreshCw, PanelLeftClose, PanelLeftOpen,
  Trash2, X, Megaphone, Mail, Smartphone, CheckCircle, Clock,
  LogOut, Moon, Sun,
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

// 🌐 i18n
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
  { id: 'settings',   key: 'settings',   icon: Settings },
];

const VIEWS_WITH_DATERANGE = ['overview', 'clinics', 'financials', 'platform', 'analytics'];

// ========== Convierte el rango (24H,7D,30D,QTD,YTD) a fechas ==========
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
// ========================================================================

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
        const res  = await fetch('/api/notifications?limit=30');
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
      const res = await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
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
      style={{ maxHeight: '520px', display: 'flex', flexDirection: 'column' }}
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
const ProfileDropdown = ({ onGoSettings, onClose, theme, toggleTheme, above = false }) => {
  const dropRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const posStyle = above
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

  return (
    <div
      ref={dropRef}
      style={{
        ...posStyle,
        width: 210,
        background: '#1e293b',
        borderRadius: 12,
        border: '1px solid #334155',
        boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
        zIndex: 9999,
        overflow: 'hidden',
        paddingTop: 4,
        paddingBottom: 4,
      }}
    >
      <button
        onClick={() => { onGoSettings(); onClose(); }}
        style={{ ...btnBase, color: '#cbd5e1' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        <Settings size={15} style={{ color: '#64748b', flexShrink: 0 }} />
        Settings
      </button>
      <button
        onClick={() => { toggleTheme(); onClose(); }}
        style={{ ...btnBase, color: '#cbd5e1' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        {theme === 'dark'
          ? <Sun size={15} style={{ color: '#64748b', flexShrink: 0 }} />
          : <Moon size={15} style={{ color: '#64748b', flexShrink: 0 }} />
        }
        {theme === 'dark' ? 'Light mode' : 'Dark mode'}
      </button>
      <div style={{ height: 1, background: '#334155', margin: '4px 0' }} />
      <button
        onClick={() => { toast.success('Sesión cerrada'); onClose(); }}
        style={{ ...btnBase, color: '#f87171' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        <LogOut size={15} style={{ color: '#f87171', flexShrink: 0 }} />
        Log out
      </button>
    </div>
  );
};

export default function App() {
  // 🌐 i18n + tema
  const { t } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  // 🌐 Traducción de la barra lateral
  const NAV = useMemo(() => NAV_KEYS.map(item => ({
    ...item,
    label: t(`sidebar.${item.key}`),
  })), [t]);

  const [view,        setView]       = useState('overview');
  const [open,        setOpen]       = useState(true);
  const [loading,     setLoading]    = useState(true);
  const [refreshing,  setRefreshing] = useState(false);
  const [dateRange,   setDateRange]  = useState('30D');
  const [bellOpen,    setBellOpen]   = useState(false);
  // ── Estado del dropdown de perfil: null | 'sidebar' | 'topbar' ───────────
  const [profileOpen, setProfileOpen] = useState(null);

  const [tooltip, setTooltip] = useState({ id: null, top: 0 });

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

  // ─── Fetch ─────────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async (range = dateRange) => {
    setRefreshing(true);
    const { start_date, end_date } = getDateRangeFromPeriod(range);
    const withDates = (url) => `${url}?start_date=${start_date}&end_date=${end_date}`;
    const safe = (p) => p.catch(() => null);

    const results = await Promise.allSettled([
      safe(apiFetch(withDates('/api/kpis/arr'))),                               // 0
      safe(apiFetch(withDates('/api/kpis/clinics/active'))),                    // 1
      safe(apiFetch(withDates('/api/kpis/patients/total'))),                    // 2
      safe(apiFetch(withDates('/api/kpis/nrr'))),                               // 3
      safe(apiFetch(withDates('/api/financials/mrr/breakdown'))),               // 4
      safe(apiFetch(withDates('/api/financials/churn-risk/by-region'))),        // 5
      safe(apiFetch('/api/alerts')),                                            // 6
      safe(apiFetch('/api/clinics')),                                           // 7
      safe(apiFetch('/api/infrastructure/servers')),                            // 8
      safe(apiFetch('/api/infrastructure/processes')),                          // 9
      safe(apiFetch('/api/platform/ai/costs')),                                 // 10
      safe(apiFetch('/api/platform/ai/latency')),                               // 11
      safe(apiFetch('/api/platform/ai/pose-analysis/success-rate')),            // 12
      safe(apiFetch('/api/analytics/apps/patients')),                           // 13
      safe(apiFetch('/api/analytics/apps/tablet')),                             // 14
      safe(apiFetch('/api/analytics/apps/web')),                                // 15
      safe(apiFetch('/api/analytics/features/adoption')),                       // 16
      safe(apiFetch('/api/analytics/adherence/global')),                        // 17
      safe(apiFetch('/api/analytics/retention/cohorts')),                       // 18
      safe(apiFetch('/api/analytics/ai/soap-quality')),                         // 19
      safe(apiFetch('/api/settings')),                                          // 20
      safe(apiFetch('/api/settings/azure')),                                    // 21
      safe(apiFetch('/api/settings/database')),                                 // 22
      safe(apiFetch('/api/users')),                                             // 23
      safe(apiFetch(withDates('/api/kpis/system-health'))),                     // 24
      safe(apiFetch(withDates('/api/kpis/users/active-now'))),                  // 25
      safe(apiFetch(withDates('/api/kpis/downloads/total'))),                   // 26
      safe(apiFetch(withDates('/api/kpis/users/dormant'))),                     // 27
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

  // ─── Handlers ─────────────────────────────────────────────────────────────
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

  // ─── Sidebar ──────────────────────────────────────────────────────────────
  const Sidebar = () => (
    <aside
      style={{
        width:         `${visibleW}px`,
        transition:    'width 300ms cubic-bezier(0.4,0,0.2,1)',
        zIndex:        50,
        display:       'flex',
        flexDirection: 'column',
        background:    '#0f172a',
        flexShrink:    0,
        willChange:    'width',
        overflow:      'hidden',
      }}
    >
      <div style={{
        display:      'flex',
        alignItems:   'center',
        padding:      '0 16px',
        borderBottom: '1px solid #1e293b',
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
              background: 'linear-gradient(135deg,#6366f1,#9333ea)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Activity size={22} color="white" />
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
                  e.currentTarget.style.background = 'rgba(255,255,255,0.07)';
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
                background:     active ? 'rgba(255,255,255,0.12)' : 'transparent',
                color:          active ? 'white' : '#94a3b8',
                transition:     'background 150ms, color 150ms',
                textAlign:      'left',
                minHeight:      44,
                position:       'relative',
              }}
            >
              <Icon size={20} style={{ flexShrink: 0, margin: '0 2px' }} />

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
                <span style={{ fontSize: 14, fontWeight: 500 }}>{label}</span>

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
                }} />
              )}
            </button>
          );
        })}
      </nav>

      {/* ── Footer con ProfileDropdown ──────────────────────────────────── */}
      <div style={{
        padding:    '16px 12px',
        borderTop:  '1px solid #1e293b',
        marginTop:  'auto',
        position:   'relative',
      }}>
        {/* Dropdown posicionado encima del footer */}
        {profileOpen === 'sidebar' && (
          <ProfileDropdown
            onGoSettings={() => { setView('settings'); }}
            onClose={() => setProfileOpen(null)}
            theme={theme}
            toggleTheme={toggleTheme}
            above={true}
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
            JD
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
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'white' }}>John Doe</p>
              <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Super Admin</p>
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
            padding:        '6px 12px',
            background:     '#334155',
            color:          'white',
            fontSize:       13,
            fontWeight:     500,
            borderRadius:   8,
            whiteSpace:     'nowrap',
            pointerEvents:  'none',
            zIndex:         9999,
            boxShadow:      '0 4px 12px rgba(0,0,0,0.3)',
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

  // ─── Topbar ───────────────────────────────────────────────────────────────
  const Topbar = () => {
    const showDateRange = VIEWS_WITH_DATERANGE.includes(view);
    return (
      <header className="h-[72px] bg-white border-b border-slate-200 z-40 flex-shrink-0 dark:bg-gray-900 dark:border-gray-700">
        <div className="flex items-center justify-between px-8 h-full gap-4">
          <h1 className="text-xl font-bold text-slate-900 whitespace-nowrap dark:text-white">
            {t(`sidebar.${view}`)}
          </h1>
          <div className="flex items-center gap-3">
            {showDateRange && (
              <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 dark:bg-gray-800">
                {['24H', '7D', '30D', 'QTD', 'YTD'].map((r) => (
                  <button
                    key={r}
                    onClick={() => setDateRange(r)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                      dateRange === r
                        ? 'bg-white text-slate-900 shadow-sm dark:bg-gray-700 dark:text-white'
                        : 'text-slate-500 hover:text-slate-700 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            )}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder={t('topbar.searchPlaceholder')}
                className="pl-9 pr-4 py-2 bg-slate-100 rounded-lg text-sm w-56 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all dark:bg-gray-800 dark:text-white dark:focus:bg-gray-700"
              />
            </div>
            <button
              onClick={() => {
                fetchAll(dateRange);
                toast.success('Datos actualizados');
              }}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors dark:hover:bg-gray-800"
              title={t('topbar.refresh')}
            >
              <RefreshCw size={18} className={`text-slate-600 dark:text-gray-300 ${refreshing ? 'animate-spin' : ''}`} />
            </button>

            <div className="relative">
              <button
                onClick={() => setBellOpen((o) => !o)}
                className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors dark:hover:bg-gray-800"
                title={t('topbar.notifications')}
              >
                <Bell size={18} className="text-slate-600 dark:text-gray-300" />
                {unreadAlerts > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-gray-900" />
                )}
              </button>
              {bellOpen && <NotificationPanel onClose={() => setBellOpen(false)} />}
            </div>

            {/* ── Botón JD con ProfileDropdown ────────────────────────── */}
            <div className="relative">
              <button
                onClick={() => setProfileOpen((p) => p === 'topbar' ? null : 'topbar')}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors dark:hover:bg-gray-800"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-bold">
                  JD
                </div>
                <ChevronDown
                  size={14}
                  className="text-slate-500 dark:text-gray-400 transition-transform"
                  style={{ transform: profileOpen === 'topbar' ? 'rotate(180deg)' : 'rotate(0deg)' }}
                />
              </button>
              {profileOpen === 'topbar' && (
                <ProfileDropdown
                  onGoSettings={() => { setView('settings'); }}
                  onClose={() => setProfileOpen(null)}
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

  // ─── View router ──────────────────────────────────────────────────────────
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
          />
        );
      case 'clinics':
  return (
    <ClinicsView
      apiClinics={apiClinics}
      clinicsLoading={clinicsLoading}
      onImpersonate={handleImpersonate}
      onRefreshClinics={async () => {        // ← agrega esto
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

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      className="flex h-screen w-full bg-slate-50 overflow-hidden dark:bg-gray-950"
      style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap');
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
      `}</style>

      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 relative bg-slate-50 overflow-hidden dark:bg-gray-950">
        <Topbar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden relative">
          <div className="p-8">
            {renderView()}
          </div>
        </main>
      </div>
    </div>
  );
}