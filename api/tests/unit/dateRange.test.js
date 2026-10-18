// tests/unit/dateRange.test.js
import { describe, it, expect } from 'vitest';
import { getDateRange } from '../../src/utils/dateRange.js';
import { AppError } from '../../src/utils/AppError.js';

describe('getDateRange', () => {
  it('returns start and end dates for valid input', () => {
    const { start, end } = getDateRange('2024-01-01', '2024-06-30');
    expect(start).toBeInstanceOf(Date);
    expect(end).toBeInstanceOf(Date);
    expect(start.getFullYear()).toBe(2024);
  });

  it('allows start === end (single day range)', () => {
    const { start, end } = getDateRange('2024-03-15', '2024-03-15');
    expect(start.toISOString().startsWith('2024-03-15')).toBe(true);
    expect(end.toISOString().startsWith('2024-03-15')).toBe(true);
  });

  it('throws AppError for invalid start date', () => {
    expect(() => getDateRange('not-a-date', '2024-06-30')).toThrow(AppError);
  });

  it('throws AppError for invalid end date', () => {
    expect(() => getDateRange('2024-01-01', 'bad')).toThrow(AppError);
  });

  it('throws AppError when start > end', () => {
    expect(() => getDateRange('2024-12-31', '2024-01-01')).toThrow(AppError);
  });

  it('throws AppError when span exceeds 5 years', () => {
    expect(() => getDateRange('2019-01-01', '2024-06-01')).toThrow(AppError);
  });

  it('accepts exactly 5-year span', () => {
    expect(() => getDateRange('2019-01-01', '2024-01-01')).not.toThrow();
  });
});
