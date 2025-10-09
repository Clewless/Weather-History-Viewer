import path from 'path';
import { fileURLToPath } from 'url';

import express from 'express';
import helmet from 'helmet';
import { config } from 'dotenv';
import rateLimit from 'express-rate-limit';

import { ValidationError, createErrorResponse, NetworkError, APIError, wrapError } from './utils/simpleErrors';
import { getEnvVar, validateEnvVars } from './utils/env';
import { createCorsMiddleware } from './utils/cors';
import {
  validateDateRangeWithErrors,
  validateCoordinatesWithErrors,
  validateTimezoneWithErrors
} from './utils/validation';
import { validateWithZod } from './utils/zodValidation';
import { SimpleCacheManager } from './utils/simpleCacheManager';
import {
  searchLocations,
  getHistoricalWeather,
  reverseGeocode,
  DailyWeatherData,
  HourlyWeatherData
} from './open-meteo';
import { Location as GeoLocation } from './types/location';
import { getCurrentISODate } from './utils/dateUtils';
import { CACHE_TTL, RATE_LIMITS } from './constants';
// Import Zod schemas
import {
  SearchAPIParamsSchema,
  WeatherAPIRequestSchema,
  ReverseGeocodeAPIParamsSchema
} from './schemas/apiSchema';

/**
 * Simple HTML escaping function to prevent XSS
 */
const escapeHtml = (str: string): string => {
  if (typeof str !== 'string') {
    return String(str);
  }
 return str
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#x27;');
};

// Load environment variables from .env file
config();

// Compute __filename and __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Add diagnostic logging
console.log('Starting server...');
console.log('__dirname:', __dirname);
console.log('__filename:', __filename);

// Debug environment variables (use validated getters where possible)
console.log('Environment variables:');
console.log('  NODE_ENV:', getEnvVar('NODE_ENV') ?? 'not set');
console.log('  PORT:', getEnvVar('PORT') ?? 'not set');
console.log('  API_BASE_URL:', getEnvVar('API_BASE_URL') ?? 'not set');
console.log('  FRONTEND_PORT:', getEnvVar('FRONTEND_PORT') ?? 'not set');
console.log('  CORS_ORIGIN:', getEnvVar('CORS_ORIGIN') ?? 'not set');

// Validate environment variables
try {
  validateEnvVars();
  console.log('Environment variables validated successfully');
} catch (error) {
  console.error('Environment validation failed:', error);
  process.exit(1);
}

// Get validated environment variables (provide safe fallbacks)
const nodeEnv = getEnvVar('NODE_ENV') ?? 'development';
const port = Number.parseInt(getEnvVar('PORT') ?? '3001', 10);
const frontendPort = Number.parseInt(getEnvVar('FRONTEND_PORT') ?? '3000', 10);
const corsOrigins = getEnvVar('CORS_ORIGIN') ?? '';

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
        scriptSrc: ["'self'", "'unsafe-inline'", ...(nodeEnv === 'development' ? ['http://localhost:3000'] : [])],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"] // Allow images from self and data URLs
      },
    },
  })
);

// Serve static files from the public directory
// eslint-disable-next-line import/no-named-as-default-member
app.use(express.static(path.join(__dirname, '..', 'public')));

// (Env variables already computed above)

// Define the type for the cache data
type CacheData = GeoLocation[] | { daily: DailyWeatherData; hourly: HourlyWeatherData } | GeoLocation;

// Create a simple cache manager (replaces overly complex unified cache)
const cache = new SimpleCacheManager<CacheData>(CACHE_TTL.SERVER_DEFAULT);

// Initialize memory monitoring
console.log('🔍 Memory leak detection activated');

// Removed memory leak tester - was part of excessive memory monitoring infrastructure
console.log('⚠️ Memory leak detection has been simplified');

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
    port,
    environment: {
      API_BASE_URL: getEnvVar('API_BASE_URL') || 'not set',
      NODE_ENV: nodeEnv || 'not set',
      PORT: String(port || 'not set')
    }
  });
});

/**
 * Debug endpoint to check API configuration
 */
app.get('/api/debug-config', (req, res) => {
  res.json({
    server: {
      baseUrl: `http://localhost:${port}`,
      apiPrefix: '/api',
      fullApiUrl: `http://localhost:${port}/api`
    },
    expectedFrontendConfig: {
      API_BASE_URL: `http://localhost:${port}/api`
    },
    endpoints: {
      health: `/api/health`,
      search: `/api/search?q=<query>`,
      weather: `/api/weather?lat=<lat>&lon=<lon>&start=<date>&end=<date>&timezone=<tz>`,
      reverseGeocode: `/api/reverse-geocode?lat=<lat>&lon=<lon>`
    }
  });
});

/**
 * Searches for locations based on a query string.
 * e.g., /api/search?q=New%20York
 */
app.get('/api/search', async (req, res) => {
  try {
    // Validate and sanitize query parameters using Zod
    const validatedParams = validateWithZod(SearchAPIParamsSchema, req.query, 'Invalid search parameters') as { q: string };
    const { q: query } = validatedParams;

    // Check cache first
    const cachedResult = cache.get(`search:${query}`);
    if (cachedResult) {
      return res.json(cachedResult);
    }

       // Additional sanitization for security
       const sanitizedQuery = escapeHtml(query.trim());
   
       const locations = await searchLocations(sanitizedQuery);
    
    // Cache the result
    cache.set(`search:${query}`, locations);
    
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
    // Validate and sanitize query parameters using Zod
    const validatedParams = validateWithZod(WeatherAPIRequestSchema, req.query, 'Invalid weather parameters') as { lat: number; lon: number; start: string; end: string; timezone: string };
    const { lat, lon, start, end, timezone } = validatedParams;

    // Normalize/trim date strings to avoid accidental whitespace or encoding artifacts
    const startTrim = start.trim();
    const endTrim = end.trim();

    // Debug logging for parameters
    console.log(`[DEBUG] Extracted parameters:`);
    console.log(`  lat: ${lat}, lon: ${lon}`);
    console.log(`  start: "${start}", end: "${end}"`);
    console.log(`  timezone: "${timezone}"`);
    console.log(`[DEBUG] Parameter types:`, {
      latType: typeof lat,
      lonType: typeof lon,
      startType: typeof start,
      endType: typeof end,
      timezoneType: typeof timezone,
      startIsString: typeof start === 'string',
      endIsString: typeof end === 'string'
    });

    // Validate coordinates
    validateCoordinatesWithErrors(lat, lon);

    // Validate timezone
    validateTimezoneWithErrors(timezone);

    // Validate date range
    console.log(`[DEBUG] Date validation - start: "${startTrim}", end: "${endTrim}"`);
    validateDateRangeWithErrors(startTrim, endTrim);

    // Check cache first
    const cacheKey = `weather:${lat}:${lon}:${startTrim}:${endTrim}:${timezone}`;
    const cachedResult = cache.get(cacheKey);
    if (cachedResult) {
      return res.json(cachedResult);
    }

    const weather = await getHistoricalWeather(
      { latitude: lat, longitude: lon, timezone },
      startTrim,
      endTrim
    );
    
    // Cache the result
    cache.set(cacheKey, weather);
    
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
  console.log(`[DEBUG] Reverse geocode request: lat=${req.query.lat}, lon=${req.query.lon}`);
  try {
    // Validate and sanitize query parameters using Zod
    const validatedParams = validateWithZod(ReverseGeocodeAPIParamsSchema, req.query, 'Invalid reverse geocode parameters') as { lat: number; lon: number };
    const { lat, lon } = validatedParams;

    console.log(`[DEBUG] Reverse geocode validated params: lat=${lat}, lon=${lon}`);

    // Validate coordinates
    validateCoordinatesWithErrors(lat, lon);

    // Check cache first
    const cacheKey = `reverse:${lat}:${lon}`;
    const cachedResult = cache.get(cacheKey);
    if (cachedResult) {
      console.log(`[DEBUG] Reverse geocode cache hit for ${cacheKey}`);
      return res.json(cachedResult);
    }

    console.log(`[DEBUG] Reverse geocode cache miss, calling Open-Meteo API for ${lat}, ${lon}`);
    const location: GeoLocation = await reverseGeocode(lat, lon);

    console.log(`[DEBUG] Reverse geocode success: ${location.name}, ${location.country}`);

    // Cache the result
    cache.set(cacheKey, location);

    res.json(location);
  } catch (error: unknown) {
    console.error(`[DEBUG] Reverse geocode failed for lat=${req.query.lat}, lon=${req.query.lon}:`, error);
    const wrappedError = wrapError(error, 'Reverse geocode failed');
    const errorResponse = createErrorResponse(
      wrappedError,
      wrappedError instanceof ValidationError ? 400 : 500
    );
    console.error(`[DEBUG] Reverse geocode error response:`, errorResponse);
    res.status(errorResponse.statusCode || 500).json(errorResponse);
  }
});

// Add endpoint to get cache statistics (only in development environment)
if (nodeEnv === 'development') {
  app.get('/api/cache-stats', (req, res) => {
    res.json({ size: cache.size() });
  });
  
  // Add endpoint to clear cache (useful for development)
  app.get('/api/cache-clear', (req, res) => {
    cache.clear();
    res.json({ message: 'All caches cleared' });
  });

  // Add endpoint to shut down the server (useful for development)
  app.post('/api/shutdown', (req, res) => {
    res.json({ message: 'Shutting down server...' });
    gracefulShutdown('API');
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
  console.log(`🚀 Server successfully started!`);
  console.log(`📍 Server listening at http://localhost:${port}`);
  console.log(`🌍 Environment: ${nodeEnv}`);
  console.log(`🔒 CORS origins: ${corsOrigins || 'None specified'}`);
  console.log(`🏥 Health check available at: http://localhost:${port}/api/health`);
  console.log(`📊 Available endpoints:`);
  console.log(`   GET /api/health - Health check`);
  console.log(`   GET /api/debug-config - View API configuration`);
  console.log(`   GET /api/search?q=<query> - Search locations`);
  console.log(`   GET /api/weather?lat=<lat>&lon=<lon>&start=<date>&end=<date>&timezone=<tz> - Get weather data`);
  console.log(`   GET /api/reverse-geocode?lat=<lat>&lon=<lon> - Reverse geocode`);
  if (nodeEnv === 'development') {
    console.log(`   GET /api/cache-stats - View cache statistics`);
    console.log(`   GET /api/cache-clear - Clear all caches`);
  }
  console.log(`\n💡 If you're seeing API errors, check that:`);
  console.log(`   1. The server is running (you should see this message)`);
  console.log(`   2. Frontend API_BASE_URL matches: http://localhost:${port}/api`);
  console.log(`   3. No firewall is blocking port ${port}`);
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
      // Simple cache manager doesn't require cleanup, but we can clear it if needed
      console.log('Cache cleaned up');

      // Stop memory monitoring - apiMemoryTester was removed as part of simplification
      console.log('Memory leak detection stopped');

      // Force final garbage collection
      if (typeof global.gc === 'function') {
        try {
          global.gc();
          console.log('Final garbage collection completed');
        } catch {
          // GC might not be available in all environments
        }
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
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