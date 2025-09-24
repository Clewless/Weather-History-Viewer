import axios from 'axios';
import axiosRetry, { exponentialDelay, isRetryableError } from 'axios-retry';
import tzLookup from 'tz-lookup';

import { APIError, wrapError } from './errors.js';
import { validateDateRangeWithErrors, validateCoordinatesWithErrors, validateTimezoneWithErrors } from './utils/validation.js';
import { validateWithZod, safeValidateWithZod } from './utils/zodValidation.js';
import { getEnvVar } from './utils/env.js';
import { parseAPITimeString } from './utils/dateUtils.js';
import { Location } from './types.js';
import { FALLBACK_LOCATION } from './constants.js';
// Import Zod schemas
import {
  WeatherDataResponseSchema
} from './schemas/weatherSchema.js';
import {
  LocationSchema,
  WeatherLocationSchema
} from './schemas/locationSchema.js';

/**
 * Core location data required for weather operations
 */
export interface WeatherLocation {
  latitude: number;
  longitude: number;
  timezone: string;
}
/**
 * Represents daily weather data from the Open-Meteo Historical Weather API.
 */
export interface DailyWeatherData {
  time: Date[];
  weathercode: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  apparent_temperature_max: number[];
  apparent_temperature_min: number[];
  sunrise: string[];
  sunset: string[];
  precipitation_sum: number[];
  rain_sum: number[];
  showers_sum: number[];
  snowfall_sum: number[];
  precipitation_hours: number[];
  windspeed_10m_max: number[];
  windgusts_10m_max: number[];
  winddirection_10m_dominant: number[];
  shortwave_radiation_sum: number[];
  et0_fao_evapotranspiration: number[];
}

/**
 * Represents hourly weather data from the Open-Meteo Historical Weather API.
 */
export interface HourlyWeatherData {
  time: Date[];
  temperature_2m: number[];
  relativehumidity_2m: number[];
  dewpoint_2m: number[];
  apparent_temperature: number[];
  pressure_msl: number[];
  surface_pressure: number[];
  precipitation: number[];
  rain: number[];
  snowfall: number[];
  weathercode: number[];
  cloudcover: number[];
  cloudcover_low: number[];
  cloudcover_mid: number[];
  cloudcover_high: number[];
  shortwave_radiation: number[];
  direct_radiation: number[];
  diffuse_radiation: number[];
  direct_normal_irradiance: number[];
  windspeed_10m: number[];
  winddirection_10m: number[];
  windgusts_10m: number[];
  temperature_80m: number[];
}

// Configure axios with retry logic and timeout
const axiosInstance = axios.create({
  timeout: 10000, // 10 seconds timeout
});
axiosRetry(axiosInstance, {
  retries: 3, // Number of retry attempts
  retryDelay: exponentialDelay, // Exponential backoff
  retryCondition: (error) => {
    // Retry on network errors, timeouts, or 5xx status codes
    return isRetryableError(error) ||
           error.code === 'ECONNABORTED' ||
           (!!error.response?.status && error.response.status >= 500);
  },
});

/**
 * Searches for locations using the Open-Meteo Geocoding API.
 * @param query The search query (e.g., a city name).
 * @returns A promise that resolves to an array of matching locations.
 */
export const searchLocations = async (query: string): Promise<Location[]> => {
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.searchParams.append('name', query);
  url.searchParams.append('count', '5');
  // Add API key to requests if provided in environment variables
  // Using an API key increases rate limits and is recommended for production use
  // Get a free key at https://open-meteo.com/en/docs
  const headers: Record<string, string> = {};
  const apiKey = getEnvVar('OPEN_METEO_API_KEY');
  if (apiKey) {
    headers['X-API-Key'] = apiKey;
  }

  try {
    const response = await axiosInstance.get(url.toString(), { headers });
    const {data} = response;

    if (!data.results || !Array.isArray(data.results)) {
      throw new APIError('Invalid geocoding response: missing or invalid results array', response.status, data);
    }

    // Validate each location in the results array
    const validatedLocations: Location[] = [];
    for (const location of data.results) {
      const validationResult = safeValidateWithZod(LocationSchema, location);
      if (validationResult.success) {
        validatedLocations.push(validationResult.data as Location);
      } else {
        console.warn('Invalid location data received from API:', validationResult.error);
        // We'll skip invalid locations rather than failing the entire request
      }
    }

    return validatedLocations;
  } catch (error: unknown) {
    throw wrapError(error, 'Geocoding search failed');
  }
};

/**
 * Fetches historical weather data for a given location and date range.
 * @param location The location to fetch weather data for.
 * @param startDate The start date of the date range (YYYY-MM-DD).
 * @param endDate The end date of the date range (YYYY-MM-DD).
 * @returns A promise that resolves to an object containing daily and hourly weather data.
 */
export const getHistoricalWeather = async (
  location: WeatherLocation,
  startDate: string,
  endDate: string
): Promise<{ daily: DailyWeatherData; hourly: HourlyWeatherData }> => {
  // Validate inputs before making API call
  validateDateRangeWithErrors(startDate, endDate);
  validateCoordinatesWithErrors(location.latitude, location.longitude);
  validateTimezoneWithErrors(location.timezone);

  // Validate the location object with Zod
  const validatedLocation = validateWithZod(WeatherLocationSchema, location, 'Invalid weather location') as { latitude: number; longitude: number; timezone: string };

  const params = {
    latitude: validatedLocation.latitude,
    longitude: validatedLocation.longitude,
    start_date: startDate,
    end_date: endDate,
    daily: [
      'weathercode',
      'temperature_2m_max',
      'temperature_2m_min',
      'apparent_temperature_max',
      'apparent_temperature_min',
      'sunrise',
      'sunset',
      'precipitation_sum',
      'rain_sum',
      'showers_sum',
      'snowfall_sum',
      'precipitation_hours',
      'windspeed_10m_max',
      'windgusts_10m_max',
      'winddirection_10m_dominant',
      'shortwave_radiation_sum',
      'et0_fao_evapotranspiration',
    ].join(','),
    hourly: [
      'temperature_2m',
      'relativehumidity_2m',
      'dewpoint_2m',
      'apparent_temperature',
      'pressure_msl',
      'surface_pressure',
      'precipitation',
      'rain',
      'snowfall',
      'weathercode',
      'cloudcover',
      'cloudcover_low',
      'cloudcover_mid',
      'cloudcover_high',
      'shortwave_radiation',
      'direct_radiation',
      'diffuse_radiation',
      'direct_normal_irradiance',
      'windspeed_10m',
      'winddirection_10m',
      'windgusts_10m',
      'temperature_80m',
    ].join(','),
    timezone: validatedLocation.timezone,
  };

  const url = new URL('https://archive-api.open-meteo.com/v1/archive');
  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      url.searchParams.append(key, value.join(','));
    } else {
      url.searchParams.append(key, String(value));
    }
  });
  const headers: Record<string, string> = {};
  const apiKey = getEnvVar('OPEN_METEO_API_KEY');
  if (apiKey) {
    headers['X-API-Key'] = apiKey;
  }

  try {
    const response = await axiosInstance.get(url.toString(), { headers });
    const {data} = response;

    if (!data.daily || !data.hourly) {
      throw new APIError('Invalid weather response: missing daily or hourly data', response.status, data);
    }

    if (!Array.isArray(data.daily.time) || !Array.isArray(data.hourly.time)) {
      throw new APIError('Invalid weather response: time arrays missing or invalid', response.status, data);
    }

    // Process time for daily data with validation
    data.daily.time = data.daily.time.map((t: string) => {
        const date = parseAPITimeString(t);
        if (!date) {
            throw new APIError(`Invalid date string in daily data: ${t}`, response.status, data);
        }
        return date;
    });

    // Process time for hourly data with validation
    data.hourly.time = data.hourly.time.map((t: string) => {
        const date = parseAPITimeString(t);
        if (!date) {
            throw new APIError(`Invalid date string in hourly data: ${t}`, response.status, data);
        }
        return date;
    });

    // Validate the response structure with Zod
    const validatedData = validateWithZod(WeatherDataResponseSchema, {
      daily: data.daily,
      hourly: data.hourly
    }, 'Invalid weather data response');

    // After processing string timestamps to Date objects, we can safely cast to the interface types
    return validatedData as unknown as { daily: DailyWeatherData; hourly: HourlyWeatherData };
  } catch (error: unknown) {
    throw wrapError(error, 'Weather API request failed');
  }
};

/**
 * Gets the location for a given latitude and longitude using the Open-Meteo Geocoding API.
 * @param latitude The latitude.
 * @param longitude The longitude.
 * @returns A promise that resolves to a location.
 */
export const reverseGeocode = async (
  latitude: number,
  longitude: number
): Promise<Location> => {
  // Try the reverse geocoding endpoint first
  const url = new URL('https://geocoding-api.open-meteo.com/v1/reverse');
  url.searchParams.append('latitude', latitude.toString());
  url.searchParams.append('longitude', longitude.toString());
  const headers: Record<string, string> = {};
  const apiKey = getEnvVar('OPEN_METEO_API_KEY');
  if (apiKey) {
    headers['X-API-Key'] = apiKey;
  }

  try {
    const response = await axiosInstance.get(url.toString(), { headers });
    const {data} = response;

    // Check if we got a valid response
    if (data.error) {
      throw new APIError(`Reverse geocode API error: ${data.reason}`, response.status, data);
    }

    if (!data.results || !Array.isArray(data.results) || data.results.length === 0) {
      throw new APIError('Invalid reverse geocode response: no results found', response.status, data);
    }

    const result = data.results[0];
    
    // Validate the location data with Zod
    const validatedLocation = validateWithZod(LocationSchema, result, 'Invalid location data from reverse geocode API') as Location;
    
    if (!validatedLocation.latitude || !validatedLocation.longitude || !validatedLocation.timezone || !validatedLocation.name) {
      throw new APIError('Invalid reverse geocode response: missing required location fields', response.status, data);
    }

    return validatedLocation;
  } catch (error: unknown) {
    // Log the error for debugging purposes
    console.error('Reverse geocoding failed:', error instanceof Error ? error.message : error);

    // If reverse geocoding fails, we'll create a fallback location
    // Create a fallback location with detected timezone from coordinates
    const fallbackLocation: Location = {
      id: FALLBACK_LOCATION.ID,
      name: `Location at ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
      latitude,
      longitude,
      elevation: FALLBACK_LOCATION.ELEVATION,
      feature_code: FALLBACK_LOCATION.FEATURE_CODE,
      country_code: FALLBACK_LOCATION.COUNTRY_CODE,
      timezone: tzLookup(latitude, longitude) || FALLBACK_LOCATION.TIMEZONE,
      country: FALLBACK_LOCATION.COUNTRY,
      // Add a flag to indicate this is a fallback location
      isFallback: true as const
    };

    // Validate the fallback location with Zod
    const validatedFallbackLocation = validateWithZod(LocationSchema, fallbackLocation, 'Invalid fallback location data') as Location;
    
    // Log when fallback is used
    console.warn(`Using fallback location for coordinates: ${latitude}, ${longitude}`);

    return validatedFallbackLocation;
  }
};
