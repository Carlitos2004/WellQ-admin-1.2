/**
 * ImpersonateModal.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Modal de confirmación para el acceso de soporte técnico.
 * Ruta: src/components/clinics/ImpersonateModal.jsx
 *
 * Flujo:
 *  1. El agente escribe una justificación ética (mín. 10 chars).
 *  2. Se llama POST /api/clinics/{clinic_id}/impersonate.
 *  3. El backend inserta en ImpersonateAuditLog y retorna el temp_token.
 *  4. onSuccess(data) dispara el window.open al portal (en App.jsx).
 */
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldAlert, Loader2, ExternalLink, AlertTriangle } from 'lucide-react';
import { apiFetch } from '../../api/client';

export const ImpersonateModal = ({ clinic, onClose, onSuccess }) => {
  const [reason,  setReason]  = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [done,    setDone]    = useState(false);

  const isValid  = reason.trim().length >= 10;
  const clinicId = clinic?.clinic_id ?? clinic?.id;

  const handleConfirm = async () => {
    if (!isValid || loading) return;
    setLoading(true);
    setError(null);
    try {
      // Usamos tu interceptor que envía el Token
      const data = await apiFetch(`/api/clinics/${clinicId}/impersonate`, {
        method:  'POST',
        body:    JSON.stringify({ reason: reason.trim() }),
      });
      
      setDone(true);
      // Pequeña pausa para ver la animación de éxito antes de redirigir
      setTimeout(() => { onSuccess?.(data); onClose(); }, 1200);
      
    } catch (err) {
      // Si el candado te rebota (403), cerramos el modal para que el SweetAlert actúe
      if (err.status === 403) {
        onClose();
        return;
      }
      setError(err.message ?? 'Error al iniciar la sesión de soporte.');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[10100] flex items-center justify-center p-4">
        {/* z-[10100] → aparece sobre el ClinicDrawer (z-[10000]) si se lanza desde ahí */}
        <motion.div
          className="absolute inset-0 bg-[#06090E]/80 backdrop-blur-xl"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={!loading ? onClose : undefined}
        />

        <motion.div
          className="relative z-10 bg-white dark:bg-wellq-dark rounded-[24px] shadow-2xl w-full max-w-md flex flex-col overflow-hidden border border-amber-500/25 dark:border-amber-500/25"
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1,    y: 0  }}
          exit={{   opacity: 0, scale: 0.96, y: 10  }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          {/* Gradiente de alerta ambiental */}
          <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-amber-500/10 to-transparent pointer-events-none" />

          {/* ── Header ────────────────────────────────────────────────────────── */}
          <div className="relative flex items-center justify-between px-6 py-5 border-b border-wellq-gray/10 dark:border-white/5 bg-wellq-gray/3 dark:bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shadow-sm">
                <ShieldAlert size={16} className="text-amber-500" strokeWidth={2.2} />
              </div>
              <div>
                <h2 className="font-bold text-wellq-dark dark:text-white text-sm leading-tight">
                  Acceso de Soporte
                </h2>
                <p className="text-xs font-medium text-wellq-gray mt-0.5">
                  Entrando como →{' '}
                  <span className="font-black text-wellq-cyan">{clinic?.name}</span>
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="p-2 hover:bg-wellq-gray/8 dark:hover:bg-white/8 rounded-xl transition-colors cursor-pointer disabled:opacity-40"
            >
              <X size={17} className="text-wellq-gray" strokeWidth={2.5} />
            </button>
          </div>

          {/* ── Estado de Éxito ───────────────────────────────────────────────── */}
          {done ? (
            <div className="flex flex-col items-center justify-center py-14 gap-3">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="w-16 h-16 rounded-full bg-wellq-cyan/10 border border-wellq-cyan/20 flex items-center justify-center"
              >
                <ExternalLink size={28} className="text-wellq-cyan" />
              </motion.div>
              <p className="font-bold text-wellq-dark dark:text-white">Sesión iniciada</p>
              <p className="text-sm text-wellq-gray">Abriendo el portal de la clínica...</p>
            </div>
          ) : (
            <>
              {/* ── Body ──────────────────────────────────────────────────────── */}
              <div className="p-6 space-y-5">
                {/* Aviso legal */}
                <div className="flex items-start gap-3 p-3.5 bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/15 rounded-xl">
                  <AlertTriangle size={15} className="text-amber-500 mt-0.5 flex-shrink-0" strokeWidth={2.2} />
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-400 leading-relaxed">
                    Esta acción queda registrada permanentemente en el audit log con tu identidad de administrador.
                  </p>
                </div>

                {/* Textarea de justificación */}
                <div>
                  <label className="block text-xs font-bold text-wellq-gray uppercase tracking-wider mb-1.5">
                    Justificación ética{' '}
                    <span className="text-red-400 normal-case font-medium">*</span>
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Describe la razón del acceso de soporte..."
                    rows={3}
                    autoFocus
                    className="w-full px-4 py-2.5 border border-wellq-gray/30 rounded-xl text-sm text-wellq-dark dark:text-white placeholder-wellq-gray/40 focus:outline-none focus:ring-2 focus:ring-wellq-cyan focus:border-transparent transition-all resize-none dark:bg-wellq-dark/50"
                  />
                  {/* Contador de caracteres */}
                  <div className="flex justify-end mt-1">
                    <span className={`text-[10px] font-semibold tabular-nums ${
                      isValid ? 'text-wellq-green' : 'text-wellq-gray'
                    }`}>
                      {reason.trim().length} / mín. 10
                    </span>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <p className="text-xs font-bold text-red-500 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl px-4 py-3">
                    {error}
                  </p>
                )}
              </div>

              {/* ── Footer ────────────────────────────────────────────────────── */}
              <div className="flex items-center gap-3 px-6 py-4 border-t border-wellq-gray/10 dark:border-white/5 bg-wellq-gray/3 dark:bg-white/[0.02]">
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-wellq-dark dark:text-white bg-white dark:bg-white/5 border border-wellq-gray/20 dark:border-white/10 hover:bg-wellq-gray/5 dark:hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={!isValid || loading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-bold hover:bg-amber-600 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-amber-500/20"
                >
                  {loading
                    ? <><Loader2 size={15} className="animate-spin" /> Iniciando...</>
                    : <><ShieldAlert size={15} /> Confirmar Acceso</>
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