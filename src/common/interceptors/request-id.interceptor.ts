import { randomUUID } from 'node:crypto';
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { Observable } from 'rxjs';

export const REQUEST_ID_HEADER = 'x-request-id';

export function generateRequestId(): string {
  return `req_${randomUUID()}`;
}

/**
 * Guarantees every request carries an `X-Request-Id`, so
 * `meta.requestId` in the success envelope and `error.requestId` in the error
 * envelope are always populated as required by docs/API-CONTRACT.md.
 *
 * A client-supplied id is preserved when present, which makes tracing across
 * services possible.
 */
@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const incoming = request.headers[REQUEST_ID_HEADER];
    const requestId =
      typeof incoming === 'string' && incoming.trim().length > 0
        ? incoming.trim()
        : generateRequestId();

    response.setHeader('X-Request-Id', requestId);

    return next.handle();
  }
}

export function readRequestId(response: Response): string {
  const value = response.getHeader(REQUEST_ID_HEADER);
  return typeof value === 'string' && value.length > 0 ? value : 'req_unknown';
}
