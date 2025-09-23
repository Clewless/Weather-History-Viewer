import fc from 'fast-check';

import { getLocalDayHours, formatLocalTime } from './weatherUtils';

// Mock the imported functions since we can't easily mock all dependencies
jest.mock('./dateUtils', () => ({
  parseDateString: jest.fn((dateStr: string) => {
    // Return a valid date for valid date strings, null for invalid ones
    if (dateStr && typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return new Date(`${dateStr}T00:00:00.000Z`);
    }
    return null;
  }),
  formatTimeInTimezone: jest.fn((time: string, timezone: string) => {
    // Handle edge cases that the tests are generating
    if (!time || !timezone || time.trim() === '' || timezone.trim() === '') {
      return '00:00';
    }

    // Return a formatted time string for valid inputs
    try {
      const date = new Date(time);
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        return '00:00';
      }
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } catch {
      return '00:00';
    }
  })
}));

// Mock the Location type
interface MockLocation {
  timezone: string;
}

// Mock the HourlyWeatherData type with required properties
interface MockHourlyWeatherData {
  time: Date[];
  temperature_2m: number[];
  precipitation: number[];
  weathercode: number[];
  cloudcover: number[];
}

describe('Weather Utilities - Property Based Tests', () => {
  describe('getLocalDayHours', () => {
    it('should handle empty or invalid inputs gracefully', () => {
      fc.assert(
        fc.property(fc.string(), fc.string(), fc.constant(null as any), (startDate, location, hourly) => {
          const result = getLocalDayHours(hourly, location as any, startDate);
          return Array.isArray(result.times) &&
                 Array.isArray(result.temps) &&
                 Array.isArray(result.precip) &&
                 Array.isArray(result.codes) &&
                 Array.isArray(result.cloudcover);
        })
      );
    });

    it('should return consistent data structure', () => {
      fc.assert(
        fc.property(
          fc.array(fc.date()),
          fc.array(fc.integer({ min: -50, max: 50 })),
          fc.array(fc.integer({ min: 0, max: 100 })),
          fc.array(fc.integer({ min: 0, max: 100 })),
          fc.array(fc.integer({ min: 0, max: 100 })),
          (times, temps, precip, codes, cloudcover) => {
            const mockHourly: MockHourlyWeatherData = {
              time: times,
              temperature_2m: temps,
              precipitation: precip,
              weathercode: codes,
              cloudcover
            };

            const mockLocation: MockLocation = { timezone: 'America/New_York' };
            const startDate = '2023-12-25';

            const result = getLocalDayHours(mockHourly as any, mockLocation as any, startDate);

            // All arrays should have the same length
            const arrays = [result.times, result.temps, result.precip, result.codes, result.cloudcover];
            const lengths = arrays.map(arr => arr.length);
            return lengths.every(len => len === lengths[0]);
          }
        )
      );
    });
  });

  describe('formatLocalTime', () => {
    it('should handle various timezone formats', () => {
      const commonTimezones = [
        'America/New_York',
        'America/Chicago',
        'America/Denver',
        'America/Los_Angeles',
        'Europe/London',
        'Europe/Paris',
        'Asia/Tokyo',
        'UTC',
        'GMT'
      ];

      fc.assert(
        fc.property(
          fc.constantFrom(...commonTimezones),
          fc.string(),
          (timezone, time) => {
            const result = formatLocalTime(time, timezone);
            return typeof result === 'string' && result.length > 0;
          }
        )
      );
    });

    it('should handle invalid timezones gracefully', () => {
      fc.assert(
        fc.property(fc.string(), fc.string(), (invalidTz, time) => {
          const result = formatLocalTime(time, invalidTz);
          return typeof result === 'string';
        })
      );
    });
  });

  describe('temperature data processing', () => {
    it('should maintain data integrity', () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer({ min: -50, max: 50 }), { minLength: 1, maxLength: 24 }),
          fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 1, maxLength: 24 }),
          fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 1, maxLength: 24 }),
          fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 1, maxLength: 24 }),
          (temps, precip, codes, cloudcover) => {
            const mockHourly: MockHourlyWeatherData = {
              time: Array.from({ length: temps.length }, (_, i) => new Date(2023, 11, 25, i)),
              temperature_2m: temps,
              precipitation: precip,
              weathercode: codes,
              cloudcover
            };

            const mockLocation: MockLocation = { timezone: 'America/New_York' };
            const startDate = '2023-12-25';

            const result = getLocalDayHours(mockHourly as any, mockLocation as any, startDate);

            // Temperature values should be preserved exactly
            return result.temps.every((temp, i) => temp === temps[i]);
          }
        )
      );
    });
  });
});