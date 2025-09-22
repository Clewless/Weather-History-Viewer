/**
 * Unified location type definitions to ensure consistency across the application
 */

/**
 * Core location interface representing a geographic location
 */
export interface Location {
  /** Unique identifier for the location */
  id: number;
  /** Name of the location (city, region, etc.) */
  name: string;
  /** Geographic latitude (-90 to 90) */
  latitude: number;
  /** Geographic longitude (-180 to 180) */
  longitude: number;
  /** Elevation in meters */
  elevation: number;
  /** Feature code from geocoding API */
  feature_code: string;
  /** ISO country code (e.g., 'US', 'CA') */
  country_code: string;
  /** Timezone identifier (e.g., 'America/New_York') */
  timezone: string;
  /** Country name */
  country: string;
  /** Optional: First-level administrative division (state, province, etc.) */
  admin1?: string | null;
  /** Optional: Second-level administrative division (county, region, etc.) */
  admin2?: string | null;
  /** Optional: Third-level administrative division (city, district, etc.) */
  admin3?: string | null;
  /** Optional: Population count */
  population?: number | null;
  /** Optional: Array of postal codes */
  postcodes?: string[];
  /** Optional: Country ID from geocoding API */
  country_id?: number | null;
  /** Optional: Administrative division IDs */
  admin1_id?: number | null;
  admin2_id?: number | null;
  admin3_id?: number | null;
  /** Optional: Flag indicating this is a fallback location */
  isFallback?: boolean;
}

/**
 * Minimal location interface for basic operations
 */
export interface WeatherLocation {
  /** Geographic latitude (-90 to 90) */
  latitude: number;
  /** Geographic longitude (-180 to 180) */
  longitude: number;
  /** Timezone identifier (e.g., 'America/New_York') */
  timezone: string;
}

/**
 * Location search result with enhanced metadata
 */
export interface LocationSearchResult extends Location {
  /** Search relevance score (if available from API) */
  score?: number;
  /** Distance from search center (if available) */
  distance?: number;
}

/**
 * Fallback location configuration
 */
export interface FallbackLocation {
  /** Default fallback location ID */
  ID: number;
  /** Default fallback location name */
  NAME: string;
  /** Default fallback latitude */
  LATITUDE: number;
  /** Default fallback longitude */
  LONGITUDE: number;
  /** Default fallback elevation */
  ELEVATION: number;
  /** Default fallback feature code */
  FEATURE_CODE: string;
  /** Default fallback country code */
  COUNTRY_CODE: string;
  /** Default fallback timezone */
  TIMEZONE: string;
  /** Default fallback country name */
  COUNTRY: string;
}