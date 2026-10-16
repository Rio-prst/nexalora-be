import {
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import { forbidden } from '../errors/app-error.js';
import type { Role } from '../types/role.js';

/**
 * Enforces `@Roles(...)`. Runs after JwtAuthGuard, which populates
 * `request.user`, so both are registered as global guards in that order.
 *
 * Endpoints without `@Roles()` accept any authenticated role.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user;

    if (!user || !required.includes(user.role)) {
      throw forbidden();
    }

    return true;
  }
}
