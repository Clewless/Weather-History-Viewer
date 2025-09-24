import { z } from 'zod';

/**
 * Zod schema for validating daily weather data from Open-Meteo API
 */
export const DailyWeatherDataSchema = z.object({
  time: z.array(z.union([z.string().datetime(), z.date()])),
  weathercode: z.array(z.union([z.number(), z.null()])),
  temperature_2m_max: z.array(z.union([z.number(), z.null()])),
 temperature_2m_min: z.array(z.union([z.number(), z.null()])),
 apparent_temperature_max: z.array(z.union([z.number(), z.null()])),
  apparent_temperature_min: z.array(z.union([z.number(), z.null()])),
 sunrise: z.array(z.union([z.string(), z.null()])),
  sunset: z.array(z.union([z.string(), z.null()])),
  precipitation_sum: z.array(z.union([z.number(), z.null()])),
  rain_sum: z.array(z.union([z.number(), z.null()])),
  showers_sum: z.array(z.union([z.number(), z.null()])),
  snowfall_sum: z.array(z.union([z.number(), z.null()])),
  precipitation_hours: z.array(z.union([z.number(), z.null()])),
  windspeed_10m_max: z.array(z.union([z.number(), z.null()])),
 windgusts_10m_max: z.array(z.union([z.number(), z.null()])),
  winddirection_10m_dominant: z.array(z.union([z.number(), z.null()])),
  shortwave_radiation_sum: z.array(z.union([z.number(), z.null()])),
  et0_fao_evapotranspiration: z.array(z.union([z.number(), z.null()])),
});

/**
 * Zod schema for validating hourly weather data from Open-Meteo API
 */
export const HourlyWeatherDataSchema = z.object({
  time: z.array(z.union([z.string().datetime(), z.date()])),
  temperature_2m: z.array(z.union([z.number(), z.null()])),
 relativehumidity_2m: z.array(z.union([z.number(), z.null()])),
  dewpoint_2m: z.array(z.union([z.number(), z.null()])),
  apparent_temperature: z.array(z.union([z.number(), z.null()])),
  pressure_msl: z.array(z.union([z.number(), z.null()])),
  surface_pressure: z.array(z.union([z.number(), z.null()])),
  precipitation: z.array(z.union([z.number(), z.null()])),
  rain: z.array(z.union([z.number(), z.null()])),
  snowfall: z.array(z.union([z.number(), z.null()])),
 weathercode: z.array(z.union([z.number(), z.null()])),
  cloudcover: z.array(z.union([z.number(), z.null()])),
  cloudcover_low: z.array(z.union([z.number(), z.null()])),
 cloudcover_mid: z.array(z.union([z.number(), z.null()])),
  cloudcover_high: z.array(z.union([z.number(), z.null()])),
  shortwave_radiation: z.array(z.union([z.number(), z.null()])),
 direct_radiation: z.array(z.union([z.number(), z.null()])),
 diffuse_radiation: z.array(z.union([z.number(), z.null()])),
 direct_normal_irradiance: z.array(z.union([z.number(), z.null()])),
  windspeed_10m: z.array(z.union([z.number(), z.null()])),
  winddirection_10m: z.array(z.union([z.number(), z.null()])),
  windgusts_10m: z.array(z.union([z.number(), z.null()])),
  temperature_80m: z.array(z.union([z.number(), z.null()])),
});

/**
 * Zod schema for validating weather data response
 */
export const WeatherDataResponseSchema = z.object({
  daily: DailyWeatherDataSchema,
  hourly: HourlyWeatherDataSchema,
  metadata: z.object({
    source: z.string(),
    generatedAt: z.string(),
    location: z.object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      timezone: z.string().min(1).max(50),
    }),
  }).optional(),
});

/**
 * Zod schema for validating weather API parameters
 */
export const WeatherAPIParamsSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timezone: z.string().min(1).max(50),
  daily: z.array(z.string()).optional(),
  hourly: z.array(z.string()).optional(),
  temperature_unit: z.enum(['celsius', 'fahrenheit']).optional(),
  windspeed_unit: z.enum(['kmh', 'ms', 'mph', 'kn']).optional(),
  precipitation_unit: z.enum(['mm', 'inch']).optional(),
});