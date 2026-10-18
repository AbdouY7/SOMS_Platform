// src/components/ui/EmptyState.jsx
import { useTranslation } from 'react-i18next';
import { Button } from './Button.jsx';

export function EmptyState({ icon: Icon, title, message, action, actionLabel }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center animate-fadeIn">
      {Icon && (
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gray-100">
          <Icon size={32} className="text-gray-400" />
        </div>
      )}
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-gray-700">
          {title || t('common.noData')}
        </h3>
        {message && <p className="text-sm text-gray-500 max-w-sm mx-auto">{message}</p>}
      </div>
      {action && actionLabel && (
        <Button variant="primary" size="sm" onClick={action}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
