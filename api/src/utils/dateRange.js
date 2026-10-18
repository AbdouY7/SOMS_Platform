// src/utils/dateRange.js
import { AppError } from './AppError.js';

const MAX_SPAN_YEARS = 5;

/**
 * range_date_get: validates and returns a {start, end} date pair.
 * Rules: both valid dates, start <= end, max span 5 years.
 *
 * @param {string} startStr - ISO date string YYYY-MM-DD
 * @param {string} endStr   - ISO date string YYYY-MM-DD
 * @returns {{ start: Date, end: Date }}
 * @throws {AppError} if validation fails
 */
export function getDateRange(startStr, endStr) {
  const start = new Date(startStr);
  const end = new Date(endStr);

  if (isNaN(start.getTime())) {
    throw AppError.validation(`Invalid start date: ${startStr}`);
  }
  if (isNaN(end.getTime())) {
    throw AppError.validation(`Invalid end date: ${endStr}`);
  }
  if (start > end) {
    throw AppError.validation('start date must be before or equal to end date');
  }

  const maxEnd = new Date(start);
  maxEnd.setFullYear(maxEnd.getFullYear() + MAX_SPAN_YEARS);
  if (end > maxEnd) {
    throw AppError.validation(`Date range must not exceed ${MAX_SPAN_YEARS} years`);
  }

  return { start, end };
}
