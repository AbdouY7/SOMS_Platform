// src/components/ui/Badge.jsx
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';

const variants = {
  default:   'bg-gray-100 text-gray-700',
  primary:   'bg-blue-100 text-blue-700',
  success:   'bg-green-100 text-green-700',
  warning:   'bg-yellow-100 text-yellow-700',
  danger:    'bg-red-100 text-red-700',
  demo:      'bg-orange-100 text-orange-700 font-semibold',
};

export function Badge({ children, variant = 'default', className, ...props }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

const SOURCE_VARIANT = {
  public_manual: 'primary',
  csv_import:    'default',
  official_api:  'success',
  synthetic_demo: 'demo',
};

/**
 * DataSourceBadge: displays the source_type with an i18n label.
 */
export function DataSourceBadge({ sourceType, className }) {
  const { t } = useTranslation();
  return (
    <Badge variant={SOURCE_VARIANT[sourceType] || 'default'} className={className}>
      {t(`common.dataSource.${sourceType}`, sourceType)}
    </Badge>
  );
}
