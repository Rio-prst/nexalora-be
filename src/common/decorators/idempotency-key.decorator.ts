import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import { validationError } from '../errors/app-error.js';

export const IDEMPOTENCY_KEY_HEADER = 'idempotency-key';

/**
 * Reads and validates the `Idempotency-Key` header.
 *
 * Mandatory for `POST /api/attempts` and `POST /api/plans`
 * (docs/API-CONTRACT.md section 1.1). A missing or blank header is rejected as
 * a validation error rather than being silently defaulted, because defaulting
 * would defeat the duplicate-request protection it exists to provide.
 */
export const IdempotencyKey = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
    }>();

    const raw = request.headers[IDEMPOTENCY_KEY_HEADER];
    const value = Array.isArray(raw) ? raw[0] : raw;

    if (typeof value !== 'string' || value.trim().length === 0) {
      throw validationError({
        [IDEMPOTENCY_KEY_HEADER]:
          'Idempotency-Key header is required and must not be blank',
      });
    }

    return value.trim();
  },
);
