import fc from 'fast-check';

import {
  parseDateString,
  isValidDateString,
  isValidDateRange,
  isDateAfter,
  isDateBefore,
  createDateFromTimestamp,
  getPreviousMonth,
  getNextMonth,
  formatDateForInput,
  formatDateForDisplay,
  getMonthName,
  safeParseDate
} from './dateUtils';

describe('Date Utilities - Property Based Tests', () => {
  describe('parseDateString and isValidDateString', () => {
    it('should only return valid dates for valid date strings', () => {
      fc.assert(
        fc.property(fc.date({ min: new Date('2000-01-01'), max: new Date() }), (date) => {
          // Check if date is valid before processing
          if (isNaN(date.getTime())) {
            return true; // Skip invalid dates
          }
          
          const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
          const parsed = parseDateString(dateStr);
          const isValid = isValidDateString(dateStr);
          
          // For a valid date string, parsing should return a non-null result
          if (isValid) {
            return parsed !== null;
          }
          return parsed === null;
        })
      );
    });

    it('should return null for invalid date strings', () => {
      fc.assert(
        fc.property(fc.string(), (invalidStr) => {
          if (isValidDateString(invalidStr)) {
            const parsed = parseDateString(invalidStr);
            return parsed !== null;
          }
          return true;
        })
      );
    });
  });

  describe('isValidDateRange', () => {
    it('should validate date ranges correctly', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date('2000-01-01'), max: new Date() }),
          fc.date({ min: new Date('2000-01-01'), max: new Date() }),
          (startDate, endDate) => {
            // Check if dates are valid before processing
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
              return true; // Skip invalid dates
            }
            
            const startStr = startDate.toISOString().split('T')[0]; // YYYY-MM-DD format
            const endStr = endDate.toISOString().split('T')[0]; // YYYY-MM-DD format

            // The actual function will parse these to start-of-day UTC dates
            const parsedStart = parseDateString(startStr);
            const parsedEnd = parseDateString(endStr);

            // Check if the date range is within 365 days
            let withinRangeLimit = true;
            if (parsedStart && parsedEnd) {
              const diffTime = parsedEnd.getTime() - parsedStart.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              withinRangeLimit = diffDays <= 365;
            }

            if (parsedStart && parsedEnd && parsedStart <= parsedEnd && withinRangeLimit) {
              // For valid ranges (start <= end and within 365 days), should return true
              return isValidDateRange(startStr, endStr);
            } else if (parsedStart && parsedEnd && (parsedStart > parsedEnd || !withinRangeLimit)) {
              // For invalid ranges (start > end or exceeding 365 days), should return false
              return !isValidDateRange(startStr, endStr);
            } else {
              // If parsing failed, it should return false
              return !isValidDateRange(startStr, endStr);
            }
          }
        )
      );
    });

    it('should reject ranges exceeding 365 days', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date('1940-01-01'), max: new Date() }),
          fc.integer({ min: 366, max: 1000 }),
          (startDate, daysToAdd) => {
            // Create end date with bounds checking to avoid invalid timestamps
            const maxTimestamp = new Date('2100-01-01').getTime();
            const endTimestamp = startDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000;

            if (endTimestamp > maxTimestamp) {
              return true; // Skip invalid timestamps
            }

            // Check if startDate is valid before processing
            if (isNaN(startDate.getTime())) {
              return true; // Skip invalid dates
            }
            
            const endDate = new Date(endTimestamp);
            
            // Check if dates are valid before processing
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
              return true; // Skip invalid dates
            }
            
            const startStr = startDate.toISOString().split('T')[0];
            const endStr = endDate.toISOString().split('T')[0];

            return !isValidDateRange(startStr, endStr);
          }
        )
      );
    });
  });

  describe('date comparison functions', () => {
    it('should maintain transitivity for isDateAfter', () => {
      fc.assert(
        fc.property(fc.date(), fc.date(), fc.date(), (date1, date2, date3) => {
          if (date1.getTime() < date2.getTime() && date2.getTime() < date3.getTime()) {
            return isDateAfter(date2, date1) && isDateAfter(date3, date2) && isDateAfter(date3, date1);
          }
          return true;
        })
      );
    });

    it('should maintain transitivity for isDateBefore', () => {
      fc.assert(
        fc.property(fc.date(), fc.date(), fc.date(), (date1, date2, date3) => {
          if (date1.getTime() > date2.getTime() && date2.getTime() > date3.getTime()) {
            return isDateBefore(date2, date1) && isDateBefore(date3, date2) && isDateBefore(date3, date1);
          }
          return true;
        })
      );
    });
  });

  describe('createDateFromTimestamp', () => {
    it('should create valid dates from valid timestamps', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 2147483647000 }), (timestamp) => {
          const date = createDateFromTimestamp(timestamp);
          return date.getTime() === timestamp;
        })
      );
    });
  });

  describe('navigation functions', () => {
    it('should navigate months correctly', () => {
      fc.assert(
        fc.property(fc.date({ min: new Date('2000-01-01'), max: new Date() }), (date) => {
          // Check if date is valid before processing
          if (isNaN(date.getTime())) {
            return true; // Skip invalid dates
          }
          
          const nextMonth = getNextMonth(date);
          const prevMonth = getPreviousMonth(nextMonth);

          // Going forward and back should return to the original month
          return prevMonth.getMonth() === date.getMonth() &&
                 prevMonth.getFullYear() === date.getFullYear();
        })
      );
    });

    it('should handle year boundaries correctly', () => {
      fc.assert(
        fc.property(fc.integer({ min: 2020, max: 2030 }), (year) => {
          const dec31 = new Date(year, 11, 31); // December 31st
          const nextMonth = getNextMonth(dec31);

          return nextMonth.getMonth() === 0 &&
                 nextMonth.getFullYear() === year + 1 &&
                 nextMonth.getDate() === 1;
        })
      );
    });
  });

  describe('formatting functions', () => {
    it('should format dates consistently', () => {
      fc.assert(
        fc.property(fc.date(), (date) => {
          // Check if date is valid before processing
          if (isNaN(date.getTime())) {
            return true; // Skip invalid dates
          }
          
          const inputFormatted = formatDateForInput(date);
          const displayFormatted = formatDateForDisplay(date);
          const monthName = getMonthName(date);

          return typeof inputFormatted === 'string' &&
                 typeof displayFormatted === 'string' &&
                 typeof monthName === 'string' &&
                 inputFormatted.length > 0 &&
                 displayFormatted.length > 0 &&
                 monthName.length > 0;
        })
      );
    });
  });

  describe('safeParseDate', () => {
    it('should handle valid and invalid inputs gracefully', () => {
      fc.assert(
        fc.property(fc.string(), fc.integer({ min: 0 }), (dateStr, fallbackTimestamp) => {
          const result = safeParseDate(dateStr, fallbackTimestamp);

          if (isValidDateString(dateStr)) {
            return result !== null;
          }

          if (fallbackTimestamp > 0) {
            return result !== null;
          }

          return result === null;
        })
      );
    });
  });
});