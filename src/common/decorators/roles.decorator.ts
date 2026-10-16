import { SetMetadata } from '@nestjs/common';
import type { Role } from '../types/role.js';

export const ROLES_KEY = 'roles';

/**
 * Restricts an endpoint to the given roles. Enforced by RolesGuard, which runs
 * after JwtAuthGuard has populated `request.user`.
 *
 * An endpoint without `@Roles()` is open to any authenticated role.
 */
export const Roles = (...roles: Role[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);
