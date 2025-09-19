import cors from 'cors';

/**
 * CORS configuration utility for handling multiple environments
 */

interface CorsConfig {
  origin: string | string[] | boolean;
  methods?: string[];
  credentials?: boolean;
  maxAge?: number;
  exposedHeaders?: string[];
  allowedHeaders?: string[];
}

/**
 * Determines CORS configuration based on environment
 * @param env - Current environment (development, production, etc.)
 * @param corsOrigins - Comma-separated list of allowed origins from environment variables
 * @returns CORS configuration object
 */
export function getCorsConfig(env: string, corsOrigins: string): CorsConfig {
  // Parse origins from environment variable
  const origins = corsOrigins.split(',').map(origin => origin.trim()).filter(origin => origin.length > 0);
  
  // In development, be more permissive
  if (env === 'development') {
    // If no origins specified, allow localhost origins
    if (origins.length === 0) {
      return {
        origin: ['http://localhost:8080', 'http://127.0.0.1:8080'],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        credentials: false,
        maxAge: 86400
      };
    }
    
    // Add localhost origins to the list for development convenience
    const devOrigins = [...origins, 'http://localhost:8080', 'http://127.0.0.1:8080'];
    return {
      origin: devOrigins,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      credentials: false,
      maxAge: 86400
    };
  }
  
  // In production, be strict
  if (env === 'production') {
    if (origins.length === 0) {
      // In production, we disable CORS entirely if no origins are specified for security
      return {
        origin: false, // Disable CORS entirely if no origins specified
        methods: ['GET'],
        credentials: false,
        maxAge: 86400
      };
    }
    
    return {
      origin: origins,
      methods: ['GET'],
      credentials: false,
      maxAge: 86400
    };
  }
  
  // For other environments (test, staging, etc.), use a balanced approach
  if (origins.length === 0) {
    return {
      origin: '*', // Allow all origins in non-production environments without specific origins
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      credentials: false,
      maxAge: 86400
    };
  }
  
  return {
    origin: origins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: false,
    maxAge: 86400
  };
}

/**
 * Creates a CORS middleware with environment-specific configuration
 * @param env - Current environment
 * @param corsOrigins - Comma-separated list of allowed origins
 * @returns CORS middleware
 */
export function createCorsMiddleware(env: string, corsOrigins: string) {
  const config = getCorsConfig(env, corsOrigins);
  return cors(config);
}