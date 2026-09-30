import { ZodError, ZodIssue } from "zod";

/**
 * Base application error. All custom errors extend this.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(message: string, statusCode = 400, code = "APP_ERROR") {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 400: validation failed. Carries field-level Zod errors.
 */
export class ValidationError extends AppError {
  public readonly fieldErrors: Record<string, string[]>;

  constructor(zodError: ZodError) {
    super("Validation failed", 400, "VALIDATION_ERROR");
    this.fieldErrors = ValidationError.formatZodIssues(zodError.issues);
  }

  private static formatZodIssues(issues: ZodIssue[]): Record<string, string[]> {
    const errors: Record<string, string[]> = {};
    for (const issue of issues) {
      const path = issue.path.length > 0 ? issue.path.join(".") : "_root";
      if (!errors[path]) errors[path] = [];
      errors[path].push(issue.message);
    }
    return errors;
  }
}

/**
 * 400: a business rule rejected the input, with no Zod field errors to report.
 */
export class ValidationFailedError extends AppError {
  constructor(message: string, code = "VALIDATION_ERROR") {
    super(message, 400, code);
  }
}

/**
 * 401: missing or invalid authentication credentials.
 */
export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized", code = "UNAUTHORIZED") {
    super(message, 401, code);
  }
}

/**
 * 404: resource not found.
 */
export class NotFoundError extends AppError {
  constructor(resource = "Resource", code = "NOT_FOUND") {
    super(`${resource} not found`, 404, code);
  }
}

/**
 * 409: conflict (duplicate, already exists, in use).
 */
export class ConflictError extends AppError {
  constructor(message = "Resource conflict", code = "CONFLICT") {
    super(message, 409, code);
  }
}
