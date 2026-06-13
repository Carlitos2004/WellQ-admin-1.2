import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TicketPlus, Loader2, ChevronDown, AlertCircle, Info } from 'lucide-react';
// ── CORRECCIÓN: Quitamos fetchTicketCategories porque ahora viene por props
import {
  createSupportTicket,
  fetchSupportResponders,
} from '../../api/client';
import { useLanguage } from '../../contexts/LanguageContext';

// ── regex de validación de email (misma lógica que el backend) ─────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── CORRECCIÓN: Agregamos categories como prop ────────────────────────
export const CreateTicketModal = ({ clinics = [], categories = [], onClose, onCreated }) => {
  const { t } = useLanguage();

  const [form, setFormState] = useState({
    title:          '',
    description:    '',
    category:       '',
    clinic_id:      '',
    reporter_name:  '',
    reporter_email: '',
    responder_id:   '',   // asignación inicial al crear
  });
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState(null);

  // ── CORRECCIÓN: Eliminados los estados redundantes de categories ────────
  const [responders,      setResponders]      = useState([]); // [{id, name, group, email}]
  const [loadingMeta,     setLoadingMeta]     = useState(true);

  // ── NUEVO: cargar solo responders al montar el modal ───────────────────
  useEffect(() => {
    let cancelled = false;

    const loadMeta = async () => {
      setLoadingMeta(true);
      try {
        const respRes = await fetchSupportResponders();
        if (cancelled) return;
        setResponders(respRes?.responders ?? []);
      } catch {
        // Error silencioso — el modal sigue funcionando
      } finally {
        if (!cancelled) setLoadingMeta(false);
      }
    };

    loadMeta();
    return () => { cancelled = true; };
  }, []);

  // ── CORRECCIÓN: equipo y lista de responders filtrada usando la prop ────
  const selectedCategoryTeam = categories.find((c) => c.name === form.category)?.team ?? null;
  const filteredResponders   = selectedCategoryTeam
    ? responders.filter((r) => r.group === selectedCategoryTeam)
    : responders; // si la categoría no tiene equipo mapeado, mostrar todos

  const set = (field, value) => {
    setFormState((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'category') next.responder_id = '';
      return next;
    });
    setError(null);
  };

  const handleSubmit = async () => {
    if (!form.title.trim())       return setError(t('support.validationTitleRequired'));
    if (!form.description.trim()) return setError(t('support.validationDescriptionRequired'));
    if (!form.category)           return setError(t('support.validationCategoryRequired'));
    if (!form.clinic_id)          return setError(t('support.validationClinicRequired'));

    // validar formato de email del reportador
    if (form.reporter_email.trim() && !EMAIL_RE.test(form.reporter_email.trim())) {
      return setError(t('support.validationReporterEmail'));
    }

    setSaving(true);
    setError(null);
    try {
      await createSupportTicket({
        title:          form.title.trim(),
        description:    form.description.trim(),
        category:       form.category,
        clinic_id:      form.clinic_id      || undefined,
        reporter_name:  form.reporter_name.trim()  || undefined,
        reporter_email: form.reporter_email.trim() || undefined,
        responder_id:   form.responder_id   || undefined,
      });
      onCreated?.();
    } catch (err) {
      setError(err.message ?? t('support.errorCreateTicket'));
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
        onClick={() => !saving && onClose()}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        exit={{   opacity: 0, scale: 0.95,  y: 10 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        className="fixed inset-0 z-[110] flex items-center justify-center p-4 pointer-events-none"
      >
        <div className="pointer-events-auto w-full max-w-lg max-h-[92vh] flex flex-col bg-white dark:bg-wellq-dark rounded-2xl shadow-2xl border border-wellq-gray/20 dark:border-white/10 font-sans overflow-hidden">

          {/* Header */}
          <div className="flex-shrink-0 flex items-center gap-3 px-6 py-5 border-b border-wellq-gray/10 dark:border-white/5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-wellq-blue to-wellq-cyan flex items-center justify-center shadow-sm shadow-wellq-cyan/20">
              <TicketPlus size={16} className="text-wellq-dark" strokeWidth={2.2} />
            </div>
            <div className="flex-1">
              <h2 className="text-base font-black text-wellq-dark dark:text-white tracking-tight">
                {t('support.newTicket')}
              </h2>
              <p className="text-[11px] font-medium text-wellq-gray mt-0.5">
                {t('support.newTicketDesc')}
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={saving}
              className="p-2 rounded-xl text-wellq-gray hover:text-wellq-dark dark:hover:text-white hover:bg-wellq-gray/10 dark:hover:bg-white/10 transition-colors disabled:opacity-40"
            >
              <X size={18} strokeWidth={2.5} />
            </button>
          </div>

          {/* Form */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full dark:[&::-webkit-scrollbar-thumb]:bg-white/10">

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 text-xs font-bold text-red-500 bg-red-50 dark:bg-red-500/10 border border-red-200/60 dark:border-red-500/20 rounded-xl px-4 py-2.5"
                >
                  <AlertCircle size={14} strokeWidth={2.5} className="flex-shrink-0" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Título */}
            <Field label={t('support.fieldTitleRequired')}>
              <input
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder={t('support.titlePlaceholder')}
                disabled={saving}
                className={inputCls}
              />
            </Field>

            {/* Categoría + Clínica en fila */}
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('support.fieldCategoryRequired')}>
                <div className="relative">
                  <select
                    value={form.category}
                    onChange={(e) => set('category', e.target.value)}
                    disabled={saving || loadingMeta}
                    className={`${inputCls} appearance-none pr-8`}
                  >
                    <option value="">
                      {loadingMeta ? t('common.loading') : t('common.choose')}
                    </option>
                    {/* ── CORRECCIÓN: iterar sobre objetos, usando c.name ── */}
                    {categories.map((c) => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={13} strokeWidth={2.5} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-wellq-gray" />
                </div>
              </Field>

              {clinics.length > 0 && (
                <Field label={t('support.fieldClinicRequired')}>
                  <div className="relative">
                    <select
                      value={form.clinic_id}
                      onChange={(e) => set('clinic_id', e.target.value)}
                      disabled={saving}
                      className={`${inputCls} appearance-none pr-8`}
                    >
                      <option value="">{t('common.select')}</option>
                      {clinics.map((c) => (
                        <option key={c.clinic_id} value={c.clinic_id}>{c.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={13} strokeWidth={2.5} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-wellq-gray" />
                  </div>
                </Field>
              )}
            </div>

            {/* Asignar a (responder) */}
            <Field label={t('support.assignTo')}>
              <div>
                <div className="relative">
                  <select
                    value={form.responder_id}
                    onChange={(e) => set('responder_id', e.target.value)}
                    disabled={saving || !form.category || loadingMeta}
                    className={`${inputCls} appearance-none pr-8 disabled:cursor-not-allowed`}
                  >
                    {!form.category && (
                      <option value="">{t('support.chooseCategoryFirst')}</option>
                    )}

                    {form.category && filteredResponders.length === 0 && (
                      <option value="">{t('support.noRespondersForTeam')}</option>
                    )}

                    {form.category && filteredResponders.length > 0 && (
                      <>
                        <option value="">{t('support.unassigned')}</option>
                        {filteredResponders.map((r) => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </>
                    )}
                  </select>
                  <ChevronDown
                    size={13}
                    strokeWidth={2.5}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-wellq-gray"
                  />
                </div>

                {/* Hint animado: equipo que recibirá el ticket */}
                <AnimatePresence>
                  {selectedCategoryTeam && (
                    <motion.p
                      initial={{ opacity: 0, y: -3 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -3 }}
                      transition={{ duration: 0.18 }}
                      className="flex items-center gap-1.5 text-[11px] font-medium text-wellq-cyan mt-1.5"
                    >
                      <Info size={11} strokeWidth={2.5} className="flex-shrink-0" />
                      {t('support.assignTeamHint')}{' '}
                      <span className="font-bold">{selectedCategoryTeam}</span>
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </Field>

            {/* Descripción */}
            <Field label={t('support.fieldDescriptionRequired')}>
              <textarea
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder={t('support.descriptionPlaceholder')}
                rows={3}
                disabled={saving}
                className={`${inputCls} resize-none`}
              />
            </Field>

            {/* Reporter */}
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('support.reporterName')}>
                <input
                  value={form.reporter_name}
                  onChange={(e) => set('reporter_name', e.target.value)}
                  placeholder={t('support.reporterNamePlaceholder')}
                  disabled={saving}
                  className={inputCls}
                />
              </Field>
              <Field label={t('support.reporterEmail')}>
                <input
                  type="email"
                  value={form.reporter_email}
                  onChange={(e) => set('reporter_email', e.target.value)}
                  placeholder="juan@clinica.cl"
                  disabled={saving}
                  className={inputCls}
                />
              </Field>
            </div>
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-wellq-gray/10 dark:border-white/5 bg-wellq-gray/3 dark:bg-white/[0.02]">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-[13px] font-bold text-wellq-gray hover:text-wellq-dark dark:hover:text-white border border-wellq-gray/20 dark:border-white/10 hover:bg-wellq-gray/5 dark:hover:bg-white/5 transition-all disabled:opacity-40"
            >
              {t('common.cancel')}
            </button>
            <motion.button
              whileHover={!saving ? { scale: 1.02 } : {}}
              whileTap={!saving ? { scale: 0.97 } : {}}
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-[13px] font-bold bg-gradient-to-r from-wellq-blue to-wellq-cyan text-wellq-dark shadow-sm shadow-wellq-cyan/20 hover:shadow-md transition-all disabled:opacity-60"
            >
              {saving
                ? <Loader2 size={14} strokeWidth={2.5} className="animate-spin" />
                : <TicketPlus size={14} strokeWidth={2.5} />
              }
              {saving ? t('support.creatingTicket') : t('support.createTicket')}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </>,
    document.body
  );
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const inputCls = 'w-full px-4 py-2.5 text-sm font-medium rounded-xl border border-wellq-gray/20 dark:border-white/10 bg-white dark:bg-wellq-dark text-wellq-dark dark:text-white placeholder:text-wellq-gray/40 focus:outline-none focus:ring-2 focus:ring-wellq-cyan focus:border-wellq-cyan transition-all disabled:opacity-50 dark:[color-scheme:dark]';

const Field = ({ label, children }) => (
  <div className="space-y-1.5">
    <label className="text-[10px] font-bold uppercase tracking-widest text-wellq-gray">{label}</label>
    {children}
  </div>
);
