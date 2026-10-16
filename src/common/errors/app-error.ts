import type { ErrorCode } from '../types/api-response.js';

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details: unknown;

  constructor(
    code: ErrorCode,
    status: number,
    message: string,
    details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function validationError(details?: unknown): AppError {
  return new AppError('VALIDATION_ERROR', 400, 'Invalid input', details);
}

export function unauthorized(message = 'Authentication is required'): AppError {
  return new AppError('UNAUTHORIZED', 401, message);
}

export function forbidden(
  message = 'You do not have access to this resource',
): AppError {
  return new AppError('FORBIDDEN', 403, message);
}

/**
 * Used both for genuinely missing resources and for resources owned by
 * another account, so ownership cannot be probed (AC-01B).
 */
export function notFound(message = 'Resource not found'): AppError {
  return new AppError('NOT_FOUND', 404, message);
}

export function versionConflict(
  expectedVersion: number,
  latestVersion: number,
): AppError {
  return new AppError(
    'VERSION_CONFLICT',
    409,
    'Data has changed on another device or tab',
    { expectedVersion, latestVersion },
  );
}

export function idempotencyKeyReused(
  message = 'Idempotency-Key was reused with a different payload',
): AppError {
  return new AppError('IDEMPOTENCY_KEY_REUSED', 409, message);
}

export function domainRuleViolation(
  message: string,
  details?: unknown,
): AppError {
  return new AppError('DOMAIN_RULE_VIOLATION', 422, message, details);
}

export function rateLimited(message = 'Too many requests'): AppError {
  return new AppError('RATE_LIMITED', 429, message);
}
