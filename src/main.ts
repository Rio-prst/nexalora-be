import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter.js';
import { RequestIdInterceptor } from './common/interceptors/request-id.interceptor.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.enableShutdownHooks();
  app.enableCors();

  // Registered here rather than per module so ordering is explicit: the
  // requestId must exist on the response before the exception filter runs.
  app.useGlobalInterceptors(new RequestIdInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter());

  const openApiConfig = new DocumentBuilder()
    .setTitle('Nexalora API')
    .setDescription(
      'Study and career exploration backend for senior high school students. ' +
        'Responses use a { data, meta } envelope on success and ' +
        '{ error } on failure.',
    )
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
    .build();

  const openApiDocument = SwaggerModule.createDocument(app, openApiConfig);
  SwaggerModule.setup('docs', app, openApiDocument, {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap().catch((error: unknown) => {
  console.error('Fatal error during application bootstrap', error);
  process.exit(1);
});
