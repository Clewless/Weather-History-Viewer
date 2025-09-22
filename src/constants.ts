/**
 * Application constants organized by category
 */

// =========================================
// LOCATION & GEOGRAPHY
// =========================================

/** Default location coordinates (New York City) */
export const DEFAULT_LATITUDE = 40.7128;
export const DEFAULT_LONGITUDE = -74.0060;

/** Geographic bounds for coordinate validation */
export const GEO_BOUNDS = {
  MIN_LATITUDE: -90,
  MAX_LATITUDE: 90,
  MIN_LONGITUDE: -180,
  MAX_LONGITUDE: 180,
} as const;

import { FallbackLocation } from './types';

/** Fallback location data when geolocation fails */
export const FALLBACK_LOCATION: FallbackLocation = {
  ID: 0,
  NAME: 'Unknown Location',
  LATITUDE: 0,
  LONGITUDE: 0,
  ELEVATION: 0,
  FEATURE_CODE: 'PPL',
  COUNTRY_CODE: 'XX',
  TIMEZONE: 'UTC',
  COUNTRY: 'Unknown',
};

// =========================================
// CACHE CONFIGURATION
// =========================================

/** Cache TTL values (in milliseconds) */
export const CACHE_TTL = {
  SEARCH: 5 * 60 * 1000,        // 5 minutes
  WEATHER: 30 * 60 * 1000,      // 30 minutes
  REVERSE_GEOCODE: 30 * 60 * 1000, // 30 minutes
  SERVER_DEFAULT: 30 * 60 * 1000, // 30 minutes (general server cache)
} as const;

// =========================================
// API CONFIGURATION
// =========================================

/** API request configuration */
export const API_CONFIG = {
  TIMEOUT: 10000, // 10 seconds
  RETRIES: 3,
} as const;

// =========================================
// GEOLOCATION CONFIGURATION
// =========================================

/** Browser geolocation API configuration */
export const GEOLOCATION_CONFIG = {
  ENABLE_HIGH_ACCURACY: true,
  TIMEOUT: 10000, // 10 seconds
  MAXIMUM_AGE: 300000, // 5 minutes
} as const;

// =========================================
// RATE LIMITING
// =========================================

/** Rate limiting configuration for API endpoints */
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