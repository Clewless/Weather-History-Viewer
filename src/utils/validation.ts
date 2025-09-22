/**
 * Enhanced validation utilities with sanitization for use across the application
 */

import { escape } from 'validator';

import { ValidationError } from '../errors';

import { parseDateString, isValidDateString, isValidDateRange } from './dateUtils';

/**
 * Validates if a date string is in YYYY-MM-DD format and represents a valid date.
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns True if valid, false otherwise
 */
export const isValidDate = (dateStr: string): boolean => {
  return isValidDateString(dateStr);
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
  if (!query || typeof query !== 'string') {
    return false;
  }

  const trimmed = query.trim();
  // Must be between 1 and 100 characters
  if (trimmed.length < 1 || trimmed.length > 100) {
    return false;
  }

  // Only allow alphanumeric characters, spaces, commas, hyphens, apostrophes, and periods
  const allowedChars = /^[a-zA-Z0-9\s,'\-.]+$/;
  if (!allowedChars.test(trimmed)) {
    return false;
  }

  // Sanitize the query to prevent XSS
  return escape(trimmed);
};

/**
 * Validates timezone string format.
 * @param timezone - Timezone string (e.g., "America/New_York" or "Etc/GMT+5")
 * @returns True if valid format, false otherwise
 */
export const validateTimezone = (timezone: string): boolean => {
  // Basic validation for common timezone formats
  const timezoneRegex = /^[A-Za-z/_+-]+$/;
  // Additional validation for common timezone patterns
  const commonTimezones = [
    'UTC', 'GMT', 'EST', 'CST', 'MST', 'PST', 'EDT', 'CDT', 'MDT', 'PDT',
    'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
    'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo', 'Asia/Shanghai'
  ];
  // Check if it's a common timezone or matches the regex pattern
  return (timezoneRegex.test(timezone) || commonTimezones.includes(timezone)) && timezone.length <= 50;
};

/**
 * Validates and sanitizes a date range including format, range limits, and order.
 * @param start - Start date string
 * @param end - End date string
 * @returns Sanitized date strings if valid, false otherwise
 */
export const validateAndSanitizeDateRange = (start: string, end: string): {start: string, end: string} | false => {
  // Sanitize inputs
  const sanitizedStart = escape(start);
  const sanitizedEnd = escape(end);

  if (!isValidDate(sanitizedStart) || !isValidDate(sanitizedEnd)) {
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
 * @returns True if valid, false otherwise
 */
export const validateAndSanitizeCoordinates = (lat: unknown, lng: unknown): {lat: number, lng: number} | false => {
  // Convert to numbers if they're strings
  const latitude = typeof lat === 'string' ? parseFloat(lat) : lat;
  const longitude = typeof lng === 'string' ? parseFloat(lng) : lng;

  // Check if they're valid numbers
  if (typeof latitude !== 'number' || isNaN(latitude) ||
      typeof longitude !== 'number' || isNaN(longitude)) {
    return false;
  }

  // Validate the ranges
  if (!validateLatLng(latitude, longitude)) {
    return false;
  }

  return { lat: latitude, lng: longitude };
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
  const sanitized = escape(timezone);

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
  if (!isValidDate(start) || !isValidDate(end)) {
    throw new ValidationError('Invalid date format. Please use valid YYYY-MM-DD dates', 'date', { start, end });
  }

  if (!isValidDateRange(start, end)) {
    throw new ValidationError('Date range cannot exceed 365 days', 'date_range', { start, end });
  }

  const startDate = parseDateString(start);
  const endDate = parseDateString(end);

  if (!startDate || !endDate) {
    throw new ValidationError('Invalid date format. Please use valid YYYY-MM-DD dates', 'date', { start, end });
  }

  if (startDate > endDate) {
    throw new ValidationError('End date must be after or equal to start date', 'date_order', { start, end });
  }
};

/**
 * Validates coordinates with error throwing.
 * @param lat - Latitude value
 * @param lng - Longitude value
 * @throws ValidationError if validation fails
 */
export const validateCoordinatesWithErrors = (lat: number, lng: number): void => {
  if (!validateLatLng(lat, lng)) {
    throw new ValidationError('Invalid latitude or longitude values', 'coordinates', { lat, lng });
  }
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
