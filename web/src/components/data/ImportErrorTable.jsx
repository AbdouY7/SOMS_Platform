// src/components/data/ImportErrorTable.jsx
// Row #, column, error code, message and the raw row for each rejected cell.
import { useTranslation } from 'react-i18next';

export function ImportErrorTable({ errors = [] }) {
  const { t } = useTranslation();
  if (errors.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead className="border-b border-gray-200 bg-gray-50 text-gray-600">
          <tr>
            <th className="px-4 py-3 text-start font-medium">{t('data.row', 'Row')}</th>
            <th className="px-4 py-3 text-start font-medium">{t('data.column', 'Column')}</th>
            <th className="px-4 py-3 text-start font-medium">{t('data.errorCode', 'Error code')}</th>
            <th className="px-4 py-3 text-start font-medium">{t('data.message', 'Message')}</th>
            <th className="px-4 py-3 text-start font-medium">{t('data.rawRow', 'Raw row')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {errors.map((e, i) => (
            <tr key={e.id ?? `${e.rowNumber}-${e.column}-${i}`} className="align-top">
              <td className="whitespace-nowrap px-4 py-3 tabular-nums text-gray-900">{e.rowNumber}</td>
              <td className="px-4 py-3 font-mono text-xs text-gray-700">{e.column ?? '—'}</td>
              <td className="px-4 py-3">
                <span className="rounded bg-red-50 px-2 py-0.5 font-mono text-xs text-red-700">{e.errorCode}</span>
              </td>
              <td className="px-4 py-3 text-gray-700">{e.message}</td>
              <td className="max-w-xs px-4 py-3">
                <code dir="ltr" className="block truncate font-mono text-xs text-gray-500" title={e.rawRow ? JSON.stringify(e.rawRow) : e.rawValue ?? ''}>
                  {e.rawRow ? JSON.stringify(e.rawRow) : e.rawValue ?? '—'}
                </code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
