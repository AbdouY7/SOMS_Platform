// tests/unit/growthCalculate.test.js
import { describe, it, expect } from 'vitest';
import { growthCalculate } from '../../src/modules/growth/growth.service.js';

describe('growthCalculate', () => {
  it('returns normal percentage when both values are positive', () => {
    const res = growthCalculate(150, 100);
    expect(res).toEqual({ value: 50, state: 'normal' });
  });

  it('handles negative growth correctly', () => {
    const res = growthCalculate(80, 100);
    expect(res).toEqual({ value: -20, state: 'normal' });
  });

  it('returns state "new" when previous is 0 and current > 0', () => {
    const res = growthCalculate(100, 0);
    expect(res).toEqual({ value: null, state: 'new' });
  });

  it('returns state "no_activity" when both previous and current are 0', () => {
    const res = growthCalculate(0, 0);
    expect(res).toEqual({ value: null, state: 'no_activity' });
  });

  it('handles null and undefined safely by treating them as 0', () => {
    expect(growthCalculate(null, null)).toEqual({ value: null, state: 'no_activity' });
    expect(growthCalculate(50, null)).toEqual({ value: null, state: 'new' });
  });

  it('rounds percentage to two decimal places', () => {
    const res = growthCalculate(100, 30);
    expect(res.value).toBe(233.33);
    expect(res.state).toBe('normal');
  });
});

