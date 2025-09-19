import express from 'express';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import validator from 'validator';
import { ValidationError, createErrorResponse } from './errors';
import { getEnvVar, validateEnvVars } from './utils/env';
import { createCorsMiddleware } from './utils/cors';
import { getStringParam, getNumberParam } from './utils/params';
import { 
  validateDateRangeWithErrors, 
  validateCoordinatesWithErrors, 
  validateSearchQueryWithErrors,
  validateTimezoneWithErrors
} from './utils/validation';
import { ServerCacheManager } from './utils/serverCacheManager';
import {
  searchLocations,
  getHistoricalWeather,
  reverseGeocode,
  Location as GeoLocation,
  WeatherLocation,
  DailyWeatherData,
  HourlyWeatherData
} from './open-meteo';

// Load environment variables from .env file
dotenv.config();

// Validate environment variables
try {
  validateEnvVars();
  console.log('Environment variables validated successfully');
} catch (error) {
  console.error('Environment validation failed:', error);
  process.exit(1);
}

/**
 * This file sets up a simple Express server to act as a Backend-for-Frontend (BFF).
 * It provides a simplified API for the frontend to consume, and handles the communication
 * with the Open-Meteo API.
 */

const app = express();
app.use(helmet());

// Get validated environment variables
const port = parseInt(getEnvVar('PORT'));
const corsOrigins = getEnvVar('CORS_ORIGIN');
const nodeEnv = process.env.NODE_ENV || 'development';

// Create cache managers for different API endpoints
const searchCache = new ServerCacheManager<GeoLocation[]>(5 * 60 * 1000, 500, 5 * 60 * 1000); // 5 minutes TTL, max 500 items
const weatherCache = new ServerCacheManager<{ daily: DailyWeatherData; hourly: HourlyWeatherData }>(30 * 60 * 1000, 200, 10 * 60 * 1000); // 30 minutes TTL, max 200 items
const reverseGeocodeCache = new ServerCacheManager<GeoLocation>(10 * 60 * 1000, 300, 5 * 60 * 1000); // 10 minutes TTL, max 300 items

// Create CORS middleware with environment-specific configuration
const corsMiddleware = createCorsMiddleware(nodeEnv, corsOrigins);
app.use(corsMiddleware);

// Rate limiting configuration
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs for general API
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to specific API routes
app.use('/api/search', apiLimiter);
app.use('/api/reverse-geocode', apiLimiter);

// More restrictive rate limiting for weather data endpoint
const weatherLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs for weather data
  message: 'Too many weather data requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/weather', weatherLimiter);

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * Searches for locations based on a query string.
 * e.g., /api/search?q=New%20York
 */
app.get('/api/search', async (req, res) => {
  try {
    // Validate query parameter exists
    if (!req.query.q) {
      return res.status(400).json(createErrorResponse(
        new ValidationError('Query parameter "q" is required', 'q'), 
        400
      ));
    }
    
    const query = getStringParam(req.query, 'q')!;
    validateSearchQueryWithErrors(query);

    // Check cache first
    const cacheKey = `search:${query}`;
    const cachedResult = searchCache.get(cacheKey);
    if (cachedResult) {
      return res.json(cachedResult);
    }

    // Additional sanitization for security
    const sanitizedQuery = validator.escape(query.trim());

    const locations = await searchLocations(sanitizedQuery);
    
    // Cache the result
    searchCache.set(cacheKey, locations);
    
    res.json(locations);
  } catch (error: unknown) {
    const errorResponse = createErrorResponse(
      error instanceof Error ? error : new Error('Unknown error'),
      error instanceof ValidationError ? 400 : 500
    );
    res.status(errorResponse.statusCode || 500).json(errorResponse);
  }
});

/**
 * Gets historical weather data for a given location and date range.
 * e.g., /api/weather?lat=40.71&lon=-74.01&start=2023-01-01&end=2023-01-02
 */
app.get('/api/weather', async (req, res) => {
  try {
    // Validate required parameters exist
    if (!req.query.lat || !req.query.lon || !req.query.start || !req.query.end || !req.query.timezone) {
      return res.status(400).json(createErrorResponse(
        new ValidationError('Missing required parameters: lat, lon, start, end, timezone'), 
        400
      ));
    }
    
    // Extract and validate required parameters
    const lat = getNumberParam(req.query, 'lat')!;
    const lon = getNumberParam(req.query, 'lon')!;
    const start = getStringParam(req.query, 'start')!;
    const end = getStringParam(req.query, 'end')!;
    const timezone = getStringParam(req.query, 'timezone')!;

    // Validate coordinates
    validateCoordinatesWithErrors(lat, lon);

    // Validate timezone
    validateTimezoneWithErrors(timezone);

    // Validate date range
    validateDateRangeWithErrors(start, end);

    // Check cache first
    const cacheKey = `weather:${lat}:${lon}:${start}:${end}:${timezone}`;
    const cachedResult = weatherCache.get(cacheKey);
    if (cachedResult) {
      return res.json(cachedResult);
    }

    const weather = await getHistoricalWeather(
      { latitude: lat, longitude: lon, timezone },
      start,
      end
    );
    
    // Cache the result
    weatherCache.set(cacheKey, weather);
    
    res.json(weather);
  } catch (error: unknown) {
    const errorResponse = createErrorResponse(
      error instanceof Error ? error : new Error('Unknown error'),
      error instanceof ValidationError ? 400 : 500
    );
    res.status(errorResponse.statusCode || 500).json(errorResponse);
  }
});

/**
 * Gets the location for a given latitude and longitude.
 * e.g., /api/reverse-geocode?lat=40.71&lon=-74.01
 */
app.get('/api/reverse-geocode', async (req, res) => {
  try {
    // Validate required parameters exist
    if (!req.query.lat || !req.query.lon) {
      return res.status(400).json(createErrorResponse(
        new ValidationError('Missing required parameters: lat, lon'), 
        400
      ));
    }
    
    // Extract and validate required parameters
    const lat = getNumberParam(req.query, 'lat')!;
    const lon = getNumberParam(req.query, 'lon')!;

    // Validate coordinates
    validateCoordinatesWithErrors(lat, lon);

    // Check cache first
    const cacheKey = `reverse:${lat}:${lon}`;
    const cachedResult = reverseGeocodeCache.get(cacheKey);
    if (cachedResult) {
      return res.json(cachedResult);
    }

    const location: GeoLocation = await reverseGeocode(lat, lon);
    
    // Cache the result
    reverseGeocodeCache.set(cacheKey, location);
    
    res.json(location);
  } catch (error: unknown) {
    const errorResponse = createErrorResponse(
      error instanceof Error ? error : new Error('Unknown error'),
      error instanceof ValidationError ? 400 : 500
    );
    res.status(errorResponse.statusCode || 500).json(errorResponse);
  }
});

// Add endpoint to get cache statistics
app.get('/api/cache-stats', (req, res) => {
  res.json({
    search: searchCache.getStats(),
    weather: weatherCache.getStats(),
    reverse: reverseGeocodeCache.getStats()
  });
});

// Add endpoint to clear cache (useful for development)
app.post('/api/cache-clear', (req, res) => {
  searchCache.clear();
  weatherCache.clear();
  reverseGeocodeCache.clear();
  res.json({ message: 'All caches cleared' });
});

// Centralized error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err.stack);
  const errorResponse = createErrorResponse(err, 500);
  res.status(500).json(errorResponse);
});

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json(createErrorResponse(new Error('API endpoint not found'), 404));
});

const server = app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
  console.log(`Environment: ${nodeEnv}`);
  console.log(`CORS origins: ${corsOrigins || 'None specified'}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  // Stop cache cleanup timers
  searchCache.stopCleanup();
  weatherCache.stopCleanup();
  reverseGeocodeCache.stopCleanup();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('Shutting down server...');
  // Stop cache cleanup timers
  searchCache.stopCleanup();
  weatherCache.stopCleanup();
  reverseGeocodeCache.stopCleanup();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});