import axios, { AxiosError } from 'axios';
import axiosRetry, { exponentialDelay, isRetryableError } from 'axios-retry';
import tzLookup from 'tz-lookup';

import { APIError, wrapError } from './errors';
import { validateDateRangeWithErrors, validateCoordinatesWithErrors, validateTimezoneWithErrors } from './utils/validation';
import { validateWithZod, safeValidateWithZod } from './utils/zodValidation';
import { getEnvVar } from './utils/env';
import { parseAPITimeString } from './utils/dateUtils';
import { Location } from './types';
// Import Zod schemas
import {
  WeatherDataResponseSchema
} from './schemas/weatherSchema';
import {
  LocationSchema,
  WeatherLocationSchema
} from './schemas/locationSchema';

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
 * Searches for locations using the Nominatim (OpenStreetMap) Geocoding API.
 * @param query The search query (e.g., a city name).
 * @returns A promise that resolves to an array of matching locations.
 */
export const searchLocations = async (query: string): Promise<Location[]> => {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.append('format', 'json');
  url.searchParams.append('q', query);
  url.searchParams.append('limit', '5');
  url.searchParams.append('addressdetails', '1');
  const headers: Record<string, string> = {
    'User-Agent': 'WeatherHistoryViewer/1.0'
  };

  try {
    const response = await axiosInstance.get(url.toString(), { headers });
    const { data } = response;

    if (!Array.isArray(data)) {
      throw new APIError('Invalid geocoding response: expected array', response.status, data);
    }

    // Map Nominatim response to Location interface
    const locations: Location[] = [];
    for (const item of data) {
      if (item.lat && item.lon && item.display_name) {
        const latitude = parseFloat(item.lat);
        const longitude = parseFloat(item.lon);

        const location: Location = {
          id: parseInt(item.place_id) || Math.floor(Math.random() * 1000000),
          name: item.display_name?.split(',')[0]?.trim() || item.display_name || 'Unknown Location',
          latitude,
          longitude,
          elevation: 0,
          feature_code: item.class || 'PPL',
          country_code: item.address?.country_code?.toUpperCase() || 'XX',
          timezone: tzLookup(latitude, longitude) || 'UTC',
          country: item.address?.country || 'Unknown',
          admin1: item.address?.state || '',
          admin2: item.address?.county || '',
          admin3: item.address?.city || item.address?.town || item.address?.village || '',
          population: 0
        };

        // Validate the location data with Zod
        const validationResult = safeValidateWithZod(LocationSchema, location);
        if (validationResult.success) {
          locations.push(validationResult.data as Location);
        } else {
          console.warn('Invalid location data received from Nominatim API:', validationResult.error);
          // We'll skip invalid locations rather than failing the entire request
        }
      }
    }

    return locations;
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

    console.log('[DEBUG] open-meteo: Raw API time formats', {
      dailyTimeSample: data.daily.time[0],
      hourlyTimeSample: data.hourly.time[0],
      timezone: params.timezone,
      startDate: params.start_date,
      endDate: params.end_date
    });

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
 * Gets the location for a given latitude and longitude using Nominatim (OpenStreetMap) reverse geocoding.
 * @param latitude The latitude.
 * @param longitude The longitude.
 * @returns A promise that resolves to a location.
 */
export const reverseGeocode = async (
    latitude: number,
    longitude: number
  ): Promise<Location> => {
    // Use Nominatim for reverse geocoding since Open-Meteo doesn't support it
    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.append('format', 'json');
    url.searchParams.append('lat', latitude.toString());
    url.searchParams.append('lon', longitude.toString());
    url.searchParams.append('addressdetails', '1');
    url.searchParams.append('zoom', '10'); // Get reasonably detailed address
    const headers: Record<string, string> = {
      'User-Agent': 'WeatherHistoryViewer/1.0'
    };

    try {
      console.log(`[DEBUG] Reverse geocoding request: ${url.toString()}`);
      const response = await axiosInstance.get(url.toString(), { headers });
      const {data} = response;
      console.log(`[DEBUG] Reverse geocoding response status: ${response.status}`);
      console.log(`[DEBUG] Reverse geocoding response data:`, data);

      // Check if we got a valid response
      if (data.error) {
        console.error(`[DEBUG] Reverse geocode API returned error: ${data.error}`);
        throw new APIError(`Reverse geocode API error: ${data.error}`, response.status, data);
      }

      if (!data || !data.lat || !data.lon) {
        console.error(`[DEBUG] Reverse geocode API returned invalid data for coordinates: ${latitude}, ${longitude}`);
        throw new APIError('Invalid reverse geocode response: missing coordinate data', response.status, data);
      }

      // Map Nominatim response to Location interface
      const location: Location = {
        id: parseInt(data.place_id) || Math.floor(Math.random() * 1000000), // Use place_id or generate ID
        name: data.display_name?.split(',')[0]?.trim() || data.display_name || 'Unknown Location',
        latitude: parseFloat(data.lat),
        longitude: parseFloat(data.lon),
        elevation: 0, // Elevation not provided by Nominatim
        feature_code: data.class || 'PPL',
        country_code: data.address?.country_code?.toUpperCase() || 'XX',
        timezone: tzLookup(latitude, longitude) || 'UTC', // Use tz-lookup library
        country: data.address?.country || 'Unknown',
        admin1: data.address?.state || '',
        admin2: data.address?.county || '',
        admin3: data.address?.city || data.address?.town || data.address?.village || '',
        population: 0 // Population not provided by Nominatim
      };

      console.log(`[DEBUG] Mapped location:`, location);

      // Validate the location data with Zod
      const validatedLocation = validateWithZod(LocationSchema, location, 'Invalid location data from reverse geocode API') as Location;

      if (!validatedLocation.latitude || !validatedLocation.longitude || !validatedLocation.timezone || !validatedLocation.name) {
        console.error(`[DEBUG] Reverse geocode response missing required fields:`, validatedLocation);
        throw new APIError('Invalid reverse geocode response: missing required location fields', response.status, data);
      }

      console.log(`[DEBUG] Successfully reverse geocoded to: ${validatedLocation.name}, ${validatedLocation.country}`);
      return validatedLocation;
    } catch (error: unknown) {
      // Enhanced logging for debugging purposes
      console.error(`[DEBUG] Reverse geocoding failed for coordinates (${latitude}, ${longitude}):`, error instanceof Error ? error.message : error);
      if (error instanceof AxiosError) {
        console.error(`[DEBUG] Response status: ${error.response?.status}`);
        console.error(`[DEBUG] Response data:`, error.response?.data);
      }

      // Re-throw the error to be handled by the caller
      throw error;
    }
  };
