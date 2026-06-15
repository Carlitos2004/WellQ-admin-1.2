import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ToggleLeft, ToggleRight, Moon, Sun, Globe, Server, Database, Shield,
  Key, Save, Check, UserPlus, Pencil, Trash2, X,
  RefreshCw, CheckCircle2, AlertTriangle, XCircle,
  Plus, GripVertical,
} from 'lucide-react';
import { Skeleton } from '../components/ui';
import { apiFetch, fetchSyncStatus } from '../api/client';
import { toast } from 'sonner';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageSelector from './LanguageSelector';
import useHasPermission from '../hooks/useHasPermission';
import { filterAndSortBySearch, hasSearchQuery, matchesSearch } from '../utils/search';

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

// ─── Role & Permission color maps ─────────────────────────────────────────────
const ROLE_COLORS = [
  { dot: 'bg-wellq-cyan',  selected: 'bg-wellq-cyan/10 text-wellq-cyan',   ring: 'ring-wellq-cyan/30'  },
  { dot: 'bg-wellq-blue',  selected: 'bg-wellq-blue/10 text-wellq-blue',   ring: 'ring-wellq-blue/30'  },
  { dot: 'bg-purple-400',  selected: 'bg-purple-400/10 text-purple-400',   ring: 'ring-purple-400/30'  },
  { dot: 'bg-amber-400',   selected: 'bg-amber-400/10 text-amber-500',     ring: 'ring-amber-400/30'   },
  { dot: 'bg-wellq-green', selected: 'bg-wellq-green/10 text-wellq-green', ring: 'ring-wellq-green/30' },
  { dot: 'bg-rose-400',    selected: 'bg-rose-400/10 text-rose-400',       ring: 'ring-rose-400/30'    },
];

const MODULE_COLORS = {
  Overview:  'bg-wellq-cyan/10 text-wellq-cyan',
  Clinics:   'bg-wellq-green/10 text-wellq-green',
  Billing:   'bg-amber-400/10 text-amber-500',
  Platform:  'bg-wellq-blue/10 text-wellq-blue',
  Analytics: 'bg-purple-400/10 text-purple-400',
  Support:   'bg-rose-400/10 text-rose-400',
  Plans:     'bg-indigo-400/10 text-indigo-400',
  Settings:  'bg-wellq-gray/10 text-wellq-gray',
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

const normalizeUserSaveError = (message, fallback) => {
  if (!message || message.includes('HTTP 422')) return fallback;
  return message;
};

const SearchEmptyState = ({ query }) => {
  const { t } = useLanguage();
  return (
    <motion.div variants={tabVariants} initial="hidden" animate="enter" exit="exit" className="bg-white rounded-2xl p-10 shadow-sm border border-wellq-gray/20 dark:bg-wellq-dark dark:border-white/10 text-center">
      <p className="text-sm font-bold text-wellq-dark dark:text-white">{t('common.noResults')}</p>
      <p className="mt-1 text-xs font-medium text-wellq-gray">{t('common.noMatchesInSection', { query })}</p>
    </motion.div>
  );
};

export const SettingsView = ({
  globalSettings,
  dbStatus,
  users: initialUsers,
  loading,
  onSaveSettings,
  onRefreshUsers,
  searchQuery = '',
}) => {
  const [activeTab, setActiveTab] = useState('general');
  const { theme, toggleTheme } = useTheme();
  const { t, tVal } = useLanguage();
  const canManageSettings = useHasPermission('settings.manage');

  const [localSettings, setLocalSettings] = useState({});
  const hasChanges = Object.keys(localSettings).length > 0;

  useEffect(() => {
    if (!canManageSettings && activeTab !== 'general') {
      setActiveTab('general');
    }
  }, [activeTab, canManageSettings]);

  const [serverStatus, setServerStatus] = useState({
    status: 'checking',
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
          status: health.status === 'ok' ? 'online' : 'degraded',
          version: health.version,
          environment: health.environment,
          database: health.database === 'neon_connected' ? 'connected' : 'disconnected',
          latency: `${latencyMs} ms`,
        });
      } catch {
        setServerStatus({ status: 'unreachable', version: '?', environment: '?', database: '?', latency: '?' });
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
    if (!canManageSettings) {
      setKeyLoading(false);
      return;
    }

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
  }, [canManageSettings]);

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

  // ── Users state ──────────────────────────────────────────────────
  const [users, setUsers] = useState(initialUsers || []);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState({ user_id: '', full_name: '', email: '', role_id: '', status: 'active' });
  const [savingUser, setSavingUser] = useState(false);
  const [userError, setUserError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState({ open: false, userId: null });

  useEffect(() => { setUsers(initialUsers || []); }, [initialUsers]);

  const openNew = () => {
    setEditUser(null);
    setForm({ user_id: '', full_name: '', email: '', role_id: '', status: 'active' });
    setUserError('');
    setShowModal(true);
  };

  const openEdit = (user) => {
    setEditUser(user);
    setForm({ user_id: user.user_id, full_name: user.full_name, email: user.email, role_id: user.role_id || '', status: user.status });
    setUserError('');
    setShowModal(true);
  };

  const closeModal = () => setShowModal(false);

  // 🔥 CORE FIX: Forzamos que role_id sea enviado como número, no como string
  const handleUserSubmit = async (e) => {
    e.preventDefault();
    setUserError('');

    const userId = form.user_id.trim();
    const fullName = form.full_name.trim();
    const email = form.email.trim();
    const roleId = Number(form.role_id);

    if (!editUser && !userId) {
      setUserError(t('settings.userValidationUserIdRequired'));
      return;
    }
    if (!fullName) {
      setUserError(t('settings.userValidationNameRequired'));
      return;
    }
    if (!email) {
      setUserError(t('settings.userValidationEmailRequired'));
      return;
    }
    if (!form.role_id || !Number.isFinite(roleId)) {
      setUserError(t('settings.userValidationRoleRequired'));
      return;
    }

    setSavingUser(true);
    try {
      const payload = {
        full_name: fullName,
        email,
        role_id: roleId,
        status: form.status,
      };

      if (editUser) {
        await apiFetch(`/api/users/${userId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        toast.success(t('settings.userUpdated'));
      } else {
        await apiFetch('/api/users', {
          method: 'POST',
          body: JSON.stringify({ ...payload, user_id: userId }),
        });
        toast.success(t('settings.userCreated'));
      }
      closeModal();
      if (onRefreshUsers) onRefreshUsers();
    } catch (err) {
      setUserError(normalizeUserSaveError(err.message, t('settings.userSaveFailed')));
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

  // ── Sync state (existing) ───────────────────────────────────────────────────
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

  // ── Team sub-tabs state (nuevo) ─────────────────────────────────────────────
  const [teamSubTab, setTeamSubTab] = useState('roles');

  // ── Roles & Permissions state (nuevo) ──────────────────────────────────────
  const [roles, setRoles] = useState([]);
  const [allPermissions, setAllPermissions] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [localAssignedIds, setLocalAssignedIds] = useState(new Set());
  const [permsDirty, setPermsDirty] = useState(false);
  const [savingPerms, setSavingPerms] = useState(false);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [dragOverPanel, setDragOverPanel] = useState(null);
  const dragRef = useRef({ permId: null, source: null });

  // Role CRUD modal
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editRole, setEditRole] = useState(null);
  const [roleForm, setRoleForm] = useState({ name: '', description: '' });
  const [savingRole, setSavingRole] = useState(false);
  const [roleError, setRoleError] = useState('');
  const [confirmDeleteRole, setConfirmDeleteRole] = useState({ open: false, roleId: null, roleName: '' });

  const loadRoles = async () => {
    setRolesLoading(true);
    try {
      const res = await apiFetch('/api/roles');
      setRoles(res.data ?? []);
    } catch (err) {
      toast.error(t('settings.errorLoadRoles'));
    } finally {
      setRolesLoading(false);
    }
  };

  const loadPermissions = async () => {
    try {
      const res = await apiFetch('/api/permissions');
      setAllPermissions(res.data ?? []);
    } catch (err) {
      console.error('Error loading permissions', err);
    }
  };

  useEffect(() => {
    if (canManageSettings && activeTab === 'team') {
      loadRoles();
      loadPermissions();
    }
  }, [activeTab, canManageSettings]);

  const handleSelectRole = (role) => {
    if (permsDirty && selectedRoleId !== role.id) {
      // Reset dirty state when switching roles
      setPermsDirty(false);
    }
    const ids = allPermissions
      .filter((p) => (role.permissions ?? []).includes(p.key))
      .map((p) => p.id);
    setLocalAssignedIds(new Set(ids));
    setSelectedRoleId(role.id);
    setPermsDirty(false);
  };

  const selectedRole = roles.find((r) => r.id === selectedRoleId) ?? null;
  const assignedPermsList = allPermissions.filter((p) => localAssignedIds.has(p.id));
  const availablePermsList = allPermissions.filter((p) => !localAssignedIds.has(p.id));
  const searchActive = hasSearchQuery(searchQuery);
  const permissionValues = (perm) => [
    perm.label,
    perm.key,
    perm.module,
    t(`sidebar.${String(perm.module ?? '').toLowerCase()}`, perm.module),
  ];
  const visibleRoles = filterAndSortBySearch(roles, searchQuery, (role) => [
    t('settings.rolesAndPermissions'),
    t('settings.roles'),
    role.name,
    role.description,
    role.permissions?.length,
    ...(role.permissions ?? []),
  ]);
  const visibleAssignedPermsList = filterAndSortBySearch(assignedPermsList, searchQuery, permissionValues);
  const visibleAvailablePermsList = filterAndSortBySearch(availablePermsList, searchQuery, permissionValues);
  const visibleUsers = filterAndSortBySearch(users, searchQuery, (u) => [
    t('settings.users'),
    u.user_id,
    u.full_name,
    u.email,
    u.role,
    roles.find((r) => String(r.id) === String(u.role_id))?.name,
    u.status,
    t(`values.${u.status}`, u.status),
  ]);
  const settingRows = [
    { key: 'maintenance_mode', label: t('settings.maintenanceMode'), desc: t('settings.maintenanceModeDesc') },
    { key: 'enforce_2fa', label: t('settings.enforce2FA'), desc: t('settings.enforce2FADesc') },
  ];
  const visibleSettingRows = filterAndSortBySearch(settingRows, searchQuery, (row) => [t('settings.globalConfig'), row.key, row.label, row.desc]);
  const visibleSyncSources = filterAndSortBySearch(syncSources, searchQuery, (src) => {
    const meta = SYNC_STATUS_META[src.status] ?? SYNC_STATUS_META.error;
    return [t('settings.syncStatus'), src.name, src.status, t(meta.labelKey), src.last_sync];
  });
  const showApiKeys = !searchActive || matchesSearch(searchQuery, t('settings.apiKeys'), t('settings.gcpKeyTitle'), t('settings.gcpKeySubtitle'), t('settings.gcpKeyLabel'), t('settings.gcpKeyHint'), apiKey);
  const showGeneralConfig = !searchActive || visibleSettingRows.length > 0 || matchesSearch(searchQuery, t('settings.globalConfig'), t('settings.apiVersion'), globalSettings?.api_version, t('settings.supportEmail'), 'wellq.admin@gmail.com');
  const showAppearance = !searchActive || matchesSearch(searchQuery, t('settings.appearance'), t('settings.darkMode'), theme);
  const showLanguage = !searchActive || matchesSearch(searchQuery, t('settings.language'), 'english', 'spanish', 'espanol', 'espaÃ±ol');
  const showBackend = !searchActive || matchesSearch(searchQuery, t('settings.backendServer'), t('settings.status'), tVal(serverStatus.status), serverStatus.version, serverStatus.environment, serverStatus.latency);
  const showDatabase = !searchActive || matchesSearch(searchQuery, t('settings.database'), t('settings.engine'), t('settings.collections'), t('settings.latency'), dbStatus?.database, dbStatus?.status, dbStatus?.collections_count, dbStatus?.latency_ms);
  const showSync = !searchActive || visibleSyncSources.length > 0 || matchesSearch(searchQuery, t('settings.syncStatus'));
  const showTeamRoles = !searchActive || visibleRoles.length > 0 || visibleAssignedPermsList.length > 0 || visibleAvailablePermsList.length > 0 || matchesSearch(searchQuery, t('settings.rolesAndPermissions'), t('settings.assigned'), t('settings.available'));
  const showTeamUsers = !searchActive || visibleUsers.length > 0 || matchesSearch(searchQuery, t('settings.users'), t('settings.colName'), t('settings.colEmail'), t('settings.colRole'), t('settings.colStatus'));

  const moveToAssigned = (permId) => {
    setLocalAssignedIds((prev) => new Set([...prev, permId]));
    setPermsDirty(true);
  };

  const moveToAvailable = (permId) => {
    setLocalAssignedIds((prev) => { const s = new Set(prev); s.delete(permId); return s; });
    setPermsDirty(true);
  };

  const handleDragStart = (permId, source) => {
    dragRef.current = { permId, source };
  };

  const handleDrop = (targetPanel) => {
    const { permId, source } = dragRef.current;
    if (!permId || source === targetPanel) return;
    if (targetPanel === 'assigned') moveToAssigned(permId);
    else moveToAvailable(permId);
    dragRef.current = { permId: null, source: null };
  };

  const handleSavePerms = async () => {
    if (!selectedRoleId) return;
    setSavingPerms(true);
    try {
      await apiFetch(`/api/roles/${selectedRoleId}/permissions`, {
        method: 'POST',
        body: JSON.stringify({ permission_ids: [...localAssignedIds] }),
      });
      toast.success(t('settings.permissionsUpdated'));
      setPermsDirty(false);
      await loadRoles();
    } catch (err) {
      toast.error(t('settings.errorSavePermissions'));
    } finally {
      setSavingPerms(false);
    }
  };

  const handleCancelPerms = () => {
    if (selectedRole) handleSelectRole(selectedRole);
  };

  // Role CRUD
  const openNewRole = () => {
    setEditRole(null);
    setRoleForm({ name: '', description: '' });
    setRoleError('');
    setShowRoleModal(true);
  };

  const openEditRole = (role) => {
    setEditRole(role);
    setRoleForm({ name: role.name, description: role.description ?? '' });
    setRoleError('');
    setShowRoleModal(true);
  };

  const closeRoleModal = () => setShowRoleModal(false);

  const handleRoleSubmit = async (e) => {
    e.preventDefault();
    setSavingRole(true);
    setRoleError('');
    try {
      if (editRole) {
        await apiFetch(`/api/roles/${editRole.id}`, {
          method: 'PUT',
          body: JSON.stringify({ name: roleForm.name, description: roleForm.description || null }),
        });
        toast.success(t('settings.roleUpdated', { name: roleForm.name }));
      } else {
        await apiFetch('/api/roles', {
          method: 'POST',
          body: JSON.stringify({ name: roleForm.name, description: roleForm.description || null }),
        });
        toast.success(t('settings.roleCreated', { name: roleForm.name }));
      }
      closeRoleModal();
      await loadRoles();
    } catch (err) {
      setRoleError(err.message || t('settings.errorSaveRole'));
    } finally {
      setSavingRole(false);
    }
  };

  const handleDeleteRole = (role) =>
    setConfirmDeleteRole({ open: true, roleId: role.id, roleName: role.name });

  const doDeleteRole = async () => {
    const { roleId, roleName } = confirmDeleteRole;
    setConfirmDeleteRole({ open: false, roleId: null, roleName: '' });
    try {
      await apiFetch(`/api/roles/${roleId}`, { method: 'DELETE' });
      toast.success(t('settings.roleDeleted', { name: roleName }));
      if (selectedRoleId === roleId) {
        setSelectedRoleId(null);
        setLocalAssignedIds(new Set());
        setPermsDirty(false);
      }
      await loadRoles();
    } catch (err) {
      toast.error(err.message || t('settings.errorDeleteRole'));
    }
  };

  // ── Render Tabs ────────────────────────────────────────────────────────────
  const renderTabContent = () => {
    const currentTab = canManageSettings ? activeTab : 'general';

    if (currentTab === 'api_keys') {
      if (!showApiKeys) return <SearchEmptyState query={searchQuery} />;
      return (
        <motion.div key="api_keys" variants={tabVariants} initial="hidden" animate="enter" exit="exit" className="bg-white rounded-2xl p-6 shadow-sm border border-wellq-gray/20 dark:bg-wellq-dark dark:border-white/10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-wellq-cyan/10 flex items-center justify-center ring-1 ring-wellq-cyan/20">
              <Key size={18} className="text-wellq-cyan" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-wellq-dark dark:text-white leading-tight">{t('settings.gcpKeyTitle')}</h3>
              <p className="text-xs text-wellq-gray dark:text-wellq-gray/80 mt-0.5">{t('settings.gcpKeySubtitle')}</p>
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
                <p className="mt-2 text-xs text-wellq-gray/70 dark:text-wellq-gray/60">{t('settings.gcpKeyHint')}</p>
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

    // ── Team tab ───────────────────────────────────────────────────────────────
    if (currentTab === 'team') {
      if ((teamSubTab === 'roles' && !showTeamRoles) || (teamSubTab === 'users' && !showTeamUsers)) {
        return <SearchEmptyState query={searchQuery} />;
      }
      return (
        <motion.div key="team" variants={tabVariants} initial="hidden" animate="enter" exit="exit" className="bg-white rounded-2xl p-6 shadow-sm border border-wellq-gray/20 dark:bg-wellq-dark dark:border-white/10">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-wellq-blue/10 flex items-center justify-center ring-1 ring-wellq-blue/20">
                <Shield size={18} className="text-wellq-blue" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-wellq-dark dark:text-white leading-tight">{t('settings.team')}</h3>
                <p className="text-xs text-wellq-gray dark:text-wellq-gray/80 mt-0.5">{t('settings.teamSubtitle')}</p>
              </div>
            </div>
            {teamSubTab === 'users' && (
              <button
                onClick={openNew}
                className="flex items-center gap-2 px-5 py-2.5 bg-wellq-cyan text-wellq-black rounded-xl text-sm font-bold hover:bg-wellq-cyan/90 transition-all shadow-sm active:scale-95"
              >
                <UserPlus size={16} /> {t('settings.newUser')}
              </button>
            )}
            {teamSubTab === 'roles' && (
              <button
                onClick={openNewRole}
                className="flex items-center gap-2 px-5 py-2.5 bg-wellq-cyan text-wellq-black rounded-xl text-sm font-bold hover:bg-wellq-cyan/90 transition-all shadow-sm active:scale-95"
              >
                <Plus size={16} /> {t('settings.newRole')}
              </button>
            )}
          </div>

          {/* Sub-tabs — mismo estilo que los tabs principales */}
          <div className="flex gap-1.5 bg-wellq-gray/5 dark:bg-white/[0.03] p-1.5 rounded-xl mb-6 border border-wellq-gray/10 dark:border-white/5 shadow-inner w-fit">
            {[{ id: 'roles', label: t('settings.rolesAndPermissions') }, { id: 'users', label: t('settings.users') }].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTeamSubTab(tab.id)}
                className={`px-5 py-2 text-sm font-bold rounded-lg transition-all duration-200 ${
                  teamSubTab === tab.id
                    ? 'bg-white text-wellq-dark shadow-sm dark:bg-wellq-dark dark:text-white ring-1 ring-wellq-gray/10 dark:ring-white/10'
                    : 'text-wellq-gray hover:text-wellq-dark dark:text-wellq-gray/70 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Sub-tab content */}
          <AnimatePresence mode="wait">
            {teamSubTab === 'roles' ? (
              <motion.div key="subtab-roles" variants={tabVariants} initial="hidden" animate="enter" exit="exit">
                {rolesLoading ? (
                  <div className="flex justify-center py-16">
                    <div className="w-6 h-6 border-2 border-wellq-cyan border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <>
                    {/* Hint drag & drop */}
                    <p className="flex items-center gap-1.5 text-xs text-wellq-gray/60 dark:text-wellq-gray/50 mb-4">
                      <GripVertical size={12} />
                      {t('settings.rolePermissionsHint')}
                    </p>

                    {/* 3-panel grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                      {/* Panel 1 — Roles */}
                      <div className="rounded-2xl border border-wellq-gray/10 dark:border-white/5 overflow-hidden">
                        <div className="px-4 py-3 border-b border-wellq-gray/10 dark:border-white/5 bg-wellq-gray/5 dark:bg-white/[0.02]">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-wellq-gray">
                            {t('settings.roles')} <span className="ml-1 text-wellq-gray/40">({visibleRoles.length})</span>
                          </span>
                        </div>
                        <div className="p-2 space-y-1 min-h-[240px]">
                          {visibleRoles.map((role, idx) => {
                            const color = ROLE_COLORS[idx % ROLE_COLORS.length];
                            const isSelected = selectedRoleId === role.id;
                            return (
                              <div
                                key={role.id}
                                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all group ${
                                  isSelected
                                    ? `${color.selected} ring-1 ${color.ring}`
                                    : 'hover:bg-wellq-gray/5 dark:hover:bg-white/[0.03] text-wellq-dark dark:text-white'
                                }`}
                                onClick={() => handleSelectRole(role)}
                              >
                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${color.dot}`} />
                                <span className="text-sm font-semibold truncate flex-1">{role.name}</span>
                                <span className="text-[10px] font-bold text-wellq-gray/40 flex-shrink-0">
                                  {role.permissions?.length ?? 0}
                                </span>
                                {/* Edit / delete appear on hover */}
                                <div className={`flex items-center gap-0.5 flex-shrink-0 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); openEditRole(role); }}
                                    className="p-1 hover:bg-white/40 dark:hover:bg-white/10 rounded-lg transition-colors"
                                  >
                                    <Pencil size={11} />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteRole(role); }}
                                    className="p-1 hover:bg-red-500/10 rounded-lg transition-colors"
                                  >
                                    <Trash2 size={11} className="text-red-400" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                          {visibleRoles.length === 0 && (
                            <p className="text-xs text-center text-wellq-gray/40 py-8">{t('settings.noRoles')}</p>
                          )}
                        </div>
                      </div>

                      {/* Panel 2 — Asignados */}
                      <div className="rounded-2xl border border-wellq-gray/10 dark:border-white/5 overflow-hidden flex flex-col">
                        <div className="px-4 py-3 border-b border-wellq-gray/10 dark:border-white/5 bg-wellq-gray/5 dark:bg-white/[0.02] flex items-center justify-between flex-shrink-0">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-wellq-gray">
                            {t('settings.assigned')}
                            {selectedRole && (
                              <span className="ml-1.5 font-normal text-wellq-gray/50">— {selectedRole.name}</span>
                            )}
                          </span>
                          <span className="text-[10px] font-bold text-wellq-cyan tabular-nums">{visibleAssignedPermsList.length}</span>
                        </div>
                        <div
                          className={`flex-1 p-3 min-h-[240px] transition-colors ${
                            dragOverPanel === 'assigned' ? 'bg-wellq-cyan/5 dark:bg-wellq-cyan/10' : ''
                          }`}
                          onDragOver={(e) => { e.preventDefault(); setDragOverPanel('assigned'); }}
                          onDragLeave={() => setDragOverPanel(null)}
                          onDrop={() => { handleDrop('assigned'); setDragOverPanel(null); }}
                        >
                          {!selectedRoleId ? (
                            <div className="flex flex-col items-center justify-center h-full gap-2 py-8">
                              <Shield size={24} className="text-wellq-gray/20" />
                              <p className="text-xs text-wellq-gray/40 text-center">{t('settings.selectRoleToManage')}</p>
                            </div>
                          ) : visibleAssignedPermsList.length === 0 ? (
                            <div className={`flex flex-col items-center justify-center h-full gap-2 py-8 border-2 border-dashed rounded-xl transition-colors ${
                              dragOverPanel === 'assigned' ? 'border-wellq-cyan/40' : 'border-wellq-gray/10 dark:border-white/5'
                            }`}>
                              <p className="text-xs text-wellq-gray/40">{t('settings.dragPermissionsHere')}</p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {visibleAssignedPermsList.map((perm) => (
                                <PermCard
                                  key={perm.id}
                                  perm={perm}
                                  onDragStart={() => handleDragStart(perm.id, 'assigned')}
                                  onDoubleClick={() => moveToAvailable(perm.id)}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Panel 3 — Disponibles */}
                      <div className="rounded-2xl border border-wellq-gray/10 dark:border-white/5 overflow-hidden flex flex-col">
                        <div className="px-4 py-3 border-b border-wellq-gray/10 dark:border-white/5 bg-wellq-gray/5 dark:bg-white/[0.02] flex items-center justify-between flex-shrink-0">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-wellq-gray">{t('settings.available')}</span>
                          <span className="text-[10px] font-bold text-wellq-gray/40 tabular-nums">{visibleAvailablePermsList.length}</span>
                        </div>
                        <div
                          className={`flex-1 p-3 min-h-[240px] transition-colors ${
                            dragOverPanel === 'available' ? 'bg-wellq-gray/5 dark:bg-white/[0.03]' : ''
                          }`}
                          onDragOver={(e) => { e.preventDefault(); setDragOverPanel('available'); }}
                          onDragLeave={() => setDragOverPanel(null)}
                          onDrop={() => { handleDrop('available'); setDragOverPanel(null); }}
                        >
                          {!selectedRoleId ? (
                            <div className="flex flex-col items-center justify-center h-full py-8">
                              <p className="text-xs text-wellq-gray/40 text-center">{t('settings.availablePermissionsEmpty')}</p>
                            </div>
                          ) : visibleAvailablePermsList.length === 0 ? (
                            <div className={`flex flex-col items-center justify-center h-full gap-2 py-8 border-2 border-dashed rounded-xl transition-colors ${
                              dragOverPanel === 'available' ? 'border-wellq-gray/30' : 'border-wellq-gray/10 dark:border-white/5'
                            }`}>
                              <p className="text-xs text-wellq-gray/40">{t('settings.allPermissionsAssigned')}</p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {visibleAvailablePermsList.map((perm) => (
                                <PermCard
                                  key={perm.id}
                                  perm={perm}
                                  onDragStart={() => handleDragStart(perm.id, 'available')}
                                  onDoubleClick={() => moveToAssigned(perm.id)}
                                  muted
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Footer guardar / cancelar */}
                    {selectedRoleId && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between mt-5 pt-5 border-t border-wellq-gray/10 dark:border-white/5"
                      >
                        <p className={`text-xs font-medium transition-colors ${
                          permsDirty ? 'text-amber-500' : 'text-wellq-gray/40'
                        }`}>
                          {permsDirty ? t('settings.unsavedChanges') : t('settings.noPendingChanges')}
                        </p>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={handleCancelPerms}
                            disabled={!permsDirty}
                            className="px-5 py-2.5 rounded-xl text-sm font-bold text-wellq-gray hover:text-wellq-dark dark:hover:text-white hover:bg-wellq-gray/10 dark:hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            {t('common.cancel')}
                          </button>
                          <button
                            onClick={handleSavePerms}
                            disabled={!permsDirty || savingPerms}
                            className="flex items-center gap-2 px-6 py-2.5 bg-wellq-cyan text-wellq-black rounded-xl text-sm font-bold hover:bg-wellq-cyan/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm active:scale-95"
                          >
                            {savingPerms ? (
                              <><div className="w-4 h-4 border-2 border-wellq-black/30 border-t-wellq-black rounded-full animate-spin" /> {t('settings.saving')}</>
                            ) : (
                              <><Save size={15} /> {t('settings.savePermissions')}</>
                            )}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </>
                )}
              </motion.div>
            ) : (
              /* ── Sub-tab Usuarios (tabla existente) ──────────────────────── */
              <motion.div key="subtab-users" variants={tabVariants} initial="hidden" animate="enter" exit="exit">
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
                      {visibleUsers.map((u) => (
                        <motion.tr variants={tableRowVariants} key={u.user_id} className="border-b border-wellq-gray/10 dark:border-white/5 hover:bg-wellq-gray/3 dark:hover:bg-white/[0.01] transition-colors group">
                          <td className="py-3 px-4 font-semibold text-wellq-dark dark:text-white break-words max-w-[200px]">{u.full_name}</td>
                          <td className="py-3 px-4 text-wellq-gray dark:text-wellq-gray/80 break-words max-w-[250px]">{u.email}</td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {/* 🔥 CORE FIX: Aseguramos que busque el rol comparando ambos como strings */}
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-wellq-gray/10 text-wellq-gray">
                              {roles.find(r => String(r.id) === String(u.role_id))?.name || u.role || t('settings.noRole')}
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
                      {visibleUsers.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-sm font-medium text-wellq-gray dark:text-wellq-gray/70">{t('settings.noUsers')}</td>
                        </tr>
                      )}
                    </motion.tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      );
    }

    // General tab
    if (searchActive && !showGeneralConfig && !showAppearance && !showLanguage && !showBackend && !showDatabase && !showSync) {
      return <SearchEmptyState query={searchQuery} />;
    }

    return (
      <motion.div key="general" variants={tabVariants} initial="hidden" animate="enter" exit="exit" className="space-y-6">

        {/* Global Settings */}
        {showGeneralConfig && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-wellq-gray/20 dark:bg-wellq-dark dark:border-white/10">
          <h3 className="font-bold text-lg text-wellq-dark dark:text-white mb-6">{t('settings.globalConfig')}</h3>
          {loading ? (
            <Skeleton className="h-32 w-full rounded-xl" />
          ) : (
            <div className="space-y-3">
              {visibleSettingRows.map(({ key, label, desc }) => {
                const val = localSettings[key] ?? globalSettings?.[key] ?? false;
                return (
                  <div key={key} className="flex items-center justify-between p-4 rounded-2xl bg-wellq-gray/5 dark:bg-white/[0.03] border border-transparent dark:border-white/5 hover:border-wellq-gray/10 transition-colors">
                    <div>
                      <div className="text-sm font-bold text-wellq-dark dark:text-white">{label}</div>
                      <div className="text-xs font-medium text-wellq-gray mt-0.5">{desc}</div>
                    </div>
                    <button
                      onClick={() => canManageSettings && toggleSetting(key)}
                      disabled={!canManageSettings}
                      className={`focus:outline-none active:scale-95 transition-transform ${!canManageSettings ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title={!canManageSettings ? t('settings.readOnly') : undefined}
                    >
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
                    <div className="text-xs font-medium text-wellq-gray mt-0.5">{t('settings.technicalContact')}</div>
                  </div>
                  <a
                    href="https://mail.google.com/mail/?view=cm&fs=1&to=wellq.admin@gmail.com"
                    target="_blank" rel="noopener noreferrer"
                    className="text-sm font-bold text-wellq-cyan hover:underline transition-all"
                  >
                    wellq.admin@gmail.com
                  </a>
                </div>
              </div>

              {canManageSettings && hasChanges && (
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
        )}

        {/* Appearance & Language */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {showAppearance && (
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
          )}
          {showLanguage && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-wellq-gray/20 dark:bg-wellq-dark dark:border-white/10">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-wellq-blue/10 flex items-center justify-center">
                <Globe size={18} className="text-wellq-blue" />
              </div>
              <h3 className="font-bold text-lg text-wellq-dark dark:text-white">{t('settings.language')}</h3>
            </div>
            <LanguageSelector />
          </div>
          )}
        </div>

        {/* Backend & DB & Sync Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {showBackend && (
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
                  serverStatus.status === 'online' ? 'bg-wellq-green/10 text-wellq-green border border-wellq-green/20' : 'bg-red-50 text-red-600 border border-red-200'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${serverStatus.status === 'online' ? 'bg-wellq-green' : 'bg-red-500 animate-pulse'}`} />
                  {tVal(serverStatus.status)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-wellq-gray">{t('settings.version')}</span>
                <span className="text-sm font-bold text-wellq-dark dark:text-white">{serverStatus.version}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-wellq-gray">{t('settings.environment')}</span>
                <span className="text-sm font-bold text-wellq-dark dark:text-white capitalize">{tVal(serverStatus.environment)}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-wellq-gray/10 dark:border-white/5">
                <span className="text-xs font-semibold uppercase tracking-wider text-wellq-gray">{t('settings.latency')}</span>
                <span className="text-sm font-black text-wellq-blue tabular-nums">{serverStatus.latency}</span>
              </div>
            </div>
          </div>
          )}

          {showDatabase && (
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
                    <span className="w-1.5 h-1.5 rounded-full bg-wellq-green" /> {tVal(dbStatus?.status) ?? t('common.loading')}
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
          )}

          {showSync && (
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
                {Array.from({ length: 3 }).map((_, i) => (<Skeleton key={i} className="h-12 w-full rounded-xl" />))}
              </div>
            ) : (
              <div className="relative space-y-2.5">
                {visibleSyncSources.map((src) => {
                  const meta = SYNC_STATUS_META[src.status] ?? SYNC_STATUS_META.error;
                  const SyncIcon = meta.icon;
                  const fmtSync = src.last_sync
                    ? new Date(src.last_sync).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                    : t('settings.syncNever');
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
                {visibleSyncSources.length === 0 && (
                  <p className="text-xs font-medium text-center text-wellq-gray py-4">
                    {t('settings.syncNoData')}
                  </p>
                )}
              </div>
            )}
          </div>
          )}
        </div>
      </motion.div>
    );
  };

  // ─── Modal usuario (Portal) ────────────────────────────────────────────────
  const modalContent = showModal && createPortal(
    <div className="fixed inset-0 z-[9999] flex items-end justify-center p-3 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
      <div className="relative flex min-h-0 max-h-[calc(100dvh-1.5rem)] w-full max-w-lg flex-col overflow-hidden rounded-[24px] border border-wellq-gray/20 bg-white shadow-2xl dark:border-white/10 dark:bg-wellq-dark sm:max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-5 border-b border-wellq-gray/10 dark:border-white/5 bg-wellq-gray/3 dark:bg-white/[0.02] flex-shrink-0">
          <div>
            <h3 className="text-lg font-bold text-wellq-dark dark:text-white leading-tight">
              {editUser ? t('settings.editUser') : t('settings.newUser')}
            </h3>
            <p className="text-xs font-medium text-wellq-gray mt-1">{t('settings.accessConfiguration')}</p>
          </div>
          <button onClick={closeModal} className="p-2 bg-wellq-gray/5 hover:bg-wellq-gray/10 dark:bg-white/5 dark:hover:bg-white/10 rounded-xl transition-colors">
            <X size={18} className="text-wellq-gray" strokeWidth={2.5} />
          </button>
        </div>
        <form onSubmit={handleUserSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto overscroll-contain wellq-scrollbar">
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-wellq-gray mb-1.5">{t('settings.userId')}</label>
                <input
                  required disabled={!!editUser} autoFocus={!editUser}
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-wellq-gray mb-1.5">{t('settings.colRole')}</label>
                  <select
                    required
                    className="w-full px-4 py-2.5 bg-wellq-gray/5 dark:bg-white/[0.02] border border-wellq-gray/20 dark:border-white/10 rounded-xl text-sm font-semibold text-wellq-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-wellq-cyan appearance-none cursor-pointer dark:[color-scheme:dark]"
                    value={form.role_id}
                    onChange={(e) => setForm({ ...form, role_id: e.target.value })}
                  >
                    <option value="" disabled className="bg-white dark:bg-wellq-dark text-wellq-gray">{t('settings.selectRole')}</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id} className="bg-white dark:bg-wellq-dark text-wellq-dark dark:text-white">
                        {role.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-wellq-gray mb-1.5">{t('settings.colStatus')}</label>
                  <select
                    required
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
          </div>
            <div className="flex flex-col-reverse gap-3 border-t border-wellq-gray/10 bg-white px-6 py-5 dark:border-white/5 dark:bg-wellq-dark sm:flex-row sm:justify-end">
              <button type="button" onClick={closeModal} className="px-5 py-2.5 rounded-xl text-sm font-bold text-wellq-gray hover:text-wellq-dark dark:hover:text-white hover:bg-wellq-gray/10 dark:hover:bg-white/5 transition-colors">
                {t('common.cancel')}
              </button>
              <button type="submit" disabled={savingUser} className="flex items-center gap-2 px-6 py-2.5 bg-wellq-cyan text-wellq-black rounded-xl text-sm font-bold hover:bg-wellq-cyan/90 transition-all disabled:opacity-50 shadow-sm active:scale-95">
                {savingUser ? <><div className="w-4 h-4 border-2 border-wellq-black/30 border-t-wellq-black rounded-full animate-spin" /> {t('settings.saving')}</> : t('common.save')}
              </button>
            </div>
        </form>
      </div>
    </div>,
    document.body
  );

  // ─── Modal Rol (Portal) ────────────────────────────────────────────────────
  const roleModalContent = showRoleModal && createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeRoleModal} />
      <div className="relative bg-white dark:bg-wellq-dark rounded-[24px] shadow-2xl w-full max-w-sm border border-wellq-gray/20 dark:border-white/10 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-wellq-gray/10 dark:border-white/5 bg-wellq-gray/3 dark:bg-white/[0.02]">
          <div>
            <h3 className="text-lg font-bold text-wellq-dark dark:text-white leading-tight">
              {editRole ? t('settings.editRole') : t('settings.newRole')}
            </h3>
            <p className="text-xs font-medium text-wellq-gray mt-1">
              {editRole ? t('settings.editingRole', { name: editRole.name }) : t('settings.roleModalSubtitle')}
            </p>
          </div>
          <button onClick={closeRoleModal} className="p-2 bg-wellq-gray/5 hover:bg-wellq-gray/10 dark:bg-white/5 dark:hover:bg-white/10 rounded-xl transition-colors">
            <X size={18} className="text-wellq-gray" strokeWidth={2.5} />
          </button>
        </div>
        <form onSubmit={handleRoleSubmit}>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-wellq-gray mb-1.5">{t('settings.roleName')}</label>
              <input
                required
                autoFocus
                placeholder={t('settings.roleNamePlaceholder')}
                className="w-full px-4 py-2.5 bg-wellq-gray/5 dark:bg-white/[0.02] border border-wellq-gray/20 dark:border-white/10 rounded-xl text-sm font-semibold text-wellq-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-wellq-cyan placeholder:font-normal placeholder:text-wellq-gray/40"
                value={roleForm.name}
                onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-wellq-gray mb-1.5">{t('settings.description')} <span className="font-normal normal-case text-wellq-gray/50">({t('common.optional')})</span></label>
              <input
                placeholder={t('settings.roleDescriptionPlaceholder')}
                className="w-full px-4 py-2.5 bg-wellq-gray/5 dark:bg-white/[0.02] border border-wellq-gray/20 dark:border-white/10 rounded-xl text-sm font-semibold text-wellq-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-wellq-cyan placeholder:font-normal placeholder:text-wellq-gray/40"
                value={roleForm.description}
                onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
              />
            </div>
            {roleError && (
              <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-500/10 rounded-xl border border-red-100 dark:border-red-500/20">
                <AlertTriangle size={14} className="text-red-500" />
                <p className="text-xs font-semibold text-red-600 dark:text-red-400">{roleError}</p>
              </motion.div>
            )}
          </div>
          <div className="flex justify-end gap-3 px-6 py-5 border-t border-wellq-gray/10 dark:border-white/5 bg-wellq-gray/3 dark:bg-white/[0.02]">
            <button type="button" onClick={closeRoleModal} className="px-5 py-2.5 rounded-xl text-sm font-bold text-wellq-gray hover:text-wellq-dark dark:hover:text-white hover:bg-wellq-gray/10 dark:hover:bg-white/5 transition-colors">
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={savingRole} className="flex items-center gap-2 px-6 py-2.5 bg-wellq-cyan text-wellq-black rounded-xl text-sm font-bold hover:bg-wellq-cyan/90 transition-all disabled:opacity-50 shadow-sm active:scale-95">
              {savingRole ? <><div className="w-4 h-4 border-2 border-wellq-black/30 border-t-wellq-black rounded-full animate-spin" /> {t('settings.saving')}</> : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );

  const settingsTabs = [
    { id: 'general', label: t('settings.general') },
    ...(canManageSettings ? [
      { id: 'api_keys', label: t('settings.apiKeys') },
      { id: 'team', label: t('settings.team') },
    ] : []),
  ];

  return (
    <div className="space-y-6 font-sans overflow-x-hidden" style={{ scrollbarGutter: 'stable' }}>
      {/* Tabs principales */}
      <div className="flex gap-1.5 bg-wellq-gray/5 dark:bg-white/[0.03] p-1.5 rounded-xl self-start inline-flex border border-wellq-gray/10 dark:border-white/5 shadow-inner">
        {settingsTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2 text-sm font-bold rounded-lg transition-all duration-200 ${
              (canManageSettings ? activeTab : 'general') === tab.id
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

      {modalContent}
      {roleModalContent}

      <ConfirmDialog
        open={confirmDelete.open}
        title={t('settings.deleteUserTitle')}
        message={t('settings.deleteUserMessage')}
        onConfirm={doDeleteUser}
        onCancel={() => setConfirmDelete({ open: false, userId: null })}
      />

      <ConfirmDialog
        open={confirmDeleteRole.open}
        title={t('settings.deleteRoleTitle')}
        message={t('settings.deleteRoleMessage', { name: confirmDeleteRole.roleName })}
        onConfirm={doDeleteRole}
        onCancel={() => setConfirmDeleteRole({ open: false, roleId: null, roleName: '' })}
      />
    </div>
  );
};

// ─── PermCard — componente interno ───────────────────────────────────────────
const PermCard = ({ perm, onDragStart, onDoubleClick, muted = false }) => {
  const { t } = useLanguage();
  const moduleLabel = t(`sidebar.${String(perm.module ?? '').toLowerCase()}`, perm.module);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDoubleClick={onDoubleClick}
      title={t('settings.permissionCardHint')}
      className={`flex items-start gap-2 p-2.5 rounded-xl border cursor-grab active:cursor-grabbing transition-all group select-none ${
        muted
          ? 'bg-wellq-gray/3 dark:bg-white/[0.01] border-wellq-gray/10 dark:border-white/5 hover:border-wellq-gray/20 dark:hover:border-white/10'
          : 'bg-white dark:bg-white/[0.03] border-wellq-gray/10 dark:border-white/5 hover:border-wellq-cyan/30 dark:hover:border-wellq-cyan/30'
      }`}
    >
      <GripVertical
        size={12}
        className="text-wellq-gray/25 mt-0.5 flex-shrink-0 group-hover:text-wellq-gray/50 transition-colors"
      />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-wellq-dark dark:text-white truncate leading-tight">{perm.label}</p>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md leading-tight ${
            MODULE_COLORS[perm.module] ?? 'bg-wellq-gray/10 text-wellq-gray'
          }`}>
            {moduleLabel}
          </span>
          <span className="text-[9px] text-wellq-gray/40 font-mono truncate">{perm.key}</span>
        </div>
      </div>
    </div>
  );
};
