// src/components/data/ImportBadges.jsx
import { useTranslation } from 'react-i18next';
import { Badge } from '../ui/Badge.jsx';
import { importTypeLabel } from '../../features/data/constants.js';

const STATUS_VARIANT = {
  previewed: 'info',
  processing: 'warning',
  completed: 'success',
  failed: 'danger',
  cancelled: 'neutral',
};

export function ImportTypeBadge({ type }) {
  const { t } = useTranslation();
  return <Badge variant="info">{t(`data.types.${type}`, importTypeLabel(type))}</Badge>;
}

export function ImportStatusBadge({ status }) {
  const { t } = useTranslation();
  const fallback = status ? status.charAt(0).toUpperCase() + status.slice(1) : '—';
  return <Badge variant={STATUS_VARIANT[status] ?? 'neutral'}>{t(`data.status.${status}`, fallback)}</Badge>;
}
