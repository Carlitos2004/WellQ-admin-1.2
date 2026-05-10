import React, { useState } from 'react';
import { Filter, Download, Mail, X, Send, Loader2 } from 'lucide-react';
import { SegmentedControl, Skeleton } from '../components/ui';
import { ClinicRow } from '../components/clinics/ClinicRow';
import { ClinicDrawer } from '../components/clinics/ClinicDrawer';
import { API_BASE } from '../api/client';

const HARDCODED_CLINICS = [
  {
    id: '000',
    name: 'Esperando base de datos',
    tier: 'Esperando...',
    status: 'Esperando...',
    patientsUsed: 0,
    patientsLimit: 0,
    healthScore: 0,
    lastLogin: 'Esperando...',
  },
];

// ── Bulk Email Modal ──────────────────────────────────────────────────────────
const BulkEmailModal = ({ onClose, clinicCount }) => {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState(null);

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/notifications', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title:             subject,
          message:           message,
          channel:           'email',
          recipientClinicId: 'all',
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSent(true);
    } catch {
      setError('Error al enviar. Intenta de nuevo.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <h2 className="font-bold text-slate-900">Bulk Email</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Se enviará a {clinicCount} clínica{clinicCount !== 1 ? 's' : ''}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer">
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        {/* Sent state */}
        {sent ? (
          <div className="flex flex-col items-center justify-center py-14 gap-3">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
              <Send size={24} className="text-emerald-600" />
            </div>
            <p className="font-semibold text-slate-900">¡Email enviado!</p>
            <p className="text-sm text-slate-400">La notificación fue encolada correctamente.</p>
            <button
              onClick={onClose}
              className="mt-2 px-5 py-2 bg-slate-100 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Asunto
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Ej: Actualización de plataforma WellQ"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Mensaje
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Escribe el contenido del email..."
                  rows={5}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
                />
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSend}
                disabled={sending || !subject.trim() || !message.trim()}
                className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {sending
                  ? <><Loader2 size={15} className="animate-spin" /> Enviando...</>
                  : <><Send size={15} /> Enviar Email</>
                }
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ── Main View ─────────────────────────────────────────────────────────────────
export const ClinicsView = ({ apiClinics, clinicsLoading, onImpersonate }) => {
  const [filter,         setFilter]         = useState('All');
  const [selected,       setSelected]       = useState(null);
  const [settingsClinic, setSettingsClinic] = useState(null);
  const [invoiceClinic,  setInvoiceClinic]  = useState(null);
  const [bulkOpen,       setBulkOpen]       = useState(false);

  const clinics  = apiClinics.length > 0 ? apiClinics : HARDCODED_CLINICS;
  const filtered = clinics.filter((c) => {
    if (filter === 'All')     return true;
    if (filter === 'Active')  return c.status === 'Active' || c.status === 'active';
    if (filter === 'At Risk') return (c.healthScore ?? 0) < 70 && (c.healthScore ?? 0) > 0;
    return true;
  });

  const closeAll    = () => { setSelected(null); setSettingsClinic(null); setInvoiceClinic(null); };
  const activeDrawer = selected ?? settingsClinic ?? invoiceClinic;

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <SegmentedControl
          options={['All', 'Active', 'At Risk', 'Churned']}
          selected={filter}
          onChange={setFilter}
        />
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer">
            <Filter size={16} /> Filters
          </button>
          <button
            onClick={() =>
              fetch(`${API_BASE}/api/clinics/export?format=csv`)
                .then((r) => r.json())
                .then((d) => window.open(d.download_url))
                .catch(() => {})
            }
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Download size={16} /> Export
          </button>
          <button
            onClick={() => setBulkOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            <Mail size={16} /> Bulk Email
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-100 sticky top-0">
            <tr>
              <th className="py-4 px-4 text-left w-12">
                <input type="checkbox" className="rounded border-slate-300 text-indigo-600" />
              </th>
              {['Clinic', 'Plan', 'Status', 'License Usage', 'Health', 'Last Login', 'Actions'].map((h) => (
                <th key={h} className="py-4 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {clinicsLoading
              ? [...Array(4)].map((_, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    <td colSpan={8} className="py-3 px-4">
                      <Skeleton className="h-8 w-full" />
                    </td>
                  </tr>
                ))
              : filtered.map((clinic) => (
                  <ClinicRow
                    key={clinic.clinic_id ?? clinic.id}
                    clinic={clinic}
                    onSelect={setSelected}
                    selected={
                      selected?.clinic_id === clinic.clinic_id ||
                      selected?.id === clinic.id
                    }
                    onImpersonate={onImpersonate}
                    onSettings={(c) => { closeAll(); setSettingsClinic(c); }}
                    onInvoices={(c) => { closeAll(); setInvoiceClinic(c); }}
                  />
                ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <span className="text-sm text-slate-500">
            Showing {filtered.length > 0 ? '1' : '0'}-{filtered.length} of {filtered.length} clinics
          </span>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-500 hover:bg-white transition-colors disabled:opacity-50" disabled>
              Previous
            </button>
            <button className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium">1</button>
            <button className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 hover:bg-white transition-colors disabled:opacity-50" disabled>
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Drawer — un solo ClinicDrawer inteligente para los tres casos */}
      {activeDrawer && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={closeAll} />
          <ClinicDrawer 
            clinic={activeDrawer} 
            mode={settingsClinic ? 'settings' : invoiceClinic ? 'invoices' : 'overview'} 
            onClose={closeAll} 
          />
        </>
      )}

      {/* Modal — Bulk Email */}
      {bulkOpen && (
        <BulkEmailModal
          onClose={() => setBulkOpen(false)}
          clinicCount={filtered.length}
        />
      )}
    </div>
  );
};