// tests/unit/divideSafe.test.js
import { describe, it, expect } from 'vitest';
import { divideSafe } from '../../src/utils/divideSafe.js';

describe('divideSafe', () => {
  it('returns null when denominator is 0', () => {
    expect(divideSafe(10, 0)).toBeNull();
  });

  it('returns null when denominator is null', () => {
    expect(divideSafe(10, null)).toBeNull();
  });

  it('returns null when numerator is null', () => {
    expect(divideSafe(null, 5)).toBeNull();
  });

  it('returns null when both are null', () => {
    expect(divideSafe(null, null)).toBeNull();
  });

  it('returns correct division for valid numbers', () => {
    expect(divideSafe(10, 2)).toBe(5);
  });

  it('returns correct decimal division', () => {
    expect(divideSafe(1, 3)).toBeCloseTo(0.3333, 4);
  });

  it('never returns NaN', () => {
    const result = divideSafe(0, 0);
    expect(result).toBeNull();
  });

  it('never returns Infinity', () => {
    const result = divideSafe(1, 0);
    expect(result).toBeNull();
  });

  it('returns 0 when numerator is 0 and denominator is valid', () => {
    expect(divideSafe(0, 5)).toBe(0);
  });
});
