import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, CheckCircle, Mail, ChevronRight } from 'lucide-react';
import { UtilizationBar } from '../ui';
import { apiFetch } from '../../api/client';

export const ClinicDrawer = ({ clinic, onClose }) => {
  const [subscription, setSubscription] = useState(null);
  const [license, setLicense] = useState(null);
  const [usage, setUsage] = useState(null);
  const [contact, setContact] = useState(null);

  useEffect(() => {
    if (!clinic) return;
    const id = clinic.clinic_id ?? clinic.id;
    apiFetch(`/api/clinics/${id}/subscription`)
      .then((d) => setSubscription(d.subscription))
      .catch(() => {});
    apiFetch(`/api/clinics/${id}/license`)
      .then((d) => setLicense(d.licenses))
      .catch(() => {});
    apiFetch(`/api/clinics/${id}/usage`)
      .then((d) => setUsage(d.metrics))
      .catch(() => {});
    apiFetch(`/api/clinics/${id}/contact`)
      .then((d) => setContact(d))
      .catch(() => {});
  }, [clinic]);

  if (!clinic) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-[420px] bg-white shadow-2xl z-50 transform transition-transform duration-300 border-l border-slate-200">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold">
              {(clinic.name ?? 'E').charAt(0)}
            </div>
            <div>
              <h2 className="font-bold text-lg text-slate-900">
                {clinic.name ?? 'Esperando base de datos'}
              </h2>
              <span className="text-sm text-slate-400">
                {clinic.clinic_id ?? clinic.id ?? 'Esperando...'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Contact */}
          <section>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Contact Information
            </h3>
            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Decision Maker</span>
                <span className="text-sm font-medium text-slate-900">
                  {contact?.contact_info?.primary_name ?? 'Esperando conexión...'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Email</span>
                <span className="text-sm font-medium text-indigo-600">
                  {contact?.contact_info?.primary_email ?? 'esperando@basededatos.com'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Phone</span>
                <span className="text-sm font-medium text-slate-900">
                  {contact?.contact_info?.primary_phone ?? '000000000'}
                </span>
              </div>
            </div>
          </section>

          {/* Subscription */}
          <section>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Subscription Details
            </h3>
            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Plan</span>
                <span
                  className={`px-2.5 py-1 rounded-md text-xs font-medium ${
                    (subscription?.plan_name ?? clinic.tier) === 'Enterprise' ||
                    (subscription?.plan_name ?? '').includes('Enterprise')
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {subscription?.plan_name ?? clinic.tier ?? 'Esperando...'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Contract Value</span>
                <span className="text-sm font-bold text-slate-900">
                  {subscription
                    ? `$${(subscription.mrr_value * 12).toLocaleString()}/yr`
                    : '$0/yr'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Renewal Date</span>
                <span className="text-sm font-medium text-slate-900">
                  {subscription?.renews_at
                    ? new Date(subscription.renews_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'Esperando base de datos'}
                </span>
              </div>
              {subscription?.features_enabled?.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {subscription.features_enabled.map((f) => (
                    <span
                      key={f}
                      className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-xs rounded-full border border-indigo-100"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Usage */}
          <section>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Usage Statistics
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100">
                <div className="text-2xl font-bold text-indigo-600">
                  {usage?.patient_sessions_completed?.toLocaleString() ?? '0'}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {usage ? 'Patient Sessions' : 'Esperando conexión...'}
                </div>
              </div>
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-100">
                <div className="text-2xl font-bold text-emerald-600">
                  {usage?.active_clinicians?.toLocaleString() ?? '0'}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {usage ? 'Active Clinicians' : 'Esperando conexión...'}
                </div>
              </div>
              {usage && (
                <>
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-100">
                    <div className="text-2xl font-bold text-amber-600">
                      {(usage.ai_processing_minutes ?? 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">AI Minutes Used</div>
                  </div>
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
                    <div className="text-2xl font-bold text-slate-700">
                      {(usage.api_calls ?? 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">API Calls</div>
                  </div>
                </>
              )}
            </div>
            {license && (
              <div className="mt-3 p-3 bg-slate-50 rounded-xl">
                <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                  <span>License Usage</span>
                  <span className="font-semibold text-slate-900">
                    {license.currently_active?.toLocaleString() ?? 0} /{' '}
                    {license.total_limit?.toLocaleString() ?? 0}
                  </span>
                </div>
                <UtilizationBar
                  used={license.currently_active ?? 0}
                  total={license.total_limit ?? 0}
                />
                {license.warning_threshold_reached && (
                  <div className="flex items-center gap-1.5 text-amber-600 text-xs mt-2">
                    <AlertTriangle size={12} /> Warning threshold reached
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Churn Prediction */}
          <section>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              AI Churn Prediction
            </h3>
            <div
              className={`rounded-xl p-4 border ${
                (clinic.healthScore ?? 0) >= 80
                  ? 'bg-emerald-50 border-emerald-200'
                  : (clinic.healthScore ?? 0) >= 50 && clinic.healthScore !== 0
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {(clinic.healthScore ?? 0) >= 80 ? (
                  <CheckCircle size={18} className="text-emerald-600" />
                ) : (clinic.healthScore ?? 0) >= 50 && clinic.healthScore !== 0 ? (
                  <AlertTriangle size={18} className="text-amber-600" />
                ) : (
                  <AlertTriangle size={18} className="text-slate-400" />
                )}
                <span
                  className={`font-semibold ${
                    (clinic.healthScore ?? 0) >= 80
                      ? 'text-emerald-700'
                      : (clinic.healthScore ?? 0) >= 50 && clinic.healthScore !== 0
                      ? 'text-amber-700'
                      : 'text-slate-500'
                  }`}
                >
                  {clinic.healthScore ? 'Risk Assessment' : 'Esperando evaluación...'}
                </span>
              </div>
              <p className="text-sm text-slate-900">
                Esperando conexión con backend para predecir riesgo.
              </p>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-slate-50/50">
          <div className="flex gap-3">
            <button className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2">
              <Mail size={16} /> Contact Clinic
            </button>
            <button className="px-4 py-2.5 border border-slate-200 rounded-lg font-medium text-slate-700 hover:bg-slate-100 transition-colors">
              View Full Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
