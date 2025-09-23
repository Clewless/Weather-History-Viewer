# Zod Validation Implementation

This directory contains Zod schemas and validation utilities for the Weather History Viewer application. These schemas provide runtime validation for data structures, making the application more robust and less error-prone.

## Schemas

### Location Schemas
- `LocationSchema`: Validates location data from the Open-Meteo API
- `SearchQuerySchema`: Validates search query parameters
- `ReverseGeocodeSchema`: Validates reverse geocoding parameters
- `WeatherLocationSchema`: Validates weather location data

### Weather Schemas
- `DailyWeatherDataSchema`: Validates daily weather data from Open-Meteo API
- `HourlyWeatherDataSchema`: Validates hourly weather data from Open-Meteo API
- `WeatherDataResponseSchema`: Validates weather data response
- `WeatherAPIParamsSchema`: Validates weather API parameters

### API Schemas
- `SearchAPIParamsSchema`: Validates search API request parameters
- `WeatherAPIRequestSchema`: Validates weather API request parameters
- `ReverseGeocodeAPIParamsSchema`: Validates reverse geocode API request parameters
- `DateRangeSchema`: Validates date range parameters

## Validation Utilities

The `zodValidation.ts` file provides utility functions for working with Zod schemas:

- `validateWithZod`: Validates data against a Zod schema and throws a ValidationError if validation fails
- `safeValidateWithZod`: Validates data against a Zod schema and returns a ValidationResult
- `formatZodErrors`: Formats Zod errors into a more readable format

## Usage

The schemas are used throughout the application to validate:

1. API request parameters in the server
2. Data received from external APIs
3. Internal data structures

This helps prevent runtime errors and ensures data consistency across the application.