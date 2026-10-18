// src/utils/divideSafe.js

/**
 * divide_safe: returns null when denominator is 0 or null, or numerator is null.
 * NEVER silently returns 0, NaN, or Infinity.
 *
 * @param {number|null} n - numerator
 * @param {number|null} d - denominator
 * @returns {number|null}
 */
export function divideSafe(n, d) {
  if (n === null || n === undefined) return null;
  if (!d || d === 0) return null;
  return n / d;
}
