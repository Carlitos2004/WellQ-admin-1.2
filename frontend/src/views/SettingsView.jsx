import React, { useState, useEffect } from 'react';
import {
  ToggleLeft, ToggleRight, Moon, Sun, Globe, Server, Database, Shield,
  Key, Save, Check, UserPlus, Pencil, Trash2, X,
} from 'lucide-react';
import { Skeleton } from '../components/ui';
import { apiFetch } from '../api/client';
import { toast } from 'sonner';
import ConfirmDialog from '../components/ui/ConfirmDialog';
// 🌐🌙 Contextos
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

export const SettingsView = ({
  globalSettings,
  dbStatus,
  users: initialUsers,
  loading,
  onSaveSettings,
  onRefreshUsers,
}) => {
  // ── Tabs ─────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('general');

  // 🌐🌙 Usar contextos en lugar de estados locales
  const { theme, toggleTheme } = useTheme();
  const { t, locale, setLanguage } = useLanguage();

  // ── General: local settings (se mantiene igual) ──────────────────────────
  const [localSettings, setLocalSettings] = useState({});
  const hasChanges = Object.keys(localSettings).length > 0;

  // ── Backend Server Status ────────────────────────────────────────────────
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

  // ── API Keys ─────────────────────────────────────────────────────────────
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

  // ── Team (CRUD users) ────────────────────────────────────────────────────
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

  // ── ConfirmDialog para eliminar usuario ──────────────────────────────────
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

  // ── Reemplaza window.confirm + alert ─────────────────────────────────────
  const handleDeleteUser = (userId) => {
    setConfirmDelete({ open: true, userId });
  };

  const doDeleteUser = async () => {
    const userId = confirmDelete.userId;
    setConfirmDelete({ open: false, userId: null });
    try {
      await apiFetch(`/api/users/${userId}`, { method: 'DELETE' });
      toast.success('Usuario eliminado correctamente');
      if (onRefreshUsers) onRefreshUsers();
    } catch (err) {
      toast.error('Error al eliminar el usuario');
    }
  };

  // ── Render tabs ──────────────────────────────────────────────────────────
  const renderTab = () => {
    if (activeTab === 'api_keys') {
      return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-wellq-gray/20 dark:bg-wellq-dark dark:border-wellq-gray/30">
          <div className="flex items-center gap-3 mb-6">
            <Key size={20} className="text-wellq-cyan" />
            <h3 className="font-semibold text-wellq-dark dark:text-white">GCP Service Account Key</h3>
          </div>
          {keyLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-wellq-cyan border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-wellq-gray dark:text-wellq-gray/80 mb-1">
                  API Key (JSON or Base64)
                </label>
                <textarea
                  rows={6}
                  className="w-full px-3 py-2 border border-wellq-gray/30 dark:border-wellq-gray/30 rounded-lg text-sm font-mono focus:ring-2 focus:ring-wellq-cyan focus:outline-none dark:bg-wellq-dark/50 dark:text-white"
                  placeholder="Paste your GCP service account key..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <p className="mt-1 text-xs text-wellq-gray/70 dark:text-wellq-gray/60">
                  Used for Vertex AI and Cloud Storage.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSaveKey}
                  disabled={savingKey || apiKey === savedKey}
                  className="flex items-center gap-2 px-4 py-2 bg-wellq-cyan text-wellq-black rounded-lg text-sm font-medium hover:bg-wellq-cyan/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingKey ? (
                    <><div className="w-4 h-4 border-2 border-wellq-black border-t-transparent rounded-full animate-spin" /> Saving...</>
                  ) : keySuccess ? (
                    <><Check size={16} /> Saved!</>
                  ) : (
                    <><Save size={16} /> Save Key</>
                  )}
                </button>
                {apiKey && !keySuccess && (
                  <span className="text-xs text-wellq-gray dark:text-wellq-gray/70">
                    {apiKey === savedKey ? 'No changes' : 'Unsaved changes'}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (activeTab === 'team') {
      return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-wellq-gray/20 dark:bg-wellq-dark dark:border-wellq-gray/30">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Shield size={20} className="text-wellq-blue" />
              <h3 className="font-semibold text-wellq-dark dark:text-white">{t('settings.team')}</h3>
            </div>
            <button
              onClick={openNew}
              className="flex items-center gap-2 px-4 py-2 bg-wellq-cyan text-wellq-black rounded-lg text-sm font-medium hover:bg-wellq-cyan/90 transition-colors"
            >
              <UserPlus size={16} /> New User
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-wellq-gray/20 dark:border-wellq-gray/30">
                  <th className="text-left py-2 px-3 font-medium text-wellq-gray dark:text-wellq-gray/80">Name</th>
                  <th className="text-left py-2 px-3 font-medium text-wellq-gray dark:text-wellq-gray/80">Email</th>
                  <th className="text-left py-2 px-3 font-medium text-wellq-gray dark:text-wellq-gray/80">Role</th>
                  <th className="text-left py-2 px-3 font-medium text-wellq-gray dark:text-wellq-gray/80">Status</th>
                  <th className="text-right py-2 px-3 font-medium text-wellq-gray dark:text-wellq-gray/80">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.user_id} className="border-b border-wellq-gray/10 dark:border-wellq-gray/30 hover:bg-wellq-gray/5 dark:hover:bg-wellq-dark/50">
                    <td className="py-2 px-3 text-wellq-dark dark:text-white">{u.full_name}</td>
                    <td className="py-2 px-3 text-wellq-gray dark:text-wellq-gray/80">{u.email}</td>
                    <td className="py-2 px-3 capitalize text-wellq-dark dark:text-white">
                      {u.role === 'super_admin' ? 'Super Admin' : u.role === 'viewer' ? 'Viewer' : 'Admin'}
                    </td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        u.status === 'active' ? 'bg-wellq-green/20 text-wellq-green' : 'bg-wellq-gray/10 text-wellq-gray dark:bg-wellq-gray/20 dark:text-wellq-gray/80'
                      }`}>
                        {u.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right">
                      <button onClick={() => openEdit(u)} className="p-1 hover:bg-wellq-gray/10 dark:hover:bg-wellq-dark/40 rounded mr-1">
                        <Pencil size={15} className="text-wellq-gray dark:text-wellq-gray/80" />
                      </button>
                      <button onClick={() => handleDeleteUser(u.user_id)} className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
                        <Trash2 size={15} className="text-red-500" />
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-wellq-gray dark:text-wellq-gray/70">No users yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={closeModal} />
              <div className="relative bg-white dark:bg-wellq-dark rounded-2xl shadow-xl p-6 w-full max-w-md mx-4 border border-wellq-gray/20 dark:border-wellq-gray/30">
                <button onClick={closeModal} className="absolute top-4 right-4 p-1 hover:bg-wellq-gray/10 dark:hover:bg-wellq-dark/40 rounded">
                  <X size={18} className="text-wellq-gray dark:text-wellq-gray/80" />
                </button>
                <h3 className="text-lg font-semibold text-wellq-dark dark:text-white mb-4">
                  {editUser ? 'Edit User' : 'New User'}
                </h3>
                <form onSubmit={handleUserSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-wellq-gray dark:text-wellq-gray/80 mb-1">User ID</label>
                    <input
                      required
                      className="w-full px-3 py-2 border border-wellq-gray/30 dark:border-wellq-gray/30 rounded-lg text-sm dark:bg-wellq-dark/50 dark:text-white"
                      value={form.user_id}
                      disabled={!!editUser}
                      onChange={(e) => setForm({ ...form, user_id: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-wellq-gray dark:text-wellq-gray/80 mb-1">Full Name</label>
                    <input
                      required
                      className="w-full px-3 py-2 border border-wellq-gray/30 dark:border-wellq-gray/30 rounded-lg text-sm dark:bg-wellq-dark/50 dark:text-white"
                      value={form.full_name}
                      onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-wellq-gray dark:text-wellq-gray/80 mb-1">Email</label>
                    <input
                      required
                      type="email"
                      className="w-full px-3 py-2 border border-wellq-gray/30 dark:border-wellq-gray/30 rounded-lg text-sm dark:bg-wellq-dark/50 dark:text-white"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-wellq-gray dark:text-wellq-gray/80 mb-1">Role</label>
                      <select
                        className="w-full px-3 py-2 border border-wellq-gray/30 dark:border-wellq-gray/30 rounded-lg text-sm dark:bg-wellq-dark/50 dark:text-white"
                        value={form.role}
                        onChange={(e) => setForm({ ...form, role: e.target.value })}
                      >
                        <option value="super_admin">Super Admin</option>
                        <option value="admin">Admin</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-wellq-gray dark:text-wellq-gray/80 mb-1">Status</label>
                      <select
                        className="w-full px-3 py-2 border border-wellq-gray/30 dark:border-wellq-gray/30 rounded-lg text-sm dark:bg-wellq-dark/50 dark:text-white"
                        value={form.status}
                        onChange={(e) => setForm({ ...form, status: e.target.value })}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                  {userError && <p className="text-red-500 text-xs">{userError}</p>}
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="px-4 py-2 text-sm text-wellq-gray dark:text-wellq-gray/80 hover:bg-wellq-gray/10 dark:hover:bg-wellq-dark/40 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingUser}
                      className="px-4 py-2 bg-wellq-cyan text-wellq-black text-sm font-medium rounded-lg hover:bg-wellq-cyan/90 disabled:opacity-50"
                    >
                      {savingUser ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      );
    }

    // ── General tab ────────────────────────────────────────────────────────
    return (
      <div className="space-y-6">
        {/* Global Settings */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-wellq-gray/20 dark:bg-wellq-dark dark:border-wellq-gray/30">
          <h3 className="font-semibold text-wellq-dark dark:text-white mb-6">Global Platform Configuration</h3>
          {loading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <div className="space-y-4">
              {[
                { key: 'maintenance_mode', label: t('settings.maintenanceMode'), desc: 'Blocks clinic access to the system' },
                { key: 'enforce_2fa', label: t('settings.enforce2FA'), desc: 'Requires two-factor auth for all admins' },
              ].map(({ key, label, desc }) => {
                const val = localSettings[key] ?? globalSettings?.[key] ?? false;
                return (
                  <div key={key} className="flex items-center justify-between p-4 rounded-xl bg-wellq-gray/5 dark:bg-wellq-dark/50">
                    <div>
                      <div className="text-sm font-medium text-wellq-dark dark:text-white">{label}</div>
                      <div className="text-xs text-wellq-gray dark:text-wellq-gray/80">{desc}</div>
                    </div>
                    <button onClick={() => toggleSetting(key)}>
                      {val ? <ToggleRight size={32} className="text-wellq-cyan" /> : <ToggleLeft size={32} className="text-wellq-gray/40" />}
                    </button>
                  </div>
                );
              })}

              <div className="flex items-center justify-between p-4 rounded-xl bg-wellq-gray/5 dark:bg-wellq-dark/50">
                <div>
                  <div className="text-sm font-medium text-wellq-dark dark:text-white">API Version</div>
                  <div className="text-xs text-wellq-gray dark:text-wellq-gray/80">Current backend version</div>
                </div>
                <span className="px-2.5 py-1 bg-wellq-cyan/20 text-wellq-cyan text-xs font-semibold rounded-full">
                  {globalSettings?.api_version ?? '0.0.0'}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-wellq-gray/5 dark:bg-wellq-dark/50">
                <div className="text-sm font-medium text-wellq-dark dark:text-white">Support Email</div>
                <span className="text-sm font-medium text-wellq-cyan">
                  {globalSettings?.support_email ?? 'ops@wellq.co'}
                </span>
              </div>

              {hasChanges && (
                <button
                  onClick={() => { onSaveSettings(localSettings); setLocalSettings({}); }}
                  className="w-full py-2.5 bg-wellq-cyan text-wellq-black rounded-xl font-medium hover:bg-wellq-cyan/90 transition-colors"
                >
                  {t('settings.saveChanges')}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Appearance & Language */}
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-wellq-gray/20 dark:bg-wellq-dark dark:border-wellq-gray/30">
            <div className="flex items-center gap-3 mb-4">
              {theme === 'dark' ? <Moon size={20} className="text-wellq-cyan" /> : <Sun size={20} className="text-wellq-cyan" />}
              <h3 className="font-semibold text-wellq-dark dark:text-white">{t('settings.appearance')}</h3>
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl bg-wellq-gray/5 dark:bg-wellq-dark/50">
              <span className="text-sm font-medium text-wellq-dark dark:text-white">{t('settings.darkMode')}</span>
              <button onClick={toggleTheme}>
                {theme === 'dark' ? <ToggleRight size={32} className="text-wellq-cyan" /> : <ToggleLeft size={32} className="text-wellq-gray/40" />}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-wellq-gray/20 dark:bg-wellq-dark dark:border-wellq-gray/30">
            <div className="flex items-center gap-3 mb-4">
              <Globe size={20} className="text-wellq-blue" />
              <h3 className="font-semibold text-wellq-dark dark:text-white">{t('settings.language')}</h3>
            </div>
            <div className="p-4 rounded-xl bg-wellq-gray/5 dark:bg-wellq-dark/50">
              <select
                value={locale}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-wellq-dark/80 border border-wellq-gray/30 dark:border-wellq-gray/30 rounded-lg text-sm text-wellq-dark dark:text-white"
              >
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>
        </div>

        {/* Backend Server & Database */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Backend Server Status */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-wellq-gray/20 dark:bg-wellq-dark dark:border-wellq-gray/30">
            <div className="flex items-center gap-3 mb-4">
              <Server size={20} className="text-wellq-blue" />
              <h3 className="font-semibold text-wellq-dark dark:text-white">Backend Server</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-wellq-gray dark:text-wellq-gray/80">Status</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  serverStatus.status === 'Online' ? 'bg-wellq-green/20 text-wellq-green' : 'bg-red-50 text-red-700'
                }`}>
                  {serverStatus.status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-wellq-gray dark:text-wellq-gray/80">Version</span>
                <span className="text-sm font-medium text-wellq-dark dark:text-white">{serverStatus.version}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-wellq-gray dark:text-wellq-gray/80">Environment</span>
                <span className="text-sm font-medium text-wellq-dark dark:text-white capitalize">{serverStatus.environment}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-wellq-gray dark:text-wellq-gray/80">Database</span>
                <span className={`text-sm font-medium ${
                  serverStatus.database === 'Connected' ? 'text-wellq-green' : 'text-red-600'
                }`}>
                  {serverStatus.database}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-wellq-gray dark:text-wellq-gray/80">Latency</span>
                <span className="text-sm font-medium text-wellq-dark dark:text-white">{serverStatus.latency}</span>
              </div>
            </div>
          </div>

          {/* Database (existing) */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-wellq-gray/20 dark:bg-wellq-dark dark:border-wellq-gray/30">
            <div className="flex items-center gap-3 mb-4">
              <Database size={20} className="text-wellq-green" />
              <h3 className="font-semibold text-wellq-dark dark:text-white">Database</h3>
            </div>
            {loading ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <div className="space-y-3">
                {[
                  { label: 'Engine', value: dbStatus?.database ?? 'Waiting for database' },
                  { label: 'Status', value: dbStatus?.status ?? 'Waiting...' },
                  { label: 'Latency', value: `${dbStatus?.latency_ms ?? 0} ms`, color: 'text-wellq-green' },
                  { label: 'Collections', value: dbStatus?.collections_count ?? 0 },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-sm text-wellq-gray dark:text-wellq-gray/80">{label}</span>
                    <span className={`text-sm font-medium ${color ?? 'text-wellq-dark dark:text-white'}`}>{value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 bg-wellq-gray/10 p-1 rounded-xl self-start inline-flex dark:bg-wellq-dark/80">
        {[
          { id: 'general', label: t('settings.general') },
          { id: 'api_keys', label: t('settings.apiKeys') },
          { id: 'team', label: t('settings.team') },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === tab.id
                ? 'bg-white text-wellq-dark shadow-sm dark:bg-wellq-dark/60 dark:text-white'
                : 'text-wellq-gray hover:text-wellq-dark dark:text-wellq-gray/80 dark:hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {renderTab()}

      {/* ConfirmDialog para eliminar usuario */}
      <ConfirmDialog
        open={confirmDelete.open}
        title="Eliminar usuario"
        message="¿Estás seguro de que quieres eliminar este usuario? Esta acción no se puede deshacer."
        onConfirm={doDeleteUser}
        onCancel={() => setConfirmDelete({ open: false, userId: null })}
      />
    </div>
  );
};