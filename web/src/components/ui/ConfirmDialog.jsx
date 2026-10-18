// src/components/ui/ConfirmDialog.jsx
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal.jsx';
import { Button } from './Button.jsx';

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  confirmVariant = 'danger',
  loading = false,
}) {
  const { t } = useTranslation();
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="flex gap-4">
        <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-full bg-red-50">
          <AlertTriangle className="text-red-500" size={24} />
        </div>
        <p className="text-sm text-gray-600 mt-2">{message}</p>
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          {t('common.cancel')}
        </Button>
        <Button variant={confirmVariant} onClick={onConfirm} loading={loading}>
          {confirmLabel || t('common.confirm')}
        </Button>
      </div>
    </Modal>
  );
}
