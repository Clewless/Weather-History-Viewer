/**
 * Application constants
 */

// Default location coordinates (New York City)
export const DEFAULT_LATITUDE = 40.7128;
export const DEFAULT_LONGITUDE = -74.0060;

// Cache TTL values (in milliseconds)
export const CACHE_TTL = {
  SEARCH: 5 * 60 * 1000,        // 5 minutes
  WEATHER: 60 * 60 * 1000,       // 1 hour
  REVERSE_GEOCODE: 30 * 60 * 1000, // 30 minutes
  SERVER_SEARCH: 5 * 60 * 1000,  // 5 minutes
  SERVER_WEATHER: 30 * 60 * 1000, // 30 minutes
  SERVER_REVERSE_GEOCODE: 10 * 60 * 1000, // 10 minutes
} as const;

// Geographic bounds
export const GEO_BOUNDS = {
  MIN_LATITUDE: -90,
  MAX_LATITUDE: 90,
  MIN_LONGITUDE: -180,
  MAX_LONGITUDE: 180,
} as const;

// API configuration
export const API_CONFIG = {
  TIMEOUT: 10000, // 10 seconds
  RETRIES: 3,
} as const;

// Geolocation configuration
export const GEOLOCATION_CONFIG = {
  ENABLE_HIGH_ACCURACY: true,
  TIMEOUT: 10000, // 10 seconds
  MAXIMUM_AGE: 300000, // 5 minutes
} as const;

// Rate limiting configuration
export const RATE_LIMITS = {
  GENERAL: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 100,
  },
  WEATHER: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 50,
  },
} as const;

// Fallback location data
export const FALLBACK_LOCATION = {
  ID: 0,
  NAME: 'Unknown Location',
  LATITUDE: 0,
  LONGITUDE: 0,
  ELEVATION: 0,
  FEATURE_CODE: 'PPL',
  COUNTRY_CODE: 'XX',
  TIMEZONE: 'UTC',
  COUNTRY: 'Unknown',
} as const;