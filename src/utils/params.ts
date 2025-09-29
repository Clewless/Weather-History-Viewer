/**
 * Utility functions for safe parameter handling in Express routes
 */

import { ValidationError } from '../errors';

/**
 * Safely extracts a string parameter from request query
 * @param query - The request query object
 * @param paramName - The name of the parameter to extract
 * @param required - Whether the parameter is required
 * @returns The parameter value as a string, or undefined if not required and not present
 * @throws ValidationError if required parameter is missing
 */
export function getStringParam(query: Record<string, unknown>, paramName: string, required: boolean = true): string | undefined {
  const value = query[paramName];
  
  if (value === undefined || value === null) {
    if (required) {
      throw new ValidationError(`Missing required parameter: ${paramName}`, paramName);
    }
    return undefined;
  }
  
  if (typeof value !== 'string') {
    throw new ValidationError(`Parameter ${paramName} must be a string`, paramName, value);
  }
  
  return value;
}

/**
 * Safely extracts a number parameter from request query
 * @param query - The request query object
 * @param paramName - The name of the parameter to extract
 * @param required - Whether the parameter is required
 * @returns The parameter value as a number, or undefined if not required and not present
 * @throws ValidationError if required parameter is missing or cannot be parsed as a number
 */
export function getNumberParam(query: Record<string, unknown>, paramName: string, required: boolean = true): number | undefined {
  const value = query[paramName];
  
  if (value === undefined || value === null) {
    if (required) {
      throw new ValidationError(`Missing required parameter: ${paramName}`, paramName);
    }
    return undefined;
  }
  
  // Convert to string first if it's not already
  const stringValue = typeof value === 'string' ? value : String(value);
  
  // Check if it's a valid number (restrict to prevent scientific notation and very large numbers)
  // Allow up to 10 digits before decimal and 6 after, no scientific notation
  if (!/^-?\d{1,10}(\.\d{1,6})?$/.test(stringValue)) {
    throw new ValidationError(`Parameter ${paramName} must be a valid number`, paramName, value);
  }
  
  const numValue = parseFloat(stringValue);
  
  if (isNaN(numValue)) {
    throw new ValidationError(`Parameter ${paramName} is not a valid number`, paramName, value);
  }
  
  return numValue;
}

/**
 * Safely extracts a boolean parameter from request query
 * @param query - The request query object
 * @param paramName - The name of the parameter to extract
 * @param required - Whether the parameter is required
 * @returns The parameter value as a boolean, or undefined if not required and not present
 * @throws ValidationError if required parameter is missing or cannot be parsed as a boolean
 */
export function getBooleanParam(query: Record<string, unknown>, paramName: string, required: boolean = false): boolean | undefined {
  const value = query[paramName];
  
  if (value === undefined || value === null) {
    if (required) {
      throw new ValidationError(`Missing required parameter: ${paramName}`, paramName);
    }
    return undefined;
  }
  
  // Convert to string first if it's not already
  const stringValue = typeof value === 'string' ? value : String(value);
  
  // Handle boolean-like values
  const lowerValue = stringValue.toLowerCase();
  if (lowerValue === 'true' || lowerValue === '1' || lowerValue === 'yes') {
    return true;
  }
  if (lowerValue === 'false' || lowerValue === '0' || lowerValue === 'no') {
    return false;
  }
  
  throw new ValidationError(`Parameter ${paramName} must be a boolean value (true/false, 1/0, yes/no)`, paramName, value);
}

/**
 * Validates that a parameter is present in the query
 * @param query - The request query object
 * @param paramName - The name of the parameter to check
 * @throws ValidationError if parameter is missing
 */
export function requireParam(query: Record<string, unknown>, paramName: string): void {
  if (query[paramName] === undefined || query[paramName] === null) {
    throw new ValidationError(`Missing required parameter: ${paramName}`, paramName);
  }
}

/**
 * Extracts multiple parameters from a query object at once
 * @param query - The request query object
 * @param paramSpecs - Object mapping parameter names to their types and required status
 * @returns Object with extracted parameters
 * @throws ValidationError if required parameters are missing or invalid
 */
export function getParams(
  query: Record<string, unknown>,
  paramSpecs: Record<string, { type: 'string' | 'number' | 'boolean'; required?: boolean }>
): Record<string, string | number | boolean | undefined> {
  const result: Record<string, string | number | boolean | undefined> = {};
  
  for (const [paramName, spec] of Object.entries(paramSpecs)) {
    const { type, required = true } = spec;
    
    try {
      switch (type) {
        case 'string':
          result[paramName] = getStringParam(query, paramName, required);
          break;
        case 'number':
          result[paramName] = getNumberParam(query, paramName, required);
          break;
        case 'boolean':
          result[paramName] = getBooleanParam(query, paramName, required);
          break;
      }
    } catch (error) {
      // Re-throw with additional context
      if (error instanceof ValidationError) {
        throw new ValidationError(
          `Parameter validation failed for ${paramName}: ${error.message}`, 
          paramName, 
          error.value
        );
      }
      throw error;
    }
  }
  
  return result;
}