import React, { useState } from 'react';
import { Filter, Download, Mail, X, Send, Loader2 } from 'lucide-react';
import { SegmentedControl, Skeleton } from '../components/ui';
import { ClinicRow } from '../components/clinics/ClinicRow';
import { ClinicDrawer } from '../components/clinics/ClinicDrawer';
import { API_BASE } from '../api/client';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useLanguage } from '../contexts/LanguageContext';

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

const BulkEmailModal = ({ onClose, clinicCount }) => {
  const { t } = useLanguage();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState(null);

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/notifications', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title:             subject,
          message:           message,
          channel:           'email',
          recipientClinicId: 'all',
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSent(true);
    } catch {
      setError(t('clinics.sendError'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white dark:bg-wellq-dark rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-wellq-gray/20 dark:border-wellq-gray/30">
          <div>
            <h2 className="font-bold text-wellq-dark dark:text-white">{t('clinics.bulkEmail')}</h2>
            <p className="text-xs text-wellq-gray mt-0.5">
              {t('clinics.sendingTo')} {clinicCount} {t('clinics.clinic')}{clinicCount !== 1 ? 's' : ''}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-wellq-gray/10 dark:hover:bg-wellq-dark/50 rounded-lg transition-colors cursor-pointer">
            <X size={18} className="text-wellq-gray" />
          </button>
        </div>
        {sent ? (
          <div className="flex flex-col items-center justify-center py-14 gap-3">
            <div className="w-14 h-14 rounded-full bg-wellq-green/10 flex items-center justify-center">
              <Send size={24} className="text-wellq-green" />
            </div>
            <p className="font-semibold text-wellq-dark dark:text-white">{t('clinics.emailSent')}</p>
            <p className="text-sm text-wellq-gray">{t('clinics.emailQueued')}</p>
            <button
              onClick={onClose}
              className="mt-2 px-5 py-2 bg-wellq-gray/10 dark:bg-wellq-dark/50 rounded-lg text-sm font-medium text-wellq-dark dark:text-white hover:bg-wellq-gray/20 dark:hover:bg-wellq-dark/80 transition-colors cursor-pointer"
            >
              {t('common.close')}
            </button>
          </div>
        ) : (
          <>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-wellq-gray uppercase tracking-wider mb-1.5">{t('clinics.subject')}</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder={t('clinics.subjectPlaceholder')}
                  className="w-full px-4 py-2.5 border border-wellq-gray/30 rounded-xl text-sm text-wellq-dark dark:text-white placeholder-wellq-gray/40 focus:outline-none focus:ring-2 focus:ring-wellq-cyan focus:border-transparent transition-all dark:bg-wellq-dark/50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-wellq-gray uppercase tracking-wider mb-1.5">{t('clinics.message')}</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t('clinics.messagePlaceholder')}
                  rows={5}
                  className="w-full px-4 py-2.5 border border-wellq-gray/30 rounded-xl text-sm text-wellq-dark dark:text-white placeholder-wellq-gray/40 focus:outline-none focus:ring-2 focus:ring-wellq-cyan focus:border-transparent transition-all resize-none dark:bg-wellq-dark/50"
                />
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-wellq-gray/20 dark:border-wellq-gray/30 bg-wellq-gray/5 dark:bg-wellq-dark/50">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-wellq-gray/30 rounded-lg text-sm font-medium text-wellq-dark dark:text-white hover:bg-wellq-gray/10 dark:hover:bg-wellq-dark/40 transition-colors cursor-pointer"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSend}
                disabled={sending || !subject.trim() || !message.trim()}
                className="flex items-center gap-2 px-5 py-2 bg-wellq-cyan text-wellq-black rounded-lg text-sm font-medium hover:bg-wellq-cyan/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {sending
                  ? <><Loader2 size={15} className="animate-spin" /> {t('clinics.sending')}</>
                  : <><Send size={15} /> {t('clinics.sendEmail')}</>
                }
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export const ClinicsView = ({ apiClinics, clinicsLoading, onImpersonate, onRefreshClinics }) => {
  const { t } = useLanguage();

  const [filter,         setFilter]         = useState('All');
  const [selected,       setSelected]       = useState(null);
  const [settingsClinic, setSettingsClinic] = useState(null);
  const [invoiceClinic,  setInvoiceClinic]  = useState(null);
  const [bulkOpen,       setBulkOpen]       = useState(false);
  const [deleteTarget,   setDeleteTarget]   = useState(null);
  const [deleting,       setDeleting]       = useState(false);
  const [checkedIds,     setCheckedIds]     = useState(new Set());

  const clinics  = apiClinics.length > 0 ? apiClinics : HARDCODED_CLINICS;
  const filtered = clinics.filter((c) => {
    if (filter === 'All')     return true;
    if (filter === 'Active')  return c.status === 'Active' || c.status === 'active';
    if (filter === 'At Risk') return (c.healthScore ?? 0) < 70 && (c.healthScore ?? 0) > 0;
    return true;
  });

  const closeAll     = () => { setSelected(null); setSettingsClinic(null); setInvoiceClinic(null); };
  const activeDrawer = selected ?? settingsClinic ?? invoiceClinic;

  const allChecked  = filtered.length > 0 && filtered.every((c) => checkedIds.has(c.clinic_id ?? c.id));
  const someChecked = !allChecked && filtered.some((c) => checkedIds.has(c.clinic_id ?? c.id));

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setCheckedIds(new Set(filtered.map((c) => c.clinic_id ?? c.id)));
    } else {
      setCheckedIds(new Set());
    }
  };

  const handleCheck = (clinic, checked) => {
    const id = clinic.clinic_id ?? clinic.id;
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.clinic_id ?? deleteTarget.id;
    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/api/clinics/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setDeleteTarget(null);
      onRefreshClinics && onRefreshClinics();
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <SegmentedControl
          options={[t('clinics.all'), t('clinics.active'), t('clinics.atRisk'), t('clinics.churned')]}
          selected={filter}
          onChange={setFilter}
        />
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-wellq-gray/30 rounded-lg text-sm font-medium text-wellq-dark dark:text-white hover:bg-wellq-gray/5 dark:hover:bg-wellq-dark/40 transition-colors cursor-pointer">
            <Filter size={16} /> {t('clinics.filters')}
          </button>
          <button
            onClick={() =>
              fetch(`${API_BASE}/api/clinics/export?format=csv`)
                .then((r) => r.json())
                .then((d) => window.open(d.download_url))
                .catch(() => {})
            }
            className="flex items-center gap-2 px-4 py-2 border border-wellq-gray/30 rounded-lg text-sm font-medium text-wellq-dark dark:text-white hover:bg-wellq-gray/5 dark:hover:bg-wellq-dark/40 transition-colors cursor-pointer"
          >
            <Download size={16} /> {t('clinics.export')}
          </button>
          <button
            onClick={() => setBulkOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-wellq-cyan text-wellq-black rounded-lg text-sm font-medium hover:bg-wellq-cyan/80 transition-colors cursor-pointer"
          >
            <Mail size={16} /> {t('clinics.bulkEmail')}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-wellq-dark rounded-2xl shadow-sm border border-wellq-gray/20 dark:border-wellq-gray/30 overflow-hidden">
        <table className="w-full">
          <thead className="bg-wellq-gray/5 dark:bg-wellq-dark/50 border-b border-wellq-gray/20 dark:border-wellq-gray/30 sticky top-0">
            <tr>
              <th className="py-4 px-4 text-left w-12">
                <input
                  type="checkbox"
                  checked={allChecked}
                  ref={(el) => { if (el) el.indeterminate = someChecked; }}
                  onChange={handleSelectAll}
                  className="rounded border-wellq-gray/30 dark:border-wellq-gray/40 text-wellq-cyan cursor-pointer"
                />
              </th>
              {[
                t('clinics.columns.clinic'),
                t('clinics.columns.plan'),
                t('clinics.columns.status'),
                t('clinics.columns.licenseUsage'),
                t('clinics.columns.health'),
                t('clinics.columns.lastLogin'),
                t('clinics.columns.actions'),
              ].map((h) => (
                <th key={h} className="py-4 px-4 text-left text-xs font-semibold text-wellq-gray uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {clinicsLoading
              ? [...Array(4)].map((_, i) => (
                  <tr key={i} className="border-b border-wellq-gray/10 dark:border-wellq-gray/30">
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
                    checked={checkedIds.has(clinic.clinic_id ?? clinic.id)}
                    onCheck={handleCheck}
                    onImpersonate={setSelected}
                    onSettings={(c) => { closeAll(); setSettingsClinic(c); }}
                    onInvoices={(c) => { closeAll(); setInvoiceClinic(c); }}
                    onDelete={setDeleteTarget}
                  />
                ))}
          </tbody>
        </table>

        <div className="flex items-center justify-between px-6 py-4 border-t border-wellq-gray/20 dark:border-wellq-gray/30 bg-wellq-gray/5 dark:bg-wellq-dark/50">
          <span className="text-sm text-wellq-gray">
            {checkedIds.size > 0
              ? `${checkedIds.size} ${t('clinics.selected')}${checkedIds.size !== 1 ? 's' : ''} ${t('clinics.of')} ${filtered.length}`
              : `${t('clinics.showing')} ${filtered.length > 0 ? '1' : '0'}-${filtered.length} ${t('clinics.of')} ${filtered.length} ${t('clinics.clinics')}`
            }
          </span>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 border border-wellq-gray/30 rounded-lg text-sm font-medium text-wellq-gray dark:text-wellq-gray/80 hover:bg-white dark:hover:bg-wellq-dark/40 transition-colors disabled:opacity-50" disabled>
              {t('clinics.previous')}
            </button>
            <button className="px-3 py-1.5 bg-wellq-cyan text-wellq-black rounded-lg text-sm font-medium">1</button>
            <button className="px-3 py-1.5 border border-wellq-gray/30 rounded-lg text-sm font-medium text-wellq-dark dark:text-white hover:bg-white dark:hover:bg-wellq-dark/40 transition-colors disabled:opacity-50" disabled>
              {t('clinics.next')}
            </button>
          </div>
        </div>
      </div>

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

      {bulkOpen && (
        <BulkEmailModal
          onClose={() => setBulkOpen(false)}
          clinicCount={filtered.length}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title={t('clinics.deleteTitle')}
        message={`${t('clinics.deleteMessage')} "${deleteTarget?.name}"? ${t('clinics.deleteWarning')}`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};