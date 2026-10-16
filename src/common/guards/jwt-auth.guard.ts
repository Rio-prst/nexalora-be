import {
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import jsonwebtoken from 'jsonwebtoken';
import type { JwtPayload } from 'jsonwebtoken';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { unauthorized } from '../errors/app-error.js';
import { Role, isRole } from '../types/role.js';
import type { AuthenticatedUser } from '../types/authenticated-user.js';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const DEFAULT_DEMO_ROLE: Role = Role.DEMO;

function readBearerToken(request: Request): string | null {
  const header = request.headers.authorization;
  if (typeof header !== 'string') return null;

  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;

  return token.trim();
}

/**
 * Verifies the Supabase access token with HS256 and resolves the principal.
 *
 * Registered globally through `APP_GUARD`, so every endpoint is protected
 * unless it carries `@Public()`.
 *
 * Role resolution: Supabase's own `role` claim is `authenticated` / `anon` and
 * is not a product role, so the product role is read from
 * `app_metadata.role`. Anything unrecognised falls back to `DEMO`, which holds
 * the restricted synthetic-profile access described in docs/PRD.md section 4
 * and cannot read or overwrite real student data.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = readBearerToken(request);

    if (!token) {
      throw unauthorized('Missing Bearer token');
    }

    const secret = this.config.getOrThrow<string>('JWT_SECRET');

    // `jsonwebtoken` is CommonJS-only, so a named import (`import { verify }`)
    // fails at runtime under ESM even though TypeScript accepts it. The default
    // import is the only shape Node can actually resolve.
    const payload = jsonwebtoken.verify(token, secret, {
      algorithms: ['HS256'],
    }) as JwtPayload;

    request.user = this.toAuthenticatedUser(payload);

    return true;
  }

  private toAuthenticatedUser(payload: JwtPayload): AuthenticatedUser {
    const subject = payload.sub;

    if (typeof subject !== 'string' || !UUID_PATTERN.test(subject)) {
      throw unauthorized('Token subject is missing or not a valid user id');
    }

    const metadata = payload.app_metadata as { role?: unknown } | undefined;
    const claimed = metadata?.role;
    const role = isRole(claimed) ? claimed : DEFAULT_DEMO_ROLE;

    return { userId: subject, role };
  }
}
