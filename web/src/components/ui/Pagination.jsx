// src/components/ui/Pagination.jsx
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button.jsx';

export function Pagination({ page, limit, total, onPageChange }) {
  const { t } = useTranslation();
  const totalPages = Math.ceil(total / limit);
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-2 py-3 text-sm text-gray-600">
      <span>
        {t('common.pagination.page')} {page} {t('common.pagination.of')} {totalPages}
        {' '}({total} {t('common.pagination.total', { defaultValue: 'total' })})
      </span>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label={t('common.pagination.previous')}
        >
          <ChevronLeft size={16} />
          <span className="hidden sm:inline">{t('common.pagination.previous')}</span>
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label={t('common.pagination.next')}
        >
          <span className="hidden sm:inline">{t('common.pagination.next')}</span>
          <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  );
}
