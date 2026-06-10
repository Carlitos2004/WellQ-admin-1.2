import { X } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export default function ConfirmDialog({ open, title, message, onConfirm, onCancel }) {
  const { t } = useLanguage();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white dark:bg-wellq-dark rounded-2xl shadow-xl p-6 w-full max-w-md mx-4 border border-wellq-gray/20 dark:border-wellq-gray/30">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1 hover:bg-wellq-gray/10 dark:hover:bg-wellq-dark/40 rounded"
        >
          <X size={18} className="text-wellq-gray dark:text-wellq-gray/80" />
        </button>
        <h3 className="text-lg font-semibold text-wellq-dark dark:text-white mb-2">{title}</h3>
        <p className="text-sm text-wellq-gray dark:text-wellq-gray/80 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-wellq-gray dark:text-wellq-gray/80 hover:bg-wellq-gray/10 dark:hover:bg-wellq-dark/40 rounded-lg"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600"
          >
            {t('common.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
