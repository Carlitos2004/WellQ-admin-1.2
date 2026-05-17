import React, { useState, useEffect } from 'react';
import { X, Mail, Settings as SettingsIcon, Receipt, Download, Loader2, CheckCircle } from 'lucide-react';
import { UtilizationBar } from '../ui';
import { apiFetch, API_BASE } from '../../api/client';

export const ClinicDrawer = ({ clinic, mode = 'overview', onClose }) => {
  const [activeTab,    setActiveTab]    = useState(mode);
  const [subscription, setSubscription] = useState(null);
  const [license,      setLicense]      = useState(null);
  const [usage,        setUsage]        = useState(null);
  const [contact,      setContact]      = useState(null);

  // ── Settings form state ───────────────────────────────────────────────────
  const [clinicName,   setClinicName]   = useState('');
  const [clinicPlan,   setClinicPlan]   = useState('');
  const [clinicStatus, setClinicStatus] = useState('');
  const [saving,       setSaving]       = useState(false);
  const [saveOk,       setSaveOk]       = useState(false);
  const [saveError,    setSaveError]    = useState(null);

  useEffect(() => {
    setActiveTab(mode);
  }, [mode]);

  useEffect(() => {
    if (!clinic) return;
    // Inicializar form con valores actuales
    setClinicName(clinic.name ?? '');
    setClinicPlan(clinic.tier ?? 'Enterprise');
    setClinicStatus(clinic.status ?? 'Active');
    setSaveOk(false);
    setSaveError(null);

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

  // ── Save Changes handler ──────────────────────────────────────────────────
  const handleSave = async () => {
    const id = clinic.clinic_id ?? clinic.id;
    setSaving(true);
    setSaveOk(false);
    setSaveError(null);
    try {
      const res = await fetch(`${API_BASE}/api/clinics/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          name:   clinicName,
          tier:   clinicPlan,
          status: clinicStatus,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 3000);
    } catch (err) {
      setSaveError('Error al guardar. Intenta de nuevo.');
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  // ── Contact Clinic handler — FIX: botón no tenía onClick ─────────────────
  const handleContactClinic = () => {
    const email = contact?.contact_info?.primary_email;
    if (email) {
      window.open(
        `mailto:${email}?subject=WellQ%20-%20${encodeURIComponent(clinic.name ?? '')}`
      );
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-[420px] bg-white dark:bg-wellq-dark shadow-2xl z-50 transform transition-transform duration-300 border-l border-wellq-gray/20 dark:border-wellq-gray/30 flex flex-col">
      {/* Header & Tabs */}
      <div className="flex-none pt-6 px-6 border-b border-wellq-gray/10 dark:border-wellq-gray/30">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-wellq-cyan to-wellq-blue flex items-center justify-center text-white text-lg font-bold">
              {(clinic.name ?? 'E').charAt(0)}
            </div>
            <div>
              <h2 className="font-bold text-lg text-wellq-dark dark:text-white">
                {clinic.name ?? 'Esperando base de datos'}
              </h2>
              <span className="text-sm text-wellq-gray">
                {clinic.clinic_id ?? clinic.id ?? 'Esperando...'}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-wellq-gray/10 dark:hover:bg-wellq-dark/40 rounded-lg transition-colors cursor-pointer">
            <X size={20} className="text-wellq-gray dark:text-wellq-gray/80" />
          </button>
        </div>

        <div className="flex items-center gap-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'overview' ? 'border-wellq-cyan text-wellq-cyan' : 'border-transparent text-wellq-gray dark:text-wellq-gray/80 hover:text-wellq-dark dark:hover:text-white'}`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${activeTab === 'settings' ? 'border-wellq-cyan text-wellq-cyan' : 'border-transparent text-wellq-gray dark:text-wellq-gray/80 hover:text-wellq-dark dark:hover:text-white'}`}
          >
            <SettingsIcon size={14} /> Settings
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${activeTab === 'invoices' ? 'border-wellq-cyan text-wellq-cyan' : 'border-transparent text-wellq-gray dark:text-wellq-gray/80 hover:text-wellq-dark dark:hover:text-white'}`}
          >
            <Receipt size={14} /> Invoices
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto bg-wellq-gray/5 dark:bg-wellq-dark/30 p-6">

        {activeTab === 'overview' && (
          <div className="space-y-6">
            <section>
              <h3 className="text-xs font-semibold text-wellq-gray uppercase tracking-wider mb-3">Contact Information</h3>
              <div className="bg-white dark:bg-wellq-dark border border-wellq-gray/20 dark:border-wellq-gray/30 rounded-xl p-4 space-y-3 shadow-sm">
                <div className="flex justify-between"><span className="text-sm text-wellq-gray">Decision Maker</span><span className="text-sm font-medium text-wellq-dark dark:text-white">{contact?.contact_info?.primary_name ?? 'Esperando conexión...'}</span></div>
                <div className="flex justify-between"><span className="text-sm text-wellq-gray">Email</span><span className="text-sm font-medium text-wellq-cyan">{contact?.contact_info?.primary_email ?? 'esperando@basededatos.com'}</span></div>
                <div className="flex justify-between"><span className="text-sm text-wellq-gray">Phone</span><span className="text-sm font-medium text-wellq-dark dark:text-white">{contact?.contact_info?.primary_phone ?? '000000000'}</span></div>
              </div>
            </section>

            <section>
              <h3 className="text-xs font-semibold text-wellq-gray uppercase tracking-wider mb-3">Subscription Details</h3>
              <div className="bg-white dark:bg-wellq-dark border border-wellq-gray/20 dark:border-wellq-gray/30 rounded-xl p-4 space-y-3 shadow-sm">
                <div className="flex justify-between">
                  <span className="text-sm text-wellq-gray">Plan</span>
                  <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-wellq-gray/10 text-wellq-dark dark:text-white dark:bg-wellq-dark/50">{subscription?.plan_name ?? clinic.tier ?? 'Esperando...'}</span>
                </div>
                <div className="flex justify-between"><span className="text-sm text-wellq-gray">Contract Value</span><span className="text-sm font-bold text-wellq-dark dark:text-white">{subscription ? `$${(subscription.mrr_value * 12).toLocaleString()}/yr` : '$0/yr'}</span></div>
              </div>
            </section>

            <section>
              <h3 className="text-xs font-semibold text-wellq-gray uppercase tracking-wider mb-3">Usage Statistics</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-wellq-cyan/10 dark:bg-wellq-cyan/10 rounded-xl p-4 border border-wellq-cyan/20">
                  <div className="text-2xl font-bold text-wellq-cyan">{usage?.patient_sessions_completed?.toLocaleString() ?? '0'}</div>
                  <div className="text-xs text-wellq-gray mt-1">Patient Sessions</div>
                </div>
                <div className="bg-wellq-green/10 dark:bg-wellq-green/10 rounded-xl p-4 border border-wellq-green/20">
                  <div className="text-2xl font-bold text-wellq-green">{usage?.active_clinicians?.toLocaleString() ?? '0'}</div>
                  <div className="text-xs text-wellq-gray mt-1">Active Clinicians</div>
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-wellq-dark dark:text-white mb-1">Edit Clinic</h3>
              <p className="text-sm text-wellq-gray mb-4">Manage core details and status for this tenant.</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-wellq-dark dark:text-white mb-1.5">Clinic Name</label>
                <input
                  type="text"
                  value={clinicName}
                  onChange={(e) => setClinicName(e.target.value)}
                  className="w-full px-4 py-2 border border-wellq-gray/30 rounded-lg text-sm text-wellq-dark dark:text-white dark:bg-wellq-dark/50 focus:outline-none focus:ring-2 focus:ring-wellq-cyan"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-wellq-dark dark:text-white mb-1.5">Assigned Plan</label>
                <select
                  value={clinicPlan}
                  onChange={(e) => setClinicPlan(e.target.value)}
                  className="w-full px-4 py-2 border border-wellq-gray/30 rounded-lg text-sm text-wellq-dark dark:text-white dark:bg-wellq-dark/50 focus:outline-none focus:ring-2 focus:ring-wellq-cyan bg-white dark:bg-wellq-dark/50"
                >
                  <option value="Enterprise">Enterprise</option>
                  <option value="Pro">Pro / SMB</option>
                  <option value="Trial">Trial</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-wellq-dark dark:text-white mb-1.5">Account Status</label>
                <select
                  value={clinicStatus}
                  onChange={(e) => setClinicStatus(e.target.value)}
                  className="w-full px-4 py-2 border border-wellq-gray/30 rounded-lg text-sm text-wellq-dark dark:text-white dark:bg-wellq-dark/50 focus:outline-none focus:ring-2 focus:ring-wellq-cyan bg-white dark:bg-wellq-dark/50"
                >
                  <option value="Active">Active</option>
                  <option value="Suspended">Suspended</option>
                  <option value="Churned">Churned</option>
                </select>
              </div>

              {saveError && <p className="text-xs text-red-500">{saveError}</p>}

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full mt-4 px-4 py-2.5 bg-wellq-cyan text-wellq-black rounded-lg font-medium hover:bg-wellq-cyan/90 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving
                  ? <><Loader2 size={15} className="animate-spin" /> Guardando...</>
                  : saveOk
                  ? <><CheckCircle size={15} /> ¡Guardado!</>
                  : 'Save Changes'
                }
              </button>
            </div>
          </div>
        )}

        {activeTab === 'invoices' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold text-wellq-dark dark:text-white mb-1">Billing History</h3>
              <p className="text-sm text-wellq-gray mb-4">Recent invoices and payment status.</p>
            </div>
            {[
              { id: 'INV-2026-003', date: 'May 1, 2026', amount: '$499.00', status: 'Paid' },
              { id: 'INV-2026-002', date: 'Apr 1, 2026', amount: '$499.00', status: 'Paid' },
              { id: 'INV-2026-001', date: 'Mar 1, 2026', amount: '$499.00', status: 'Paid' },
            ].map((inv) => (
              <div key={inv.id} className="flex items-center justify-between p-4 bg-white dark:bg-wellq-dark border border-wellq-gray/20 dark:border-wellq-gray/30 rounded-xl shadow-sm hover:border-wellq-cyan/40 dark:hover:border-wellq-cyan/40 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-wellq-cyan/10 flex items-center justify-center text-wellq-cyan">
                    <Receipt size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-wellq-dark dark:text-white">{inv.amount}</p>
                    <p className="text-xs text-wellq-gray">{inv.id} • {inv.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 bg-wellq-green/10 text-wellq-green text-xs font-medium rounded-md">
                    {inv.status}
                  </span>
                  <button className="p-1.5 text-wellq-gray hover:text-wellq-cyan hover:bg-wellq-cyan/10 rounded transition-colors cursor-pointer opacity-0 group-hover:opacity-100">
                    <Download size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {activeTab === 'overview' && (
        <div className="flex-none p-6 border-t border-wellq-gray/20 dark:border-wellq-gray/30 bg-white dark:bg-wellq-dark">
          <div className="flex gap-3">
            {/* FIX: botón tenía onClick faltante — ahora abre mailto con email del contacto */}
            <button
              onClick={handleContactClinic}
              className="flex-1 px-4 py-2.5 bg-wellq-cyan text-wellq-black rounded-lg font-medium hover:bg-wellq-cyan/90 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Mail size={16} /> Contact Clinic
            </button>
          </div>
        </div>
      )}
    </div>
  );
};