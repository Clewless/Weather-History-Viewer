/**
 * Enhanced validation utilities with sanitization for use across the application
 */

import invariant from 'tiny-invariant';

/**
 * Simple HTML escaping function to prevent XSS
 */
const escapeHtml = (str: string): string => {
  if (typeof str !== 'string') {
    return String(str);
  }
  return str
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#x27;');
};

import { ValidationError } from './simpleErrors';

import { getEnvVar } from './env';
import { parseDateString, isValidDateString, isValidDateRange } from './dateUtils';
import {
  validateString,
  validateNumber
} from './invariants';

// Control verbose logging via environment variable. Default: false
const DEBUG_LOGS = getEnvVar('DEBUG_LOGS') === 'true';

/**
 * Type guard to check if a value is a valid date string
 * @param dateStr - Value to check
 * @returns True if the value is a valid date string, false otherwise
 */
export const isValidDateStringGuard = (dateStr: unknown): dateStr is `${number}-${number}-${number}` => {
  return typeof dateStr === 'string' && isValidDateString(dateStr);
};

/**
 * Type guard to check if coordinates are valid
 * @param lat - Latitude value
 * @param lng - Longitude value
 * @returns True if both coordinates are valid numbers within range, false otherwise
 */
export const isValidCoordinateGuard = (lat: unknown, lng: unknown): boolean => {
  try {
    // Convert to numbers if they're strings
    const latitude = typeof lat === 'string' ? parseFloat(lat) : lat;
    const longitude = typeof lng === 'string' ? parseFloat(lng) : lng;

    // Check if they're valid numbers
    if (typeof latitude !== 'number' || isNaN(latitude) ||
        typeof longitude !== 'number' || isNaN(longitude)) {
      return false;
    }

    // Validate the ranges
    return validateLatLng(latitude, longitude);
  } catch {
    return false;
  }
};

/**
 * Type guard to check if a value is a valid search query
 * @param query - Value to check
 * @returns True if the value is a valid search query, false otherwise
 */
export const isValidSearchQueryGuard = (query: unknown): query is string => {
  return typeof query === 'string' && validateAndSanitizeSearchQuery(query) !== false;
};

/**
 * Type guard to check if a value is a valid timezone
 * @param timezone - Value to check
 * @returns True if the value is a valid timezone, false otherwise
 */
export const isValidTimezoneGuard = (timezone: unknown): timezone is string => {
  return typeof timezone === 'string' && validateTimezone(timezone);
};

/**
 * Validates latitude and longitude values are within valid ranges.
 * @param lat - Latitude (-90 to 90)
 * @param lng - Longitude (-180 to 180)
 * @returns True if valid, false otherwise
 */
export const validateLatLng = (lat: number, lng: number): boolean => {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
};

/**
 * Validates and sanitizes search query for location searches.
 * @param query - Search query string
 * @returns Sanitized query string if valid, false otherwise
 */
export const validateAndSanitizeSearchQuery = (query: string): string | false => {
  try {
    validateString(query, 'search query');

    const trimmed = query.trim();
    // Must be between 1 and 100 characters (after trimming)
    invariant(trimmed.length >= 1 && trimmed.length <= 100, 'Search query must be between 1 and 100 characters');
    // Reject queries that contain only whitespace
    invariant(!/^\s*$/.test(trimmed), 'Search query cannot be only whitespace');
    // Only allow alphanumeric characters, spaces, commas, hyphens, periods, and single quotes
    const allowedChars = /^[-a-zA-Z0-9\s,.'.]+$/;
    invariant(allowedChars.test(trimmed), 'Search query contains invalid characters');

    // Sanitize the query to prevent XSS - but keep single quotes unescaped since they're allowed
    // Use a more targeted escaping that doesn't escape single quotes
    return trimmed
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"');
  } catch {
    return false;
 }
};

/**
 * Validates timezone string format.
 * @param timezone - Timezone string (e.g., "America/New_York" or "Etc/GMT+5")
 * @returns True if valid format, false otherwise
 */
export const validateTimezone = (timezone: string): boolean => {
  try {
    validateString(timezone, 'timezone');
    const trimmed = timezone.trim();
    invariant(trimmed.length > 0 && trimmed.length <= 50, 'Timezone must be between 1 and 50 characters');
    invariant(trimmed === timezone, 'Timezone cannot have leading or trailing spaces');

    // Additional validation for common timezone patterns
    const commonTimezones = [
      'UTC', 'GMT', 'EST', 'CST', 'MST', 'PST', 'EDT', 'CDT', 'MDT', 'PDT',
      'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
      'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo', 'Asia/Shanghai',
      'Etc/GMT+5', 'Etc/GMT-8', 'Etc/GMT+10'
    ];

    // Check if it's a common timezone first
    if (commonTimezones.includes(trimmed)) {
      return true;
    }

    // For other timezones, use more strict pattern matching
    const timezoneRegex = /^(?:[A-Za-z]+\/[A-Za-z_]+|Etc\/GMT[+-]\d+)$/;
    invariant(timezoneRegex.test(trimmed), 'Invalid timezone format');

    return true;
  } catch {
    return false;
  }
};

/**
 * Validates and sanitizes a date range including format, range limits, and order.
 * @param start - Start date string
 * @param end - End date string
 * @returns Sanitized date strings if valid, false otherwise
 */
export const validateAndSanitizeDateRange = (start: string, end: string): {start: string, end: string} | false => {
   // Sanitize inputs
   const sanitizedStart = escapeHtml(start);
   const sanitizedEnd = escapeHtml(end);
 
   if (!isValidDateString(sanitizedStart) || !isValidDateString(sanitizedEnd)) {
    return false;
  }

  if (!isValidDateRange(sanitizedStart, sanitizedEnd)) {
    return false;
  }

  const startDate = parseDateString(sanitizedStart);
  const endDate = parseDateString(sanitizedEnd);

  if (!startDate || !endDate) {
    return false;
  }

  if (startDate > endDate) {
    return false;
  }

  return { start: sanitizedStart, end: sanitizedEnd };
};

/**
 * Validates and sanitizes coordinates.
 * @param lat - Latitude value
 * @param lng - Longitude value
 * @returns Sanitized coordinates if valid, false otherwise
 */
export const validateAndSanitizeCoordinates = (lat: unknown, lng: unknown): {lat: number, lng: number} | false => {
  try {
    // Convert to numbers if they're strings
    const latitude = typeof lat === 'string' ? parseFloat(lat) : lat;
    const longitude = typeof lng === 'string' ? parseFloat(lng) : lng;

    // Check if they're valid numbers using invariant
    invariant(typeof latitude === 'number' && !isNaN(latitude), 'Latitude must be a valid number');
    invariant(typeof longitude === 'number' && !isNaN(longitude), 'Longitude must be a valid number');

    // Validate the ranges using invariant
    invariant(validateLatLng(latitude, longitude), 'Coordinates out of valid range: lat(-90 to 90), lng(-180 to 180)');

    return { lat: latitude, lng: longitude };
  } catch {
    return false;
  }
};

/**
 * Validates and sanitizes timezone string.
 * @param timezone - Timezone string
 * @returns Sanitized timezone string if valid, false otherwise
 */
export const validateAndSanitizeTimezone = (timezone: string): string | false => {
  if (!timezone || typeof timezone !== 'string') {
    return false;
  }

   // Sanitize the timezone string
   const sanitized = escapeHtml(timezone);
 
   if (!validateTimezone(sanitized)) {
    return false;
  }

  return sanitized;
};

/**
 * Validates a date range including format, range limits, and order.
 * @param start - Start date string
 * @param end - End date string
 * @throws ValidationError if validation fails
 */
export const validateDateRangeWithErrors = (start: string, end: string): void => {
  if (DEBUG_LOGS) console.log('[DEBUG] validateDateRangeWithErrors called with:', { start, end });

  // Validate input parameters
  validateString(start, 'start date');
  validateString(end, 'end date');

  // Use the sanitizer/validator helper which trims, escapes and performs
  // consistent validation. This avoids false negatives caused by timezone
  // offsets when constructing Date objects directly from YYYY-MM-DD strings.
  const sanitized = validateAndSanitizeDateRange(start, end);
  invariant(sanitized, 'Invalid date range format or range exceeds 365 days');
};

/**
 * Validates coordinates with error throwing.
 * @param lat - Latitude value
 * @param lng - Longitude value
 * @throws ValidationError if validation fails
 */
export const validateCoordinatesWithErrors = (lat: number, lng: number): void => {
  validateNumber(lat, 'latitude', -90, 90);
  validateNumber(lng, 'longitude', -180, 180);
  invariant(validateLatLng(lat, lng), 'Invalid coordinate range');
};

/**
 * Validates search query with error throwing.
 * @param query - Search query string
 * @throws ValidationError if validation fails
 */
export const validateSearchQueryWithErrors = (query: string): void => {
  if (!validateAndSanitizeSearchQuery(query)) {
    throw new ValidationError('Invalid search query format or length', 'query', query);
  }
};

/**
 * Validates timezone with error throwing.
 * @param timezone - Timezone string
 * @throws ValidationError if validation fails
 */
export const validateTimezoneWithErrors = (timezone: string): void => {
  if (!validateTimezone(timezone)) {
    throw new ValidationError('Invalid timezone format', 'timezone', timezone);
  }
};
