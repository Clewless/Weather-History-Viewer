import fc from 'fast-check';

import {
  validateLatLng,
  validateAndSanitizeSearchQuery,
  validateTimezone,
  isValidCoordinateGuard,
  isValidSearchQueryGuard,
  isValidTimezoneGuard
} from './validation';

describe('Validation Utilities - Property Based Tests', () => {
  describe('validateLatLng', () => {
    it('should accept valid latitude and longitude ranges', () => {
      fc.assert(
        fc.property(
          fc.double({ min: -90, max: 90, noNaN: true }),
          fc.double({ min: -180, max: 180, noNaN: true }),
          (lat, lng) => {
            return validateLatLng(lat, lng);
          }
        )
      );
    });

    it('should reject invalid latitude values', () => {
      fc.assert(
        fc.property(fc.double({ min: -91, max: -90.1 }), fc.double({ min: -180, max: 180, noNaN: true }), (lat, lng) => {
          return !validateLatLng(lat, lng);
        })
      );

      fc.assert(
        fc.property(fc.double({ min: 90.1, max: 91 }), fc.double({ min: -180, max: 180, noNaN: true }), (lat, lng) => {
          return !validateLatLng(lat, lng);
        })
      );
    });

    it('should reject invalid longitude values', () => {
      fc.assert(
        fc.property(fc.double({ min: -90, max: 90, noNaN: true }), fc.double({ min: -181, max: -180.1 }), (lat, lng) => {
          return !validateLatLng(lat, lng);
        })
      );

      fc.assert(
        fc.property(fc.double({ min: -90, max: 90, noNaN: true }), fc.double({ min: 180.1, max: 181 }), (lat, lng) => {
          return !validateLatLng(lat, lng);
        })
      );
    });
  });

  describe('validateAndSanitizeSearchQuery', () => {
    it('should accept valid search queries', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter(str =>
            /^[-a-zA-Z0-9\s,.'.]+$/.test(str) && !/^\s*$/.test(str.trim())
          ),
          (query) => {
            const result = validateAndSanitizeSearchQuery(query);
            return typeof result === 'string' && result.length > 0;
          }
        )
      );
    });

    it('should reject queries that are too short', () => {
      fc.assert(
        fc.property(fc.string({ maxLength: 0 }), (query) => {
          const result = validateAndSanitizeSearchQuery(query);
          return result === false;
        })
      );
    });

    it('should reject queries that are too long', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 101, maxLength: 200 }), (query) => {
          const result = validateAndSanitizeSearchQuery(query);
          return result === false;
        })
      );
    });

    it('should reject queries with dangerous characters', () => {
      fc.assert(
        fc.property(fc.string(), (query) => {
          if (query.includes('<') || query.includes('>') || query.includes('"') ||
              query.includes('&') || query.includes('java') ||
              /^\s*$/.test(query.trim())) { // Also reject whitespace-only queries
            return validateAndSanitizeSearchQuery(query) === false;
          }
          return true;
        })
      );
    });
  });

  describe('validateTimezone', () => {
    it('should accept valid timezone formats', () => {
      const validTimezones = [
        'UTC', 'GMT', 'EST', 'CST', 'MST', 'PST', 'EDT', 'CDT', 'MDT', 'PDT',
        'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
        'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo', 'Asia/Shanghai',
        'America/New_York', 'Etc/GMT+5', 'Etc/GMT-8', 'Etc/GMT+10'
      ];

      fc.assert(
        fc.property(fc.constantFrom(...validTimezones), (timezone) => {
          return validateTimezone(timezone);
        })
      );
    });

    it('should reject overly long timezone strings', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 51 }), (longTz) => {
          return !validateTimezone(longTz);
        })
      );
    });

    it('should reject invalid timezone characters', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1, maxLength: 50 }), (invalidTz) => {
          if (!/^[A-Za-z/_+-]+$/.test(invalidTz)) {
            return !validateTimezone(invalidTz);
          }
          return true;
        })
      );
    });
  });

  describe('type guards', () => {
    it('should be consistent with validation functions', () => {
      fc.assert(
        fc.property(
          fc.double({ min: -90, max: 90, noNaN: true }),
          fc.double({ min: -180, max: 180, noNaN: true }),
          (lat, lng) => {
            const guardResult = isValidCoordinateGuard(lat, lng);
            const validateResult = validateLatLng(lat, lng);
            return guardResult === validateResult;
          }
        )
      );

      fc.assert(
        fc.property(fc.string({ minLength: 1, maxLength: 100 }), (query) => {
          const guardResult = isValidSearchQueryGuard(query);
          const validateResult = validateAndSanitizeSearchQuery(query) !== false;
          return guardResult === validateResult;
        })
      );

      fc.assert(
        fc.property(fc.string({ minLength: 1, maxLength: 50 }), (timezone) => {
          const guardResult = isValidTimezoneGuard(timezone);
          const validateResult = validateTimezone(timezone);
          return guardResult === validateResult;
        })
      );
    });
  });

  describe('input sanitization security', () => {
    it('should sanitize dangerous HTML characters', () => {
      fc.assert(
        fc.property(fc.string(), (input) => {
          if (input.includes('<script>') || input.includes('</script>') ||
              input.includes('<img') || input.includes('java')) {
            const result = validateAndSanitizeSearchQuery(input);
            return result === false || !result.includes('<script>');
          }
          return true;
        })
      );
    });

    it('should prevent XSS injection patterns', () => {
      const dangerousPatterns = [
        '<script>alert("xss")</script>',
        'java-alert("xss")',
        '<img src=x onerror=alert("xss")>',
        '<svg onload=alert("xss")>',
        'data:text/html,<script>alert("xss")</script>',
        'vbscript:msgbox("xss")'
      ];

      fc.assert(
        fc.property(fc.constantFrom(...dangerousPatterns), (dangerousInput) => {
          const result = validateAndSanitizeSearchQuery(dangerousInput);
          return result === false;
        })
      );
    });
  });
});