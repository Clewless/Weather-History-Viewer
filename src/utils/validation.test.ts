import { validateDateRangeWithErrors } from './validation';

describe('validateDateRangeWithErrors', () => {
  test('accepts valid YYYY-MM-DD same-day range', () => {
    expect(() => validateDateRangeWithErrors('2025-09-22', '2025-09-22')).not.toThrow();
  });

  test('throws for invalid date format', () => {
    expect(() => validateDateRangeWithErrors('2025/09/22', '2025/09/22')).toThrow();
  });
});
