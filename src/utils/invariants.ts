/**
 * Common invariant utility functions using tiny-invariant for better runtime validation
 * These provide consistent, descriptive error messages and reduce boilerplate code
 */

import invariant from 'tiny-invariant';

/**
 * Validates that a value is a non-empty string
 */
export const validateString = (value: unknown, name: string): string => {
  invariant(typeof value === 'string' && value.length > 0, `${name} must be a non-empty string, got: ${typeof value}`);
  return value;
};

/**
 * Validates that a value is a valid number within optional range
 */
export const validateNumber = (value: unknown, name: string, min?: number, max?: number): number => {
  invariant(typeof value === 'number' && !isNaN(value), `${name} must be a valid number, got: ${typeof value}`);
  if (min !== undefined) {
    invariant(value >= min, `${name} must be >= ${min}, got: ${value}`);
  }
  if (max !== undefined) {
    invariant(value <= max, `${name} must be <= ${max}, got: ${value}`);
  }
  return value;
};

/**
 * Validates that a value is a function
 */
export const validateFunction = <T extends (...args: unknown[]) => unknown>(
  value: unknown,
  name: string
): T => {
  invariant(typeof value === 'function', `${name} must be a function, got: ${typeof value}`);
  return value as T;
};

/**
 * Validates that a value is an object (but not null)
 */
export const validateObject = (value: unknown, name: string): object => {
  invariant(value !== null && typeof value === 'object', `${name} must be an object, got: ${typeof value}`);
  return value;
};

/**
 * Validates that a value is a boolean
 */
export const validateBoolean = (value: unknown, name: string): boolean => {
  invariant(typeof value === 'boolean', `${name} must be a boolean, got: ${typeof value}`);
  return value;
};

/**
 * Validates coordinate ranges
 */
export const validateCoordinate = (value: number, name: string, min: number, max: number): number => {
  invariant(typeof value === 'number' && !isNaN(value), `${name} must be a valid number, got: ${typeof value}`);
  invariant(value >= min && value <= max, `${name} must be between ${min} and ${max}, got: ${value}`);
  return value;
};

/**
 * Validates array length
 */
export const validateArrayLength = (value: unknown[], name: string, minLength?: number, maxLength?: number): unknown[] => {
  invariant(Array.isArray(value), `${name} must be an array, got: ${typeof value}`);
  if (minLength !== undefined) {
    invariant(value.length >= minLength, `${name} must have at least ${minLength} items, got: ${value.length}`);
  }
  if (maxLength !== undefined) {
    invariant(value.length <= maxLength, `${name} must have at most ${maxLength} items, got: ${value.length}`);
  }
  return value;
};

/**
 * Validates that an object has required properties
 */
export const validateRequiredProperties = (obj: object, properties: string[], objectName: string): void => {
  invariant(obj !== null && typeof obj === 'object', `${objectName} must be an object`);
  for (const prop of properties) {
    invariant(prop in obj, `${objectName} must have property '${prop}'`);
  }
};