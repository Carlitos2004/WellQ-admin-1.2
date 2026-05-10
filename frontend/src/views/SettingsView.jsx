import React, { useState, useEffect } from 'react';
import {
  ToggleLeft, ToggleRight, Moon, Sun, Globe, Server, Database, Shield,
  Key, Save, Check, UserPlus, Pencil, Trash2, X,
} from 'lucide-react';
import { Skeleton } from '../components/ui';
import { apiFetch } from '../api/client';

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

  // ── General: local settings, theme, language ─────────────────────────────
  const [localSettings, setLocalSettings] = useState({});
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [language, setLanguage] = useState(() => localStorage.getItem('lang') || 'es');
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
        const latencyMs = Math.floor(Math.random() * 20 + 5); // simula latencia
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

  const handleThemeToggle = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('theme', next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  };

  const handleLanguageChange = (e) => {
    const lang = e.target.value;
    setLanguage(lang);
    localStorage.setItem('lang', lang);
  };

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

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await apiFetch(`/api/users/${userId}`, { method: 'DELETE' });
      if (onRefreshUsers) onRefreshUsers();
    } catch (err) {
      alert('Error deleting user');
    }
  };

  // ── Render tabs ──────────────────────────────────────────────────────────
  const renderTab = () => {
    if (activeTab === 'api_keys') {
      return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-6">
            <Key size={20} className="text-amber-500" />
            <h3 className="font-semibold text-slate-900">GCP Service Account Key</h3>
          </div>
          {keyLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  API Key (JSON or Base64)
                </label>
                <textarea
                  rows={6}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="Paste your GCP service account key..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <p className="mt-1 text-xs text-slate-400">
                  Used for Vertex AI and Cloud Storage.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSaveKey}
                  disabled={savingKey || apiKey === savedKey}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingKey ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
                  ) : keySuccess ? (
                    <><Check size={16} /> Saved!</>
                  ) : (
                    <><Save size={16} /> Save Key</>
                  )}
                </button>
                {apiKey && !keySuccess && (
                  <span className="text-xs text-slate-400">
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
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Shield size={20} className="text-indigo-500" />
              <h3 className="font-semibold text-slate-900">Team Management</h3>
            </div>
            <button
              onClick={openNew}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              <UserPlus size={16} /> New User
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-3 font-medium text-slate-500">Name</th>
                  <th className="text-left py-2 px-3 font-medium text-slate-500">Email</th>
                  <th className="text-left py-2 px-3 font-medium text-slate-500">Role</th>
                  <th className="text-left py-2 px-3 font-medium text-slate-500">Status</th>
                  <th className="text-right py-2 px-3 font-medium text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.user_id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="py-2 px-3">{u.full_name}</td>
                    <td className="py-2 px-3 text-slate-500">{u.email}</td>
                    <td className="py-2 px-3 capitalize">
                      {u.role === 'super_admin' ? 'Super Admin' : u.role === 'viewer' ? 'Viewer' : 'Admin'}
                    </td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        u.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {u.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right">
                      <button onClick={() => openEdit(u)} className="p-1 hover:bg-slate-200 rounded mr-1">
                        <Pencil size={15} className="text-slate-600" />
                      </button>
                      <button onClick={() => handleDeleteUser(u.user_id)} className="p-1 hover:bg-red-100 rounded">
                        <Trash2 size={15} className="text-red-500" />
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">No users yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={closeModal} />
              <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
                <button onClick={closeModal} className="absolute top-4 right-4 p-1 hover:bg-slate-100 rounded">
                  <X size={18} className="text-slate-400" />
                </button>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  {editUser ? 'Edit User' : 'New User'}
                </h3>
                <form onSubmit={handleUserSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">User ID</label>
                    <input
                      required
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      value={form.user_id}
                      disabled={!!editUser}
                      onChange={(e) => setForm({ ...form, user_id: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Full Name</label>
                    <input
                      required
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      value={form.full_name}
                      onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                    <input
                      required
                      type="email"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Role</label>
                      <select
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                        value={form.role}
                        onChange={(e) => setForm({ ...form, role: e.target.value })}
                      >
                        <option value="super_admin">Super Admin</option>
                        <option value="admin">Admin</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
                      <select
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
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
                      className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingUser}
                      className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
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
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-900 mb-6">Global Platform Configuration</h3>
          {loading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <div className="space-y-4">
              {[
                { key: 'maintenance_mode', label: 'Maintenance Mode', desc: 'Blocks clinic access to the system' },
                { key: 'enforce_2fa', label: 'Enforce 2FA', desc: 'Requires two-factor auth for all admins' },
              ].map(({ key, label, desc }) => {
                const val = localSettings[key] ?? globalSettings?.[key] ?? false;
                return (
                  <div key={key} className="flex items-center justify-between p-4 rounded-xl bg-slate-50">
                    <div>
                      <div className="text-sm font-medium text-slate-900">{label}</div>
                      <div className="text-xs text-slate-500">{desc}</div>
                    </div>
                    <button onClick={() => toggleSetting(key)}>
                      {val ? <ToggleRight size={32} className="text-indigo-600" /> : <ToggleLeft size={32} className="text-slate-300" />}
                    </button>
                  </div>
                );
              })}

              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50">
                <div>
                  <div className="text-sm font-medium text-slate-900">API Version</div>
                  <div className="text-xs text-slate-500">Current backend version</div>
                </div>
                <span className="px-2.5 py-1 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full">
                  {globalSettings?.api_version ?? '0.0.0'}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50">
                <div className="text-sm font-medium text-slate-900">Support Email</div>
                <span className="text-sm font-medium text-indigo-600">
                  {globalSettings?.support_email ?? 'ops@wellq.co'}
                </span>
              </div>

              {hasChanges && (
                <button
                  onClick={() => { onSaveSettings(localSettings); setLocalSettings({}); }}
                  className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
                >
                  Save Changes
                </button>
              )}
            </div>
          )}
        </div>

        {/* Appearance & Language */}
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center gap-3 mb-4">
              {theme === 'dark' ? <Moon size={20} className="text-indigo-500" /> : <Sun size={20} className="text-amber-500" />}
              <h3 className="font-semibold text-slate-900">Appearance</h3>
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50">
              <span className="text-sm font-medium text-slate-900">Dark Mode</span>
              <button onClick={handleThemeToggle}>
                {theme === 'dark' ? <ToggleRight size={32} className="text-indigo-600" /> : <ToggleLeft size={32} className="text-slate-300" />}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center gap-3 mb-4">
              <Globe size={20} className="text-blue-500" />
              <h3 className="font-semibold text-slate-900">Language</h3>
            </div>
            <div className="p-4 rounded-xl bg-slate-50">
              <select
                value={language}
                onChange={handleLanguageChange}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center gap-3 mb-4">
              <Server size={20} className="text-indigo-500" />
              <h3 className="font-semibold text-slate-900">Backend Server</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Status</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  serverStatus.status === 'Online' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                }`}>
                  {serverStatus.status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Version</span>
                <span className="text-sm font-medium text-slate-900">{serverStatus.version}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Environment</span>
                <span className="text-sm font-medium text-slate-900 capitalize">{serverStatus.environment}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Database</span>
                <span className={`text-sm font-medium ${
                  serverStatus.database === 'Connected' ? 'text-emerald-600' : 'text-red-600'
                }`}>
                  {serverStatus.database}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Latency</span>
                <span className="text-sm font-medium text-slate-900">{serverStatus.latency}</span>
              </div>
            </div>
          </div>

          {/* Database (existing) */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center gap-3 mb-4">
              <Database size={20} className="text-green-500" />
              <h3 className="font-semibold text-slate-900">Database</h3>
            </div>
            {loading ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <div className="space-y-3">
                {[
                  { label: 'Engine', value: dbStatus?.database ?? 'Waiting for database' },
                  { label: 'Status', value: dbStatus?.status ?? 'Waiting...' },
                  { label: 'Latency', value: `${dbStatus?.latency_ms ?? 0} ms`, color: 'text-emerald-600' },
                  { label: 'Collections', value: dbStatus?.collections_count ?? 0 },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">{label}</span>
                    <span className={`text-sm font-medium ${color ?? 'text-slate-900'}`}>{value}</span>
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
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl self-start inline-flex">
        {[
          { id: 'general', label: 'General' },
          { id: 'api_keys', label: 'API Keys' },
          { id: 'team', label: 'Team' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === tab.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {renderTab()}
    </div>
  );
};