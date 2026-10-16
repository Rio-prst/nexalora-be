import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import type { Request } from 'express';
import { ProfileProvisioningService } from './profile-provisioning.service.js';

/**
 * Ensures the caller's `profiles` row exists before the handler runs.
 *
 * Guards execute before interceptors in the Nest lifecycle, so
 * `request.user` is already populated by JwtAuthGuard and a missing value means
 * the route is public — nothing to provision.
 */
@Injectable()
export class ProfileProvisioningInterceptor implements NestInterceptor {
  constructor(private readonly provisioning: ProfileProvisioningService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user;

    if (user) {
      await this.provisioning.ensure(user.userId);
    }

    return next.handle();
  }
}
