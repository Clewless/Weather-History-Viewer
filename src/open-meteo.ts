import axios from 'axios';
import axiosRetry from 'axios-retry';
import { APIError, NetworkError, wrapError } from './errors';
import { validateDateRangeWithErrors, validateCoordinatesWithErrors, validateTimezoneWithErrors } from './utils/validation';

/**
 * Represents a location found by the Open-Meteo Geocoding API.
 */
export interface Location {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  elevation: number;
  feature_code: string;
  country_code: string;
  admin1_id?: number;
  admin2_id?: number;
  admin3_id?: number;
  timezone: string;
  population?: number;
  postcodes?: string[];
  country_id?: number;
  country: string;
  admin1?: string;
  admin2?: string;
  admin3?: string;
}

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
  retryDelay: axiosRetry.exponentialDelay, // Exponential backoff
  retryCondition: (error) => {
    // Retry on network errors, timeouts, or 5xx status codes
    return axiosRetry.isRetryableError(error) ||
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
  if (process.env.OPEN_METEO_API_KEY) {
    headers['X-API-Key'] = process.env.OPEN_METEO_API_KEY;
  }

  try {
    const response = await axiosInstance.get(url.toString(), { headers });
    const data = response.data;

    if (!data.results || !Array.isArray(data.results)) {
      throw new APIError('Invalid geocoding response: missing or invalid results array', response.status, data);
    }

    return data.results;
  } catch (error) {
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

  const params = {
    latitude: location.latitude,
    longitude: location.longitude,
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
    timezone: location.timezone,
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
  if (process.env.OPEN_METEO_API_KEY) {
    headers['X-API-Key'] = process.env.OPEN_METEO_API_KEY;
  }

  try {
    const response = await axiosInstance.get(url.toString(), { headers });
    const data = response.data;

    if (!data.daily || !data.hourly) {
      throw new Error('Invalid weather response: missing daily or hourly data');
    }

    if (!Array.isArray(data.daily.time) || !Array.isArray(data.hourly.time)) {
      throw new Error('Invalid weather response: time arrays missing or invalid');
    }

    // Process time for daily data with validation
    data.daily.time = data.daily.time.map((t: string) => {
        const date = new Date(t);
        if (isNaN(date.getTime())) {
            throw new Error(`Invalid date string in daily data: ${t}`);
        }
        return date;
    });

    // Process time for hourly data with validation
    data.hourly.time = data.hourly.time.map((t: string) => {
        const date = new Date(t);
        if (isNaN(date.getTime())) {
            throw new Error(`Invalid date string in hourly data: ${t}`);
        }
        return date;
    });

    return data;
  } catch (error) {
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
  if (process.env.OPEN_METEO_API_KEY) {
    headers['X-API-Key'] = process.env.OPEN_METEO_API_KEY;
  }

  try {
    const response = await axiosInstance.get(url.toString(), { headers });
    const data = response.data;

    // Check if we got a valid response
    if (data.error) {
      throw new Error(`Reverse geocode API error: ${data.reason}`);
    }

    if (!data.results || !Array.isArray(data.results) || data.results.length === 0) {
      throw new Error('Invalid reverse geocode response: no results found');
    }

    const result = data.results[0];
    if (!result.latitude || !result.longitude || !result.timezone || !result.name) {
      throw new Error('Invalid reverse geocode response: missing required location fields');
    }

    return result;
  } catch (error) {
    // If reverse geocoding fails, we'll create a fallback location
    console.warn('Reverse geocoding failed, using UTC timezone as fallback. Weather times may be inaccurate.', wrapError(error, 'Reverse geocoding'));
    
    // Create a fallback location with the provided coordinates and UTC timezone
    const fallbackLocation: Location = {
      id: 0,
      name: `Location at ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
      latitude,
      longitude,
      elevation: 0,
      feature_code: 'PPL',
      country_code: 'XX',
      timezone: 'UTC',
      country: 'Unknown'
    };
    
    return fallbackLocation;
  }
};
