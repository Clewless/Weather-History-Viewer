import { z } from 'zod';

/**
 * Zod schema for validating location data from the Open-Meteo API
 */
export const LocationSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(200),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  elevation: z.number(),
  feature_code: z.string().min(1).max(50),
  country_code: z.string().length(2),
  timezone: z.string().min(1).max(50),
  country: z.string().min(1).max(100),
  admin1: z.string().min(1).max(100).nullable().optional(),
  admin2: z.string().min(1).max(100).nullable().optional(),
  admin3: z.string().min(1).max(100).nullable().optional(),
  population: z.number().nullable().optional(),
  postcodes: z.array(z.string()).optional(),
  country_id: z.number().nullable().optional(),
  admin1_id: z.number().nullable().optional(),
  admin2_id: z.number().nullable().optional(),
  admin3_id: z.number().nullable().optional(),
  isFallback: z.boolean().optional(),
});

/**
 * Zod schema for validating search query parameters
 */
export const SearchQuerySchema = z.object({
  q: z.string().min(1).max(100).regex(/^[a-zA-Z0-9\s,.\-_]+$/),
});

/**
 * Zod schema for validating reverse geocoding parameters
 */
export const ReverseGeocodeSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
});

/**
 * Zod schema for validating weather location data
 */
export const WeatherLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timezone: z.string().min(1).max(50),
});