import { describe, expect, it } from '@jest/globals';
import type { NextFunction, Request, Response } from 'express';
import {
  generateRequestId,
  readRequestId,
  requestIdMiddleware,
} from './request-id.middleware.js';

function run(headers: Record<string, string>): {
  captured: Record<string, string>;
  nextCalled: boolean;
} {
  const captured: Record<string, string> = {};
  let nextCalled = false;

  const response = {
    setHeader(name: string, value: string): void {
      captured[name.toLowerCase()] = value;
    },
  } as unknown as Response;

  const request = { headers } as unknown as Request;
  const next: NextFunction = () => {
    nextCalled = true;
  };

  requestIdMiddleware(request, response, next);

  return { captured, nextCalled };
}

describe('requestIdMiddleware', () => {
  it('generates an id when the request has none', () => {
    const { captured, nextCalled } = run({});

    expect(captured['x-request-id']).toMatch(/^req_/);
    expect(nextCalled).toBe(true);
  });

  it('preserves a client-supplied id so traces can span services', () => {
    const { captured } = run({ 'x-request-id': 'req_abc' });

    expect(captured['x-request-id']).toBe('req_abc');
  });

  it('replaces a blank id instead of propagating an empty one', () => {
    const { captured } = run({ 'x-request-id': '   ' });

    expect(captured['x-request-id']).toMatch(/^req_/);
  });

  it('produces unique ids across calls', () => {
    expect(new Set([generateRequestId(), generateRequestId()]).size).toBe(2);
  });

  it('reads the id back off the response', () => {
    const response = {
      getHeader: () => 'req_from_header',
    } as unknown as Response;

    expect(readRequestId(response)).toBe('req_from_header');
  });

  it('falls back to a placeholder only when the header is genuinely absent', () => {
    const response = { getHeader: () => undefined } as unknown as Response;

    expect(readRequestId(response)).toBe('req_unknown');
  });
});
