import { describe, expect, it } from '@jest/globals';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import type { Request, Response } from 'express';
import { of } from 'rxjs';
import {
  RequestIdInterceptor,
  generateRequestId,
} from './request-id.interceptor.js';

function createContext(headers: Record<string, string>): {
  context: ExecutionContext;
  captured: Record<string, string>;
} {
  const captured: Record<string, string> = {};

  const response = {
    // Express stores headers case-insensitively; the mock mirrors that so the
    // test does not depend on the casing used at the call site.
    setHeader(name: string, value: string): void {
      captured[name.toLowerCase()] = value;
    },
  } as unknown as Response;

  const request = { headers } as unknown as Request;

  const context = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ExecutionContext;

  return { context, captured };
}

const next: CallHandler = { handle: () => of('ok') };

describe('RequestIdInterceptor', () => {
  it('generates an id when the request has none', () => {
    const { context, captured } = createContext({});

    new RequestIdInterceptor().intercept(context, next);

    expect(captured['x-request-id']).toMatch(/^req_/);
  });

  it('preserves a client-supplied id so traces can span services', () => {
    const { context, captured } = createContext({ 'x-request-id': 'req_abc' });

    new RequestIdInterceptor().intercept(context, next);

    expect(captured['x-request-id']).toBe('req_abc');
  });

  it('replaces a blank id instead of propagating an empty one', () => {
    const { context, captured } = createContext({ 'x-request-id': '   ' });

    new RequestIdInterceptor().intercept(context, next);

    expect(captured['x-request-id']).toMatch(/^req_/);
  });

  it('produces unique ids across calls', () => {
    const ids = new Set([generateRequestId(), generateRequestId()]);

    expect(ids.size).toBe(2);
  });
});
