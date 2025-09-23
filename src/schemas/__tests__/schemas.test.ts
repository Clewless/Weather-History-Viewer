import { describe, it, expect } from '@jest/globals';
import { ZodError } from 'zod';

import { 
  LocationSchema, 
  SearchQuerySchema, 
  ReverseGeocodeSchema, 
  WeatherLocationSchema
} from '../locationSchema';
import { 
  DailyWeatherDataSchema,
  HourlyWeatherDataSchema,
  WeatherAPIParamsSchema
} from '../weatherSchema';
import { validateWithZod, safeValidateWithZod, ValidationError } from '../../utils/zodValidation';

describe('Zod Schemas', () => {
  describe('LocationSchema', () => {
    it('should validate a correct location object', () => {
      const validLocation = {
        id: 123,
        name: 'New York',
        latitude: 40.7128,
        longitude: -74.0060,
        elevation: 10,
        feature_code: 'PPL',
        country_code: 'US',
        timezone: 'America/New_York',
        country: 'United States',
        admin1: 'New York',
        admin2: 'New York County',
        population: 8000000,
        postcodes: ['10001', '10002'],
        country_id: 1,
        admin1_id: 2,
        admin2_id: 3,
        admin3_id: 4,
        isFallback: false
      };

      expect(() => validateWithZod(LocationSchema, validLocation)).not.toThrow();
    });

    it('should reject an invalid latitude', () => {
      const invalidLocation = {
        id: 123,
        name: 'Invalid Location',
        latitude: 91, // Invalid latitude
        longitude: -74.0060,
        elevation: 10,
        feature_code: 'PPL',
        country_code: 'US',
        timezone: 'America/New_York',
        country: 'United States'
      };

      expect(() => validateWithZod(LocationSchema, invalidLocation)).toThrow(ValidationError);
    });

    it('should reject an invalid longitude', () => {
      const invalidLocation = {
        id: 123,
        name: 'Invalid Location',
        latitude: 40.7128,
        longitude: -181, // Invalid longitude
        elevation: 10,
        feature_code: 'PPL',
        country_code: 'US',
        timezone: 'America/New_York',
        country: 'United States'
      };

      expect(() => validateWithZod(LocationSchema, invalidLocation)).toThrow(ValidationError);
    });

    it('should reject an invalid country code', () => {
      const invalidLocation = {
        id: 123,
        name: 'Invalid Location',
        latitude: 40.7128,
        longitude: -74.0060,
        elevation: 10,
        feature_code: 'PPL',
        country_code: 'USA', // Invalid country code (should be 2 characters)
        timezone: 'America/New_York',
        country: 'United States'
      };

      expect(() => validateWithZod(LocationSchema, invalidLocation)).toThrow(ValidationError);
    });
  });

  describe('SearchQuerySchema', () => {
    it('should validate a correct search query', () => {
      const validQuery = { q: 'New York' };
      expect(() => validateWithZod(SearchQuerySchema, validQuery)).not.toThrow();
    });

    it('should reject an empty query', () => {
      const invalidQuery = { q: '' };
      expect(() => validateWithZod(SearchQuerySchema, invalidQuery)).toThrow(ValidationError);
    });

    it('should reject a query that is too long', () => {
      const invalidQuery = { q: 'a'.repeat(101) }; // 101 characters, max is 100
      expect(() => validateWithZod(SearchQuerySchema, invalidQuery)).toThrow(ValidationError);
    });

    it('should reject a query with invalid characters', () => {
      const invalidQuery = { q: 'New York <script>' }; // Invalid characters
      expect(() => validateWithZod(SearchQuerySchema, invalidQuery)).toThrow(ValidationError);
    });
  });

  describe('ReverseGeocodeSchema', () => {
    it('should validate correct coordinates', () => {
      const validCoords = { lat: 40.7128, lon: -74.0060 };
      expect(() => validateWithZod(ReverseGeocodeSchema, validCoords)).not.toThrow();
    });

    it('should reject invalid latitude', () => {
      const invalidCoords = { lat: 91, lon: -74.0060 }; // Invalid latitude
      expect(() => validateWithZod(ReverseGeocodeSchema, invalidCoords)).toThrow(ValidationError);
    });

    it('should reject invalid longitude', () => {
      const invalidCoords = { lat: 40.7128, lon: -181 }; // Invalid longitude
      expect(() => validateWithZod(ReverseGeocodeSchema, invalidCoords)).toThrow(ValidationError);
    });
  });

  describe('WeatherLocationSchema', () => {
    it('should validate correct weather location data', () => {
      const validWeatherLocation = {
        latitude: 40.7128,
        longitude: -74.0060,
        timezone: 'America/New_York'
      };
      expect(() => validateWithZod(WeatherLocationSchema, validWeatherLocation)).not.toThrow();
    });

    it('should reject invalid coordinates', () => {
      const invalidWeatherLocation = {
        latitude: 91, // Invalid latitude
        longitude: -74.0060,
        timezone: 'America/New_York'
      };
      expect(() => validateWithZod(WeatherLocationSchema, invalidWeatherLocation)).toThrow(ValidationError);
    });

    it('should reject invalid timezone', () => {
      const invalidWeatherLocation = {
        latitude: 40.7128,
        longitude: -74.0060,
        timezone: '' // Empty timezone
      };
      expect(() => validateWithZod(WeatherLocationSchema, invalidWeatherLocation)).toThrow(ValidationError);
    });
  });

  describe('DailyWeatherDataSchema', () => {
    it('should validate correct daily weather data', () => {
      const validDailyData = {
        time: ['2023-01-01T00:00:00Z', '2023-01-02T00:00:00Z'],
        weathercode: [1, 2],
        temperature_2m_max: [10, 12],
        temperature_2m_min: [2, 4],
        apparent_temperature_max: [8, 10],
        apparent_temperature_min: [0, 2],
        sunrise: ['07:00', '07:01'],
        sunset: ['17:00', '17:01'],
        precipitation_sum: [0, 5],
        rain_sum: [0, 3],
        showers_sum: [0, 2],
        snowfall_sum: [0, 0],
        precipitation_hours: [0, 2],
        windspeed_10m_max: [10, 15],
        windgusts_10m_max: [20, 25],
        winddirection_10m_dominant: [180, 190],
        shortwave_radiation_sum: [100, 150],
        et0_fao_evapotranspiration: [2, 3]
      };

      expect(() => validateWithZod(DailyWeatherDataSchema, validDailyData)).not.toThrow();
    });

    it('should reject invalid time format', () => {
      const invalidDailyData = {
        time: ['invalid-date', '2023-01-02T00:00:00Z'], // Invalid date
        weathercode: [1, 2],
        temperature_2m_max: [10, 12],
        // ... other fields
      };

      expect(() => validateWithZod(DailyWeatherDataSchema, invalidDailyData)).toThrow(ValidationError);
    });
  });

  describe('HourlyWeatherDataSchema', () => {
    it('should validate correct hourly weather data', () => {
      const validHourlyData = {
        time: ['2023-01-01T00:00:00Z', '2023-01-01T01:00:00Z'],
        temperature_2m: [10, 11],
        relativehumidity_2m: [50, 55],
        dewpoint_2m: [5, 6],
        apparent_temperature: [8, 9],
        pressure_msl: [1013, 1012],
        surface_pressure: [1000, 999],
        precipitation: [0, 0],
        rain: [0, 0],
        snowfall: [0, 0],
        weathercode: [1, 1],
        cloudcover: [50, 60],
        cloudcover_low: [30, 40],
        cloudcover_mid: [20, 25],
        cloudcover_high: [10, 15],
        shortwave_radiation: [100, 120],
        direct_radiation: [80, 100],
        diffuse_radiation: [20, 25],
        direct_normal_irradiance: [50, 60],
        windspeed_10m: [10, 12],
        winddirection_10m: [180, 190],
        windgusts_10m: [20, 25],
        temperature_80m: [12, 13]
      };

      expect(() => validateWithZod(HourlyWeatherDataSchema, validHourlyData)).not.toThrow();
    });
  });

  describe('WeatherAPIParamsSchema', () => {
    it('should validate correct weather API parameters', () => {
      const validParams = {
        latitude: 40.7128,
        longitude: -74.0060,
        start_date: '2023-01-01',
        end_date: '2023-01-02',
        timezone: 'America/New_York',
        daily: ['temperature_2m_max', 'temperature_2m_min'],
        hourly: ['temperature_2m', 'relativehumidity_2m'],
        temperature_unit: 'celsius',
        windspeed_unit: 'kmh',
        precipitation_unit: 'mm'
      };

      expect(() => validateWithZod(WeatherAPIParamsSchema, validParams)).not.toThrow();
    });

    it('should reject invalid date format', () => {
      const invalidParams = {
        latitude: 40.7128,
        longitude: -74.0060,
        start_date: '01/01/2023', // Invalid date format
        end_date: '2023-01-02',
        timezone: 'America/New_York'
      };

      expect(() => validateWithZod(WeatherAPIParamsSchema, invalidParams)).toThrow(ValidationError);
    });
  });
});

describe('Zod Validation Utilities', () => {
  describe('validateWithZod', () => {
    it('should return validated data for correct input', () => {
      const validData = { q: 'New York' };
      const result = validateWithZod(SearchQuerySchema, validData);
      expect(result).toEqual(validData);
    });

    it('should throw ValidationError for invalid input', () => {
      const invalidData = { q: '' };
      expect(() => validateWithZod(SearchQuerySchema, invalidData)).toThrow();
    });
  });

  describe('safeValidateWithZod', () => {
    it('should return success result for correct input', () => {
      const validData = { q: 'New York' };
      const result = safeValidateWithZod(SearchQuerySchema, validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it('should return error result for invalid input', () => {
      const invalidData = { q: '' };
      const result = safeValidateWithZod(SearchQuerySchema, invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ZodError);
      }
    });
  });
});