/**
 * Standardized error response format for API communication
 * This interface defines a consistent error structure that both frontend and backend can use
 */
export interface ErrorResponse {
  error: string;
  field?: string;
  details?: string;
  statusCode?: number;
  timestamp?: string;
}

/**
 * Standardized success response format
 */
export interface SuccessResponse<T> {
  data: T;
  timestamp?: string;
}