// src/components/data/FileDropzone.jsx
// Drag-and-drop or click to choose one file. Shows name and size once chosen.
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UploadCloud, FileText, X } from 'lucide-react';

const formatSize = (bytes) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export function FileDropzone({ file, onFile, accept = '.csv', disabled = false }) {
  const { t } = useTranslation();
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const pick = (list) => {
    const f = list?.[0];
    if (f) onFile(f);
  };

  if (file) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4">
        <FileText size={24} className="flex-shrink-0 text-blue-600" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-900">{file.name}</p>
          <p className="text-xs text-gray-500">{formatSize(file.size)}</p>
        </div>
        <button
          type="button"
          onClick={() => onFile(null)}
          disabled={disabled}
          aria-label={t('data.removeFile', 'Remove file')}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800 disabled:opacity-40"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !disabled) { e.preventDefault(); inputRef.current?.click(); } }}
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); if (!disabled) pick(e.dataTransfer.files); }}
      className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
        dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white hover:border-gray-400'
      } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
    >
      <UploadCloud size={32} className="text-gray-400" aria-hidden />
      <p className="text-sm font-medium text-gray-700">{t('data.dropHere', 'Drop your CSV file here, or click to browse')}</p>
      <p className="text-xs text-gray-500">{t('data.csvOnly', 'CSV files only')}</p>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => { pick(e.target.files); e.target.value = ''; }}
      />
    </div>
  );
}
