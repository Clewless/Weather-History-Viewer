import { z } from 'zod';

/**
 * Zod schema for validating daily weather data from Open-Meteo API
 */
export const DailyWeatherDataSchema = z.object({
  time: z.array(z.string().datetime()),
  weathercode: z.array(z.number()),
  temperature_2m_max: z.array(z.number()),
  temperature_2m_min: z.array(z.number()),
  apparent_temperature_max: z.array(z.number()),
  apparent_temperature_min: z.array(z.number()),
  sunrise: z.array(z.string()),
  sunset: z.array(z.string()),
  precipitation_sum: z.array(z.number()),
  rain_sum: z.array(z.number()),
  showers_sum: z.array(z.number()),
  snowfall_sum: z.array(z.number()),
  precipitation_hours: z.array(z.number()),
  windspeed_10m_max: z.array(z.number()),
  windgusts_10m_max: z.array(z.number()),
  winddirection_10m_dominant: z.array(z.number()),
  shortwave_radiation_sum: z.array(z.number()),
  et0_fao_evapotranspiration: z.array(z.number()),
});

/**
 * Zod schema for validating hourly weather data from Open-Meteo API
 */
export const HourlyWeatherDataSchema = z.object({
  time: z.array(z.string().datetime()),
  temperature_2m: z.array(z.number()),
  relativehumidity_2m: z.array(z.number()),
  dewpoint_2m: z.array(z.number()),
  apparent_temperature: z.array(z.number()),
  pressure_msl: z.array(z.number()),
  surface_pressure: z.array(z.number()),
  precipitation: z.array(z.number()),
  rain: z.array(z.number()),
  snowfall: z.array(z.number()),
  weathercode: z.array(z.number()),
  cloudcover: z.array(z.number()),
  cloudcover_low: z.array(z.number()),
  cloudcover_mid: z.array(z.number()),
  cloudcover_high: z.array(z.number()),
  shortwave_radiation: z.array(z.number()),
  direct_radiation: z.array(z.number()),
  diffuse_radiation: z.array(z.number()),
  direct_normal_irradiance: z.array(z.number()),
  windspeed_10m: z.array(z.number()),
  winddirection_10m: z.array(z.number()),
  windgusts_10m: z.array(z.number()),
  temperature_80m: z.array(z.number()),
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