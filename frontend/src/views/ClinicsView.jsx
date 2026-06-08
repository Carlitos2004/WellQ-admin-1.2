import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import ExcelJS from 'exceljs';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Filter, Download, Mail, X, Send, Loader2,
  Building2, Activity, TrendingDown, Users,
  ChevronLeft, ChevronRight, Plus, Trash2
} from 'lucide-react';
import { Skeleton } from '../components/ui';
import { ClinicRow }        from '../components/clinics/ClinicRow';
import { ClinicDrawer }     from '../components/clinics/ClinicDrawer';
import { ImpersonateModal } from '../components/clinics/ImpersonateModal'; // ← NUEVO
import { API_BASE, apiFetch } from '../api/client';
import { useLanguage } from '../contexts/LanguageContext';

// ─── Animaciones ─────────────────────────────────────────────────────────────
const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

// ─── Datos de placeholder ─────────────────────────────────────────────────────
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

// ─── BulkEmailModal ───────────────────────────────────────────────────────────
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
      await apiFetch('/api/notifications', {
        method:  'POST',
        body: JSON.stringify({
          title:             subject,
          message:           message,
          channel:           'email',
          recipientClinicId: 'all',
        }),
      });
      setSent(true);
    } catch (err) {
      if (err.status === 403) return; // Si es 403, SweetAlert se encarga, no muestra error genérico
      setError(t('clinics.sendError'));
    } finally {
      setSending(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <motion.div
          className="absolute inset-0 bg-[#06090E]/80 backdrop-blur-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />
        <motion.div
          className="relative z-10 bg-white dark:bg-wellq-dark rounded-[24px] shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden border border-wellq-gray/15 dark:border-white/10"
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1,    y: 0  }}
          exit={{   opacity: 0, scale: 0.96, y: 10  }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-wellq-cyan/8 to-transparent pointer-events-none" />

          <div className="relative flex items-center justify-between px-6 py-5 border-b border-wellq-gray/10 dark:border-white/5 bg-wellq-gray/3 dark:bg-white/[0.02] shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-wellq-cyan to-wellq-blue flex items-center justify-center shadow-md shadow-wellq-cyan/20">
                <Mail size={16} className="text-wellq-black" strokeWidth={2.2} />
              </div>
              <div>
                <h2 className="font-bold text-wellq-dark dark:text-white text-sm leading-tight">{t('clinics.bulkEmail')}</h2>
                <p className="text-xs font-medium text-wellq-gray mt-0.5">
                  {t('clinics.sendingTo')} <span className="font-black text-wellq-cyan">{clinicCount}</span> {t('clinics.clinic')}{clinicCount !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-wellq-gray/8 dark:hover:bg-white/8 rounded-xl transition-colors cursor-pointer">
              <X size={17} className="text-wellq-gray" strokeWidth={2.5} />
            </button>
          </div>

          {sent ? (
            <div className="flex flex-col items-center justify-center py-14 gap-3">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="w-16 h-16 rounded-full bg-wellq-green/10 border border-wellq-green/20 flex items-center justify-center"
              >
                <Send size={28} className="text-wellq-green" />
              </motion.div>
              <p className="font-bold text-wellq-dark dark:text-white">{t('clinics.emailSent')}</p>
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
              <div className="flex-1 overflow-y-auto p-6 space-y-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-wellq-gray/20 dark:[&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full">
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

              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-wellq-gray/20 dark:border-wellq-gray/30 bg-wellq-gray/5 dark:bg-wellq-dark/50 shrink-0">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-wellq-gray/30 rounded-lg text-sm font-medium text-wellq-dark dark:text-white hover:bg-wellq-gray/10 dark:hover:bg-wellq-dark/40 transition-colors cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleSend}
                  disabled={sending || !subject.trim() || !message.trim()}
                  className="flex items-center gap-2 px-5 py-2 bg-wellq-cyan text-wellq-black rounded-lg text-sm font-medium hover:bg-wellq-cyan/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm shadow-wellq-cyan/20"
                >
                  {sending
                    ? <><Loader2 size={15} className="animate-spin" /> {t('clinics.sending')}</>
                    : <><Send size={15} /> {t('clinics.sendEmail')}</>
                  }
                </button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

// ─── DeleteClinicModal ────────────────────────────────────────────────────────
const DeleteClinicModal = ({ clinic, onClose, onConfirm, deleting }) => {
  if (!clinic) return null;

  const isChurned = (clinic.status || '').toLowerCase() === 'churned';

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <motion.div
          className="absolute inset-0 bg-[#06090E]/80 backdrop-blur-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={!deleting ? onClose : undefined}
        />
        <motion.div
          className={`relative z-10 bg-white dark:bg-wellq-dark rounded-[24px] shadow-2xl w-full max-w-md flex flex-col overflow-hidden border ${isChurned ? 'border-red-500/40 dark:border-red-500/40' : 'border-red-500/20 dark:border-red-500/20'}`}
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          <div className={`absolute top-0 left-0 right-0 h-24 pointer-events-none bg-gradient-to-b ${isChurned ? 'from-red-500/20' : 'from-amber-500/10 dark:from-red-500/10'} to-transparent`} />

          <div className="relative p-8 text-center space-y-4">
            <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center mx-auto mb-4 shadow-sm ${isChurned ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30' : 'bg-amber-50 dark:bg-red-500/10 border-amber-200 dark:border-red-500/20'}`}>
              <Trash2 size={28} className={isChurned ? "text-red-500" : "text-amber-500 dark:text-red-500"} strokeWidth={2.2} />
            </div>
            <h2 className="font-bold text-wellq-dark dark:text-white text-xl">
              {isChurned ? '¿Eliminar Permanentemente?' : '¿Dar de baja Clínica?'}
            </h2>
            <p className="text-sm text-wellq-gray px-2 leading-relaxed">
              {isChurned ? (
                <>Estás a punto de borrar <strong>{clinic.name}</strong> de forma permanente. Esta acción purgará la base de datos y es absolutamente irreversible.</>
              ) : (
                <>Estás a punto de dar de baja a <strong>{clinic.name}</strong>. Sus accesos serán suspendidos y pasará a la pestaña de "Churned".</>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3 px-6 py-5 border-t border-wellq-gray/10 dark:border-white/5 bg-wellq-gray/3 dark:bg-white/[0.02]">
            <button
              onClick={onClose}
              disabled={deleting}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-wellq-dark dark:text-white bg-white dark:bg-white/5 border border-wellq-gray/20 dark:border-white/10 hover:bg-wellq-gray/5 dark:hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              disabled={deleting}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-white rounded-xl text-sm font-bold transition-colors cursor-pointer disabled:opacity-50 shadow-sm ${isChurned ? 'bg-red-600 hover:bg-red-700 shadow-red-500/30' : 'bg-red-500 hover:bg-red-600 shadow-red-500/20'}`}
            >
              {deleting ? <><Loader2 size={16} className="animate-spin" /> Procesando...</> : (isChurned ? 'Purgar Datos' : 'Mover a Churned')}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

// ─── CreateClinicModal ────────────────────────────────────────────────────────
const CreateClinicModal = ({ onClose, onSuccess }) => {
  const [step,     setStep]     = useState(0);
  const [creating, setCreating] = useState(false);
  const [created,  setCreated]  = useState(false);
  const [error,    setError]    = useState(null);

  const [form, setForm] = useState({
    name:           '',
    tier:           'smb',
    patients_limit: '500',
    mrr:            '0',
    location:       '',
    contact_name:   '',
    contact_email:  '',
    contact_phone:  '',
    company_name:   '',
    tax_id:         '',
    billing_email:  '',
    address:        '',
    internal_notes: '',
  });

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleStrictNumberKeyDown = (e) => {
    if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) return;
    if (!/^[0-9]$/.test(e.key)) e.preventDefault();
  };

  const handleFloatKeyDown = (e) => {
    if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) return;
    if (!/^[0-9.]$/.test(e.key)) e.preventDefault();
  };

  const handleRutKeyDown = (e) => {
    if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) return;
    if (!/^[0-9kK-]$/.test(e.key)) e.preventDefault();
  };

  const handlePhoneKeyDown = (e) => {
    if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) return;
    if (!/^[0-9 +]$/.test(e.key)) e.preventDefault();
  };

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      await apiFetch('/api/clinics', {
        method:  'POST',
        body: JSON.stringify({
          name:           form.name.trim(),
          tier:           form.tier,
          status:         'active',
          patients_limit: parseInt(form.patients_limit) || 500,
          mrr:            parseFloat(form.mrr) || 0,
          location:       form.location       || null,
          contact_name:   form.contact_name   || null,
          contact_email:  form.contact_email  || null,
          contact_phone:  form.contact_phone  || null,
          company_name:   form.company_name   || null,
          tax_id:         form.tax_id         || null,
          billing_email:  form.billing_email  || null,
          address:        form.address        || null,
          internal_notes: form.internal_notes || null,
        }),
      });
      setCreated(true);
      onSuccess?.();
    } catch (err) {
      if (err.status === 403) return;
      setError('Error al crear la clínica. Verifica los datos e intenta de nuevo.');
    } finally {
      setCreating(false);
    }
  };

  const inputCls = "w-full px-4 py-2.5 border border-wellq-gray/30 rounded-xl text-sm text-wellq-dark dark:text-white placeholder-wellq-gray/40 focus:outline-none focus:ring-2 focus:ring-wellq-cyan focus:border-transparent transition-all dark:bg-wellq-dark/50";
  const labelCls = "block text-xs font-semibold text-wellq-gray uppercase tracking-wider mb-1.5";

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <motion.div
          className="absolute inset-0 bg-[#06090E]/80 backdrop-blur-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />
        <motion.div
          className="relative z-10 bg-white dark:bg-wellq-dark rounded-[24px] shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden border border-wellq-gray/15 dark:border-white/10"
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1,    y: 0  }}
          exit={{   opacity: 0, scale: 0.96, y: 10  }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-wellq-cyan/10 to-transparent pointer-events-none" />

          <div className="relative flex items-center justify-between px-6 py-5 border-b border-wellq-gray/10 dark:border-white/5 bg-wellq-gray/3 dark:bg-white/[0.02] shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-wellq-cyan to-wellq-blue flex items-center justify-center shadow-md shadow-wellq-cyan/20">
                <Plus size={16} className="text-wellq-black" strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="font-bold text-wellq-dark dark:text-white text-sm leading-tight">Nueva Clínica</h2>
                <p className="text-xs font-medium text-wellq-gray mt-0.5">Registra una nueva clínica en WellQ</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-wellq-gray/8 dark:hover:bg-white/8 rounded-xl transition-colors cursor-pointer">
              <X size={17} className="text-wellq-gray" strokeWidth={2.5} />
            </button>
          </div>

          {created ? (
            <div className="flex flex-col items-center justify-center py-14 gap-3 flex-1 overflow-y-auto">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="w-16 h-16 rounded-full bg-wellq-green/10 border border-wellq-green/20 flex items-center justify-center"
              >
                <Building2 size={28} className="text-wellq-green" />
              </motion.div>
              <p className="font-bold text-wellq-dark dark:text-white">¡Clínica creada!</p>
              <p className="text-sm text-wellq-gray text-center px-8">
                <span className="font-semibold text-wellq-dark dark:text-white">{form.name}</span> ha sido registrada y está activa.
              </p>
              <button
                onClick={onClose}
                className="mt-2 px-5 py-2 bg-wellq-gray/10 dark:bg-wellq-dark/50 rounded-lg text-sm font-medium text-wellq-dark dark:text-white hover:bg-wellq-gray/20 dark:hover:bg-wellq-dark/80 transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          ) : (
            <>
              <div className="flex gap-2 px-6 pt-5 pb-1 shrink-0">
                {['Básico', 'Contacto', 'Billing'].map((s, i) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStep(i)}
                    className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                      i === step
                        ? 'bg-wellq-cyan text-wellq-black'
                        : 'bg-wellq-gray/8 dark:bg-white/5 text-wellq-gray hover:bg-wellq-cyan/15 hover:text-wellq-cyan'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-wellq-gray/20 dark:[&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full">
                {step === 0 && (
                  <div className="p-6 space-y-4">
                    <div>
                      <label className={labelCls}>
                        Nombre de la Clínica <span className="text-red-400 normal-case">*</span>
                      </label>
                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) => update('name', e.target.value)}
                        placeholder="Ej: Clínica San Rafael"
                        className={inputCls}
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Plan</label>
                      <select
                        value={form.tier}
                        onChange={(e) => update('tier', e.target.value)}
                        className={inputCls}
                      >
                        <option value="trial">Trial</option>
                        <option value="smb">SMB</option>
                        <option value="enterprise">Enterprise</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>Límite Pacientes</label>
                        <input
                          type="number"
                          min="0"
                          value={form.patients_limit}
                          onKeyDown={handleStrictNumberKeyDown}
                          onChange={(e) => update('patients_limit', e.target.value.replace(/^0+(?=\d)/, ''))}
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>MRR (USD)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={form.mrr}
                          onKeyDown={handleFloatKeyDown}
                          onChange={(e) => update('mrr', e.target.value.replace(/^0+(?=\d)/, ''))}
                          className={inputCls}
                        />
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>Ubicación</label>
                      <input
                        type="text"
                        value={form.location}
                        onChange={(e) => update('location', e.target.value)}
                        placeholder="Ej: Santiago, Chile"
                        className={inputCls}
                      />
                    </div>
                  </div>
                )}

                {step === 1 && (
                  <div className="p-6 space-y-4">
                    <div>
                      <label className={labelCls}>Nombre de Contacto</label>
                      <input
                        type="text"
                        value={form.contact_name}
                        onChange={(e) => update('contact_name', e.target.value)}
                        placeholder="Ej: Ana Martínez"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Email de Contacto</label>
                      <input
                        type="email"
                        value={form.contact_email}
                        onChange={(e) => update('contact_email', e.target.value)}
                        placeholder="admin@clinica.com"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Teléfono</label>
                      <input
                        type="tel"
                        value={form.contact_phone}
                        onKeyDown={handlePhoneKeyDown}
                        onChange={(e) => update('contact_phone', e.target.value)}
                        placeholder="+56 9 XXXX XXXX"
                        className={inputCls}
                      />
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="p-6 space-y-4">
                    <div>
                      <label className={labelCls}>Razón Social</label>
                      <input
                        type="text"
                        value={form.company_name}
                        onChange={(e) => update('company_name', e.target.value)}
                        placeholder="Ej: Clínica San Rafael SpA"
                        className={inputCls}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>RUT / Tax ID</label>
                        <input
                          type="text"
                          value={form.tax_id}
                          onKeyDown={handleRutKeyDown}
                          onChange={(e) => update('tax_id', e.target.value)}
                          placeholder="76.XXX.XXX-K"
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Email Facturación</label>
                        <input
                          type="email"
                          value={form.billing_email}
                          onChange={(e) => update('billing_email', e.target.value)}
                          placeholder="facturas@clinica.com"
                          className={inputCls}
                        />
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>Dirección</label>
                      <input
                        type="text"
                        value={form.address}
                        onChange={(e) => update('address', e.target.value)}
                        placeholder="Av. Principal 123, Ciudad"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Notas Internas</label>
                      <textarea
                        value={form.internal_notes}
                        onChange={(e) => update('internal_notes', e.target.value)}
                        placeholder="Notas privadas del equipo WellQ..."
                        rows={3}
                        className={`${inputCls} resize-none`}
                      />
                    </div>
                  </div>
                )}

                {error && (
                  <p className="text-xs text-red-500 px-6 pb-4">{error}</p>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-wellq-gray/10 dark:border-white/5 bg-wellq-gray/3 dark:bg-white/[0.02] shrink-0">
                <button
                  onClick={step > 0 ? () => setStep((s) => s - 1) : onClose}
                  className="px-4 py-2 border border-wellq-gray/30 rounded-lg text-sm font-medium text-wellq-dark dark:text-white hover:bg-wellq-gray/10 dark:hover:bg-wellq-dark/40 transition-colors cursor-pointer"
                >
                  {step > 0 ? '← Anterior' : 'Cancelar'}
                </button>

                {step < 2 ? (
                  <button
                    onClick={() => setStep((s) => s + 1)}
                    disabled={step === 0 && !form.name.trim()}
                    className="flex items-center gap-2 px-5 py-2 bg-wellq-cyan text-wellq-black rounded-lg text-sm font-medium hover:bg-wellq-cyan/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm shadow-wellq-cyan/20"
                  >
                    Siguiente →
                  </button>
                ) : (
                  <button
                    onClick={handleCreate}
                    disabled={creating || !form.name.trim()}
                    className="flex items-center gap-2 px-5 py-2 bg-wellq-cyan text-wellq-black rounded-lg text-sm font-medium hover:bg-wellq-cyan/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm shadow-wellq-cyan/20"
                  >
                    {creating
                      ? <><Loader2 size={15} className="animate-spin" /> Creando...</>
                      : <><Building2 size={15} /> Crear Clínica</>
                    }
                  </button>
                )}
              </div>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

// ─── KPI Summary Cards ────────────────────────────────────────────────────────
const KpiCard = ({ icon: Icon, label, value, colorClass, bgClass, borderClass, ringClass, barGradient, glowClass, pct }) => (
  <div className={`relative rounded-2xl border ${borderClass} bg-white dark:bg-wellq-dark p-5 overflow-hidden group transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5`}>
    <div className={`absolute top-0 left-0 right-0 h-20 bg-gradient-to-b ${glowClass ?? 'from-transparent'} to-transparent opacity-60 pointer-events-none`} />
    <div className="relative flex items-start justify-between mb-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bgClass} ring-1 ${ringClass} shadow-sm transition-transform duration-200 group-hover:scale-105`}>
        <Icon size={17} className={colorClass} strokeWidth={2.2} />
      </div>
      <span className="text-[10px] font-bold bg-black/5 dark:bg-white/5 text-wellq-gray px-2.5 py-1 rounded-lg tracking-wider uppercase">Live</span>
    </div>
    <div className="relative">
      <p className="text-xs font-bold text-wellq-gray uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-3xl font-black ${colorClass} leading-none tabular-nums tracking-tight`}>{value}</p>
    </div>
    <div className="mt-4 h-1 bg-black/[0.05] dark:bg-white/[0.05] rounded-full overflow-hidden">
      <motion.div
        className={`h-full bg-gradient-to-r ${barGradient} rounded-full`}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.15 }}
      />
    </div>
  </div>
);

// ─── ClinicsView Principal ────────────────────────────────────────────────────
export const ClinicsView = ({ apiClinics, clinicsLoading, onImpersonate, onRefreshClinics }) => {
  const { t } = useLanguage();

  const [filter,         setFilter]         = useState('all');
  const [filterOpen,     setFilterOpen]     = useState(false);
  const [filterTier,     setFilterTier]     = useState('');
  const [filterStatus,   setFilterStatus]   = useState('');
  const filterRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const [selected,         setSelected]         = useState(null);
  const [settingsClinic,   setSettingsClinic]   = useState(null);
  const [invoiceClinic,    setInvoiceClinic]    = useState(null);
  const [impersonateTarget, setImpersonateTarget] = useState(null); // ← NUEVO

  const [bulkOpen,       setBulkOpen]       = useState(false);
  const [createOpen,     setCreateOpen]     = useState(false);

  const [deleteTarget,   setDeleteTarget]   = useState(null);
  const [exportState,    setExportState]    = useState('idle');
  const [deleting,       setDeleting]       = useState(false);

  const clinics  = apiClinics.length > 0 ? apiClinics : HARDCODED_CLINICS;
  const filtered = clinics.filter((c) => {
    if (filter === 'active'  && !(c.status === 'Active'  || c.status === 'active'))  return false;
    if (filter === 'at_risk' && !((c.healthScore ?? 0) < 70 && (c.healthScore ?? 0) > 0)) return false;
    if (filter === 'churned' && !(c.status === 'churned' || c.status === 'Churned')) return false;
    if (filterTier   && c.tier   !== filterTier)   return false;
    if (filterStatus && c.status !== filterStatus) return false;
    return true;
  });

  const closeAll     = () => { setSelected(null); setSettingsClinic(null); setInvoiceClinic(null); };
  const activeDrawer = selected ?? settingsClinic ?? invoiceClinic;

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.clinic_id ?? deleteTarget.id;
    setDeleting(true);
    try {
      await apiFetch(`/api/clinics/${id}`, { method: 'DELETE' });
      setDeleteTarget(null);
      onRefreshClinics && onRefreshClinics(filter === 'churned' ? { status: 'churned' } : {});
    } catch (err) {
      if (err.status === 403) {
        setDeleteTarget(null);
        return;
      }
      console.error('Delete error:', err);
    } finally {
      setDeleting(false);
    }
  };

  const totalClinics  = clinics.length;
  const activeClinics = clinics.filter((c) => c.status === 'Active' || c.status === 'active').length;
  const atRiskClinics = clinics.filter((c) => (c.healthScore ?? 0) < 70 && (c.healthScore ?? 0) > 0).length;
  const totalPatients = clinics.reduce((acc, c) => acc + (c.patientsUsed ?? c.patient_count ?? 0), 0);

  const handleExportExcel = async () => {
    if (!filtered.length) return;
    setExportState('loading');

    try {
      const date = new Date().toISOString().split('T')[0];

      const C = {
        darkBg:   '0B1017', darkMid:  '1A2535', cyan:     '16F8F9', white:    'FFFFFF',
        green:    '10B981', greenBg:  'ECFDF5', amber:    'F59E0B', amberBg:  'FFFBEB',
        red:      'EF4444', redBg:    'FEF2F2', blue:     '3B82F6', blueBg:   'EFF6FF',
        rowAlt:   'F8FAFC', rowWhite: 'FFFFFF', textDark: '0F172A', textGray: '64748B',
        border:   'E2E8F0',
      };

      const colHeaderStyle = {
        font:      { bold: true, color: { argb: `FF${C.white}` }, size: 10 },
        fill:      { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${C.darkBg}` } },
        alignment: { vertical: 'middle', horizontal: 'center' },
        border: {
          bottom: { style: 'medium', color: { argb: `FF${C.cyan}` } },
          top:    { style: 'thin',   color: { argb: `FF${C.darkMid}` } },
          left:   { style: 'thin',   color: { argb: `FF${C.darkMid}` } },
          right:  { style: 'thin',   color: { argb: `FF${C.darkMid}` } },
        },
      };

      const cellStyle = (isAlt = false) => ({
        font:      { size: 10, color: { argb: `FF${C.textDark}` } },
        fill:      { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${isAlt ? C.rowAlt : C.rowWhite}` } },
        alignment: { vertical: 'middle', horizontal: 'left' },
        border: {
          bottom: { style: 'thin', color: { argb: `FF${C.border}` } },
          top:    { style: 'thin', color: { argb: `FF${C.border}` } },
          left:   { style: 'thin', color: { argb: `FF${C.border}` } },
          right:  { style: 'thin', color: { argb: `FF${C.border}` } },
        },
      });

      const statusStyle = (statusRaw) => {
        const s = (statusRaw ?? '').toLowerCase();
        const map = {
          active:   { fg: C.green, bg: C.greenBg },
          warning:  { fg: C.amber, bg: C.amberBg },
          critical: { fg: C.red,   bg: C.redBg   },
          churned:  { fg: C.red,   bg: C.redBg   },
        };
        const { fg, bg } = map[s] ?? { fg: C.textGray, bg: C.rowAlt };
        return {
          font:      { bold: true, color: { argb: `FF${fg}` }, size: 10 },
          fill:      { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${bg}` } },
          alignment: { vertical: 'middle', horizontal: 'center' },
          border: {
            bottom: { style: 'thin', color: { argb: `FF${fg}` } },
            top:    { style: 'thin', color: { argb: `FF${fg}` } },
            left:   { style: 'thin', color: { argb: `FF${fg}` } },
            right:  { style: 'thin', color: { argb: `FF${fg}` } },
          },
        };
      };

      const tierStyle = (tierRaw) => {
        const t = (tierRaw ?? '').toLowerCase();
        const map = {
          enterprise: { fg: C.blue,  bg: C.blueBg  },
          pro:        { fg: C.cyan,  bg: 'E0FFFE'  },
          smb:        { fg: C.cyan,  bg: 'E0FFFE'  },
          trial:      { fg: C.amber, bg: C.amberBg },
        };
        const { fg, bg } = map[t] ?? { fg: C.textGray, bg: C.rowAlt };
        return {
          font:      { bold: true, color: { argb: `FF${fg}` }, size: 10 },
          fill:      { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${bg}` } },
          alignment: { vertical: 'middle', horizontal: 'center' },
          border: {
            bottom: { style: 'thin', color: { argb: `FF${fg}` } },
            top:    { style: 'thin', color: { argb: `FF${fg}` } },
            left:   { style: 'thin', color: { argb: `FF${fg}` } },
            right:  { style: 'thin', color: { argb: `FF${fg}` } },
          },
        };
      };

      const healthStyle = (score) => {
        const n = score ?? 0;
        const fg = n >= 70 ? C.green : n > 0 ? C.amber : C.red;
        const bg = n >= 70 ? C.greenBg : n > 0 ? C.amberBg : C.redBg;
        return {
          font:      { bold: true, color: { argb: `FF${fg}` }, size: 10 },
          fill:      { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${bg}` } },
          alignment: { vertical: 'middle', horizontal: 'center' },
          border: {
            bottom: { style: 'thin', color: { argb: `FF${C.border}` } },
            top:    { style: 'thin', color: { argb: `FF${C.border}` } },
            left:   { style: 'thin', color: { argb: `FF${C.border}` } },
            right:  { style: 'thin', color: { argb: `FF${C.border}` } },
          },
        };
      };

      const sheetTitleStyle = (accentColor = C.cyan) => ({
        font:      { bold: true, color: { argb: `FF${accentColor}` }, size: 13 },
        fill:      { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${C.darkBg}` } },
        alignment: { vertical: 'middle', horizontal: 'left' },
      });

      const sectionHeaderStyle = (accentColor = C.cyan) => ({
        font:      { bold: true, color: { argb: `FF${accentColor}` }, size: 10 },
        fill:      { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${C.darkMid}` } },
        alignment: { vertical: 'middle', horizontal: 'left' },
      });

      const summaryKeyStyle = (isAlt = false) => ({
        font:      { bold: true, size: 10, color: { argb: `FF${C.textDark}` } },
        fill:      { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${isAlt ? C.rowAlt : C.rowWhite}` } },
        alignment: { vertical: 'middle', horizontal: 'left' },
        border: {
          bottom: { style: 'thin', color: { argb: `FF${C.border}` } },
          top:    { style: 'thin', color: { argb: `FF${C.border}` } },
          left:   { style: 'thin', color: { argb: `FF${C.border}` } },
          right:  { style: 'thin', color: { argb: `FF${C.border}` } },
        },
      });

      const summaryValStyle = (isAlt = false, accentColor = null) => ({
        font:      { bold: !!accentColor, size: 10, color: { argb: `FF${accentColor ?? C.textGray}` } },
        fill:      { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${isAlt ? C.rowAlt : C.rowWhite}` } },
        alignment: { vertical: 'middle', horizontal: 'right' },
        border: {
          bottom: { style: 'thin', color: { argb: `FF${C.border}` } },
          top:    { style: 'thin', color: { argb: `FF${C.border}` } },
          left:   { style: 'thin', color: { argb: `FF${C.border}` } },
          right:  { style: 'thin', color: { argb: `FF${C.border}` } },
        },
      });

      const COLS = [
        { header: 'ID',               key: 'id',        width: 20 },
        { header: 'Nombre Clínica',   key: 'name',      width: 32 },
        { header: 'Plan',             key: 'tier',      width: 16 },
        { header: 'Estado',           key: 'status',    width: 16 },
        { header: 'Pacientes Usados', key: 'used',      width: 20 },
        { header: 'Límite Pacientes', key: 'limit',     width: 20 },
        { header: 'Health Score',     key: 'health',    width: 16 },
        { header: 'Último Login',     key: 'lastLogin', width: 24 },
      ];

      const buildClinicSheet = (wb, sheetName, list, accentColor = C.cyan) => {
        const ws = wb.addWorksheet(sheetName, { views: [{ state: 'frozen', ySplit: 3 }] });
        ws.columns = COLS;

        ws.mergeCells(1, 1, 1, COLS.length);
        const titleCell = ws.getCell(1, 1);
        titleCell.value = `WellQ · Clínicas — ${sheetName.toUpperCase()}  |  Exportado ${date}`;
        Object.assign(titleCell, sheetTitleStyle(accentColor));
        ws.getRow(1).height = 28;

        ws.getRow(2).height = 5;
        for (let c = 1; c <= COLS.length; c++) {
          ws.getCell(2, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${C.darkMid}` } };
        }

        const headerRow = ws.getRow(3);
        COLS.forEach((col, idx) => {
          const cell = headerRow.getCell(idx + 1);
          cell.value = col.header;
          Object.assign(cell, colHeaderStyle);
        });
        headerRow.height = 22;

        if (!list.length) {
          const emptyRow = ws.addRow(['Sin registros para esta categoría']);
          ws.mergeCells(emptyRow.number, 1, emptyRow.number, COLS.length);
          const ec = emptyRow.getCell(1);
          ec.font      = { italic: true, color: { argb: `FF${C.textGray}` }, size: 10 };
          ec.alignment = { horizontal: 'center', vertical: 'middle' };
          emptyRow.height = 20;
        } else {
          list.forEach((clinic, i) => {
            const isAlt     = i % 2 === 1;
            const statusRaw = clinic.status ?? '';
            const tierRaw   = clinic.tier   ?? '';
            const healthNum = clinic.healthScore ?? 0;
            const used      = clinic.patientsUsed ?? clinic.patient_count ?? 0;
            const limit     = clinic.patientsLimit ?? '—';

            const row = ws.addRow({
              id:        clinic.clinic_id ?? clinic.id ?? '—',
              name:      clinic.name ?? '—',
              tier:      tierRaw.toUpperCase() || '—',
              status:    statusRaw,
              used,
              limit,
              health:    healthNum > 0 ? `${healthNum}%` : '—',
              lastLogin: clinic.lastLogin ?? '—',
            });
            row.height = 20;

            row.eachCell({ includeEmpty: true }, (cell) => {
              Object.assign(cell, cellStyle(isAlt));
            });

            Object.assign(row.getCell('status'), statusStyle(statusRaw));
            Object.assign(row.getCell('tier'),   tierStyle(tierRaw));
            Object.assign(row.getCell('health'), healthStyle(healthNum));

            ['used', 'limit'].forEach((key) => {
              const c = row.getCell(key);
              c.alignment = { horizontal: 'right', vertical: 'middle' };
              c.font      = { bold: true, size: 10, color: { argb: `FF${C.textDark}` } };
            });
          });
        }
        ws.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: COLS.length } };
      };

      const wb = new ExcelJS.Workbook();
      wb.creator  = 'WellQ Admin';
      wb.created  = new Date();
      wb.modified = new Date();

      const wsSummary = wb.addWorksheet('General', { views: [{ state: 'frozen', ySplit: 2 }] });
      wsSummary.columns = [{ key: 'metrica', width: 36 }, { key: 'valor',   width: 36 }];

      wsSummary.mergeCells('A1:B1');
      const genTitle = wsSummary.getCell('A1');
      genTitle.value = `WellQ · Resumen General de Clínicas  |  ${date}`;
      Object.assign(genTitle, sheetTitleStyle(C.cyan));
      wsSummary.getRow(1).height = 28;

      wsSummary.getRow(2).height = 5;
      ['A2', 'B2'].forEach((addr) => {
        wsSummary.getCell(addr).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${C.darkMid}` } };
      });

      const activeClinicsExp  = filtered.filter((c) => (c.status ?? '').toLowerCase() === 'active').length;
      const atRiskClinicsExp  = filtered.filter((c) => (c.healthScore ?? 0) < 70 && (c.healthScore ?? 0) > 0).length;
      const churnedClinicsExp = filtered.filter((c) => (c.status ?? '').toLowerCase() === 'churned').length;
      const totalPatientsExp  = filtered.reduce((acc, c) => acc + (c.patientsUsed ?? c.patient_count ?? 0), 0);
      const avgHealthExp      = filtered.length
        ? Math.round(filtered.reduce((acc, c) => acc + (c.healthScore ?? 0), 0) / filtered.length)
        : 0;

      const summaryData = [
        { type: 'header',    metrica: '◆  RESUMEN DE EXPORTACIÓN',  accent: C.cyan  },
        { type: 'data',      metrica: 'Fecha de Exportación',        valor: new Date().toLocaleString('es-CL', { dateStyle: 'long', timeStyle: 'short' }) },
        { type: 'data',      metrica: 'Filtro Tab Activo',           valor: filter === 'all' ? 'Todas' : filter === 'active' ? 'Activas' : filter === 'at_risk' ? 'En Riesgo' : 'Churned' },
        { type: 'data',      metrica: 'Filtro Tier',                 valor: filterTier   || 'Sin filtro' },
        { type: 'data',      metrica: 'Filtro Estado',               valor: filterStatus || 'Sin filtro' },
        { type: 'spacer' },
        { type: 'header',    metrica: '◆  KPIs DE CLÍNICAS',         accent: C.cyan  },
        { type: 'data',      metrica: 'Total Clínicas Exportadas',   valor: filtered.length              },
        { type: 'dataGreen', metrica: 'Clínicas Activas',            valor: activeClinicsExp             },
        { type: 'dataAmber', metrica: 'Clínicas En Riesgo',          valor: atRiskClinicsExp             },
        { type: 'dataRed',   metrica: 'Clínicas Churned',            valor: churnedClinicsExp            },
        { type: 'spacer' },
        { type: 'header',    metrica: '◆  MÉTRICAS DE USO',          accent: C.cyan  },
        { type: 'dataCyan',  metrica: 'Total Pacientes Activos',     valor: totalPatientsExp.toLocaleString('es-CL') },
        { type: 'dataCyan',  metrica: 'Health Score Promedio',       valor: avgHealthExp > 0 ? `${avgHealthExp}%` : '—' },
      ];

      let dataRowIdx = 0;
      summaryData.forEach((item) => {
        if (item.type === 'spacer') {
          const r = wsSummary.addRow({ metrica: '', valor: '' });
          r.height = 8;
          return;
        }
        if (item.type === 'header') {
          const r = wsSummary.addRow({ metrica: item.metrica, valor: '' });
          wsSummary.mergeCells(`A${r.number}:B${r.number}`);
          Object.assign(r.getCell(1), sectionHeaderStyle(item.accent ?? C.cyan));
          r.height = 20;
          dataRowIdx = 0;
          return;
        }
        const isAlt = dataRowIdx % 2 === 1;
        dataRowIdx++;
        const accentColor = item.type === 'dataGreen' ? C.green
                          : item.type === 'dataAmber' ? C.amber
                          : item.type === 'dataRed'   ? C.red
                          : item.type === 'dataCyan'  ? C.cyan
                          : null;
        const r = wsSummary.addRow({ metrica: item.metrica, valor: item.valor });
        r.height = 20;
        Object.assign(r.getCell(1), summaryKeyStyle(isAlt));
        Object.assign(r.getCell(2), summaryValStyle(isAlt, accentColor));
      });

      buildClinicSheet(wb, 'Todas',     filtered, C.cyan);
      buildClinicSheet(wb, 'Activas',   filtered.filter((c) => (c.status ?? '').toLowerCase() === 'active'),  C.green);
      buildClinicSheet(wb, 'En Riesgo', filtered.filter((c) => (c.healthScore ?? 0) < 70 && (c.healthScore ?? 0) > 0), C.amber);
      buildClinicSheet(wb, 'Churned',   filtered.filter((c) => (c.status ?? '').toLowerCase() === 'churned'), C.red);

      const buffer = await wb.xlsx.writeBuffer();
      const blob   = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url    = URL.createObjectURL(blob);
      const a      = document.createElement('a');
      a.href       = url;
      a.download   = `WellQ_Clinicas_${date}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      setExportState('idle');
    } catch (err) {
      console.error('Export error:', err);
      setExportState('error');
      setTimeout(() => setExportState('idle'), 3000);
    }
  };

  return (
    <motion.div
      className="space-y-7 font-sans"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={itemVariants} className="grid grid-cols-2 xl:grid-cols-4 gap-5">
        <KpiCard
          icon={Building2}
          label={t('clinics.totalClinics') ?? 'Total Clinics'}
          value={totalClinics}
          colorClass="text-wellq-cyan"
          bgClass="bg-wellq-cyan/10 dark:bg-wellq-cyan/10"
          borderClass="border-wellq-cyan/20 dark:border-wellq-cyan/30"
          ringClass="ring-wellq-cyan/20 dark:ring-wellq-cyan/10"
          barGradient="from-wellq-cyan to-wellq-blue"
          glowClass="from-wellq-cyan/10"
          pct={100}
        />
        <KpiCard
          icon={Activity}
          label={t('clinics.activeClinics') ?? 'Active Clinics'}
          value={activeClinics}
          colorClass="text-wellq-green"
          bgClass="bg-wellq-green/10 dark:bg-wellq-green/10"
          borderClass="border-wellq-green/20 dark:border-wellq-green/30"
          ringClass="ring-wellq-green/20 dark:ring-wellq-green/10"
          barGradient="from-wellq-green to-teal-400"
          glowClass="from-wellq-green/10"
          pct={totalClinics > 0 ? Math.round((activeClinics / totalClinics) * 100) : 0}
        />
        <KpiCard
          icon={TrendingDown}
          label={t('clinics.atRisk') ?? 'At Risk'}
          value={atRiskClinics}
          colorClass="text-amber-500 dark:text-amber-400"
          bgClass="bg-amber-500/10 dark:bg-amber-900/10"
          borderClass="border-amber-200/60 dark:border-amber-700/30"
          ringClass="ring-amber-200/60 dark:ring-amber-700/20"
          barGradient="from-amber-400 to-orange-400"
          glowClass="from-amber-400/10"
          pct={totalClinics > 0 ? Math.round((atRiskClinics / totalClinics) * 100) : 0}
        />
        <KpiCard
          icon={Users}
          label={t('clinics.totalPatients') ?? 'Total Patients'}
          value={totalPatients.toLocaleString()}
          colorClass="text-wellq-blue"
          bgClass="bg-wellq-blue/10 dark:bg-wellq-blue/10"
          borderClass="border-wellq-blue/20 dark:border-wellq-blue/30"
          ringClass="ring-wellq-blue/20 dark:ring-wellq-blue/10"
          barGradient="from-wellq-blue to-wellq-cyan"
          glowClass="from-wellq-blue/10"
          pct={80}
        />
      </motion.div>

      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-1 p-1 bg-wellq-gray/10 dark:bg-white/5 rounded-xl">
            {[
              { key: 'all',     label: t('clinics.all') },
              { key: 'active',  label: t('clinics.active') },
              { key: 'at_risk', label: t('clinics.atRisk') },
              { key: 'churned', label: t('clinics.churned') },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => {
                  setFilter(key);
                  if (onRefreshClinics) {
                    onRefreshClinics(key === 'churned' ? { status: 'churned' } : {});
                  }
                }}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                  filter === key
                    ? 'bg-white dark:bg-wellq-dark shadow-sm text-wellq-dark dark:text-white'
                    : 'text-wellq-gray hover:text-wellq-dark dark:hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              disabled={exportState === 'loading'}
              className={`flex items-center gap-2 px-3.5 py-2 border rounded-xl text-sm font-semibold transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                exportState === 'error'
                  ? 'border-red-400/50 text-red-400 bg-red-500/5'
                  : 'border-wellq-gray/30 dark:border-wellq-gray/20 text-wellq-dark dark:text-white hover:bg-wellq-gray/5 dark:hover:bg-white/5'
              }`}
            >
              {exportState === 'loading'
                ? <><Loader2 size={14} className="animate-spin" /> {t('clinics.export')}</>
                : exportState === 'error'
                ? <><X size={14} /> Export fallido</>
                : <><Download size={14} strokeWidth={2.2} /> {t('clinics.export')}</>
              }
            </button>

            <div className="relative" ref={filterRef}>
              <button
                onClick={() => setFilterOpen((v) => !v)}
                className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                  filterTier || filterStatus
                    ? 'border-wellq-cyan text-wellq-cyan bg-wellq-cyan/5'
                    : 'border-wellq-gray/30 dark:border-wellq-gray/20 text-wellq-dark dark:text-white hover:bg-wellq-gray/5 dark:hover:bg-white/5'
                }`}
              >
                <Filter size={15} strokeWidth={2.2} />
                {t('clinics.filters')}
                {(filterTier || filterStatus) && (
                  <span className="ml-1 w-4 h-4 rounded-full bg-wellq-cyan text-wellq-black text-[10px] font-bold flex items-center justify-center">
                    {[filterTier, filterStatus].filter(Boolean).length}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {filterOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0,  scale: 1    }}
                    exit={{   opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 z-50 w-64 bg-white dark:bg-wellq-dark rounded-2xl shadow-2xl border border-wellq-gray/15 dark:border-wellq-gray/20 p-4 space-y-4"
                  >
                    <div>
                      <label className="block text-xs font-bold text-wellq-gray uppercase tracking-wider mb-1.5">Tier</label>
                      <select
                        value={filterTier}
                        onChange={(e) => setFilterTier(e.target.value)}
                        className="w-full px-3 py-2 border border-wellq-gray/30 rounded-xl text-sm text-wellq-dark dark:text-white dark:bg-wellq-dark/80 focus:outline-none focus:ring-2 focus:ring-wellq-cyan"
                      >
                        <option value="">Todos</option>
                        <option value="trial">Trial</option>
                        <option value="smb">SMB</option>
                        <option value="enterprise">Enterprise</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-wellq-gray uppercase tracking-wider mb-1.5">Estado</label>
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="w-full px-3 py-2 border border-wellq-gray/30 rounded-xl text-sm text-wellq-dark dark:text-white dark:bg-wellq-dark/80 focus:outline-none focus:ring-2 focus:ring-wellq-cyan"
                      >
                        <option value="">Todos</option>
                        <option value="active">Active</option>
                        <option value="warning">Warning</option>
                        <option value="critical">Critical</option>
                        <option value="churned">Churned</option>
                      </select>
                    </div>
                    <div className="flex justify-between pt-1">
                      <button
                        onClick={() => { setFilterTier(''); setFilterStatus(''); }}
                        className="text-xs text-wellq-gray hover:text-wellq-dark dark:hover:text-white transition-colors cursor-pointer font-medium"
                      >
                        Limpiar filtros
                      </button>
                      <button
                        onClick={() => setFilterOpen(false)}
                        className="px-3 py-1.5 bg-wellq-cyan text-wellq-black rounded-lg text-xs font-bold cursor-pointer"
                      >
                        Aplicar
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={() => setBulkOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-wellq-cyan to-wellq-blue text-wellq-black rounded-xl text-sm font-bold hover:opacity-90 transition-all cursor-pointer shadow-md shadow-wellq-cyan/25"
            >
              <Mail size={14} strokeWidth={2.2} /> {t('clinics.bulkEmail')}
            </button>

            <button
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-wellq-cyan to-wellq-blue text-wellq-black rounded-xl text-sm font-bold hover:opacity-90 transition-all cursor-pointer shadow-md shadow-wellq-cyan/25"
            >
              <Plus size={14} strokeWidth={2.5} /> Crear Clínica
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-wellq-dark rounded-2xl shadow-sm border border-wellq-gray/15 dark:border-wellq-gray/20 overflow-hidden">
          <table className="w-full">
            <thead className="bg-wellq-gray/4 dark:bg-white/[0.02] border-b border-wellq-gray/15 dark:border-wellq-gray/20 sticky top-0">
              <tr>
                {[
                  t('clinics.columns.clinic'),
                  t('clinics.columns.plan'),
                  t('clinics.columns.status'),
                  t('clinics.columns.licenseUsage'),
                  t('clinics.columns.health'),
                  t('clinics.columns.lastLogin'),
                  t('clinics.columns.actions'),
                ].map((h) => (
                  <th key={h} className="py-4 px-4 text-left text-[10px] font-bold text-wellq-gray uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clinicsLoading
                ? [...Array(4)].map((_, i) => (
                    <tr key={i} className="border-b border-wellq-gray/10 dark:border-wellq-gray/30">
                      <td colSpan={7} className="py-3 px-4">
                        <Skeleton className="h-8 w-full" />
                      </td>
                    </tr>
                  ))
                : filtered.map((clinic, i) => (
                    <ClinicRow
                      key={clinic.clinic_id ?? clinic.id}
                      clinic={clinic}
                      onSelect={setSelected}
                      selected={
                        selected?.clinic_id === clinic.clinic_id ||
                        selected?.id === clinic.id
                      }
                      onImpersonate={setImpersonateTarget} // ← CORREGIDO
                      onSettings={(c) => { closeAll(); setSettingsClinic(c); }}
                      onInvoices={(c) => { closeAll(); setInvoiceClinic(c); }}
                      onDelete={setDeleteTarget}
                      animationDelay={i * 0.03}
                    />
                  ))}
            </tbody>
          </table>

          <div className="flex items-center justify-between px-6 py-4 border-t border-wellq-gray/10 dark:border-white/5 bg-wellq-gray/3 dark:bg-white/[0.02]">
            <span className="text-xs font-semibold text-wellq-gray">
              Mostrando <span className="font-bold text-wellq-dark dark:text-white">{filtered.length > 0 ? '1' : '0'}–{filtered.length}</span> de {filtered.length} clínicas
            </span>
            <div className="flex items-center gap-1.5">
              <button className="p-1.5 border border-wellq-gray/20 dark:border-wellq-gray/20 rounded-lg text-sm font-medium text-wellq-gray hover:bg-white dark:hover:bg-white/5 transition-colors disabled:opacity-40 cursor-not-allowed" disabled>
                <ChevronLeft size={15} strokeWidth={2.2} />
              </button>
              <button className="w-8 h-8 bg-wellq-cyan text-wellq-black rounded-lg text-sm font-black">1</button>
              <button className="p-1.5 border border-wellq-gray/20 dark:border-wellq-gray/20 rounded-lg text-sm font-medium text-wellq-gray hover:bg-white dark:hover:bg-white/5 transition-colors disabled:opacity-40 cursor-not-allowed" disabled>
                <ChevronRight size={15} strokeWidth={2.2} />
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Drawer lateral ── */}
      <AnimatePresence>
        {activeDrawer && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/55 z-[200]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeAll}
            />
            <ClinicDrawer
              clinic={activeDrawer}
              mode={settingsClinic ? 'settings' : invoiceClinic ? 'invoices' : 'overview'}
              onClose={closeAll}
              onImpersonate={setImpersonateTarget} // ← NUEVO: permite lanzar el modal desde el drawer
            />
          </>
        )}
      </AnimatePresence>

      {/* ── Modal Bulk Email ── */}
      {bulkOpen && (
        <BulkEmailModal
          onClose={() => setBulkOpen(false)}
          clinicCount={filtered.length}
        />
      )}

      {/* ── Modal Crear Clínica ── */}
      {createOpen && (
        <CreateClinicModal
          onClose={() => setCreateOpen(false)}
          onSuccess={() => { onRefreshClinics && onRefreshClinics(filter === 'churned' ? { status: 'churned' } : {}); }}
        />
      )}

      {/* ── Modal Eliminar ── */}
      <DeleteClinicModal
        clinic={deleteTarget}
        deleting={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
      />

      {/* ── Modal Impersonation (Acceso de Soporte) ── */}
      {impersonateTarget && (
        <ImpersonateModal
          clinic={impersonateTarget}
          onClose={() => setImpersonateTarget(null)}
          onSuccess={(data) => {
            setImpersonateTarget(null);
            if (data?.clinic_portal_url) {
              window.open(data.clinic_portal_url, '_blank', 'noopener,noreferrer');
            }
            onImpersonate?.(impersonateTarget, data);
          }}
        />
      )}
    </motion.div>
  );
};