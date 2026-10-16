import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export const REQUEST_ID_HEADER = 'x-request-id';

export function generateRequestId(): string {
  return `req_${randomUUID()}`;
}

/**
 * Guarantees every request carries an `X-Request-Id`.
 *
 * This is middleware rather than an interceptor on purpose. Nest runs guards
 * before interceptors, so a guard that rejects — the 401 for a missing or
 * invalid token, which is the most common failure of all — would execute before
 * an interceptor ever got the chance to set the header. The error envelope
 * requires a requestId on every response (docs/API-CONTRACT.md section 1.3),
 * and a middleware is the only hook that runs early enough to guarantee it.
 */
export function requestIdMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const incoming = request.headers[REQUEST_ID_HEADER];

  // A client-supplied id is preserved so a trace can span services.
  const requestId =
    typeof incoming === 'string' && incoming.trim().length > 0
      ? incoming.trim()
      : generateRequestId();

  response.setHeader('X-Request-Id', requestId);

  next();
}

export function readRequestId(response: Response): string {
  const value = response.getHeader(REQUEST_ID_HEADER);
  return typeof value === 'string' && value.length > 0 ? value : 'req_unknown';
}
