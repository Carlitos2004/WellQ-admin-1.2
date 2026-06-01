import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TicketPlus, Loader2, ChevronDown, AlertCircle } from 'lucide-react';
import { createSupportTicket } from '../../api/client';
import { useLanguage } from '../../contexts/LanguageContext';

const CATEGORIES = ['Bug', 'Billing', 'Feature', 'Request'];

export const CreateTicketModal = ({ clinics = [], onClose, onCreated }) => {
  const { t } = useLanguage();

  const [form, setForm] = useState({
    title:          '',
    description:    '',
    category:       '',
    clinic_id:      '',
    reporter_name:  '',
    reporter_email: '',
  });
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState(null);

  const set = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSubmit = async () => {
    if (!form.title.trim())    return setError('El título es obligatorio.');
    if (!form.description.trim()) return setError('La descripción es obligatoria.');
    if (!form.category)        return setError('Selecciona una categoría.');
    if (!form.clinic_id)       return setError('Selecciona una clínica.');

    setSaving(true);
    setError(null);
    try {
      await createSupportTicket({
        title:          form.title.trim(),
        description:    form.description.trim(),
        category:       form.category,
        clinic_id:      form.clinic_id   || undefined,
        reporter_name:  form.reporter_name.trim()  || undefined,
        reporter_email: form.reporter_email.trim() || undefined,
      });
      onCreated?.();
    } catch (err) {
      setError(err.message ?? 'Error al crear el ticket');
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
        <div className="pointer-events-auto w-full max-w-lg bg-white dark:bg-wellq-dark rounded-2xl shadow-2xl border border-wellq-gray/20 dark:border-white/10 font-sans overflow-hidden">

          {/* Header */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-wellq-gray/10 dark:border-white/5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-wellq-blue to-wellq-cyan flex items-center justify-center shadow-sm shadow-wellq-cyan/20">
              <TicketPlus size={16} className="text-wellq-dark" strokeWidth={2.2} />
            </div>
            <div className="flex-1">
              <h2 className="text-base font-black text-wellq-dark dark:text-white tracking-tight">
                {t('support.newTicket', 'Nuevo ticket')}
              </h2>
              <p className="text-[11px] font-medium text-wellq-gray mt-0.5">
                {t('support.newTicketDesc', 'Completa los campos para crear el ticket')}
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
          <div className="px-6 py-5 space-y-4">

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
            <Field label="Título *">
              <input
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder="Ej: No funciona el login de la app"
                disabled={saving}
                className={inputCls}
              />
            </Field>

            {/* Categoría + Clínica en fila */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Categoría *">
                <div className="relative">
                  <select
                    value={form.category}
                    onChange={(e) => set('category', e.target.value)}
                    disabled={saving}
                    className={`${inputCls} appearance-none pr-8`}
                  >
                    <option value="">— Elegir —</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <ChevronDown size={13} strokeWidth={2.5} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-wellq-gray" />
                </div>
              </Field>

              {clinics.length > 0 && (
                <Field label="Clínica *">
                  <div className="relative">
                    <select
                      value={form.clinic_id}
                      onChange={(e) => set('clinic_id', e.target.value)}
                      disabled={saving}
                      className={`${inputCls} appearance-none pr-8`}
                    >
                      <option value="">— Seleccionar —</option>
                      {clinics.map((c) => (
                        <option key={c.clinic_id} value={c.clinic_id}>{c.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={13} strokeWidth={2.5} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-wellq-gray" />
                  </div>
                </Field>
              )}
            </div>

            {/* Descripción */}
            <Field label="Descripción *">
              <textarea
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Describe el problema con el mayor detalle posible…"
                rows={3}
                disabled={saving}
                className={`${inputCls} resize-none`}
              />
            </Field>

            {/* Reporter */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nombre del reportador">
                <input
                  value={form.reporter_name}
                  onChange={(e) => set('reporter_name', e.target.value)}
                  placeholder="Ej: Juan Pérez"
                  disabled={saving}
                  className={inputCls}
                />
              </Field>
              <Field label="Email del reportador">
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
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-wellq-gray/10 dark:border-white/5 bg-wellq-gray/3 dark:bg-white/[0.02]">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-[13px] font-bold text-wellq-gray hover:text-wellq-dark dark:hover:text-white border border-wellq-gray/20 dark:border-white/10 hover:bg-wellq-gray/5 dark:hover:bg-white/5 transition-all disabled:opacity-40"
            >
              Cancelar
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
              {saving ? 'Creando…' : 'Crear ticket'}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </>,
    document.body
  );
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const inputCls = 'w-full px-4 py-2.5 text-sm font-medium rounded-xl border border-wellq-gray/20 dark:border-white/10 bg-white dark:bg-wellq-dark text-wellq-dark dark:text-white placeholder:text-wellq-gray/40 focus:outline-none focus:ring-2 focus:ring-wellq-cyan focus:border-wellq-cyan transition-all disabled:opacity-50';

const Field = ({ label, children }) => (
  <div className="space-y-1.5">
    <label className="text-[10px] font-bold uppercase tracking-widest text-wellq-gray">{label}</label>
    {children}
  </div>
);
