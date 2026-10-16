import { describe, expect, it, jest } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import { sign } from 'jsonwebtoken';
import { AuthService } from './auth.service.js';
import { AppError } from '../common/errors/app-error.js';
import { Role } from '../common/types/role.js';

const SECRET = 'test-secret-value-for-signing-tokens';
const USER_ID = '550e8400-e29b-41d4-a716-446655440000';

function buildService(secret: string = SECRET): AuthService {
  return new AuthService(
    {
      getOrThrow: () => secret,
      get: () => '7d',
    } as unknown as ConfigService,
    {} as never,
  );
}

function signToken(
  payload: Record<string, unknown>,
  secret: string = SECRET,
  algorithm: 'HS256' | 'HS512' = 'HS256',
): string {
  return sign(payload, secret, { algorithm });
}

describe('AuthService', () => {
  describe('resolvePrincipal', () => {
    it('returns the user id and STUDENT role for a plain token', () => {
      const token = signToken({ sub: USER_ID });

      expect(buildService().resolvePrincipal(token)).toEqual({
        userId: USER_ID,
        role: Role.STUDENT,
      });
    });

    it('reads the product role from app_metadata, not the Supabase role claim', () => {
      const token = signToken({
        sub: USER_ID,
        role: 'authenticated',
        app_metadata: { role: 'CURATOR' },
      });

      expect(buildService().resolvePrincipal(token).role).toBe(Role.CURATOR);
    });

    it('falls back to STUDENT when app_metadata has no known role', () => {
      const token = signToken({
        sub: USER_ID,
        app_metadata: { role: 'SOMETHING_ELSE' },
      });

      expect(buildService().resolvePrincipal(token).role).toBe(Role.STUDENT);
    });

    it('never maps an unknown role to DEMO', () => {
      const token = signToken({ sub: USER_ID });

      expect(buildService().resolvePrincipal(token).role).not.toBe(Role.DEMO);
    });

    it('rejects an expired token', () => {
      const token = signToken({
        sub: USER_ID,
        exp: Math.floor(Date.now() / 1000) - 60,
      });

      expect(() => buildService().resolvePrincipal(token)).toThrow(AppError);
    });

    it('rejects a token signed with a different secret', () => {
      const token = signToken(
        { sub: USER_ID },
        'a-completely-different-secret',
      );

      expect(() => buildService().resolvePrincipal(token)).toThrow(AppError);
    });

    it('rejects HS512 so an attacker cannot re-sign with a known secret', () => {
      const token = signToken({ sub: USER_ID }, SECRET, 'HS512');

      expect(() => buildService().resolvePrincipal(token)).toThrow(AppError);
    });

    it('rejects a malformed token', () => {
      expect(() => buildService().resolvePrincipal('not-a-jwt')).toThrow(
        AppError,
      );
    });

    it('rejects a token whose sub is not a uuid', () => {
      const token = signToken({ sub: 'not-a-uuid' });

      expect(() => buildService().resolvePrincipal(token)).toThrow(AppError);
    });

    it('rejects a token with no sub claim', () => {
      const token = signToken({ email: 'student@example.com' });

      expect(() => buildService().resolvePrincipal(token)).toThrow(AppError);
    });

    it('surfaces every verification failure as 401, never as 500', () => {
      try {
        buildService().resolvePrincipal('garbage');
        throw new Error('expected resolvePrincipal to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        const appError = error as AppError;
        expect(appError.status).toBe(401);
        expect(appError.code).toBe('UNAUTHORIZED');
      }
    });
  });

  describe('register & login', () => {
    it('creates a new user and returns tokens', async () => {
      const mockCreatedUser = {
        id: USER_ID,
        email: 'test@example.com',
        fullName: 'Test User',
        role: Role.STUDENT,
        createdAt: new Date(),
      };

      const prisma = {
        user: {
          findUnique: jest.fn(() => Promise.resolve(null)),
          create: jest.fn(() => Promise.resolve(mockCreatedUser)),
          update: jest.fn(() => Promise.resolve(mockCreatedUser)),
        },
        profile: {
          upsert: jest.fn(() => Promise.resolve({})),
        },
        $transaction: jest.fn((cb: (tx: unknown) => unknown) =>
          cb({
            user: { create: jest.fn(() => Promise.resolve(mockCreatedUser)) },
            profile: { upsert: jest.fn(() => Promise.resolve({})) },
          }),
        ),
      };

      const service = new AuthService(
        {
          getOrThrow: () => SECRET,
          get: () => '7d',
        } as unknown as ConfigService,
        prisma as never,
      );

      const result = await service.register({
        email: 'test@example.com',
        password: 'password123',
        fullName: 'Test User',
      });

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user.email).toBe('test@example.com');
    });

    it('rejects duplicate email during registration', async () => {
      const prisma = {
        user: {
          findUnique: jest.fn(() => Promise.resolve({ id: USER_ID })),
        },
      };

      const service = new AuthService(
        {
          getOrThrow: () => SECRET,
          get: () => '7d',
        } as unknown as ConfigService,
        prisma as never,
      );

      await expect(
        service.register({
          email: 'duplicate@example.com',
          password: 'password123',
        }),
      ).rejects.toMatchObject({ status: 409, code: 'DOMAIN_RULE_VIOLATION' });
    });

    it('rejects login with incorrect password', async () => {
      const { hashPassword } = await import('./password.util.js');
      const prisma = {
        user: {
          findUnique: jest.fn(() =>
            Promise.resolve({
              id: USER_ID,
              email: 'test@example.com',
              passwordHash: hashPassword('correctPassword'),
              role: Role.STUDENT,
              createdAt: new Date(),
            }),
          ),
        },
      };

      const service = new AuthService(
        {
          getOrThrow: () => SECRET,
          get: () => '7d',
        } as unknown as ConfigService,
        prisma as never,
      );

      await expect(
        service.login({
          email: 'test@example.com',
          password: 'wrongPassword',
        }),
      ).rejects.toMatchObject({ status: 401, code: 'UNAUTHORIZED' });
    });

    it('returns user on me()', async () => {
      const prisma = {
        user: {
          findUnique: jest.fn(() =>
            Promise.resolve({
              id: USER_ID,
              email: 'me@example.com',
              fullName: 'Me User',
              role: Role.STUDENT,
              createdAt: new Date(),
            }),
          ),
        },
      };

      const service = new AuthService(
        {
          getOrThrow: () => SECRET,
          get: () => '7d',
        } as unknown as ConfigService,
        prisma as never,
      );

      const me = await service.me(USER_ID);
      expect(me.email).toBe('me@example.com');
      expect(me.fullName).toBe('Me User');
    });
  });
});
