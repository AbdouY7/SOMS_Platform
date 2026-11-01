// src/components/data/DataSourceBadge.jsx
import { useTranslation } from 'react-i18next';

const STYLES = {
  public_manual: { cls: 'bg-blue-100 text-blue-700', label: 'Manual' },
  csv_import: { cls: 'bg-green-100 text-green-700', label: 'CSV import' },
  official_api: { cls: 'bg-violet-100 text-violet-700', label: 'Official API' },
  synthetic_demo: { cls: 'bg-amber-100 text-amber-800', label: 'Demo' },
};

export function DataSourceBadge({ source }) {
  const { t } = useTranslation();
  const s = STYLES[source] ?? { cls: 'bg-gray-100 text-gray-700', label: source ?? '—' };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>
      {t(`data.source.${source}`, s.label)}
    </span>
  );
}
