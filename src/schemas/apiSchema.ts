import { z } from 'zod';
import invariant from 'tiny-invariant';

import { validateNumber, validateString, validateObject } from '../utils/invariants.js';

/**
 * Zod schema for validating search API request parameters
 */
export const SearchAPIParamsSchema = z.object({
  q: z.string().min(1).max(100).regex(/^[a-zA-Z0-9\s,.\-_]+$/),
});

/**
 * Zod schema for validating weather API request parameters
 */
export const WeatherAPIRequestSchema = z.object({
  lat: z.preprocess((val) => Number(val), z.number().min(-90).max(90)),
  lon: z.preprocess((val) => Number(val), z.number().min(-180).max(180)),
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timezone: z.string().min(1).max(50),
});

/**
 * Zod schema for validating reverse geocode API request parameters
 */
export const ReverseGeocodeAPIParamsSchema = z.object({
  lat: z.preprocess((val) => Number(val), z.number().min(-90).max(90)),
  lon: z.preprocess((val) => Number(val), z.number().min(-180).max(180)),
});

/**
 * Zod schema for validating date range
 */
export const DateRangeSchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
}).refine((data) => {
  const startDate = new Date(data.start);
  const endDate = new Date(data.end);
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= 365;
}, {
  message: "Date range cannot exceed 365 days",
  path: ["end"],
});

/**
 * Runtime validation function for API parameters using tiny-invariant
 * This provides an additional layer of validation on top of Zod schemas
 */
export const validateAPIParams = {
  /**
   * Validates search API parameters at runtime
   */
  searchParams: (params: unknown): void => {
    validateObject(params, 'search params');
    const { q } = params as { q: string };
    validateString(q, 'search query');
    invariant(q.length >= 1 && q.length <= 100, 'Search query must be between 1 and 100 characters');
    invariant(/^[a-zA-Z0-9\s,.\-_]+$/.test(q), 'Search query contains invalid characters');
  },

  /**
   * Validates weather API parameters at runtime
   */
  weatherParams: (params: unknown): void => {
    validateObject(params, 'weather params');
    const { lat, lon, start, end, timezone } = params as { lat: number; lon: number; start: string; end: string; timezone: string };

    validateNumber(lat, 'latitude', -90, 90);
    validateNumber(lon, 'longitude', -180, 180);
    validateString(start, 'start date');
    validateString(end, 'end date');
    validateString(timezone, 'timezone');

    invariant(/^\d{4}-\d{2}-\d{2}$/.test(start), 'Invalid start date format');
    invariant(/^\d{4}-\d{2}-\d{2}$/.test(end), 'Invalid end date format');
    invariant(timezone.length > 0 && timezone.length <= 50, 'Timezone must be between 1 and 50 characters');
  },

  /**
   * Validates reverse geocode parameters at runtime
   */
  geocodeParams: (params: unknown): void => {
    validateObject(params, 'geocode params');
    const { lat, lon } = params as { lat: number; lon: number };

    validateNumber(lat, 'latitude', -90, 90);
    validateNumber(lon, 'longitude', -180, 180);
  }
};