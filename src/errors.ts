/**
 * Custom error classes for better error handling and debugging
 */

export class NetworkError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class APIError extends Error {
  constructor(message: string, public statusCode?: number, public apiResponse?: any) {
    super(message);
    this.name = 'APIError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public field?: string, public value?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ConfigurationError extends Error {
  constructor(message: string, public configKey?: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

export class RateLimitError extends Error {
  constructor(message: string, public limit?: number, public window?: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}

/**
 * Standardized error response format for API communication
 */
export interface ErrorResponse {
  error: string;
  field?: string;
  details?: string;
  statusCode?: number;
  timestamp?: string;
}

/**
 * Helper function to determine error type and wrap appropriately
 */
export function wrapError(error: unknown, context: string): Error {
  if (error instanceof Error) {
    // If it's already one of our custom errors, return as-is
    if (error instanceof NetworkError || error instanceof APIError ||
        error instanceof ValidationError || error instanceof ConfigurationError) {
      return error;
    }

    // Check if it's an axios error
    if (typeof error === 'object' && error !== null && 'isAxiosError' in error) {
      const axiosError = error as any;
      if (axiosError.response) {
        return new APIError(
          `${context}: ${axiosError.response.status} ${axiosError.response.statusText}`,
          axiosError.response.status,
          axiosError.response.data
        );
      } else if (axiosError.request) {
        return new NetworkError(`${context}: Network request failed`, undefined);
      }
    }

    // Wrap generic errors with context
    return new Error(`${context}: ${error.message}`);
  }

  // Handle non-Error objects
  return new Error(`${context}: ${String(error)}`);
}

/**
 * Helper function to create a standardized error response
 */
export function createErrorResponse(error: Error, statusCode?: number): ErrorResponse {
  const response: ErrorResponse = {
    error: error.message,
    timestamp: new Date().toISOString()
  };

  if (statusCode) {
    response.statusCode = statusCode;
  }

  if (error instanceof ValidationError) {
    response.field = error.field;
  }

  if (error instanceof APIError && error.apiResponse) {
    response.details = JSON.stringify(error.apiResponse);
  }

  if (error instanceof RateLimitError) {
    response.details = `Rate limit exceeded: ${error.limit} requests per ${error.window}`;
  }

  return response;
}