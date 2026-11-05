// src/services/csvValidate.js
// csvValidate(buffer, type, { maxErrors = 50 }) ->
//   { validRows[], errors[], errorCount, rejectedRows, columns[], delimiter, totalRows, previewRows[] }
//
// Errors use the same shape stored in DataImportError:
//   { rowNumber, column, errorCode, message, rawValue, rawRow }
// rowNumber matches the spreadsheet (header = row 1, first data row = row 2).
import { parse } from 'csv-parse/sync';
import { AppError } from '../utils/AppError.js';
import { settingsService } from './settings.js';
import { wilayaNormalize } from './wilaya.js';

export const IMPORT_TYPES = ['social_posts', 'regional_metrics', 'sales_records'];
// Keep these in sync with the enums in your database / posts schema.
export const PLATFORMS = ['instagram', 'facebook', 'tiktok', 'other'];
export const CONTENT_TYPES = ['image', 'video', 'reel', 'carousel', 'story', 'text', 'other'];
export const METRIC_TYPES = [
  'impressions',
  'clicks',
  'conversions',
  'spend',
  'orders',
  'revenue',
  'followers',
  'profit_margin',
];

export const REQUIRED_COLUMNS = {
  social_posts: ['platform', 'published_at'],
  regional_metrics: ['wilaya', 'metric_type', 'period_start', 'period_end'],
  sales_records: ['order_date', 'order_count', 'revenue'],
};

const PREVIEW_ROWS = 20;

// ── cell helpers ──────────────────────────────────────────────────────────────
const isBlank = (v) => v === undefined || v === null || String(v).trim() === '';

/** Accepts YYYY-MM-DD, YYYY-MM-DDTHH:mm[:ss][Z] and DD/MM/YYYY. Returns Date | null. */
function parseDate(raw) {
  const s = String(raw).trim();
  let y; let m; let d; let rest = '';
  let match = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?)(Z|[+-]\d{2}:?\d{2})?)?$/);
  if (match) {
    [, y, m, d] = match;
    rest = match[4] ? `T${match[4]}${match[5] ?? 'Z'}` : '';
  } else {
    match = s.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/);
    if (!match) return null;
    [, d, m, y] = match;
  }
  // reject calendar rollovers such as 2026-02-31
  const probe = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  if (probe.getUTCMonth() !== Number(m) - 1 || probe.getUTCDate() !== Number(d)) return null;
  const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}${rest || 'T00:00:00Z'}`;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

/** "1 234,5" / "1234.5" / "1,234.50" -> number | NaN */
function parseNumber(raw) {
  let s = String(raw).replace(/[\s\u00a0]/g, '');
  if (s.includes(',') && s.includes('.')) s = s.replace(/,/g, '');
  else if (s.includes(',')) s = s.replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(s)) return NaN;
  return Number(s);
}

function makeRowContext(raw) {
  const errors = [];
  const fail = (column, errorCode, message) => errors.push({ column, errorCode, message, rawValue: raw[column] ?? '' });

  return {
    errors,
    required(column) {
      if (isBlank(raw[column])) { fail(column, 'REQUIRED', `${column} is required`); return null; }
      return String(raw[column]).trim();
    },
    enumValue(column, allowed, { required = true } = {}) {
      if (isBlank(raw[column])) {
        if (required) fail(column, 'REQUIRED', `${column} is required`);
        return null;
      }
      const v = String(raw[column]).trim().toLowerCase();
      if (!allowed.includes(v)) { fail(column, 'INVALID_ENUM', `${column} must be one of: ${allowed.join(', ')}`); return null; }
      return v;
    },
    date(column, { required = true, notFuture = false } = {}) {
      if (isBlank(raw[column])) {
        if (required) fail(column, 'REQUIRED', `${column} is required`);
        return null;
      }
      const date = parseDate(raw[column]);
      if (!date) { fail(column, 'INVALID_DATE', `${column} must be a valid date (YYYY-MM-DD or DD/MM/YYYY)`); return null; }
      if (notFuture && date.getTime() > Date.now()) { fail(column, 'FUTURE_DATE', `${column} cannot be in the future`); return null; }
      return date;
    },
    number(column, { required = false, integer = false, fallback = 0 } = {}) {
      if (isBlank(raw[column])) {
        if (required) { fail(column, 'REQUIRED', `${column} is required`); return null; }
        return fallback;
      }
      const n = parseNumber(raw[column]);
      if (Number.isNaN(n)) { fail(column, 'INVALID_NUMBER', `${column} must be a number`); return null; }
      if (n < 0) { fail(column, 'NEGATIVE_NUMBER', `${column} cannot be negative`); return null; }
      if (integer && !Number.isInteger(n)) { fail(column, 'INVALID_NUMBER', `${column} must be a whole number`); return null; }
      return n;
    },
    fail,
  };
}

// ── per-type row validators: (raw) -> { value, errors } ──────────────────────
const VALIDATORS = {
  social_posts: async (raw) => {
    const c = makeRowContext(raw);
    const value = {
      platform: c.enumValue('platform', PLATFORMS),
      externalPostId: isBlank(raw.external_post_id) ? null : String(raw.external_post_id).trim().slice(0, 100),
      publishedAt: c.date('published_at', { notFuture: true }),
      contentType: c.enumValue('content_type', CONTENT_TYPES, { required: false }),
      captionPublic: isBlank(raw.caption_public) ? null : String(raw.caption_public).trim(),
      likes: c.number('likes', { integer: true, fallback: null }),
      comments: c.number('comments', { integer: true, fallback: null }),
      shares: c.number('shares', { integer: true, fallback: null }),
      views: c.number('views', { integer: true, fallback: null }),
      reach: c.number('reach', { integer: true, fallback: null }),
      impressions: c.number('impressions', { integer: true, fallback: null }),
      clicks: c.number('clicks', { integer: true, fallback: null }),
    };
    return { value, errors: c.errors };
  },

  regional_metrics: async (raw) => {
    const c = makeRowContext(raw);
    let wilayaCode = null;
    if (c.required('wilaya') !== null) {
      wilayaCode = await wilayaNormalize(raw.wilaya);
      if (!wilayaCode) c.fail('wilaya', 'UNKNOWN_WILAYA', `"${String(raw.wilaya).trim()}" is not a recognised wilaya (use code 01-58 or the name)`);
    }
    const periodStart = c.date('period_start');
    const periodEnd = c.date('period_end');
    if (periodStart && periodEnd && periodStart > periodEnd) {
      c.fail('period_end', 'DATE_RANGE', 'period_end must be on or after period_start');
    }
    const valCol = raw.metric_value !== undefined ? 'metric_value' : 'value';
    const metricValue = c.number(valCol, { required: true });
    const value = {
      wilayaCode,
      metricType: c.enumValue('metric_type', METRIC_TYPES),
      periodStart,
      periodEnd,
      metricValue,
    };
    return { value, errors: c.errors };
  },

  sales_records: async (raw) => {
    const c = makeRowContext(raw);
    let wilayaCode = null;
    if (!isBlank(raw.wilaya)) {
      wilayaCode = await wilayaNormalize(raw.wilaya);
      if (!wilayaCode) c.fail('wilaya', 'UNKNOWN_WILAYA', `"${String(raw.wilaya).trim()}" is not a recognised wilaya`);
    }
    const value = {
      orderDate: c.date('order_date'),
      wilayaCode,
      productCategory: isBlank(raw.product_category) ? null : String(raw.product_category).trim().slice(0, 100),
      orderCount: c.number('order_count', { required: true, integer: true }),
      revenue: c.number('revenue', { required: true }),
      acquisitionCost: c.number('acquisition_cost', { required: false, fallback: null }),
    };
    return { value, errors: c.errors };
  },
};

// ── main ──────────────────────────────────────────────────────────────────────
function detectDelimiter(text) {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  const counts = { ',': 0, ';': 0, '\t': 0 };
  let quoted = false;
  for (const ch of firstLine) {
    if (ch === '"') quoted = !quoted;
    else if (!quoted && ch in counts) counts[ch] += 1;
  }
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return best[1] > 0 ? best[0] : ',';
}

export async function csvValidate(buffer, type, { maxErrors = 50 } = {}) {
  if (!IMPORT_TYPES.includes(type)) throw new AppError(`Unknown import type: ${type}`, 400, 'INVALID_TYPE');

  const text = buffer.toString('utf8').replace(/^\uFEFF/, ''); // strip BOM
  const delimiter = detectDelimiter(text);

  let records;
  try {
    records = parse(text, {
      delimiter,
      skip_empty_lines: true,
      relax_column_count: true,
      trim: true,
    });
  } catch (err) {
    throw new AppError(`The file is not a valid CSV: ${err.message}`, 400, 'MALFORMED_CSV');
  }
  if (records.length === 0) throw new AppError('The file is empty', 400, 'EMPTY_FILE');

  const columns = records[0].map((h) => String(h).trim().toLowerCase().replace(/\s+/g, '_'));
  const missing = REQUIRED_COLUMNS[type].filter((col) => !columns.includes(col));
  if (type === 'regional_metrics' && !columns.includes('metric_value') && !columns.includes('value')) {
    missing.push('metric_value');
  }
  if (missing.length) {
    throw new AppError(`Missing required column(s): ${missing.join(', ')}`, 400, 'MISSING_COLUMNS');
  }

  const dataRows = records.slice(1);
  const totalRows = dataRows.length;
  if (totalRows === 0) throw new AppError('The file has a header but no data rows', 400, 'EMPTY_FILE');

  const maxRows = await settingsService.get('import_max_rows');
  if (totalRows > maxRows) {
    throw new AppError(`The file has ${totalRows} rows; the maximum is ${maxRows}`, 400, 'TOO_MANY_ROWS');
  }

  const validate = VALIDATORS[type];
  const validRows = [];
  const errors = [];
  const previewRows = [];
  let errorCount = 0;
  let rejectedRows = 0;

  for (let i = 0; i < dataRows.length; i += 1) {
    const rowNumber = i + 2;
    const raw = {};
    columns.forEach((col, idx) => { raw[col] = dataRows[i][idx] ?? ''; });

    const { value, errors: rowErrors } = await validate(raw);

    if (rowErrors.length === 0) validRows.push(value);
    else {
      rejectedRows += 1;
      errorCount += rowErrors.length;
      for (const e of rowErrors) {
        if (errors.length < maxErrors) errors.push({ rowNumber, ...e, rawRow: raw });
      }
    }

    if (previewRows.length < PREVIEW_ROWS) {
      previewRows.push({ rowNumber, values: raw, errorColumns: [...new Set(rowErrors.map((e) => e.column))] });
    }
  }

  return { validRows, errors, errorCount, rejectedRows, columns, delimiter, totalRows, previewRows };
}
