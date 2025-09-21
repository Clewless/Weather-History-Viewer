import {
  isAfter,
  isBefore,
  differenceInDays,
  getMonth,
  getDate,
  getYear,
} from 'date-fns';
import { formatInTimeZone as formatInTimeZoneTz } from 'date-fns-tz';

/**
 * Get current timestamp in milliseconds (equivalent to Date.now())
 * This is the same as the native Date.now() but provides consistency
 */
export const getCurrentTimestamp = (): number => {
  return Date.now();
};

/**
 * Parse ISO date string to Date object
 * @param dateStr - ISO date string (e.g., "2023-12-25")
 * @returns Date object or null if invalid
 */
export const parseDateString = (dateStr: string): Date | null => {
  try {
    // Add time component for proper parsing if it's just a date
    const dateTimeStr = dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00.000Z`;
    const date = new Date(dateTimeStr);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
};

/**
 * Validate if a date string is in YYYY-MM-DD format and represents a valid date
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns True if valid, false otherwise
 */
export const isValidDateString = (dateStr: string): boolean => {
  if (!dateStr || typeof dateStr !== 'string') {
    return false;
  }

  // Check basic format first (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateStr)) {
    return false;
  }

  const date = parseDateString(dateStr);
  if (!date) {
    return false;
  }

  // Extract components to validate
  const [year, month, day] = dateStr.split('-').map(Number);

  // Check if the parsed date matches the original components
  return (
    getYear(date) === year &&
    getMonth(date) === month - 1 &&
    getDate(date) === day
  );
};

/**
 * Validate date range (start <= end and range <= 365 days)
 * @param start - Start date string (YYYY-MM-DD)
 * @param end - End date string (YYYY-MM-DD)
 * @returns True if valid range, false otherwise
 */
export const isValidDateRange = (start: string, end: string): boolean => {
  const startDate = parseDateString(start);
  const endDate = parseDateString(end);

  if (!startDate || !endDate) {
    return false;
  }

  const diffDays = differenceInDays(endDate, startDate);
  return diffDays >= 0 && diffDays <= 365;
};

/**
 * Format current date as ISO string (equivalent to new Date().toISOString())
 * @returns ISO 8601 formatted date string
 */
export const getCurrentISODate = (): string => {
  return new Date().toISOString();
};

/**
 * Convert Date object to ISO string
 * @param date - Date object to format
 * @returns ISO 8601 formatted date string
 */
export const formatDateToISO = (date: Date): string => {
  return date.toISOString();
};

/**
 * Format time in local timezone (replacement for formatLocalTime in weatherUtils)
 * @param time - ISO time string
 * @param timezone - IANA timezone identifier
 * @returns Formatted time string (HH:mm)
 */
export const formatTimeInTimezone = (time: string, timezone: string): string => {
  try {
    const date = new Date(time);
    return formatInTimeZoneTz(date, timezone, 'HH:mm');
  } catch {
    return '00:00';
  }
};

/**
 * Get current date in YYYY-MM-DD format for default values
 * @returns Current date in YYYY-MM-DD format
 */
export const getCurrentDateString = (): string => {
  return new Date().toISOString().split('T')[0];
};

/**
 * Convert API time strings to Date objects (for weather data)
 * @param timeStr - Time string from API
 * @returns Date object or null if invalid
 */
export const parseAPITimeString = (timeStr: string): Date | null => {
  try {
    const date = new Date(timeStr);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
};

/**
 * Check if a date is after another date
 * @param date - Date to check
 * @param comparisonDate - Date to compare against
 * @returns True if date is after comparisonDate
 */
export const isDateAfter = (date: Date, comparisonDate: Date): boolean => {
  return isAfter(date, comparisonDate);
};

/**
 * Check if a date is before another date
 * @param date - Date to check
 * @param comparisonDate - Date to compare against
 * @returns True if date is before comparisonDate
 */
export const isDateBefore = (date: Date, comparisonDate: Date): boolean => {
  return isBefore(date, comparisonDate);
};

/**
 * Create a new Date object from timestamp
 * Helper function to avoid direct Date constructor usage
 * @param timestamp - Timestamp in milliseconds
 * @returns Date object
 */
export const createDateFromTimestamp = (timestamp: number): Date => {
  return new Date(timestamp);
};

/**
 * Create a new Date object
 * Helper function to avoid direct Date constructor usage
 * @returns Date object
 */
export const createCurrentDate = (): Date => {
  return new Date();
};

/**
 * Create a new Date object from date string
 * Helper function to avoid direct Date constructor usage
 * @param dateStr - Date string
 * @returns Date object
 */
export const createDateFromString = (dateStr: string): Date => {
  return new Date(dateStr);
};

/**
 * Create a new Date object with specific year, month, and date
 * Helper function to avoid direct Date constructor usage
 * @param year - Year
 * @param month - Month (0-indexed)
 * @param date - Date
 * @returns Date object
 */
export const createDate = (year: number, month: number, date: number): Date => {
  return new Date(year, month, date);
};