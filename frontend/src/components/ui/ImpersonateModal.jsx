import { useState } from 'react';
import { X, Eye } from 'lucide-react';

export default function ImpersonateModal({ open, clinic, onClose, onConfirm }) {
  const [reason, setReason] = useState('');

  if (!open || !clinic) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (reason.trim().length < 10) return;
    onConfirm(clinic, reason);
    setReason('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-wellq-dark rounded-2xl shadow-xl p-6 w-full max-w-md mx-4 border border-wellq-gray/20 dark:border-wellq-gray/30">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 hover:bg-wellq-gray/10 dark:hover:bg-wellq-dark/40 rounded"
        >
          <X size={18} className="text-wellq-gray dark:text-wellq-gray/80" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-wellq-cyan to-wellq-blue flex items-center justify-center">
            <Eye size={18} className="text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-wellq-dark dark:text-white">Impersonate</h3>
            <p className="text-sm text-wellq-gray">{clinic.name}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-wellq-dark dark:text-white mb-1.5">
              Motivo de acceso (mín. 10 caracteres)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Ej: Revisar configuración de facturación por solicitud del cliente..."
              className="w-full px-4 py-2.5 border border-wellq-gray/30 rounded-xl text-sm text-wellq-dark dark:text-white dark:bg-wellq-dark/50 focus:outline-none focus:ring-2 focus:ring-wellq-cyan resize-none"
              required
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-wellq-gray dark:text-wellq-gray/80 hover:bg-wellq-gray/10 dark:hover:bg-wellq-dark/40 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={reason.trim().length < 10}
              className="px-4 py-2 bg-wellq-cyan text-wellq-black text-sm font-medium rounded-lg hover:bg-wellq-cyan/80 disabled:opacity-50 transition-colors"
            >
              Acceder
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}