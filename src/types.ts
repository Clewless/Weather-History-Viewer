/**
 * Type definitions for enhanced type safety across the application
 */

import { DailyWeatherData, HourlyWeatherData } from './open-meteo';
import { Location, LocationSearchResult, FallbackLocation } from './types/location';

/**
 * Standardized error response format for API communication
 * This interface defines a consistent error structure that both frontend and backend can use
 */
export interface ErrorResponse {
  error: string;
  field?: string;
  details?: string;
  statusCode?: number;
  timestamp?: string;
  code?: string;
  stack?: string; // Only in development
}

/**
 * Standardized success response format
 */
export interface SuccessResponse<T> {
  data: T;
  timestamp?: string;
  statusCode?: number;
}

/**
 * Generic API response wrapper that can contain either success or error data
 */
export type APIResponse<T> = SuccessResponse<T> | ErrorResponse;

/**
 * Paginated response for APIs that support pagination
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  timestamp?: string;
}

// Re-export location types for convenience
export type { Location, LocationSearchResult, FallbackLocation };

/**
 * Weather data response with proper null safety
 */
export interface WeatherDataResponse {
  daily: DailyWeatherData;
  hourly: HourlyWeatherData;
  metadata?: {
    source: string;
    generatedAt: string;
    location: {
      latitude: number;
      longitude: number;
      timezone: string;
    };
  };
}

/**
 * Geolocation position with enhanced accuracy information
 */
export interface GeolocationPosition {
  coords: {
    latitude: number;
    longitude: number;
    accuracy: number;
    altitude?: number | null;
    altitudeAccuracy?: number | null;
    heading?: number | null;
    speed?: number | null;
  };
  timestamp: number;
}

/**
 * Geolocation error with specific error types
 */
export interface GeolocationError {
  code: number;
  message: string;
  PERMISSION_DENIED: 1;
  POSITION_UNAVAILABLE: 2;
  TIMEOUT: 3;
}

/**
 * Cache entry with comprehensive metadata
 */
export interface CacheEntry<T> {
  data: T;
  expiry: number;
  lastAccessed: number;
  createdAt: number;
  accessCount: number;
  size: number; // Size in bytes
  tags?: string[]; // For cache organization
}

/**
 * HTTP request configuration with comprehensive options
 */
export interface RequestConfig {
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean>;
  validateStatus?: (status: number) => boolean;
}

/**
 * HTTP response with enhanced metadata
 */
export interface HTTPResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  config: RequestConfig;
  request?: unknown;
}

/**
 * API endpoint configuration
 */
export interface APIEndpoint {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  timeout?: number;
  retries?: number;
  requiresAuth?: boolean;
}

/**
 * Rate limiting information
 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  resetDate: Date;
}

/**
 * Weather API specific types with enhanced validation
 */
export interface WeatherAPIParams {
  latitude: number;
  longitude: number;
  start_date: string;
  end_date: string;
  timezone: string;
  daily?: string[];
  hourly?: string[];
  temperature_unit?: 'celsius' | 'fahrenheit';
  windspeed_unit?: 'kmh' | 'ms' | 'mph' | 'kn';
  precipitation_unit?: 'mm' | 'inch';
}

/**
 * Validation result for comprehensive input validation
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  sanitized?: unknown;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: unknown;
}

/**
 * Cache-related types
 */
export interface CacheItem<T> {
  data: T;
  expiry: number;
  lastAccessed: number;
  createdAt: number;
  accessCount: number;
  size: number; // Size in bytes
  tags?: string[]; // For cache organization
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  maxSize: number;
  ttl: number;
  cleanupInterval: number;
  hitRate: number;
}

/**
 * Environment configuration interface
 */
export interface EnvironmentConfig {
  PORT: number;
  FRONTEND_PORT: number;
  CORS_ORIGIN: string;
  NODE_ENV: 'development' | 'production' | 'test';
  OPEN_METEO_API_KEY?: string;
  API_BASE_URL: string;
}

/**
 * Geolocation configuration interface
 */
export interface GeolocationConfig {
  enableHighAccuracy: boolean;
  timeout: number;
  maximumAge: number;
}

/**
 * API configuration interface
 */
export interface ApiConfig {
  timeout: number;
  retries: number;
  baseUrl: string;
}

/**
 * Rate limiting configuration interface
 */
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}
