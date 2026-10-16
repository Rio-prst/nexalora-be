import type { INestApplication } from '@nestjs/common';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter.js';
import { RequestIdInterceptor } from './common/interceptors/request-id.interceptor.js';

/**
 * Applies the same global wiring to every entrypoint.
 *
 * Kept separate from `main.ts` so end-to-end tests exercise the routes,
 * envelope, and error shape that production serves, rather than a bare Nest
 * application with none of it configured.
 *
 * `enableShutdownHooks()` is deliberately not applied here: it registers
 * process-level listeners and belongs to the real process, not to a test app.
 */
export function configureApp<TServer>(
  app: INestApplication<TServer>,
): INestApplication<TServer> {
  app.setGlobalPrefix('api');
  app.enableCors();

  // The requestId must exist on the response before the exception filter runs,
  // so registration order here is load-bearing.
  app.useGlobalInterceptors(new RequestIdInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter());

  return app;
}
