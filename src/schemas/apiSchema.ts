import { z } from 'zod';

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
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timezone: z.string().min(1).max(50),
});

/**
 * Zod schema for validating reverse geocode API request parameters
 */
export const ReverseGeocodeAPIParamsSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
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