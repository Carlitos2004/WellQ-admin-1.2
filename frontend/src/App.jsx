import { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, Building2, DollarSign, BarChart3,
  Settings, Server, Package, Bell, Search, ChevronDown,
  Activity, RefreshCw, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';

import { apiFetch, API_BASE } from './api/client';
import { OverviewView }    from './views/OverviewView';
import { ClinicsView }     from './views/ClinicsView';
import { FinancialsView }  from './views/FinancialsView';
import { PlatformOpsView } from './views/PlatformOpsView';
import { AnalyticsView }   from './views/AnalyticsView';
import { PlansView }       from './views/PlansView';
import { SettingsView }    from './views/SettingsView';

const SIDEBAR_W   = 256;
const SIDEBAR_COL = 64;

const NAV = [
  { id: 'overview',   label: 'Overview',          icon: LayoutDashboard },
  { id: 'clinics',    label: 'Clinic Management',  icon: Building2 },
  { id: 'plans',      label: 'Plans & Pricing',    icon: Package },
  { id: 'financials', label: 'Financials',         icon: DollarSign },
  { id: 'platform',   label: 'Platform Ops',       icon: Server },
  { id: 'analytics',  label: 'Product Analytics',  icon: BarChart3 },
  { id: 'settings',   label: 'Settings',           icon: Settings },
];

const NAV_FULL_LABELS = {
  overview:   'Overview',
  clinics:    'Clinic Management',
  plans:      'Plans & Pricing',
  financials: 'Financials',
  platform:   'Platform Ops',
  analytics:  'Product Analytics',
  settings:   'Settings',
};

const VIEWS_WITH_DATERANGE = ['overview', 'clinics', 'financials', 'platform', 'analytics'];

const fmtArr = (val) => {
  if (!val) return '$0';
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000)     return `$${(val / 1_000).toFixed(0)}K`;
  return `$${val}`;
};

export default function App() {
  const [view,        setView]       = useState('overview');
  const [open,        setOpen]       = useState(true);
  const [loading,     setLoading]    = useState(true);
  const [refreshing,  setRefreshing] = useState(false);
  const [dateRange,   setDateRange]  = useState('30D');

  // ── Estado para tooltip flotante ─────────────────────────────────────────
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

  // ─── Fetch ────────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setRefreshing(true);
    const safe = (p) => p.catch(() => null);

    const results = await Promise.allSettled([
      safe(apiFetch('/api/kpis/arr')),                               // 0
      safe(apiFetch('/api/kpis/clinics/active')),                    // 1
      safe(apiFetch('/api/kpis/patients/total')),                    // 2
      safe(apiFetch('/api/kpis/nrr')),                               // 3
      safe(apiFetch('/api/financials/mrr/breakdown')),               // 4
      safe(apiFetch('/api/financials/churn-risk/by-region')),        // 5
      safe(apiFetch('/api/alerts')),                                 // 6
      safe(apiFetch('/api/clinics')),                                // 7
      safe(apiFetch('/api/infrastructure/servers')),                 // 8
      safe(apiFetch('/api/infrastructure/processes')),               // 9
      safe(apiFetch('/api/platform/ai/costs')),                      // 10
      safe(apiFetch('/api/platform/ai/latency')),                    // 11
      safe(apiFetch('/api/platform/ai/pose-analysis/success-rate')), // 12
      safe(apiFetch('/api/analytics/apps/patients')),                // 13
      safe(apiFetch('/api/analytics/apps/tablet')),                  // 14
      safe(apiFetch('/api/analytics/features/adoption')),            // 15
      safe(apiFetch('/api/analytics/adherence/global')),             // 16
      safe(apiFetch('/api/analytics/retention/cohorts')),            // 17
      safe(apiFetch('/api/analytics/ai/soap-quality')),              // 18
      safe(apiFetch('/api/settings')),                               // 19
      safe(apiFetch('/api/settings/azure')),                         // 20
      safe(apiFetch('/api/settings/database')),                      // 21
      safe(apiFetch('/api/users')),                                  // 22
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
    setAppStats(stats);
    if (v(15))       setFeatureAdoption(v(15));
    if (v(16))       setAdherence(v(16));
    if (v(17))       setCohorts(v(17));
    if (v(18))       setSoapQuality(v(18));
    if (v(19))       setGlobalSettings(v(19));
    if (v(20))       setAzureStatus(v(20));
    if (v(21))       setDbStatus(v(21));
    if (v(22)?.data) setSystemUsers(v(22).data);

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleImpersonate = async (clinic) => {
    const id     = clinic.clinic_id ?? clinic.id;
    const reason = window.prompt(`Razón para acceder a ${clinic.name} (mín. 10 caracteres):`);
    if (!reason || reason.length < 10) return;
    try {
      const res  = await fetch(`${API_BASE}/api/clinics/${id}/impersonate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (data.success) alert(`✅ Sesión iniciada.\nExpira: ${data.expires_at}`);
    } catch (_) {}
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
        // ✅ FIX: overflow: hidden evita la scrollbar horizontal al colapsar
        overflow:      'hidden',
      }}
    >
      {/* ── Cabecera ──────────────────────────────────────────────────── */}
      <div style={{
        display:      'flex',
        alignItems:   'center',
        padding:      '20px 16px',
        borderBottom: '1px solid #1e293b',
        minHeight:    72,
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

      {/* ── Nav ───────────────────────────────────────────────────────── */}
      <nav style={{
        flex:          1,
        overflowY:     'auto',
        // ✅ FIX: overflow: hidden en nav (los tooltips salen por position:fixed)
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
                // ✅ FIX: calculamos posición real para el tooltip fixed
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

              {/* Micro-indicador de alertas cuando está colapsado */}
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

      {/* ── Footer usuario ────────────────────────────────────────────── */}
      <div style={{
        padding:     '16px 12px',
        borderTop:   '1px solid #1e293b',
        display:     'flex',
        alignItems:  'center',
      }}>
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
          display:    'flex',
          alignItems: 'center',
          maxWidth:   open ? '200px' : '0px',
          opacity:    open ? 1 : 0,
          overflow:   'hidden',
          transition: 'all 300ms cubic-bezier(0.4,0,0.2,1)',
          whiteSpace: 'nowrap',
          marginLeft: open ? 12 : 0,
        }}>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'white' }}>John Doe</p>
            <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Super Admin</p>
          </div>
          <ChevronDown size={16} color="#64748b" style={{ flexShrink: 0, marginLeft: 12 }} />
        </div>
      </div>

      {/* ✅ FIX: Tooltip flotante via position:fixed — sale fuera del aside sin romper el layout */}
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
      <header className="bg-white border-b border-slate-200 z-40 flex-shrink-0">
        <div className="flex items-center justify-between px-8 py-4 gap-4">
          <h1 className="text-xl font-bold text-slate-900 whitespace-nowrap">
            {NAV_FULL_LABELS[view]}
          </h1>
          <div className="flex items-center gap-3">
            {showDateRange && (
              <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                {['24H', '7D', '30D', 'QTD', 'YTD'].map((r) => (
                  <button
                    key={r}
                    onClick={() => setDateRange(r)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                      dateRange === r
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            )}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar clínicas, facturas..."
                className="pl-9 pr-4 py-2 bg-slate-100 rounded-lg text-sm w-56 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
            </div>
            <button
              onClick={fetchAll}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              title="Actualizar datos"
            >
              <RefreshCw size={18} className={`text-slate-600 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <Bell size={18} className="text-slate-600" />
              {unreadAlerts > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
              )}
            </button>
            <button className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-bold">
                JD
              </div>
              <ChevronDown size={14} className="text-slate-500" />
            </button>
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
          />
        );
      case 'clinics':
        return (
          <ClinicsView
            apiClinics={apiClinics}
            clinicsLoading={clinicsLoading}
            onImpersonate={handleImpersonate}
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
          />
        );
      default:
        return null;
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      className="flex h-screen w-full bg-slate-50 overflow-hidden"
      style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap');
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
      `}</style>

      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 relative bg-slate-50 overflow-hidden">
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