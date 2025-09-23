import {
  isAfter,
  isBefore,
  differenceInDays,
  getMonth,
  getDate,
  getYear,
  startOfDay,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameDay,
  parseISO,
  isValid as isValidDateFn,
} from 'date-fns';
import { formatInTimeZone as formatInTimeZoneTz } from 'date-fns-tz';

import { getEnvVar } from './env';

// Toggle verbose debug logging via environment variable. Disabled by default to keep tests quiet.
const DEBUG_LOGS = getEnvVar('DEBUG_LOGS') === 'true';

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
    if (DEBUG_LOGS) console.log('[DEBUG] parseDateString called with:', { dateStr });

    // Handle empty or invalid inputs
    if (!dateStr || typeof dateStr !== 'string') {
      if (DEBUG_LOGS) console.log('[DEBUG] parseDateString failed: empty or not string');
      return null;
    }

    // For YYYY-MM-DD format, parse as UTC to ensure we get the exact date at midnight UTC
    if (!dateStr.includes('T')) {
      const [year, month, day] = dateStr.split('-').map(Number);
      
      // Month is 0-indexed in JavaScript Date constructor
      const date = new Date(Date.UTC(year, month - 1, day));
      
      if (DEBUG_LOGS) console.log('[DEBUG] parseDateString - parsed date:', { date, isValid: !isNaN(date.getTime()), timestamp: date.getTime() });
      
      // Check for invalid dates (including edge cases near Unix epoch)
      if (isNaN(date.getTime())) {
        return null;
      }
      
      return date;
    } else {
      // For datetime strings with 'T', add the time component for proper parsing
      const dateTimeStr = dateStr.includes('Z') || dateStr.includes('+') ? dateStr : `${dateStr}Z`;
      const date = new Date(dateTimeStr);
      
      if (DEBUG_LOGS) console.log('[DEBUG] parseDateString - parsed date:', { date, isValid: !isNaN(date.getTime()), timestamp: date.getTime() });

      // Check for invalid dates (including edge cases near Unix epoch)
      if (isNaN(date.getTime())) {
        return null;
      }

      return date;
    }
  } catch {
    console.warn('Failed to parse date string:', dateStr);
    return null;
  }
};

/**
 * Validate if a date string is in YYYY-MM-DD format and represents a valid date
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns True if valid, false otherwise
 */
export const isValidDateString = (dateStr: string): boolean => {
  if (DEBUG_LOGS) console.log('[DEBUG] isValidDateString called with:', { dateStr });

  if (!dateStr || typeof dateStr !== 'string') {
    console.log('[DEBUG] isValidDateString failed: empty or not string');
    return false;
  }

  // Trim whitespace to be more tolerant of inputs
  const trimmed = dateStr.trim();

  // Check basic format first (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(trimmed)) {
    if (DEBUG_LOGS) console.log('[DEBUG] isValidDateString failed: regex test failed');
    return false;
  }

  // Parse the date components
  const [year, month, day] = trimmed.split('-').map(Number);

  // Validate date components
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) {
    if (DEBUG_LOGS) console.log('[DEBUG] isValidDateString failed: invalid date components');
    return false;
  }

  // Prefer using date-fns parseISO which handles YYYY-MM-DD reliably
  try {
    const date = parseISO(trimmed);
    if (!isValidDateFn(date)) {
      if (DEBUG_LOGS) console.log('[DEBUG] isValidDateString failed: parseISO returned invalid date');
      return false;
    }

    // More robust validation that handles edge cases near Unix epoch
    const parsedYear = getYear(date);
    const parsedMonth = getMonth(date);
    const parsedDay = getDate(date);

    // Check if the parsed date matches the expected components
    const isValid = (parsedYear === year && parsedMonth === month - 1 && parsedDay === day);

    if (DEBUG_LOGS) console.log('[DEBUG] isValidDateString result:', {
      isValid,
      parsedDate: date,
      expected: { year, month, day },
      actual: { year: parsedYear, month: parsedMonth, day: parsedDay }
    });

    return isValid;
  } catch (error) {
    if (DEBUG_LOGS) console.log('[DEBUG] isValidDateString exception:', error);
    return false;
  }
};

/**
 * Validate date range (start <= end and range <= 365 days)
 * @param start - Start date string (YYYY-MM-DD)
 * @param end - End date string (YYYY-MM-DD)
 * @returns True if valid range, false otherwise
 */
export const isValidDateRange = (start: string, end: string): boolean => {
  if (!start || !end || typeof start !== 'string' || typeof end !== 'string') {
    return false;
  }

  const startDate = parseDateString(start);
  const endDate = parseDateString(end);

  if (!startDate || !endDate) {
    return false;
  }

  // Check if start is before or equal to end
  if (startDate > endDate) {
    return false;
  }

  // Check if range doesn't exceed 365 days
  const diffDays = differenceInDays(endDate, startDate);
  return diffDays <= 365;
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
  const now = new Date();
  return now.toISOString().split('T')[0];
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

/**
 * Safely parse a date string and return a Date object with fallbacks
 * This function provides consistent date creation across the application
 * @param dateStr - Date string in YYYY-MM-DD format
 * @param fallbackTimestamp - Optional fallback timestamp if parsing fails
 * @returns Date object or null if all parsing fails
 */
export const safeParseDate = (dateStr: string, fallbackTimestamp?: number): Date | null => {
  try {
    // Handle empty or invalid inputs
    if (!dateStr || typeof dateStr !== 'string') {
      if (fallbackTimestamp && fallbackTimestamp > 0) {
        return startOfDay(createDateFromTimestamp(fallbackTimestamp));
      }
      return null;
    }

    const parsed = parseDateString(dateStr);
    if (parsed) {
      return startOfDay(parsed);
    }

    if (fallbackTimestamp && fallbackTimestamp > 0) {
      return startOfDay(createDateFromTimestamp(fallbackTimestamp));
    }

    return null;
  } catch {
    if (fallbackTimestamp && fallbackTimestamp > 0) {
      return startOfDay(createDateFromTimestamp(fallbackTimestamp));
    }
    return null;
  }
};

/**
 * Get current date as start of day
 * @returns Current date at start of day
 */
export const getCurrentDate = (): Date => {
  const now = createCurrentDate();
  return startOfDay(now);
};

/**
 * Get minimum allowed date (Jan 1, 1940)
 * @returns Date object for minimum allowed date
 */
export const getMinDate = (): Date => {
  const minDate = createDate(1940, 0, 1);
  return startOfDay(minDate);
};

/**
 * Get maximum allowed date (today)
 * @returns Date object for maximum allowed date (today)
 */
export const getMaxDate = (): Date => {
  return getCurrentDate();
};

/**
 * Generate calendar days for a given month
 * @param currentMonth - Date object representing the month to generate
 * @returns Array of Date objects for calendar display
 */
export const generateCalendarDays = (currentMonth: Date): Date[] => {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  // First day of month
  const firstDayDate = createDate(year, month, 1);
  const firstDay = startOfDay(firstDayDate);

  // Last day of month
  const lastDayDate = createDate(year, month + 1, 0);
  const lastDay = startOfDay(lastDayDate);

  // Start from Sunday of the week containing the first day
  const startDay = startOfWeek(firstDay);

  // End on Saturday of the week containing the last day
  const endDay = endOfWeek(lastDay);

  const days: Date[] = [];
  const startDayTime = startDay.getTime();
  let current = startOfDay(createDateFromTimestamp(startDayTime));

  while (current <= endDay) {
    days.push(current);
    current = addDays(current, 1);
  }

  return days;
};

/**
 * Navigate to previous month
 * @param currentMonth - Current month date
 * @returns New date object for the first day of previous month
 */
export const getPreviousMonth = (currentMonth: Date): Date => {
  if (!currentMonth || !(currentMonth instanceof Date) || isNaN(currentMonth.getTime())) {
    return getMinDate();
  }

  // Create a new date for the first day of the previous month
  let year = currentMonth.getFullYear();
  let month = currentMonth.getMonth() - 1; // Go to previous month

  // Handle year boundary
  if (month < 0) {
    month = 11; // December
    year -= 1;
  }

  return startOfDay(createDate(year, month, 1));
};

/**
 * Navigate to next month
 * @param currentMonth - Current month date
 * @returns New date object for the first day of next month
 */
export const getNextMonth = (currentMonth: Date): Date => {
  if (!currentMonth || !(currentMonth instanceof Date) || isNaN(currentMonth.getTime())) {
    return getCurrentDate();
  }

  // Create a new date for the first day of the next month
  let year = currentMonth.getFullYear();
  let month = currentMonth.getMonth() + 1; // Go to next month

  // Handle year boundary
  if (month > 11) {
    month = 0; // January
    year += 1;
  }

  return startOfDay(createDate(year, month, 1));
};

/**
 * Check if a date is today
 * @param date - Date to check
 * @returns True if the date is today
 */
export const isToday = (date: Date): boolean => {
  return isSameDay(date, getCurrentDate());
};

/**
 * Check if a date is in the current month
 * @param date - Date to check
 * @param currentMonth - Current month to compare against
 * @returns True if the date is in the current month
 */
export const isCurrentMonth = (date: Date, currentMonth: Date): boolean => {
  return date.getMonth() === currentMonth.getMonth() &&
         date.getFullYear() === currentMonth.getFullYear();
};

/**
 * Format date for display
 * @param date - Date to format
 * @returns Formatted date string
 */
export const formatDateForDisplay = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

/**
 * Format date for input fields
 * @param date - Date to format
 * @returns Date string in YYYY-MM-DD format
 */
export const formatDateForInput = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

/**
 * Get month name and year for display
 * @param date - Date to format
 * @returns Formatted month and year string
 */
export const getMonthName = (date: Date): string => {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};