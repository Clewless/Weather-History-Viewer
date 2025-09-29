import cors from 'cors';

import { getEnvVar } from './env';

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
 * @param frontendPort - Frontend port number for localhost origins
 * @returns CORS configuration object
 */
export function getCorsConfig(env: string, corsOrigins: string, frontendPort: number = 3000): CorsConfig {
  // Parse origins from environment variable
  const origins = corsOrigins.split(',').map(origin => origin.trim()).filter(origin => origin.length > 0);
  
  // Get CORS fallback disabled setting
  const corsFallbackDisabled = getEnvVar('CORS_FALLBACK_DISABLED') === 'true';
  
  // In development, be more permissive
  if (env === 'development') {
    // If no origins specified, allow localhost origins
    if (origins.length === 0) {
      return {
        origin: [`http://localhost:${frontendPort}`, `http://127.0.0.1:${frontendPort}`],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        credentials: false,
        maxAge: 86400
      };
    }
    
    // Add localhost origins to the list for development convenience
    const devOrigins = [...origins, `http://localhost:${frontendPort}`, `http://127.0.0.1:${frontendPort}`];
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
      // In production, we can either disable CORS entirely or allow all origins based on configuration
      if (corsFallbackDisabled) {
        return {
          origin: false, // Disable CORS entirely if no origins specified and fallback is disabled
          methods: ['GET'],
          credentials: false,
          maxAge: 86400
        };
      } else {
        // Allow all origins as a fallback if not explicitly disabled
        return {
          origin: '*',
          methods: ['GET'],
          credentials: false,
          maxAge: 86400
        };
      }
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
 * @param frontendPort - Frontend port number for localhost origins
 * @returns CORS middleware
 */
export function createCorsMiddleware(env: string, corsOrigins: string, frontendPort: number = 3000) {
  const config = getCorsConfig(env, corsOrigins, frontendPort);
  return cors(config);
}