import express from 'express';
import helmet from 'helmet';
import { config } from 'dotenv';
import rateLimit from 'express-rate-limit';
import { escape } from 'validator';

import { ValidationError, createErrorResponse, NetworkError, wrapError } from './errors';
import { getEnvVar, validateEnvVars } from './utils/env';
import { createCorsMiddleware } from './utils/cors';
import { getStringParam, getNumberParam } from './utils/params';
import { 
  validateDateRangeWithErrors, 
  validateCoordinatesWithErrors, 
  validateSearchQueryWithErrors,
  validateTimezoneWithErrors
} from './utils/validation';
import { NamespaceCacheManager } from './utils/unifiedCacheManager';
import {
  searchLocations,
  getHistoricalWeather,
  reverseGeocode,
  DailyWeatherData,
  HourlyWeatherData
} from './open-meteo';
import { Location as GeoLocation } from './types';
import { getCurrentISODate } from './utils/dateUtils';
import { CACHE_TTL, RATE_LIMITS } from './constants';

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
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000'] : [])],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
  })
);

// Get validated environment variables
const port = parseInt(getEnvVar('PORT'));
const frontendPort = parseInt(getEnvVar('FRONTEND_PORT'));
const corsOrigins = getEnvVar('CORS_ORIGIN');
const nodeEnv = getEnvVar('NODE_ENV');

// Define the type for the cache data
type CacheData = GeoLocation[] | { daily: DailyWeatherData; hourly: HourlyWeatherData } | GeoLocation;

// Create a unified cache manager
const cache = new NamespaceCacheManager<CacheData>(CACHE_TTL.SERVER_DEFAULT, 1000, 5 * 60 * 1000);

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
    const cachedResult = cache.get('search', query);
    if (cachedResult) {
      return res.json(cachedResult);
    }

    // Additional sanitization for security
    const sanitizedQuery = escape(query.trim());

    const locations = await searchLocations(sanitizedQuery);
    
    // Cache the result
    cache.set('search', query, locations);
    
    res.json(locations);
  } catch (error: unknown) {
    const wrappedError = wrapError(error, 'Location search failed');
    const errorResponse = createErrorResponse(
      wrappedError,
      wrappedError instanceof ValidationError ? 400 : 500
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
    // Extract and validate required parameters in one step
    const lat = getNumberParam(req.query, 'lat');
    const lon = getNumberParam(req.query, 'lon');
    const start = getStringParam(req.query, 'start');
    const end = getStringParam(req.query, 'end');
    const timezone = getStringParam(req.query, 'timezone');

    // Validate all parameters exist and are valid
    if (!lat) {
      return res.status(400).json(createErrorResponse(
        new ValidationError('Latitude parameter "lat" is required and must be a valid number', 'lat'),
        400
      ));
    }
    
    if (!lon) {
      return res.status(400).json(createErrorResponse(
        new ValidationError('Longitude parameter "lon" is required and must be a valid number', 'lon'),
        400
      ));
    }
    
    if (!start) {
      return res.status(400).json(createErrorResponse(
        new ValidationError('Start date parameter "start" is required and must be a valid string', 'start'),
        400
      ));
    }
    
    if (!end) {
      return res.status(400).json(createErrorResponse(
        new ValidationError('End date parameter "end" is required and must be a valid string', 'end'),
        400
      ));
    }
    
    if (!timezone) {
      return res.status(400).json(createErrorResponse(
        new ValidationError('Timezone parameter "timezone" is required and must be a valid string', 'timezone'),
        400
      ));
    }

    // Validate coordinates
    validateCoordinatesWithErrors(lat, lon);

    // Validate timezone
    validateTimezoneWithErrors(timezone);

    // Validate date range
    validateDateRangeWithErrors(start, end);

    // Check cache first
    const cacheKey = `${lat}:${lon}:${start}:${end}:${timezone}`;
    const cachedResult = cache.get('weather', cacheKey);
    if (cachedResult) {
      return res.json(cachedResult);
    }

    const weather = await getHistoricalWeather(
      { latitude: lat, longitude: lon, timezone },
      start,
      end
    );
    
    // Cache the result
    cache.set('weather', cacheKey, weather);
    
    res.json(weather);
  } catch (error: unknown) {
    const wrappedError = wrapError(error, 'Weather data retrieval failed');
    const errorResponse = createErrorResponse(
      wrappedError,
      wrappedError instanceof ValidationError ? 400 : 500
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
    const cacheKey = `${lat}:${lon}`;
    const cachedResult = cache.get('reverse', cacheKey);
    if (cachedResult) {
      return res.json(cachedResult);
    }

    const location: GeoLocation = await reverseGeocode(lat, lon);
    
    // Cache the result
    cache.set('reverse', cacheKey, location);
    
    res.json(location);
  } catch (error: unknown) {
    const wrappedError = wrapError(error, 'Reverse geocode failed');
    const errorResponse = createErrorResponse(
      wrappedError,
      wrappedError instanceof ValidationError ? 400 : 500
    );
    res.status(errorResponse.statusCode || 500).json(errorResponse);
  }
});

// Add endpoint to get cache statistics (only in development environment)
if (nodeEnv === 'development') {
  app.get('/api/cache-stats', (req, res) => {
    res.json(cache.getStats());
  });
  
  // Add endpoint to clear cache (useful for development)
  app.get('/api/cache-clear', (req, res) => {
    cache.clear();
    res.json({ message: 'All caches cleared' });
  });
} else {
  // In production, return a minimal response
  app.get('/api/cache-stats', (req, res) => {
    res.status(404).json({ message: 'Endpoint not available in production' });
  });
  
  app.get('/api/cache-clear', (req, res) => {
    res.status(404).json({ message: 'Endpoint not available in production' });
  });
}

// Centralized error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err.stack);
  const wrappedError = wrapError(err, 'Unhandled server error');
  const errorResponse = createErrorResponse(wrappedError, 500);
  res.status(500).json(errorResponse);
});

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json(createErrorResponse(new NetworkError('API endpoint not found'), 404));
});

const server = app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
  console.log(`Environment: ${nodeEnv}`);
  console.log(`CORS origins: ${corsOrigins || 'None specified'}`);
});

/**
 * Graceful shutdown with comprehensive resource cleanup
 */
const gracefulShutdown = (signal: string) => {
  console.log(`\nReceived ${signal}. Starting graceful shutdown...`);

  // Set a timeout for forced shutdown
  const shutdownTimeout = setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000); // 30 seconds timeout

  // Track cleanup completion
  let cleanupCompleted = false;

  const completeShutdown = () => {
    if (!cleanupCompleted) {
      cleanupCompleted = true;
      clearTimeout(shutdownTimeout);
      console.log('Graceful shutdown completed');
      process.exit(0);
    }
  };

  // Step 1: Stop accepting new connections
  server.close((err) => {
    if (err) {
      console.error('Error closing server:', err);
    } else {
      console.log('Server stopped accepting new connections');
    }

    // Step 2: Clean up cache and timers
    try {
      cache.stopCleanup();
      console.log('Cache cleanup stopped');
    } catch (error) {
      console.error('Error stopping cache cleanup:', error);
    }

    // Step 3: Clear any remaining intervals or timeouts
    // This is a safety measure to prevent hanging processes
    // Note: In a real application, you might want to track specific timers/intervals
    // and clear them explicitly here

    // Step 4: Force garbage collection if available (for memory cleanup)
    if (typeof global.gc === 'function') {
      try {
        global.gc();
        console.log('Garbage collection completed');
      } catch {
        // GC might not be available in all environments
      }
    }

    // Step 5: Small delay to allow any pending operations to complete
    setTimeout(completeShutdown, 1000);
  });

  // Handle cleanup errors
  process.on('uncaughtException', (error) => {
    console.error('Uncaught exception during shutdown:', error);
    completeShutdown();
  });

  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled rejection during shutdown:', reason);
    completeShutdown();
  });
};

// Register graceful shutdown handlers
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle additional shutdown signals for better cross-platform compatibility
process.on('SIGHUP', () => gracefulShutdown('SIGHUP'));
process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // Nodemon restart signal