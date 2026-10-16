import { describe, expect, it } from '@jest/globals';
import { HttpException, HttpStatus, type ArgumentsHost } from '@nestjs/common';
import type { Request, Response } from 'express';
import { GlobalExceptionFilter } from './global-exception.filter.js';
import { AppError, versionConflict } from '../errors/app-error.js';

interface CapturedResponse {
  status: number;
  body: Record<string, unknown> | undefined;
}

function createHost(captured: CapturedResponse): ArgumentsHost {
  const response = {
    status(code: number): Response {
      captured.status = code;
      return this as unknown as Response;
    },
    json(body: unknown): Response {
      captured.body = body as Record<string, unknown>;
      return this as unknown as Response;
    },
    getHeader(name: string): string {
      return name === 'x-request-id' ? 'req_test_123' : '';
    },
  } as unknown as Response;

  const request = {
    method: 'GET',
    url: '/api/health',
  } as Request;

  return {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  } as unknown as ArgumentsHost;
}

describe('GlobalExceptionFilter', () => {
  const filter = new GlobalExceptionFilter();

  function run(exception: unknown): CapturedResponse {
    const captured: CapturedResponse = { status: 0, body: undefined };
    filter.catch(exception, createHost(captured));
    return captured;
  }

  it('passes AppError status, code, message and details through', () => {
    const captured = run(versionConflict(2, 3));

    expect(captured.status).toBe(409);
    expect(captured.body).toEqual({
      error: {
        code: 'VERSION_CONFLICT',
        message: 'Data has changed on another device or tab',
        details: { expectedVersion: 2, latestVersion: 3 },
        requestId: 'req_test_123',
      },
    });
  });

  it('maps an HttpException status onto the documented error code', () => {
    const captured = run(new HttpException('Nope', HttpStatus.FORBIDDEN));

    expect(captured.status).toBe(403);
    expect(captured.body).toMatchObject({
      error: { code: 'FORBIDDEN', message: 'Nope' },
    });
  });

  it('hides unknown failures behind a generic 500 without leaking details', () => {
    const captured = run(new Error('connect ECONNREFUSED 10.0.0.5:5432'));

    expect(captured.status).toBe(500);
    expect(captured.body).toEqual({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        requestId: 'req_test_123',
      },
    });
    expect(JSON.stringify(captured.body)).not.toContain('ECONNREFUSED');
  });

  it('omits details entirely when none were supplied', () => {
    const captured = run(
      new AppError('UNAUTHORIZED', 401, 'Missing Bearer token'),
    );

    expect(captured.body).toEqual({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing Bearer token',
        requestId: 'req_test_123',
      },
    });
  });
});
