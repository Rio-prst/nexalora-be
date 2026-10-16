import {
  Inject,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { IAuthService } from '../../auth/interfaces/auth.service.interface.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { unauthorized } from '../errors/app-error.js';

/**
 * Registered globally through `APP_GUARD`, so every endpoint is protected
 * unless it carries `@Public()`.
 *
 * This guard is only an adapter: read the credential off the request, hand it
 * to `IAuthService`, and attach the resulting principal. Verifying the token and
 * deciding the role belongs to the auth module.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(IAuthService) private readonly authService: IAuthService,
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
    const token = JwtAuthGuard.readBearerToken(request);

    if (!token) {
      throw unauthorized('Missing Bearer token');
    }

    request.user = this.authService.resolvePrincipal(token);

    return true;
  }

  private static readBearerToken(request: Request): string | null {
    const header = request.headers.authorization;
    if (typeof header !== 'string') return null;

    const [scheme, token] = header.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) return null;

    return token.trim();
  }
}
