// src/pages/NotFound.jsx
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button.jsx';
import { FileSearch } from 'lucide-react';

export function NotFound() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center min-h-dvh gap-6 p-8 text-center bg-gray-50">
      <div className="flex items-center justify-center w-24 h-24 rounded-full bg-blue-50">
        <FileSearch size={48} className="text-blue-400" />
      </div>
      <div className="space-y-2">
        <h1 className="text-6xl font-bold text-gray-200">404</h1>
        <h2 className="text-xl font-semibold text-gray-800">{t('errors.404.title')}</h2>
        <p className="text-gray-500 max-w-sm">{t('errors.404.message')}</p>
      </div>
      <Button onClick={() => navigate('/')}>{t('errors.404.back')}</Button>
    </div>
  );
}
