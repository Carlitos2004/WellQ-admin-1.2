import React, { useState } from 'react';
import { ToggleLeft, ToggleRight, Cloud, Database, Shield } from 'lucide-react';
import { Skeleton } from '../components/ui';

export const SettingsView = ({
  globalSettings, azureStatus, dbStatus, users, loading, onSaveSettings,
}) => {
  const [localSettings, setLocalSettings] = useState({});
  const hasChanges = Object.keys(localSettings).length > 0;

  const toggleSetting = (key) =>
    setLocalSettings((prev) => ({
      ...prev,
      [key]: !(localSettings[key] ?? globalSettings?.[key]),
    }));

  return (
    <div className="space-y-6">
      {/* Global config */}
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
                    {val ? (
                      <ToggleRight size={32} className="text-indigo-600" />
                    ) : (
                      <ToggleLeft size={32} className="text-slate-300" />
                    )}
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
                {globalSettings?.support_email ?? 'esperando@basededatos.com'}
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

      {/* Azure + DB */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-4">
            <Cloud size={20} className="text-blue-500" />
            <h3 className="font-semibold text-slate-900">Azure Connection</h3>
          </div>
          {loading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Status</span>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                  {azureStatus?.status ?? 'Esperando...'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Region</span>
                <span className="text-sm font-medium text-slate-900">
                  {azureStatus?.region ?? 'Esperando conexión...'}
                </span>
              </div>
              {Object.entries(
                azureStatus?.services ?? {
                  key_vault: 'Esperando...',
                  blob_storage: 'Esperando...',
                  app_service: 'Esperando...',
                }
              ).map(([svc, st]) => (
                <div
                  key={svc}
                  className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0"
                >
                  <span className="text-xs text-slate-500 capitalize">
                    {svc.replace(/_/g, ' ')}
                  </span>
                  <span className="flex items-center gap-1 text-xs font-medium text-slate-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                    {st}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

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
                { label: 'Engine', value: dbStatus?.database ?? 'Esperando base de datos' },
                { label: 'Status', value: dbStatus?.status ?? 'Esperando...' },
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

      {/* System users */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Shield size={20} className="text-indigo-500" />
            <h3 className="font-semibold text-slate-900">System Users</h3>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
            + New User
          </button>
        </div>
        {loading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <div className="space-y-2">
            {(
              users ?? [
                { user_id: 'USR-000', name: 'Esperando conexión...', role: 'N/A', status: 'Esperando...' },
              ]
            ).map((u, i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-slate-300 flex items-center justify-center text-white text-sm font-bold">
                  {(u.name ?? 'E').charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-900">{u.name}</div>
                  <div className="text-xs text-slate-500">{u.role}</div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                  {u.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
