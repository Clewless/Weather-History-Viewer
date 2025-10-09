/**
 * Simplified error handling for the weather application
 * Replaces the overly complex error handling system
 */

export class APIError extends Error {
  constructor(message: string, public statusCode?: number, public apiResponse?: unknown) {
    super(message);
    this.name = 'APIError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public field?: string, public value?: unknown) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NetworkError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class ConfigurationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

/**
 * Helper function to determine error type and wrap appropriately
 */
export function wrapError(error: unknown, context: string): Error {
  if (error instanceof Error) {
    // If it's already one of our custom errors, return as-is
    if (error instanceof NetworkError || error instanceof APIError || error instanceof ValidationError) {
      return error;
    }

    // Check if it's an axios-like error
    if (typeof error === 'object' && error !== null && 'isAxiosError' in error) {
      const axiosError = error as { response?: { status: number; statusText: string; data: unknown }; request?: unknown };
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
    return new APIError(`${context}: ${error.message}`, 500, error);
  }

  // Handle non-Error objects
  return new APIError(`${context}: ${String(error)}`, 500, error);
}

/**
 * Helper function to create a standardized error response
 */
export function createErrorResponse(error: Error, statusCode?: number) {
  const response: any = {
    error: error.message,
    timestamp: new Date().toISOString()
  };

  if (statusCode) {
    response.statusCode = statusCode;
  }

  if (error instanceof ValidationError && error.field) {
    response.field = error.field;
  }

  return response;
}