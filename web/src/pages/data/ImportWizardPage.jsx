// src/pages/data/ImportWizardPage.jsx  — route: /data/imports/new
// 1 Type -> 2 Upload -> 3 Preview -> 4 Options -> 5 Confirm -> 6 Result
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Check, Download } from 'lucide-react';
import { Button } from '../../components/ui/Button.jsx';
import { FileDropzone } from '../../components/data/FileDropzone.jsx';
import { ImportErrorTable } from '../../components/data/ImportErrorTable.jsx';
import { IMPORT_TYPES, importTypeLabel } from '../../features/data/constants.js';
import { importsApi } from '../../api/imports.js';
import { getErrorMessage } from '../../api/system3.js';

const STEPS = [
  ['type', 'Choose type'],
  ['file', 'Upload file'],
  ['preview', 'Preview'],
  ['options', 'Options'],
  ['confirm', 'Confirm'],
  ['result', 'Result'],
];

function Stepper({ current }) {
  const { t } = useTranslation();
  return (
    <ol className="flex flex-wrap gap-x-2 gap-y-3" aria-label={t('data.steps', 'Import steps')}>
      {STEPS.map(([key, label], i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={key} className="flex items-center gap-2" aria-current={active ? 'step' : undefined}>
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                done ? 'bg-blue-600 text-white' : active ? 'border-2 border-blue-600 text-blue-700' : 'border border-gray-300 text-gray-400'
              }`}
            >
              {done ? <Check size={14} aria-hidden /> : i + 1}
            </span>
            <span className={`text-sm ${active ? 'font-medium text-gray-900' : 'text-gray-500'}`}>{t(`data.step.${key}`, label)}</span>
            {i < STEPS.length - 1 && <span className="mx-1 hidden h-px w-6 bg-gray-300 sm:block" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}

function RadioCard({ checked, onChange, name, value, title, description }) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
        checked ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white hover:bg-gray-50'
      }`}
    >
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="mt-1 accent-blue-600" />
      <span>
        <span className="block text-sm font-medium text-gray-900">{title}</span>
        <span className="block text-sm text-gray-500">{description}</span>
      </span>
    </label>
  );
}

function Stat({ label, value, tone = 'text-gray-900' }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-xl font-semibold tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}

export default function ImportWizardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [step, setStep] = useState(0);
  const [type, setType] = useState('social_posts');
  const [file, setFile] = useState(null);
  const [mode, setMode] = useState('append');
  const [onError, setOnError] = useState('skip_invalid');
  const [preview, setPreview] = useState(null);
  const [previewKey, setPreviewKey] = useState('');
  const [result, setResult] = useState(null);

  const fileKey = file ? `${type}|${file.name}|${file.size}|${file.lastModified}` : '';

  const previewMutation = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('mode', mode);
      fd.append('onError', onError);
      return importsApi.preview(type, fd);
    },
    onSuccess: (data) => { setPreview(data); setPreviewKey(fileKey); setStep(2); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const commitMutation = useMutation({
    mutationFn: () => importsApi.commit(preview.importId, { mode, onError }),
    onSuccess: (data) => {
      setResult(data);
      setStep(5);
      qc.invalidateQueries({ queryKey: ['imports'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const templateMutation = useMutation({
    mutationFn: () => importsApi.downloadTemplate(type),
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  function next() {
    if (step === 1) {
      // same file + type as the last preview: no need to upload again
      if (preview && previewKey === fileKey) setStep(2);
      else previewMutation.mutate();
      return;
    }
    setStep((s) => s + 1);
  }

  function reset() {
    setStep(0); setFile(null); setPreview(null); setPreviewKey(''); setResult(null);
    setMode('append'); setOnError('skip_invalid');
  }

  const canNext =
    (step === 0) ||
    (step === 1 && !!file) ||
    (step === 2 && preview?.validCount > 0) ||
    step === 3;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{t('data.newImport', 'New import')}</h1>
        <p className="mt-1 text-sm text-gray-500">{t('data.wizardHint', 'Check your file before anything is saved.')}</p>
      </div>

      <Stepper current={step} />

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        {/* 1. Type */}
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-900">{t('data.whatImporting', 'What are you importing?')}</h2>
            <div className="grid gap-3">
              {IMPORT_TYPES.map((it) => (
                <RadioCard
                  key={it.value}
                  name="import-type"
                  value={it.value}
                  checked={type === it.value}
                  onChange={() => setType(it.value)}
                  title={t(`data.types.${it.value}`, it.label)}
                  description={t(`data.typeHint.${it.value}`, it.hint)}
                />
              ))}
            </div>
            <Button variant="secondary" onClick={() => templateMutation.mutate()} loading={templateMutation.isPending}>
              <Download size={16} className="me-1.5" />
              {t('data.downloadTemplate', 'Download CSV template')}
            </Button>
          </div>
        )}

        {/* 2. Upload */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-900">{t('data.uploadTitle', 'Upload your CSV file')}</h2>
            <FileDropzone file={file} onFile={setFile} disabled={previewMutation.isPending} />
            <p className="text-sm text-gray-500">
              {t('data.uploadHint', 'Commas and semicolons both work. Dates can be YYYY-MM-DD or DD/MM/YYYY.')}
            </p>
          </div>
        )}

        {/* 3. Preview */}
        {step === 2 && preview && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-900">{t('data.previewTitle', 'Preview')}</h2>

            <div className="grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4 sm:grid-cols-4">
              <Stat label={t('data.totalRows', 'Total rows')} value={preview.totalRows} />
              <Stat label={t('data.validRows', 'Valid rows')} value={preview.validCount} tone="text-green-600" />
              <Stat label={t('data.invalidRows', 'Rows with errors')} value={preview.rejectedRows} tone={preview.rejectedRows ? 'text-red-600' : 'text-gray-900'} />
              <Stat label={t('data.fileName', 'File name')} value={<span className="block max-w-[10rem] truncate text-sm font-medium">{preview.fileName}</span>} />
            </div>

            <p className="text-xs text-gray-500">
              {t('data.previewNote', 'Showing the first {{n}} rows. Row numbers match your spreadsheet (the header is row 1). Cells with problems are red.', { n: preview.previewRows.length })}
            </p>

            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-3 py-2 text-start font-medium">#</th>
                    {preview.columns.map((c) => <th key={c} className="whitespace-nowrap px-3 py-2 text-start font-mono text-xs font-medium">{c}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {preview.previewRows.map((row) => (
                    <tr key={row.rowNumber}>
                      <td className="px-3 py-2 tabular-nums text-gray-500">{row.rowNumber}</td>
                      {preview.columns.map((c) => {
                        const bad = row.errorColumns.includes(c);
                        return (
                          <td
                            key={c}
                            className={`whitespace-nowrap px-3 py-2 ${bad ? 'bg-red-50 font-medium text-red-700 ring-1 ring-inset ring-red-300' : 'text-gray-800'}`}
                            title={bad ? t('data.invalidCell', 'This value is not valid') : undefined}
                          >
                            {row.values[c] === '' ? <span className="text-gray-300">—</span> : row.values[c]}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {preview.errors.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-900">
                  {t('data.firstErrors', 'First {{n}} of {{total}} errors', { n: preview.errors.length, total: preview.errorCount })}
                </h3>
                <ImportErrorTable errors={preview.errors} />
              </div>
            )}

            {preview.validCount === 0 && (
              <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {t('data.noValidRows', 'No row in this file is valid, so there is nothing to import. Fix the file and upload it again.')}
              </p>
            )}
          </div>
        )}

        {/* 4. Options */}
        {step === 3 && (
          <div className="space-y-6">
            <fieldset className="space-y-3">
              <legend className="font-semibold text-gray-900">{t('data.modeTitle', 'When a row already exists')}</legend>
              <RadioCard
                name="mode" value="append" checked={mode === 'append'} onChange={() => setMode('append')}
                title={t('data.mode.append', 'Skip duplicates (append)')}
                description={t('data.mode.appendHint', 'Existing records stay as they are; only new rows are added.')}
              />
              <RadioCard
                name="mode" value="upsert" checked={mode === 'upsert'} onChange={() => setMode('upsert')}
                title={t('data.mode.upsert', 'Update existing (upsert)')}
                description={t('data.mode.upsertHint', 'Matching records are overwritten with the values from this file.')}
              />
            </fieldset>

            <fieldset className="space-y-3">
              <legend className="font-semibold text-gray-900">{t('data.onErrorTitle', 'When a row has errors')}</legend>
              <RadioCard
                name="onError" value="skip_invalid" checked={onError === 'skip_invalid'} onChange={() => setOnError('skip_invalid')}
                title={t('data.onError.skip', 'Skip invalid rows')}
                description={t('data.onError.skipHint', 'Import the valid rows and keep an error report for the rest.')}
              />
              <RadioCard
                name="onError" value="abort" checked={onError === 'abort'} onChange={() => setOnError('abort')}
                title={t('data.onError.abort', 'Cancel the whole import')}
                description={t('data.onError.abortHint', 'Nothing is imported if any row has an error.')}
              />
            </fieldset>
          </div>
        )}

        {/* 5. Confirm */}
        {step === 4 && preview && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-900">{t('data.confirmTitle', 'Ready to import?')}</h2>
            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <div><dt className="text-gray-500">{t('data.type', 'Type')}</dt><dd className="font-medium text-gray-900">{importTypeLabel(type)}</dd></div>
              <div><dt className="text-gray-500">{t('data.fileName', 'File name')}</dt><dd className="truncate font-medium text-gray-900">{preview.fileName}</dd></div>
              <div><dt className="text-gray-500">{t('data.rowsToImport', 'Rows to import')}</dt><dd className="font-medium text-green-700">{preview.validCount}</dd></div>
              <div><dt className="text-gray-500">{t('data.rowsWithErrors', 'Rows with errors')}</dt><dd className={`font-medium ${preview.rejectedRows ? 'text-red-600' : 'text-gray-900'}`}>{preview.rejectedRows}</dd></div>
              <div><dt className="text-gray-500">{t('data.modeTitle', 'When a row already exists')}</dt><dd className="font-medium text-gray-900">{mode === 'append' ? t('data.mode.append', 'Skip duplicates (append)') : t('data.mode.upsert', 'Update existing (upsert)')}</dd></div>
              <div><dt className="text-gray-500">{t('data.onErrorTitle', 'When a row has errors')}</dt><dd className="font-medium text-gray-900">{onError === 'skip_invalid' ? t('data.onError.skip', 'Skip invalid rows') : t('data.onError.abort', 'Cancel the whole import')}</dd></div>
            </dl>
            {onError === 'abort' && preview.rejectedRows > 0 && (
              <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                {t('data.abortWarning', 'This file has errors and you chose to cancel on errors, so nothing will be imported. Go back and choose "Skip invalid rows", or fix the file.')}
              </p>
            )}
          </div>
        )}

        {/* 6. Result */}
        {step === 5 && result && (
          <div className="space-y-4">
            <h2 className={`font-semibold ${result.status === 'completed' ? 'text-green-700' : 'text-red-700'}`}>
              {result.status === 'completed' ? t('data.importDone', 'Import complete') : t('data.importCancelled', 'Import cancelled — nothing was saved')}
            </h2>
            <div className="grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4 sm:grid-cols-4">
              <Stat label={t('data.accepted', 'Accepted')} value={result.acceptedRows} tone="text-green-600" />
              <Stat label={t('data.rejected', 'Rejected')} value={result.rejectedRows} tone={result.rejectedRows ? 'text-red-600' : 'text-gray-900'} />
              <Stat label={t('data.duplicatesSkipped', 'Duplicates skipped')} value={result.skippedDuplicates} />
              <Stat label={t('data.totalRows', 'Total rows')} value={result.totalRows} />
            </div>
            {result.errorCount > 0 && (
              <p className="text-sm text-gray-700">
                {t('data.errorReportHint', 'An error report was saved for this import.')}{' '}
                <Link to={`/data/imports/${result.importId}`} className="font-medium text-blue-600 hover:text-blue-700">
                  {t('data.viewErrorReport', 'View error report')}
                </Link>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Footer navigation */}
      <div className="flex justify-between">
        {step < 5 ? (
          <Button variant="secondary" disabled={step === 0 || commitMutation.isPending || previewMutation.isPending} onClick={() => setStep((s) => s - 1)}>
            {t('common.back', 'Back')}
          </Button>
        ) : (
          <Button variant="secondary" onClick={reset}>{t('data.importAnother', 'Import another file')}</Button>
        )}

        {step < 4 && (
          <Button onClick={next} disabled={!canNext} loading={previewMutation.isPending}>
            {t('common.next', 'Next')}
          </Button>
        )}
        {step === 4 && (
          <Button onClick={() => commitMutation.mutate()} loading={commitMutation.isPending}>
            {t('data.startImport', 'Start import')}
          </Button>
        )}
        {step === 5 && (
          <Button onClick={() => navigate('/data/imports')}>{t('data.backToImports', 'Back to imports')}</Button>
        )}
      </div>
    </div>
  );
}
