/**
 * Runtime validation utilities for API responses to ensure type safety
 */

import { APIResponse, ErrorResponse, HTTPResponse, ValidationResult } from '../types';
import { ValidationError } from './simpleErrors';

/**
 * Validation error interface for response validation
 */
interface ResponseValidationError {
  field: string;
  message: string;
  code: string;
  value?: unknown;
}

/**
 * Validates that a response conforms to the expected API response format
 */
export function validateAPIResponse<T>(response: unknown): APIResponse<T> {
  if (!response || typeof response !== 'object') {
    throw new ValidationError('Invalid API response format', 'response');
  }

  const obj = response as Record<string, unknown>;

  // Check if it's an error response
  if (obj.error) {
    const errorResponse: ErrorResponse = {
      error: String(obj.error),
      field: obj.field as string | undefined,
      details: obj.details as string | undefined,
      statusCode: obj.statusCode as number | undefined,
      timestamp: obj.timestamp as string | undefined,
      code: obj.code as string | undefined,
      stack: obj.stack as string | undefined
    };
    return errorResponse;
  }

  // Check if it's a success response
  if (obj.data !== undefined) {
    return {
      data: obj.data as T,
      timestamp: obj.timestamp as string | undefined,
      statusCode: obj.statusCode as number | undefined
    };
  }

  throw new ValidationError('Response must contain either error or data field', 'response');
}

/**
 * Validates HTTP response structure
 */
export function validateHTTPResponse<T>(response: unknown): HTTPResponse<T> {
  if (!response || typeof response !== 'object') {
    throw new ValidationError('Invalid HTTP response format', 'response');
  }

  const obj = response as Record<string, unknown>;

  const validatedResponse: HTTPResponse<T> = {
    data: obj.data as T,
    status: obj.status as number,
    statusText: obj.statusText as string,
    headers: (obj.headers as Record<string, string>) || {},
    config: (obj.config as Record<string, unknown>) || {},
    request: obj.request
  };

  // Validate required fields
  if (typeof validatedResponse.status !== 'number') {
    throw new ValidationError('HTTP response status must be a number', 'status');
  }

  if (typeof validatedResponse.statusText !== 'string') {
    throw new ValidationError('HTTP response statusText must be a string', 'statusText');
  }

  if (typeof validatedResponse.headers !== 'object') {
    throw new ValidationError('HTTP response headers must be an object', 'headers');
  }

  return validatedResponse;
}

/**
 * Validates location data structure
 */
export function validateLocationData(location: unknown): ValidationResult {
  const errors: ResponseValidationError[] = [];

  if (!location || typeof location !== 'object') {
    errors.push({
      field: 'location',
      message: 'Location must be an object',
      code: 'INVALID_TYPE',
      value: location
    });
    return { isValid: false, errors };
  }

  const obj = location as Record<string, unknown>;

  // Required fields validation
  const requiredFields = ['id', 'name', 'latitude', 'longitude', 'timezone', 'country'];
  for (const field of requiredFields) {
    if (obj[field] === undefined || obj[field] === null) {
      errors.push({
        field,
        message: `${field} is required`,
        code: 'MISSING_FIELD',
        value: obj[field]
      });
    }
  }

  // Type validation
  if (typeof obj.id !== 'number') {
    errors.push({
      field: 'id',
      message: 'id must be a number',
      code: 'INVALID_TYPE',
      value: obj.id
    });
  }

  if (typeof obj.name !== 'string') {
    errors.push({
      field: 'name',
      message: 'name must be a string',
      code: 'INVALID_TYPE',
      value: obj.name
    });
  }

  const lat = obj.latitude;
  if (typeof lat !== 'number' || lat < -90 || lat > 90) {
    errors.push({
      field: 'latitude',
      message: 'latitude must be a number between -90 and 90',
      code: 'INVALID_RANGE',
      value: lat
    });
  }

  const lng = obj.longitude;
  if (typeof lng !== 'number' || lng < -180 || lng > 180) {
    errors.push({
      field: 'longitude',
      message: 'longitude must be a number between -180 and 180',
      code: 'INVALID_RANGE',
      value: lng
    });
  }

  if (typeof obj.timezone !== 'string') {
    errors.push({
      field: 'timezone',
      message: 'timezone must be a string',
      code: 'INVALID_TYPE',
      value: obj.timezone
    });
  }

  if (typeof obj.country !== 'string') {
    errors.push({
      field: 'country',
      message: 'country must be a string',
      code: 'INVALID_TYPE',
      value: obj.country
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: errors.length === 0 ? location : undefined
  };
}

/**
 * Validates weather data structure
 */
export function validateWeatherData(data: unknown): ValidationResult {
  const errors: ResponseValidationError[] = [];

  if (!data || typeof data !== 'object') {
    errors.push({
      field: 'weatherData',
      message: 'Weather data must be an object',
      code: 'INVALID_TYPE',
      value: data
    });
    return { isValid: false, errors };
  }

  const obj = data as Record<string, unknown>;

  // Check for required daily and hourly data
  if (!obj.daily) {
    errors.push({
      field: 'daily',
      message: 'Daily weather data is required',
      code: 'MISSING_FIELD',
      value: obj.daily
    });
  }

  if (!obj.hourly) {
    errors.push({
      field: 'hourly',
      message: 'Hourly weather data is required',
      code: 'MISSING_FIELD',
      value: obj.hourly
    });
  }

  // Validate time arrays exist and are arrays
  const daily = obj.daily as Record<string, unknown> | undefined;
  const hourly = obj.hourly as Record<string, unknown> | undefined;

  if (daily?.time && !Array.isArray(daily.time)) {
    errors.push({
      field: 'daily.time',
      message: 'Daily time must be an array',
      code: 'INVALID_TYPE',
      value: daily.time
    });
  }

  if (hourly?.time && !Array.isArray(hourly.time)) {
    errors.push({
      field: 'hourly.time',
      message: 'Hourly time must be an array',
      code: 'INVALID_TYPE',
      value: hourly.time
    });
  }

  // Validate that time arrays have the same length as data arrays
  if (daily?.time && daily.weathercode && Array.isArray(daily.time) && Array.isArray(daily.weathercode) && daily.time.length !== daily.weathercode.length) {
    errors.push({
      field: 'daily',
      message: 'Daily time array length must match data array lengths',
      code: 'ARRAY_LENGTH_MISMATCH',
      value: { timeLength: daily.time.length, dataLength: daily.weathercode.length }
    });
  }

  if (hourly?.time && hourly.temperature_2m && Array.isArray(hourly.time) && Array.isArray(hourly.temperature_2m) && hourly.time.length !== hourly.temperature_2m.length) {
    errors.push({
      field: 'hourly',
      message: 'Hourly time array length must match data array lengths',
      code: 'ARRAY_LENGTH_MISMATCH',
      value: { timeLength: hourly.time.length, dataLength: hourly.temperature_2m.length }
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates coordinate values
 */
export function validateCoordinates(lat: unknown, lng: unknown): ValidationResult {
  const errors: ResponseValidationError[] = [];

  if (typeof lat !== 'number' || isNaN(lat)) {
    errors.push({
      field: 'latitude',
      message: 'Latitude must be a valid number',
      code: 'INVALID_TYPE',
      value: lat
    });
  } else if (lat < -90 || lat > 90) {
    errors.push({
      field: 'latitude',
      message: 'Latitude must be between -90 and 90',
      code: 'INVALID_RANGE',
      value: lat
    });
  }

  if (typeof lng !== 'number' || isNaN(lng)) {
    errors.push({
      field: 'longitude',
      message: 'Longitude must be a valid number',
      code: 'INVALID_TYPE',
      value: lng
    });
  } else if (lng < -180 || lng > 180) {
    errors.push({
      field: 'longitude',
      message: 'Longitude must be between -180 and 180',
      code: 'INVALID_RANGE',
      value: lng
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates date range
 */
export function validateDateRange(startDate: unknown, endDate: unknown): ValidationResult {
  const errors: ResponseValidationError[] = [];

  if (typeof startDate !== 'string') {
    errors.push({
      field: 'startDate',
      message: 'Start date must be a string',
      code: 'INVALID_TYPE',
      value: startDate
    });
  } else {
    const start = new Date(startDate);
    if (isNaN(start.getTime())) {
      errors.push({
        field: 'startDate',
        message: 'Start date must be a valid date string',
        code: 'INVALID_DATE',
        value: startDate
      });
    }
  }

  if (typeof endDate !== 'string') {
    errors.push({
      field: 'endDate',
      message: 'End date must be a string',
      code: 'INVALID_TYPE',
      value: endDate
    });
  } else {
    const end = new Date(endDate);
    if (isNaN(end.getTime())) {
      errors.push({
        field: 'endDate',
        message: 'End date must be a valid date string',
        code: 'INVALID_DATE',
        value: endDate
      });
    }
  }

  // Check date order if both are valid
  if (errors.length === 0) {
    const start = new Date(startDate as string);
    const end = new Date(endDate as string);
    if (start > end) {
      errors.push({
        field: 'dateRange',
        message: 'Start date must be before or equal to end date',
        code: 'INVALID_ORDER',
        value: { start: startDate, end: endDate }
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Sanitizes and validates string input
 */
export function sanitizeString(input: unknown, fieldName: string, maxLength: number = 255): ValidationResult {
  const errors: ResponseValidationError[] = [];

  if (input === null || input === undefined) {
    errors.push({
      field: fieldName,
      message: `${fieldName} is required`,
      code: 'MISSING_FIELD',
      value: input
    });
    return { isValid: false, errors };
  }

  if (typeof input !== 'string') {
    errors.push({
      field: fieldName,
      message: `${fieldName} must be a string`,
      code: 'INVALID_TYPE',
      value: input
    });
    return { isValid: false, errors };
  }

  const sanitized = input.trim();

  if (sanitized.length === 0) {
    errors.push({
      field: fieldName,
      message: `${fieldName} cannot be empty`,
      code: 'EMPTY_STRING',
      value: input
    });
  }

  if (sanitized.length > maxLength) {
    errors.push({
      field: fieldName,
      message: `${fieldName} cannot exceed ${maxLength} characters`,
      code: 'TOO_LONG',
      value: input
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: errors.length === 0 ? sanitized : undefined
  };
}