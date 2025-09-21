import express from 'express';
import helmet from 'helmet';
import { config } from 'dotenv';
import rateLimit from 'express-rate-limit';
import { escape } from 'validator';

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
  DailyWeatherData,
  HourlyWeatherData
} from './open-meteo';
import { getCurrentISODate } from './utils/dateUtils';
import { CACHE_TTL, RATE_LIMITS, GEOLOCATION_CONFIG, FALLBACK_LOCATION } from './constants';

// Load environment variables from .env file
config();

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
const frontendPort = parseInt(getEnvVar('FRONTEND_PORT'));
const corsOrigins = getEnvVar('CORS_ORIGIN');
const nodeEnv = getEnvVar('NODE_ENV');

// Create cache managers for different API endpoints
const searchCache = new ServerCacheManager<GeoLocation[]>(CACHE_TTL.SERVER_SEARCH, 500, 5 * 60 * 1000);
const weatherCache = new ServerCacheManager<{ daily: DailyWeatherData; hourly: HourlyWeatherData }>(CACHE_TTL.SERVER_WEATHER, 200, 10 * 60 * 1000);
const reverseGeocodeCache = new ServerCacheManager<GeoLocation>(CACHE_TTL.SERVER_REVERSE_GEOCODE, 300, 5 * 60 * 1000);

// Create CORS middleware with environment-specific configuration
const corsMiddleware = createCorsMiddleware(nodeEnv, corsOrigins, frontendPort);
app.use(corsMiddleware);

// Rate limiting configuration
const apiLimiter = rateLimit({
  windowMs: RATE_LIMITS.GENERAL.WINDOW_MS,
  max: RATE_LIMITS.GENERAL.MAX_REQUESTS,
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to specific API routes
app.use('/api/search', apiLimiter);
app.use('/api/reverse-geocode', apiLimiter);

// More restrictive rate limiting for weather data endpoint
const weatherLimiter = rateLimit({
  windowMs: RATE_LIMITS.WEATHER.WINDOW_MS,
  max: RATE_LIMITS.WEATHER.MAX_REQUESTS,
  message: 'Too many weather data requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/weather', weatherLimiter);

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: getCurrentISODate(),
    uptime: process.uptime(),
    memory: {
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024 * 100) / 100, // MB
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024 * 100) / 100, // MB
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100, // MB
      external: Math.round(process.memoryUsage().external / 1024 / 1024 * 100) / 100 // MB
    },
    nodeEnv,
    port
  });
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
    const sanitizedQuery = escape(query.trim());

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

// Add endpoint to get cache statistics (only in development environment)
if (nodeEnv === 'development') {
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
} else {
  // In production, return a minimal response
  app.get('/api/cache-stats', (req, res) => {
    res.status(404).json({ message: 'Endpoint not available in production' });
  });
  
  app.post('/api/cache-clear', (req, res) => {
    res.status(404).json({ message: 'Endpoint not available in production' });
  });
}

// Centralized error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
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