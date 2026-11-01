// src/lib/dates.js
// Date utility helpers for the web app.

/**
 * Returns a human-readable relative time string (e.g. "3 minutes ago").
 * Falls back to the full locale date string when the browser doesn't support Intl.RelativeTimeFormat.
 * @param {string|Date} dateInput
 * @param {string} locale  - BCP47 locale code (e.g. 'ar', 'fr', 'en')
 */
export function timeAgo(dateInput, locale = 'en') {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date)) return '—';

  const diffMs  = date.getTime() - Date.now();
  const diffSec = Math.round(diffMs / 1000);

  const THRESHOLDS = [
    { unit: 'second', limit: 45 },
    { unit: 'minute', limit: 45 * 60 },
    { unit: 'hour',   limit: 22 * 3600 },
    { unit: 'day',    limit: 32 * 86400 },
    { unit: 'month',  limit: 11 * 30 * 86400 },
    { unit: 'year',   limit: Infinity },
  ];

  try {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    for (const { unit, limit } of THRESHOLDS) {
      const divisors = { second: 1, minute: 60, hour: 3600, day: 86400, month: 2592000, year: 31536000 };
      if (Math.abs(diffSec) < limit) {
        return rtf.format(Math.round(diffSec / divisors[unit]), unit);
      }
    }
    return rtf.format(Math.round(diffSec / 31536000), 'year');
  } catch {
    return date.toLocaleDateString(locale);
  }
}

/**
 * Format a date as a short date+time string.
 * @param {string|Date} dateInput
 * @param {string} locale
 */
export function formatDateTime(dateInput, locale = 'en') {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date)) return '—';
  try {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

/**
 * Format date only (no time).
 */
export function formatDate(dateInput, locale = 'en') {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date)) return '—';
  try {
    return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric' }).format(date);
  } catch {
    return date.toLocaleDateString();
  }
}
