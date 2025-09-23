import { ZodError, ZodIssue, ZodSchema } from 'zod';

/**
 * Type for validation result
 */
export type ValidationResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: ZodError;
};

/**
 * Custom error class for validation errors
 */
export class ValidationError extends Error {
  field?: string;
  value?: unknown;
  details?: Record<string, unknown>;

  constructor(message: string, field?: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.details = details;
  }
}

/**
 * Validates data against a Zod schema and throws a ValidationError if validation fails
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @param errorMessage - Custom error message prefix
 * @returns Validated data
 * @throws ValidationError if validation fails
 */
export const validateWithZod = <T>(schema: ZodSchema<T>, data: unknown, errorMessage: string = 'Validation failed'): T => {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof ZodError) {
      // Format Zod errors into a more readable format
      const fieldErrors = error.issues.map((e: ZodIssue) => ({
        field: e.path.join('.'),
        message: e.message,
        code: e.code,
      }));
      
      throw new ValidationError(
        `${errorMessage}: ${fieldErrors.map((e) => `${e.field}: ${e.message}`).join(', ')}`,
        fieldErrors[0]?.field || 'validation',
        { errors: fieldErrors }
      );
    }
    throw error;
  }
};

/**
 * Validates data against a Zod schema and returns a ValidationResult
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns ValidationResult with success status and either data or error
 */
export const safeValidateWithZod = <T>(schema: ZodSchema<T>, data: unknown): ValidationResult<T> => {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
};

/**
 * Formats Zod errors into a more readable format
 * @param error - ZodError to format
 * @returns Array of formatted error objects
 */
export const formatZodErrors = (error: ZodError) => {
  return error.issues.map((e: ZodIssue) => ({
    field: e.path.join('.'),
    message: e.message,
    code: e.code,
  }));
};