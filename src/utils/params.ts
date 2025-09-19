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
  
  // Check if it's a valid number
  if (!/^-?\d+(\.\d+)?$/.test(stringValue)) {
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