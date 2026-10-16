import type { INestApplication } from '@nestjs/common';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter.js';
import { requestIdMiddleware } from './common/middleware/request-id.middleware.js';

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

  // Middleware, not an interceptor: guards run first, so an interceptor would
  // not have set the header by the time a 401 is thrown.
  app.use(requestIdMiddleware);

  app.useGlobalFilters(new GlobalExceptionFilter());

  return app;
}
