/**
 * This file provides functions for interacting with the Backend-for-Frontend (BFF) server.
 * These functions can be used by the Preact components to fetch data from the server.
 */

import { DailyWeatherData, HourlyWeatherData } from './open-meteo';
import { Location, ErrorResponse, WeatherDataResponse } from './types';
import { getEnvVar } from './utils/env';
import { NetworkError, APIError, ValidationError, wrapError } from './errors';
import { validateLocationData, validateWeatherData, validateDateRange } from './utils/responseValidator';

// Get API base URL from environment variable with proper validation
const API_BASE_URL = (() => {
  const apiUrl = getEnvVar('API_BASE_URL');
  if (apiUrl) {
    // Validate the URL format
    try {
      const url = new URL(apiUrl);
      // Only allow http/https protocols and ensure it's not pointing to localhost in production
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        return apiUrl;
      }
    } catch {
      // Invalid URL format
    }
  }

  // Fallback to default, but only in development
  const nodeEnv = getEnvVar('NODE_ENV') || 'development';
  if (nodeEnv === 'production') {
    throw new Error('API_BASE_URL environment variable is required in production');
  }

  return 'http://localhost:3001/api';
})();

// API timeout in milliseconds
const API_TIMEOUT_MS = 10000;

/**
 * Generic API call function with standardized error handling and timeout
 */
async function apiCall<T>(url: string): Promise<T> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS); // 10 second timeout

    const response = await fetch(url, {
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      // Try to parse error response
      let errorData: ErrorResponse;
      try {
        errorData = await response.json();
      } catch {
        errorData = {
          error: `HTTP ${response.status}: ${response.statusText}`,
          statusCode: response.status
        };
      }

      throw new APIError(
        errorData.error || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        errorData
      );
    }

    return await response.json();
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new NetworkError('Request timed out. Please try again.');
      }
      throw wrapError(error, 'API call failed');
    }
    throw new Error('Unknown error occurred');
  }
}

/**
 * Searches for locations by calling the BFF's /api/search endpoint.
 * @param query The search query.
 * @returns A promise that resolves to an array of matching locations.
 */
export const bffSearchLocations = async (query: string): Promise<Location[]> => {
  if (!query || query.trim().length === 0) {
    throw new ValidationError('Search query cannot be empty', 'query');
  }

  const trimmedQuery = query.trim();
  const response = await apiCall<Location[]>(`${API_BASE_URL}/search?q=${encodeURIComponent(trimmedQuery)}`);

  // Validate each location in the response
  for (let i = 0; i < response.length; i++) {
    const locationValidation = validateLocationData(response[i]);
    if (!locationValidation.isValid) {
      throw new APIError(
        `Invalid location data at index ${i}: ${locationValidation.errors.map(e => e.message).join(', ')}`,
        500,
        response
      );
    }
  }

  return response;
};

/**
 * Gets historical weather data by calling the BFF's /api/weather endpoint.
 * @param location The location object.
 * @param startDate The start date of the date range.
 * @param endDate The end date of the date range.
 * @returns A promise that resolves to the weather data.
 */
export const bffGetWeather = async (location: Location, startDate: string, endDate: string): Promise<WeatherDataResponse> => {
  // Validate inputs
  if (!location) {
    throw new ValidationError('Location is required', 'location');
  }

  if (!startDate || !endDate) {
    throw new ValidationError('Start and end dates are required', 'dates');
  }

  // Validate location data structure
  const locationValidation = validateLocationData(location);
  if (!locationValidation.isValid) {
    throw new ValidationError(
      `Invalid location data: ${locationValidation.errors.map(e => e.message).join(', ')}`,
      'location'
    );
  }

  // Validate date range
  const dateValidation = validateDateRange(startDate, endDate);
  if (!dateValidation.isValid) {
    throw new ValidationError(
      `Invalid date range: ${dateValidation.errors.map(e => e.message).join(', ')}`,
      'dates'
    );
  }

  // Make API call with enhanced error handling
  const response = await apiCall<{ daily: DailyWeatherData; hourly: HourlyWeatherData }>(
    `${API_BASE_URL}/weather?lat=${location.latitude}&lon=${location.longitude}&timezone=${encodeURIComponent(location.timezone)}&start=${startDate}&end=${endDate}`
  );

  // Validate response structure
  const weatherValidation = validateWeatherData(response);
  if (!weatherValidation.isValid) {
    throw new APIError(
      `Invalid weather data response: ${weatherValidation.errors.map(e => e.message).join(', ')}`,
      500,
      response
    );
  }

  // Return properly typed response
  return response as WeatherDataResponse;
};

// Geographic coordinate bounds
const MIN_LATITUDE = -90;
const MAX_LATITUDE = 90;
const MIN_LONGITUDE = -180;
const MAX_LONGITUDE = 180;

/**
 * Validate geographic coordinates
 */
export function validateCoordinates(latitude: number, longitude: number): void {
  if (latitude < MIN_LATITUDE || latitude > MAX_LATITUDE) {
    throw new ValidationError('Latitude must be between -90 and 90', 'latitude');
  }

  if (longitude < MIN_LONGITUDE || longitude > MAX_LONGITUDE) {
    throw new ValidationError('Longitude must be between -180 and 180', 'longitude');
  }
}


/**
 * Reverse geocode coordinates to get location information
 */
export async function bffReverseGeocode(latitude: number, longitude: number): Promise<Location> {
  try {
    validateCoordinates(latitude, longitude);
    return await apiCall<Location>(
      `${API_BASE_URL}/reverse-geocode?lat=${latitude}&lon=${longitude}`
    );
  } catch (error: unknown) {
    throw wrapError(error, 'Reverse geocode failed');
  }
}
