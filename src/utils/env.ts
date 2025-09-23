import { ConfigurationError } from '../errors';

/**
 * Environment variable validation utility
 * Provides functions to validate and retrieve environment variables with proper error handling
 */

interface EnvVarConfig {
  required?: boolean;
  validator?: (value: string) => boolean;
  defaultValue?: string;
  description?: string;
}

const defaultEnvVars = {
  PORT: {
    required: false,
    validator: (value: string) => {
      const port = parseInt(value, 10);
      return !isNaN(port) && port > 0 && port < 65536;
    },
    defaultValue: '3001',
    description: 'Server port number (1-65535)'
  },
  FRONTEND_PORT: {
    required: false,
    validator: (value: string) => {
      const port = parseInt(value, 10);
      return !isNaN(port) && port > 0 && port < 65536;
    },
    defaultValue: '3000',
    description: 'Frontend port number (1-65535)'
  },
  CORS_ORIGIN: {
    required: false,
    validator: (value: string) => {
      // Allow comma-separated list of origins
      // Each origin can be a URL or a simple hostname
      const origins = value.split(',').map(origin => origin.trim());
      return origins.every(origin => {
        // Empty origin is valid (means no restriction in some contexts)
        if (origin === '') return true;
        // Allow hostnames without protocol (e.g., localhost:3000)
        if (!origin.includes('://')) {
          return origin.length > 0;
        }
        // For URLs, check they start with http:// or https://
        return origin.startsWith('http://') || origin.startsWith('https://');
      });
    },
    defaultValue: 'http://localhost:3000',
    description: 'Allowed CORS origins (comma-separated URLs or hostnames)'
  },
  CORS_FALLBACK_DISABLED: {
    required: false,
    validator: (value: string) => {
      // Should be a boolean value
      return value === 'true' || value === 'false' || value === '';
    },
    defaultValue: 'false',
    description: 'Disable CORS fallback in production (true/false)'
  },
  NODE_ENV: {
    required: false,
    validator: (value: string) => {
      return ['development', 'production', 'test'].includes(value);
    },
    defaultValue: 'development',
    description: 'Node environment (development, production, test)'
  },
  OPEN_METEO_API_KEY: {
    required: false,
    validator: (value: string) => {
      // API key can be any non-empty string
      return value.length > 0;
    },
    description: 'Open-Meteo API key (optional but recommended)'
  },
  API_BASE_URL: {
    required: false,
    validator: (value: string) => {
      // Simple URL validation - can be enhanced if needed
      return value.length > 0 && (value.startsWith('http://') || value.startsWith('https://'));
    },
    defaultValue: 'http://localhost:3001/api',
    description: 'Base URL for API requests'
  }
};

/**
  * Validates all environment variables at startup and logs warnings for optional ones
  */

/**
  * Validates and retrieves an environment variable
  * @param name - The name of the environment variable
  * @param config - Configuration for the environment variable
  * @returns The validated environment variable value
  * @throws ConfigurationError if the variable is required but missing or invalid
  */
export function getEnvVar(name: string, config?: EnvVarConfig): string | undefined {
  const value = process.env[name];
  const varConfig = config || defaultEnvVars[name as keyof typeof defaultEnvVars] || { required: false };
  
  // Check if required
  if (varConfig.required && (value === undefined || value === '')) {
    throw new ConfigurationError(`Required environment variable ${name} is not set`, name);
  }
  
  // Use default value if available and no value is set
  if ((value === undefined || value === '') && 'defaultValue' in varConfig && varConfig.defaultValue !== undefined) {
    return varConfig.defaultValue;
  }
  
  // If no value and not required, return undefined
  if (value === undefined || value === '') {
    return undefined;
  }
  
  // Validate only when a non-empty value is provided. Optional empty values are allowed.
  if (varConfig.validator && value !== '' && !varConfig.validator(value)) {
    throw new ConfigurationError(
      `Environment variable ${name} has invalid value: ${value}`,
      name
    );
  }
  
  return value;
}

/**
 * Validates all configured environment variables
 * @throws ConfigurationError if any required variables are missing or invalid
 */
export function validateEnvVars(): void {
  const errors: string[] = [];
  
  // Validate default environment variables
  for (const [name, config] of Object.entries(defaultEnvVars)) {
    try {
      const value = process.env[name];

      // If not required and no value provided, skip validator
      if ((value === undefined || value === '') && !config.required) {
        continue;
      }

      // If value missing but required, record error
      if ((value === undefined || value === '') && config.required) {
        errors.push(`Required environment variable ${name} is not set`);
        continue;
      }

      if (config.validator && !config.validator(value as string)) {
        errors.push(`Environment variable ${name} has invalid value: ${value}`);
      }
    } catch (error: unknown) {
      if (error instanceof ConfigurationError) {
        errors.push(error.message);
      }
    }
  }
  
  // Throw all errors at once
  if (errors.length > 0) {
    throw new ConfigurationError(`Environment validation failed:
${errors.join('\n')}`);
  }

  // Warn if Open-Meteo API key is missing (optional but recommended)
  if (!process.env.OPEN_METEO_API_KEY) {
    console.warn('OPEN_METEO_API_KEY is not set. Using free tier with limited rate limits. Get a free key at https://open-meteo.com/en/docs');
  }
}

/**
 * Gets all environment variables with their descriptions
 * @returns Object mapping variable names to their configs
 */
export function getEnvVarDescriptions(): Record<string, string> {
  const descriptions: Record<string, string> = {};
  
  for (const [name, config] of Object.entries(defaultEnvVars)) {
    descriptions[name] = config.description || 'No description available';
  }
  
  return descriptions;
}