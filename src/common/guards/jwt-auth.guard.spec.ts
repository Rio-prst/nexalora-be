import { describe, expect, it } from '@jest/globals';
import { Reflector } from '@nestjs/core';
import type { ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { sign } from 'jsonwebtoken';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { IAuthService } from '../../auth/interfaces/auth.service.interface.js';
import type { AuthenticatedUser } from '../types/authenticated-user.js';
import { Role } from '../types/role.js';
import { AppError } from '../errors/app-error.js';

const SECRET = 'test-secret-value-for-signing-tokens';
const USER_ID = '550e8400-e29b-41d4-a716-446655440000';

function createContext(request: Partial<Request>): ExecutionContext {
  return {
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

function createGuard(principal: AuthenticatedUser): JwtAuthGuard {
  const authService = {
    resolvePrincipal: () => principal,
  } as unknown as IAuthService;

  return new JwtAuthGuard(
    { getAllAndOverride: () => undefined } as unknown as Reflector,
    authService,
  );
}

describe('JwtAuthGuard', () => {
  const principal: AuthenticatedUser = { userId: USER_ID, role: Role.STUDENT };

  it('short-circuits a @Public() endpoint without reading a token', () => {
    const request = { headers: {} } as Request;
    const guard = new JwtAuthGuard(
      { getAllAndOverride: () => true } as unknown as Reflector,
      { resolvePrincipal: () => principal } as unknown as IAuthService,
    );

    expect(guard.canActivate(createContext(request))).toBe(true);
    expect(request.user).toBeUndefined();
  });

  it('throws 401 when the Authorization header is absent', () => {
    const guard = createGuard(principal);
    const request = { headers: {} } as Request;

    expect(() => guard.canActivate(createContext(request))).toThrow(AppError);
    try {
      guard.canActivate(createContext(request));
    } catch (error) {
      expect((error as AppError).status).toBe(401);
    }
  });

  it('rejects a non-Bearer authorization scheme', () => {
    const guard = createGuard(principal);
    const request = {
      headers: { authorization: 'Basic dXNlcjpwYXNz' },
    } as Request;

    expect(() => guard.canActivate(createContext(request))).toThrow(AppError);
  });

  it('rejects a Bearer header with no token', () => {
    const guard = createGuard(principal);
    const request = { headers: { authorization: 'Bearer ' } } as Request;

    expect(() => guard.canActivate(createContext(request))).toThrow(AppError);
  });

  it('accepts the lowercase bearer scheme', () => {
    const guard = createGuard(principal);
    const request = {
      headers: { authorization: `bearer ${sign({ sub: USER_ID }, SECRET)}` },
    } as Request;

    expect(guard.canActivate(createContext(request))).toBe(true);
  });

  it('attaches the resolved principal to request.user', () => {
    const guard = createGuard(principal);
    const request = { headers: { authorization: 'Bearer abc' } } as Request;

    guard.canActivate(createContext(request));

    expect(request.user).toEqual(principal);
  });
});
