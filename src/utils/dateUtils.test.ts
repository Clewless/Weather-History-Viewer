import { isValidDateString, parseDateString } from './dateUtils';

describe('dateUtils - isValidDateString', () => {
  test('accepts valid YYYY-MM-DD', () => {
    expect(isValidDateString('2025-09-22')).toBe(true);
  });

  test('rejects invalid format', () => {
    expect(isValidDateString('09/22/2025')).toBe(false);
    expect(isValidDateString('2025-9-22')).toBe(false);
    expect(isValidDateString('')).toBe(false);
  });

  test('parseDateString returns a Date for valid input', () => {
    const d = parseDateString('2025-09-22');
    expect(d).not.toBeNull();
    if (d) {
      // Ensure date represents midnight UTC for that ISO date
      expect(d.toISOString().startsWith('2025-09-22T00:00:00.000Z')).toBe(true);
    }
  });
});
