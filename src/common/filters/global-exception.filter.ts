import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AppError } from '../errors/app-error.js';
import type { ApiErrorResponse, ErrorCode } from '../types/api-response.js';
import { readRequestId } from '../interceptors/request-id.interceptor.js';

const STATUS_TO_CODE: Readonly<Record<number, ErrorCode>> = {
  [HttpStatus.BAD_REQUEST]: 'VALIDATION_ERROR',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'VERSION_CONFLICT',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'DOMAIN_RULE_VIOLATION',
  [HttpStatus.TOO_MANY_REQUESTS]: 'RATE_LIMITED',
};

function extractMessage(exception: HttpException): string | undefined {
  const payload = exception.getResponse();

  if (typeof payload === 'string') {
    return payload;
  }

  if (typeof payload === 'object' && payload !== null) {
    const message = (payload as { message?: unknown }).message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.join('; ');
  }

  return undefined;
}

/**
 * Normalises every thrown value into the single error envelope defined in
 * docs/API-CONTRACT.md section 1.3.
 *
 * Unknown failures collapse to `INTERNAL_ERROR` with a generic message so no
 * stack trace or database detail leaks to the client; the full error is logged
 * server-side against the same requestId.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const request = http.getRequest<Request>();
    const requestId = readRequestId(response);

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code: ErrorCode = 'INTERNAL_ERROR';
    let message = 'Internal server error';
    let details: unknown;

    if (exception instanceof AppError) {
      status = exception.status;
      code = exception.code;
      message = exception.message;
      details = exception.details;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      code = STATUS_TO_CODE[status] ?? 'INTERNAL_ERROR';
      message = extractMessage(exception) ?? 'Internal server error';
    } else {
      this.logger.error(
        `Unhandled exception on ${request.method} ${request.url} (requestId=${requestId})`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url} -> ${status} ${code} (requestId=${requestId})`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    const body: ApiErrorResponse = {
      error: {
        code,
        message,
        ...(details === undefined ? {} : { details }),
        requestId,
      },
    };

    response.status(status).json(body);
  }
}
