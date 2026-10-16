import type { Response } from 'express';
import { describe, expect, it, jest } from '@jest/globals';
import { AuthController } from './auth.controller.js';
import type { IAuthService } from './interfaces/auth.service.interface.js';
import type { AuthenticatedUser } from '../common/types/authenticated-user.js';
import { Role } from '../common/types/role.js';

const USER: AuthenticatedUser = {
  userId: '550e8400-e29b-41d4-a716-446655440000',
  role: Role.STUDENT,
};

function responseStub(): Response {
  return {
    getHeader: (name: string) =>
      name === 'x-request-id' ? 'req_auth_test' : '',
  } as unknown as Response;
}

describe('AuthController', () => {
  it('registers new account and returns data envelope', async () => {
    const register = jest.fn(() =>
      Promise.resolve({
        accessToken: 'access_1',
        refreshToken: 'refresh_1',
        user: {
          id: USER.userId,
          email: 'test@example.com',
          fullName: 'Test',
          role: 'STUDENT',
          createdAt: new Date().toISOString(),
        },
      }),
    );
    const service = { register } as unknown as IAuthService;
    const controller = new AuthController(service);

    const result = await controller.register(
      { email: 'test@example.com', password: 'password123', fullName: 'Test' },
      responseStub(),
    );

    expect(register).toHaveBeenCalled();
    expect(result.data.accessToken).toBe('access_1');
    expect(result.meta.requestId).toBe('req_auth_test');
  });

  it('logs in and returns tokens', async () => {
    const login = jest.fn(() =>
      Promise.resolve({
        accessToken: 'access_1',
        refreshToken: 'refresh_1',
        user: {
          id: USER.userId,
          email: 'test@example.com',
          fullName: 'Test',
          role: 'STUDENT',
          createdAt: new Date().toISOString(),
        },
      }),
    );
    const service = { login } as unknown as IAuthService;
    const controller = new AuthController(service);

    const result = await controller.login(
      { email: 'test@example.com', password: 'password123' },
      responseStub(),
    );

    expect(login).toHaveBeenCalled();
    expect(result.data.accessToken).toBe('access_1');
  });

  it('gets authenticated user profile via me()', async () => {
    const me = jest.fn((_userId: string) =>
      Promise.resolve({
        id: USER.userId,
        email: 'me@example.com',
        fullName: 'Me',
        role: 'STUDENT',
        createdAt: new Date().toISOString(),
      }),
    );
    const service = { me } as unknown as IAuthService;
    const controller = new AuthController(service);

    const result = await controller.me(USER, responseStub());

    expect(me).toHaveBeenCalledWith(USER.userId);
    expect(result.data.email).toBe('me@example.com');
  });

  it('logs out current user', async () => {
    const logout = jest.fn((_userId: string) =>
      Promise.resolve({ message: 'Logged out successfully' }),
    );
    const service = { logout } as unknown as IAuthService;
    const controller = new AuthController(service);

    const result = await controller.logout(USER, responseStub());

    expect(logout).toHaveBeenCalledWith(USER.userId);
    expect(result.data.message).toBe('Logged out successfully');
  });

  it('refreshes tokens', async () => {
    const refresh = jest.fn((_refreshToken: string) =>
      Promise.resolve({
        accessToken: 'new_access',
        refreshToken: 'new_refresh',
      }),
    );
    const service = { refresh } as unknown as IAuthService;
    const controller = new AuthController(service);

    const result = await controller.refresh(
      { refreshToken: 'old_refresh' },
      responseStub(),
    );

    expect(refresh).toHaveBeenCalledWith('old_refresh');
    expect(result.data.accessToken).toBe('new_access');
  });
});
