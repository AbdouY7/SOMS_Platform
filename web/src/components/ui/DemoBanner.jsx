// src/components/ui/DemoBanner.jsx
import { useTranslation } from 'react-i18next';

/**
 * Sticky banner shown at the top of every page when dataMode === 'demo'.
 * Per spec: demo views must show a permanent "DEMO DATA" banner.
 */
export function DemoBanner() {
  const { t } = useTranslation();
  return (
    <div role="alert" className="demo-banner">
      {t('common.demoBanner')}
    </div>
  );
}
