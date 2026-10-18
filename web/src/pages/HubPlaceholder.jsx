// src/pages/HubPlaceholder.jsx
// Placeholder dashboard — replaced by System 9 (Hub).
import { useTranslation } from 'react-i18next';
import { LayoutDashboard } from 'lucide-react';

export function HubPlaceholder() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center min-h-64 gap-4 text-center animate-fadeIn">
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-blue-50">
        <LayoutDashboard size={32} className="text-blue-500" />
      </div>
      <div>
        <h1 className="text-xl font-semibold text-gray-700">{t('nav.hub')}</h1>
        <p className="text-sm text-gray-400 mt-1">System 9 — coming soon</p>
      </div>
    </div>
  );
}
