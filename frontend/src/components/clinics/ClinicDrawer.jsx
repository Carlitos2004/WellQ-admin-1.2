import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, CheckCircle, Mail, Settings as SettingsIcon, Receipt, Download } from 'lucide-react';
import { UtilizationBar } from '../ui';
import { apiFetch } from '../../api/client';

export const ClinicDrawer = ({ clinic, mode = 'overview', onClose }) => {
  const [activeTab, setActiveTab] = useState(mode);
  const [subscription, setSubscription] = useState(null);
  const [license, setLicense] = useState(null);
  const [usage, setUsage] = useState(null);
  const [contact, setContact] = useState(null);

  // Sincroniza la pestaña si el modo cambia al hacer clic en otro botón
  useEffect(() => {
    setActiveTab(mode);
  }, [mode]);

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
    <div className="fixed inset-y-0 right-0 w-[420px] bg-white shadow-2xl z-50 transform transition-transform duration-300 border-l border-slate-200 flex flex-col">
      {/* Header & Tabs */}
      <div className="flex-none pt-6 px-6 border-b border-slate-100">
        <div className="flex items-center justify-between mb-6">
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
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'overview' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            Overview
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${activeTab === 'settings' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            <SettingsIcon size={14} /> Settings
          </button>
          <button 
            onClick={() => setActiveTab('invoices')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${activeTab === 'invoices' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            <Receipt size={14} /> Invoices
          </button>
        </div>
      </div>

      {/* Body / Scrollable Content */}
      <div className="flex-1 overflow-auto bg-slate-50/30 p-6">
        
        {/* --- TAB 1: OVERVIEW (Tu código original) --- */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <section>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Contact Information</h3>
              <div className="bg-white border border-slate-100 rounded-xl p-4 space-y-3 shadow-sm">
                <div className="flex justify-between"><span className="text-sm text-slate-500">Decision Maker</span><span className="text-sm font-medium text-slate-900">{contact?.contact_info?.primary_name ?? 'Esperando conexión...'}</span></div>
                <div className="flex justify-between"><span className="text-sm text-slate-500">Email</span><span className="text-sm font-medium text-indigo-600">{contact?.contact_info?.primary_email ?? 'esperando@basededatos.com'}</span></div>
                <div className="flex justify-between"><span className="text-sm text-slate-500">Phone</span><span className="text-sm font-medium text-slate-900">{contact?.contact_info?.primary_phone ?? '000000000'}</span></div>
              </div>
            </section>

            <section>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Subscription Details</h3>
              <div className="bg-white border border-slate-100 rounded-xl p-4 space-y-3 shadow-sm">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Plan</span>
                  <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700">{subscription?.plan_name ?? clinic.tier ?? 'Esperando...'}</span>
                </div>
                <div className="flex justify-between"><span className="text-sm text-slate-500">Contract Value</span><span className="text-sm font-bold text-slate-900">{subscription ? `$${(subscription.mrr_value * 12).toLocaleString()}/yr` : '$0/yr'}</span></div>
              </div>
            </section>

            <section>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Usage Statistics</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-indigo-50/50 rounded-xl p-4 border border-indigo-100">
                  <div className="text-2xl font-bold text-indigo-600">{usage?.patient_sessions_completed?.toLocaleString() ?? '0'}</div>
                  <div className="text-xs text-slate-500 mt-1">Patient Sessions</div>
                </div>
                <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-100">
                  <div className="text-2xl font-bold text-emerald-600">{usage?.active_clinicians?.toLocaleString() ?? '0'}</div>
                  <div className="text-xs text-slate-500 mt-1">Active Clinicians</div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* --- TAB 2: SETTINGS --- */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">Edit Clinic</h3>
              <p className="text-sm text-slate-500 mb-4">Manage core details and status for this tenant.</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Clinic Name</label>
                <input type="text" defaultValue={clinic.name} className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Assigned Plan</label>
                <select defaultValue={clinic.tier} className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                  <option value="Enterprise">Enterprise</option>
                  <option value="Pro">Pro / SMB</option>
                  <option value="Trial">Trial</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Account Status</label>
                <select defaultValue={clinic.status} className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                  <option value="Active">Active</option>
                  <option value="Suspended">Suspended</option>
                  <option value="Churned">Churned</option>
                </select>
              </div>
              <button className="w-full mt-4 px-4 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors cursor-pointer">
                Save Changes
              </button>
            </div>
          </div>
        )}

        {/* --- TAB 3: INVOICES --- */}
        {activeTab === 'invoices' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">Billing History</h3>
              <p className="text-sm text-slate-500 mb-4">Recent invoices and payment status.</p>
            </div>
            
            {/* Mock de facturas (hasta que conectes el endpoint de invoices real) */}
            {[
              { id: 'INV-2026-003', date: 'May 1, 2026', amount: '$499.00', status: 'Paid' },
              { id: 'INV-2026-002', date: 'Apr 1, 2026', amount: '$499.00', status: 'Paid' },
              { id: 'INV-2026-001', date: 'Mar 1, 2026', amount: '$499.00', status: 'Paid' },
            ].map((inv) => (
              <div key={inv.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-indigo-300 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <Receipt size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{inv.amount}</p>
                    <p className="text-xs text-slate-400">{inv.id} • {inv.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-md">
                    {inv.status}
                  </span>
                  <button className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors cursor-pointer opacity-0 group-hover:opacity-100">
                    <Download size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer solo para Overview */}
      {activeTab === 'overview' && (
        <div className="flex-none p-6 border-t border-slate-100 bg-white">
          <div className="flex gap-3">
            <button className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 cursor-pointer">
              <Mail size={16} /> Contact Clinic
            </button>
          </div>
        </div>
      )}
    </div>
  );
};