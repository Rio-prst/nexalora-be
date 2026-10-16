import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthenticatedUser } from '../types/authenticated-user.js';
import { unauthorized } from '../errors/app-error.js';

/**
 * Injects the authenticated principal resolved by JwtAuthGuard.
 *
 * Throws rather than returning `undefined`, so a controller that forgets
 * `@Public()` or a guard ordering mistake surfaces as a 401 instead of a
 * confusing `undefined` deep inside the service layer.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();

    if (!request.user) {
      throw unauthorized();
    }

    return request.user;
  },
);
