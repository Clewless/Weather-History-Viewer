/**
 * This file provides functions for interacting with the Backend-for-Frontend (BFF) server.
 * These functions can be used by the Preact components to fetch data from the server.
 */

import { Location, DailyWeatherData, HourlyWeatherData } from './open-meteo';
import { ErrorResponse } from './types';
import { getEnvVar } from './utils/env';

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

      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    // console.error(`API call failed: ${url}`, error);
    throw error instanceof Error ? error : new Error('Unknown error occurred');
  }
}

/**
 * Searches for locations by calling the BFF's /api/search endpoint.
 * @param query The search query.
 * @returns A promise that resolves to an array of matching locations.
 */
export const bffSearchLocations = async (query: string): Promise<Location[]> => {
  if (!query || query.trim().length === 0) {
    throw new Error('Search query cannot be empty');
  }
  return apiCall<Location[]>(`${API_BASE_URL}/search?q=${encodeURIComponent(query.trim())}`);
};

/**
 * Gets historical weather data by calling the BFF's /api/weather endpoint.
 * @param location The location object.
 * @param startDate The start date of the date range.
 * @param endDate The end date of the date range.
 * @returns A promise that resolves to the weather data.
 */
export const bffGetWeather = async (location: Location, startDate: string, endDate: string): Promise<{ daily: DailyWeatherData; hourly: HourlyWeatherData }> => {
  // Validate inputs
  if (!location) {
    throw new Error('Location is required');
  }

  if (!startDate || !endDate) {
    throw new Error('Start and end dates are required');
  }

  return apiCall<{ daily: DailyWeatherData; hourly: HourlyWeatherData }>(
    `${API_BASE_URL}/weather?lat=${location.latitude}&lon=${location.longitude}&timezone=${encodeURIComponent(location.timezone)}&start=${startDate}&end=${endDate}`
  );
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
    throw new Error('Latitude must be between -90 and 90');
  }
  
  if (longitude < MIN_LONGITUDE || longitude > MAX_LONGITUDE) {
    throw new Error('Longitude must be between -180 and 180');
  }
}

// Get API base URL from environment variable or use default
// In production, you might want to set API_BASE_URL to point to your deployed backend
// For development, it defaults to http://localhost:3000/api
const API_BASE_URL = getEnvVar('API_BASE_URL');

/**
 * Reverse geocode coordinates to get location information
 */
export async function bffReverseGeocode(latitude: number, longitude: number): Promise<Location> {
  return apiCall<Location>(
    `${API_BASE_URL}/reverse-geocode?lat=${latitude}&lon=${longitude}`
  );
}
