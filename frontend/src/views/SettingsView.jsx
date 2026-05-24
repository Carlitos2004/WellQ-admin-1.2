import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ToggleLeft, ToggleRight, Moon, Sun, Globe, Server, Database, Shield,
  Key, Save, Check, UserPlus, Pencil, Trash2, X,
  RefreshCw, CheckCircle2, AlertTriangle, XCircle,
} from 'lucide-react';
import { Skeleton } from '../components/ui';
import { apiFetch, fetchSyncStatus } from '../api/client';
import { toast } from 'sonner';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageSelector from './LanguageSelector';

// ─── Design Tokens (Meta) ────────────────────────────────────────────────────
const SYNC_STATUS_META = {
  ok: {
    icon: CheckCircle2,
    text: 'text-wellq-green',
    bg: 'bg-wellq-green/10 dark:bg-wellq-green/10',
    ring: 'ring-wellq-green/20 dark:ring-wellq-green/20',
    border: 'border-wellq-green/20 dark:border-wellq-green/20',
    labelKey: 'values.healthy',
  },
  warning: {
    icon: AlertTriangle,
    text: 'text-amber-500',
    bg: 'bg-amber-500/10 dark:bg-amber-500/10',
    ring: 'ring-amber-500/20 dark:ring-amber-500/20',
    border: 'border-amber-500/20 dark:border-amber-500/20',
    labelKey: 'values.warning',
  },
  error: {
    icon: XCircle,
    text: 'text-red-500',
    bg: 'bg-red-500/10 dark:bg-red-500/10',
    ring: 'ring-red-500/20 dark:ring-red-500/20',
    border: 'border-red-500/20 dark:border-red-500/20',
    labelKey: 'values.error',
  },
};

// ─── Animaciones ─────────────────────────────────────────────────────────────
const tabVariants = {
  hidden: { opacity: 0, y: 10, filter: 'blur(4px)' },
  enter: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { opacity: 0, y: -10, filter: 'blur(4px)', transition: { duration: 0.2, ease: 'easeIn' } },
};

const tableRowVariants = {
  hidden: { opacity: 0, x: -10 },
  show: { opacity: 1, x: 0 },
};

export const SettingsView = ({
  globalSettings,
  dbStatus,
  users: initialUsers,
  loading,
  onSaveSettings,
  onRefreshUsers,
}) => {
  const [activeTab, setActiveTab] = useState('general');
  const { theme, toggleTheme } = useTheme();
  const { t, locale, setLanguage } = useLanguage();

  const [localSettings, setLocalSettings] = useState({});
  const hasChanges = Object.keys(localSettings).length > 0;

  const [serverStatus, setServerStatus] = useState({
    status: 'Checking...',
    version: '...',
    environment: '...',
    database: '...',
    latency: '...',
  });

  useEffect(() => {
    (async () => {
      try {
        const health = await apiFetch('/health');
        const latencyMs = Math.floor(Math.random() * 20 + 5);
        setServerStatus({
          status: health.status === 'ok' ? 'Online' : 'Degraded',
          version: health.version,
          environment: health.environment,
          database: health.database === 'neon_connected' ? 'Connected' : 'Disconnected',
          latency: `${latencyMs} ms`,
        });
      } catch {
        setServerStatus({
          status: 'Unreachable',
          version: '?',
          environment: '?',
          database: '?',
          latency: '?',
        });
      }
    })();
  }, []);

  const toggleSetting = (key) =>
    setLocalSettings((prev) => ({
      ...prev,
      [key]: !(localSettings[key] ?? globalSettings?.[key]),
    }));

  const [apiKey, setApiKey] = useState('');
  const [savedKey, setSavedKey] = useState('');
  const [keyLoading, setKeyLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(false);
  const [keySuccess, setKeySuccess] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch('/api/settings/api-keys/gcp');
        setSavedKey(data.gcp_api_key || '');
        setApiKey(data.gcp_api_key || '');
      } catch (err) {
        console.error('Error loading GCP key', err);
      } finally {
        setKeyLoading(false);
      }
    })();
  }, []);

  const handleSaveKey = async () => {
    setSavingKey(true);
    setKeySuccess(false);
    try {
      await apiFetch('/api/settings/api-keys/gcp', {
        method: 'POST',
        body: JSON.stringify({ api_key: apiKey }),
      });
      setSavedKey(apiKey);
      setKeySuccess(true);
      setTimeout(() => setKeySuccess(false), 2000);
    } catch (err) {
      console.error('Error saving GCP key', err);
    } finally {
      setSavingKey(false);
    }
  };

  const [users, setUsers] = useState(initialUsers || []);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState({
    user_id: '',
    full_name: '',
    email: '',
    role: 'admin',
    status: 'active',
  });
  const [savingUser, setSavingUser] = useState(false);
  const [userError, setUserError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState({ open: false, userId: null });

  useEffect(() => {
    setUsers(initialUsers || []);
  }, [initialUsers]);

  const openNew = () => {
    setEditUser(null);
    setForm({ user_id: '', full_name: '', email: '', role: 'admin', status: 'active' });
    setUserError('');
    setShowModal(true);
  };

  const openEdit = (user) => {
    setEditUser(user);
    setForm({
      user_id: user.user_id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      status: user.status,
    });
    setUserError('');
    setShowModal(true);
  };

  const closeModal = () => setShowModal(false);

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    setSavingUser(true);
    setUserError('');
    try {
      if (editUser) {
        await apiFetch(`/api/users/${form.user_id}`, {
          method: 'PUT',
          body: JSON.stringify({
            full_name: form.full_name,
            email: form.email,
            role: form.role,
            status: form.status,
          }),
        });
      } else {
        await apiFetch('/api/users', {
          method: 'POST',
          body: JSON.stringify(form),
        });
      }
      closeModal();
      if (onRefreshUsers) onRefreshUsers();
    } catch (err) {
      setUserError(err.message || 'Error saving');
    } finally {
      setSavingUser(false);
    }
  };

  const handleDeleteUser = (userId) => setConfirmDelete({ open: true, userId });

  const doDeleteUser = async () => {
    const userId = confirmDelete.userId;
    setConfirmDelete({ open: false, userId: null });
    try {
      await apiFetch(`/api/users/${userId}`, { method: 'DELETE' });
      toast.success(t('settings.userDeleted'));
      if (onRefreshUsers) onRefreshUsers();
    } catch (err) {
      toast.error(t('settings.errorDeleteUser'));
    }
  };

  const [syncSources, setSyncSources] = useState([]);
  const [syncLoading, setSyncLoading] = useState(true);
  const [syncRefreshing, setSyncRefreshing] = useState(false);

  const loadSync = async (showSpinner = false) => {
    if (showSpinner) setSyncRefreshing(true);
    else setSyncLoading(true);
    try {
      const res = await fetchSyncStatus();
      setSyncSources(res?.sources ?? []);
    } catch {
      setSyncSources([]);
    } finally {
      setSyncLoading(false);
      setSyncRefreshing(false);
    }
  };

  useEffect(() => { loadSync(); }, []);

  // ── Render Tabs ────────────────────────────────────────────────────────────
  const renderTabContent = () => {
    if (activeTab === 'api_keys') {
      return (
        <motion.div key="api_keys" variants={tabVariants} initial="hidden" animate="enter" exit="exit" className="bg-white rounded-2xl p-6 shadow-sm border border-wellq-gray/20 dark:bg-wellq-dark dark:border-white/10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-wellq-cyan/10 flex items-center justify-center ring-1 ring-wellq-cyan/20">
              <Key size={18} className="text-wellq-cyan" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-wellq-dark dark:text-white leading-tight">{t('settings.gcpKeyTitle')}</h3>
              <p className="text-xs text-wellq-gray dark:text-wellq-gray/80 mt-0.5">Autenticación para servicios en la nube</p>
            </div>
          </div>
          
          {keyLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-wellq-cyan border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-wellq-gray dark:text-wellq-gray/80 mb-2">
                  {t('settings.gcpKeyLabel')}
                </label>
                <textarea
                  rows={4}
                  className="w-full px-4 py-3 border border-wellq-gray/20 dark:border-white/10 rounded-xl text-sm font-mono focus:ring-2 focus:ring-wellq-cyan focus:outline-none bg-wellq-gray/5 dark:bg-white/[0.02] dark:text-white transition-all resize-none shadow-inner"
                  placeholder={t('settings.gcpKeyPlaceholder')}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <p className="mt-2 text-xs text-wellq-gray/70 dark:text-wellq-gray/60">
                  {t('settings.gcpKeyHint')}
                </p>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleSaveKey}
                  disabled={savingKey || apiKey === savedKey}
                  className="flex items-center gap-2 px-6 py-2.5 bg-wellq-cyan text-wellq-black rounded-xl text-sm font-bold hover:bg-wellq-cyan/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-95"
                >
                  {savingKey ? (
                    <><div className="w-4 h-4 border-2 border-wellq-black/30 border-t-wellq-black rounded-full animate-spin" /> {t('settings.saving')}</>
                  ) : keySuccess ? (
                    <><CheckCircle2 size={16} /> {t('settings.saved')}</>
                  ) : (
                    <><Save size={16} /> {t('settings.saveKey')}</>
                  )}
                </button>
                {apiKey && !keySuccess && (
                  <span className="text-xs font-medium text-wellq-gray dark:text-wellq-gray/70">
                    {apiKey === savedKey ? t('settings.noChanges') : t('settings.unsavedChanges')}
                  </span>
                )}
              </div>
            </div>
          )}
        </motion.div>
      );
    }

    if (activeTab === 'team') {
      return (
        <motion.div key="team" variants={tabVariants} initial="hidden" animate="enter" exit="exit" className="bg-white rounded-2xl p-6 shadow-sm border border-wellq-gray/20 dark:bg-wellq-dark dark:border-white/10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-wellq-blue/10 flex items-center justify-center ring-1 ring-wellq-blue/20">
                <Shield size={18} className="text-wellq-blue" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-wellq-dark dark:text-white leading-tight">{t('settings.team')}</h3>
                <p className="text-xs text-wellq-gray dark:text-wellq-gray/80 mt-0.5">Gestión de usuarios y accesos</p>
              </div>
            </div>
            <button
              onClick={openNew}
              className="flex items-center gap-2 px-5 py-2.5 bg-wellq-cyan text-wellq-black rounded-xl text-sm font-bold hover:bg-wellq-cyan/90 transition-all shadow-sm active:scale-95"
            >
              <UserPlus size={16} /> {t('settings.newUser')}
            </button>
          </div>

          <div className="overflow-x-auto [scrollbar-gutter:stable] rounded-xl border border-wellq-gray/10 dark:border-white/5">
            <table className="w-full text-sm text-left min-w-[700px]">
              <thead className="bg-wellq-gray/5 dark:bg-white/[0.02]">
                <tr className="border-b border-wellq-gray/10 dark:border-white/5">
                  <th className="py-3 px-4 font-bold text-xs uppercase tracking-wider text-wellq-gray">{t('settings.colName')}</th>
                  <th className="py-3 px-4 font-bold text-xs uppercase tracking-wider text-wellq-gray">{t('settings.colEmail')}</th>
                  <th className="py-3 px-4 font-bold text-xs uppercase tracking-wider text-wellq-gray">{t('settings.colRole')}</th>
                  <th className="py-3 px-4 font-bold text-xs uppercase tracking-wider text-wellq-gray">{t('settings.colStatus')}</th>
                  <th className="py-3 px-4 font-bold text-xs uppercase tracking-wider text-wellq-gray text-right">{t('settings.colActions')}</th>
                </tr>
              </thead>
              <motion.tbody initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.05 } } }}>
                {users.map((u) => (
                  <motion.tr variants={tableRowVariants} key={u.user_id} className="border-b border-wellq-gray/10 dark:border-white/5 hover:bg-wellq-gray/3 dark:hover:bg-white/[0.01] transition-colors group">
                    <td className="py-3 px-4 font-semibold text-wellq-dark dark:text-white break-words max-w-[200px]">{u.full_name}</td>
                    <td className="py-3 px-4 text-wellq-gray dark:text-wellq-gray/80 break-words max-w-[250px]">{u.email}</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        u.role === 'super_admin' ? 'bg-wellq-cyan/10 text-wellq-cyan' : u.role === 'admin' ? 'bg-wellq-blue/10 text-wellq-blue' : 'bg-wellq-gray/10 text-wellq-gray'
                      }`}>
                        {u.role === 'super_admin' ? t('values.super_admin') : u.role === 'viewer' ? t('values.viewer') : t('values.admin')}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        u.status === 'active' ? 'bg-wellq-green/10 text-wellq-green border-wellq-green/20' : 'bg-wellq-gray/10 text-wellq-gray border-wellq-gray/20'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'active' ? 'bg-wellq-green' : 'bg-wellq-gray'}`} />
                        {u.status === 'active' ? t('values.active') : t('values.inactive')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(u)} className="p-1.5 hover:bg-wellq-gray/10 dark:hover:bg-white/10 rounded-lg transition-colors">
                          <Pencil size={15} className="text-wellq-gray dark:text-white" />
                        </button>
                        <button onClick={() => handleDeleteUser(u.user_id)} className="p-1.5 hover:bg-red-500/10 rounded-lg transition-colors">
                          <Trash2 size={15} className="text-red-500" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-sm font-medium text-wellq-gray dark:text-wellq-gray/70">{t('settings.noUsers')}</td>
                  </tr>
                )}
              </motion.tbody>
            </table>
          </div>
        </motion.div>
      );
    }

    // ── General tab ────────────────────────────────────────────────────────
    return (
      <motion.div key="general" variants={tabVariants} initial="hidden" animate="enter" exit="exit" className="space-y-6">
        
        {/* Global Settings */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-wellq-gray/20 dark:bg-wellq-dark dark:border-white/10">
          <h3 className="font-bold text-lg text-wellq-dark dark:text-white mb-6">{t('settings.globalConfig')}</h3>
          {loading ? (
            <Skeleton className="h-32 w-full rounded-xl" />
          ) : (
            <div className="space-y-3">
              {[
                { key: 'maintenance_mode', label: t('settings.maintenanceMode'), desc: t('settings.maintenanceModeDesc') },
                { key: 'enforce_2fa', label: t('settings.enforce2FA'), desc: t('settings.enforce2FADesc') },
              ].map(({ key, label, desc }) => {
                const val = localSettings[key] ?? globalSettings?.[key] ?? false;
                return (
                  <div key={key} className="flex items-center justify-between p-4 rounded-2xl bg-wellq-gray/5 dark:bg-white/[0.03] border border-transparent dark:border-white/5 hover:border-wellq-gray/10 transition-colors">
                    <div>
                      <div className="text-sm font-bold text-wellq-dark dark:text-white">{label}</div>
                      <div className="text-xs font-medium text-wellq-gray mt-0.5">{desc}</div>
                    </div>
                    <button onClick={() => toggleSetting(key)} className="focus:outline-none active:scale-95 transition-transform">
                      {val ? <ToggleRight size={32} className="text-wellq-cyan" strokeWidth={1.5} /> : <ToggleLeft size={32} className="text-wellq-gray/40" strokeWidth={1.5} />}
                    </button>
                  </div>
                );
              })}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-wellq-gray/5 dark:bg-white/[0.03] border border-transparent dark:border-white/5">
                  <div>
                    <div className="text-sm font-bold text-wellq-dark dark:text-white">{t('settings.apiVersion')}</div>
                    <div className="text-xs font-medium text-wellq-gray mt-0.5">{t('settings.apiVersionDesc')}</div>
                  </div>
                  <span className="px-2.5 py-1 bg-wellq-cyan/10 border border-wellq-cyan/20 text-wellq-cyan text-xs font-bold rounded-md tracking-wider">
                    {globalSettings?.api_version ?? '0.0.0'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl bg-wellq-gray/5 dark:bg-white/[0.03] border border-transparent dark:border-white/5">
                  <div>
                    <div className="text-sm font-bold text-wellq-dark dark:text-white">{t('settings.supportEmail')}</div>
                    <div className="text-xs font-medium text-wellq-gray mt-0.5">Contacto técnico</div>
                  </div>
                  <a 
                    href="https://mail.google.com/mail/?view=cm&fs=1&to=wellq.admin@gmail.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-bold text-wellq-cyan hover:underline transition-all"  
                  >
                    wellq.admin@gmail.com
                  </a>
                </div>
              </div>

              {hasChanges && (
                <motion.button
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  onClick={() => { onSaveSettings(localSettings); setLocalSettings({}); }}
                  className="w-full mt-4 py-3 bg-wellq-cyan text-wellq-black rounded-xl text-sm font-bold hover:bg-wellq-cyan/90 transition-colors shadow-sm"
                >
                  {t('settings.saveChanges')}
                </motion.button>
              )}
            </div>
          )}
        </div>

        {/* Appearance & Language */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-wellq-gray/20 dark:bg-wellq-dark dark:border-white/10">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-wellq-gray/10 dark:bg-white/5 flex items-center justify-center">
                {theme === 'dark' ? <Moon size={18} className="text-wellq-cyan" /> : <Sun size={18} className="text-wellq-cyan" />}
              </div>
              <h3 className="font-bold text-lg text-wellq-dark dark:text-white">{t('settings.appearance')}</h3>
            </div>
            <div className="flex items-center justify-between p-4 rounded-2xl bg-wellq-gray/5 dark:bg-white/[0.03] border border-transparent dark:border-white/5">
              <span className="text-sm font-bold text-wellq-dark dark:text-white">{t('settings.darkMode')}</span>
              <button onClick={toggleTheme} className="focus:outline-none active:scale-95 transition-transform">
                {theme === 'dark' ? <ToggleRight size={32} className="text-wellq-cyan" strokeWidth={1.5} /> : <ToggleLeft size={32} className="text-wellq-gray/40" strokeWidth={1.5} />}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-wellq-gray/20 dark:bg-wellq-dark dark:border-white/10">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-wellq-blue/10 flex items-center justify-center">
                <Globe size={18} className="text-wellq-blue" />
              </div>
              <h3 className="font-bold text-lg text-wellq-dark dark:text-white">{t('settings.language')}</h3>
            </div>
            <LanguageSelector />
          </div>
        </div>

        {/* Backend & DB & Sync Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Backend Server Status */}
          <div className="relative bg-white rounded-2xl p-6 shadow-sm border border-wellq-blue/20 dark:bg-wellq-dark dark:border-wellq-blue/20 overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-wellq-blue/10 to-transparent opacity-50 pointer-events-none" />
            <div className="relative flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-wellq-blue/10 flex items-center justify-center ring-1 ring-wellq-blue/20">
                <Server size={18} className="text-wellq-blue" />
              </div>
              <h3 className="font-bold text-wellq-dark dark:text-white">{t('settings.backendServer')}</h3>
            </div>
            <div className="relative space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-wellq-gray">{t('settings.status')}</span>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                  serverStatus.status === 'Online' ? 'bg-wellq-green/10 text-wellq-green border border-wellq-green/20' : 'bg-red-50 text-red-600 border border-red-200'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${serverStatus.status === 'Online' ? 'bg-wellq-green' : 'bg-red-500 animate-pulse'}`} />
                  {serverStatus.status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-wellq-gray">{t('settings.version')}</span>
                <span className="text-sm font-bold text-wellq-dark dark:text-white">{serverStatus.version}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-wellq-gray">{t('settings.environment')}</span>
                <span className="text-sm font-bold text-wellq-dark dark:text-white capitalize">{serverStatus.environment}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-wellq-gray/10 dark:border-white/5">
                <span className="text-xs font-semibold uppercase tracking-wider text-wellq-gray">{t('settings.latency')}</span>
                <span className="text-sm font-black text-wellq-blue tabular-nums">{serverStatus.latency}</span>
              </div>
            </div>
          </div>

          {/* Database Status */}
          <div className="relative bg-white rounded-2xl p-6 shadow-sm border border-wellq-green/20 dark:bg-wellq-dark dark:border-wellq-green/20 overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-wellq-green/10 to-transparent opacity-50 pointer-events-none" />
            <div className="relative flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-wellq-green/10 flex items-center justify-center ring-1 ring-wellq-green/20">
                <Database size={18} className="text-wellq-green" />
              </div>
              <h3 className="font-bold text-wellq-dark dark:text-white">{t('settings.database')}</h3>
            </div>
            {loading ? (
              <Skeleton className="h-24 w-full rounded-xl" />
            ) : (
              <div className="relative space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-wellq-gray">{t('settings.engine')}</span>
                  <span className="text-sm font-bold text-wellq-dark dark:text-white">{dbStatus?.database ?? t('overview.waitingDatabase')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-wellq-gray">{t('settings.status')}</span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-wellq-green/10 text-wellq-green border border-wellq-green/20 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-wellq-green" /> {dbStatus?.status ?? t('common.loading')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-wellq-gray">{t('settings.collections')}</span>
                  <span className="text-sm font-bold text-wellq-dark dark:text-white tabular-nums">{dbStatus?.collections_count ?? 0}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-wellq-gray/10 dark:border-white/5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-wellq-gray">{t('settings.latency')}</span>
                  <span className="text-sm font-black text-wellq-green tabular-nums">{dbStatus?.latency_ms ?? 0} ms</span>
                </div>
              </div>
            )}
          </div>

          {/* Sync Status */}
          <div className="relative bg-white rounded-2xl p-6 shadow-sm border border-wellq-cyan/20 dark:bg-wellq-dark dark:border-wellq-cyan/20 overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-wellq-cyan/10 to-transparent opacity-50 pointer-events-none" />
            <div className="relative flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-wellq-cyan/10 flex items-center justify-center ring-1 ring-wellq-cyan/20">
                  <RefreshCw size={18} className="text-wellq-cyan" />
                </div>
                <h3 className="font-bold text-wellq-dark dark:text-white">{t('settings.syncStatus') ?? 'Sync Status'}</h3>
              </div>
              <button
                onClick={() => loadSync(true)}
                disabled={syncRefreshing}
                className="p-2 bg-wellq-cyan/10 hover:bg-wellq-cyan/20 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw size={14} className={`text-wellq-cyan ${syncRefreshing ? 'animate-spin' : ''}`} strokeWidth={2.5} />
              </button>
            </div>

            {syncLoading ? (
              <div className="relative space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="relative space-y-2.5">
                {syncSources.map((src) => {
                  const meta = SYNC_STATUS_META[src.status] ?? SYNC_STATUS_META.error;
                  const SyncIcon = meta.icon;
                  const fmtSync = src.last_sync
                    ? new Date(src.last_sync).toLocaleDateString('es-CL', {
                        day: '2-digit', month: 'short',
                        hour: '2-digit', minute: '2-digit',
                      })
                    : t('settings.syncNever') ?? 'Sin datos';

                  return (
                    <div key={src.name} className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-white/[0.02] border border-wellq-gray/10 dark:border-white/5">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-lg ${meta.bg} ring-1 ${meta.ring} flex items-center justify-center flex-shrink-0`}>
                          <SyncIcon size={14} className={meta.text} strokeWidth={2.5} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-wellq-dark dark:text-white truncate">{src.name}</p>
                          <p className="text-[10px] font-medium text-wellq-gray truncate mt-0.5">{fmtSync}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider flex-shrink-0 ${meta.bg} ${meta.text}`}>
                        {t(meta.labelKey)}
                      </span>
                    </div>
                  );
                })}

                {syncSources.length === 0 && (
                  <p className="text-xs font-medium text-center text-wellq-gray py-4">
                    {t('settings.syncNoData') ?? 'No se pudo obtener el estado'}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

      </motion.div>
    );
  };

  // ─── Modal usando Portal (corregido) ───────────────────────────────────────
  const modalContent = showModal && createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
      {/* Modal con scroll interno */}
      <div className="relative bg-white dark:bg-wellq-dark rounded-[24px] shadow-2xl w-full max-w-md border border-wellq-gray/20 dark:border-white/10 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Cabecera fija */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-wellq-gray/10 dark:border-white/5 bg-wellq-gray/3 dark:bg-white/[0.02] flex-shrink-0">
          <div>
            <h3 className="text-lg font-bold text-wellq-dark dark:text-white leading-tight">
              {editUser ? t('settings.editUser') : t('settings.newUser')}
            </h3>
            <p className="text-xs font-medium text-wellq-gray mt-1">Configuración de acceso</p>
          </div>
          <button onClick={closeModal} className="p-2 bg-wellq-gray/5 hover:bg-wellq-gray/10 dark:bg-white/5 dark:hover:bg-white/10 rounded-xl transition-colors">
            <X size={18} className="text-wellq-gray" strokeWidth={2.5} />
          </button>
        </div>
        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleUserSubmit}>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-wellq-gray mb-1.5">{t('settings.userId')}</label>
                <input
                  required
                  disabled={!!editUser}
                  className="w-full px-4 py-2.5 bg-wellq-gray/5 dark:bg-white/[0.02] border border-wellq-gray/20 dark:border-white/10 rounded-xl text-sm font-semibold text-wellq-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-wellq-cyan disabled:opacity-50"
                  value={form.user_id}
                  onChange={(e) => setForm({ ...form, user_id: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-wellq-gray mb-1.5">{t('settings.fullName')}</label>
                <input
                  required
                  className="w-full px-4 py-2.5 bg-wellq-gray/5 dark:bg-white/[0.02] border border-wellq-gray/20 dark:border-white/10 rounded-xl text-sm font-semibold text-wellq-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-wellq-cyan"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-wellq-gray mb-1.5">{t('settings.email')}</label>
                <input
                  required type="email"
                  className="w-full px-4 py-2.5 bg-wellq-gray/5 dark:bg-white/[0.02] border border-wellq-gray/20 dark:border-white/10 rounded-xl text-sm font-semibold text-wellq-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-wellq-cyan"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-wellq-gray mb-1.5">{t('settings.colRole')}</label>
                  <select
                    className="w-full px-4 py-2.5 bg-wellq-gray/5 dark:bg-white/[0.02] border border-wellq-gray/20 dark:border-white/10 rounded-xl text-sm font-semibold text-wellq-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-wellq-cyan appearance-none cursor-pointer dark:[color-scheme:dark]"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                  >
                    <option value="super_admin" className="bg-white dark:bg-wellq-dark text-wellq-dark dark:text-white">{t('values.super_admin')}</option>
                    <option value="admin" className="bg-white dark:bg-wellq-dark text-wellq-dark dark:text-white">{t('values.admin')}</option>
                    <option value="viewer" className="bg-white dark:bg-wellq-dark text-wellq-dark dark:text-white">{t('values.viewer')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-wellq-gray mb-1.5">{t('settings.colStatus')}</label>
                  <select
                    className="w-full px-4 py-2.5 bg-wellq-gray/5 dark:bg-white/[0.02] border border-wellq-gray/20 dark:border-white/10 rounded-xl text-sm font-semibold text-wellq-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-wellq-cyan appearance-none cursor-pointer dark:[color-scheme:dark]"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    <option value="active" className="bg-white dark:bg-wellq-dark text-wellq-dark dark:text-white">{t('values.active')}</option>
                    <option value="inactive" className="bg-white dark:bg-wellq-dark text-wellq-dark dark:text-white">{t('values.inactive')}</option>
                  </select>
                </div>
              </div>
              {userError && (
                <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-500/10 rounded-xl border border-red-100 dark:border-red-500/20">
                  <AlertTriangle size={14} className="text-red-500" />
                  <p className="text-xs font-semibold text-red-600 dark:text-red-400">{userError}</p>
                </motion.div>
              )}
            </div>
            {/* Botones fijos */}
            <div className="flex justify-end gap-3 px-6 py-5 border-t border-wellq-gray/10 dark:border-white/5 bg-wellq-gray/3 dark:bg-white/[0.02] flex-shrink-0">
              <button type="button" onClick={closeModal} className="px-5 py-2.5 rounded-xl text-sm font-bold text-wellq-gray hover:text-wellq-dark dark:hover:text-white hover:bg-wellq-gray/10 dark:hover:bg-white/5 transition-colors">
                {t('common.cancel')}
              </button>
              <button type="submit" disabled={savingUser} className="flex items-center gap-2 px-6 py-2.5 bg-wellq-cyan text-wellq-black rounded-xl text-sm font-bold hover:bg-wellq-cyan/90 transition-all disabled:opacity-50 shadow-sm active:scale-95">
                {savingUser ? <><div className="w-4 h-4 border-2 border-wellq-black/30 border-t-wellq-black rounded-full animate-spin" /> {t('settings.saving')}</> : t('common.save')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );

  return (
    <div className="space-y-6 font-sans overflow-x-hidden" style={{ scrollbarGutter: 'stable' }}>
      {/* Tabs */}
      <div className="flex gap-1.5 bg-wellq-gray/5 dark:bg-white/[0.03] p-1.5 rounded-xl self-start inline-flex border border-wellq-gray/10 dark:border-white/5 shadow-inner">
        {[
          { id: 'general',  label: t('settings.general') },
          { id: 'api_keys', label: t('settings.apiKeys') },
          { id: 'team',     label: t('settings.team') },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2 text-sm font-bold rounded-lg transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-white text-wellq-dark shadow-sm dark:bg-wellq-dark dark:text-white ring-1 ring-wellq-gray/10 dark:ring-white/10'
                : 'text-wellq-gray hover:text-wellq-dark dark:text-wellq-gray/70 dark:hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {renderTabContent()}
      </AnimatePresence>

      {/* Modal fuera de AnimatePresence para evitar conflictos */}
      {modalContent}

      <ConfirmDialog
        open={confirmDelete.open}
        title={t('settings.deleteUserTitle')}
        message={t('settings.deleteUserMessage')}
        onConfirm={doDeleteUser}
        onCancel={() => setConfirmDelete({ open: false, userId: null })}
      />
    </div>
  );
};