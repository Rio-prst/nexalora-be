import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Opts an endpoint out of JwtAuthGuard. Guards are registered globally, so
 * every endpoint is protected unless explicitly marked here.
 */
export const Public = (): MethodDecorator & ClassDecorator =>
  SetMetadata(IS_PUBLIC_KEY, true);
