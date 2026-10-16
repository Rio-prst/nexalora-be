import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { configureApp } from './bootstrap.js';
import { buildOpenApiConfig, SWAGGER_UI_OPTIONS } from './openapi.config.js';

async function bootstrap() {
  const app = configureApp(await NestFactory.create(AppModule));

  app.enableShutdownHooks();

  const openApiDocument = SwaggerModule.createDocument(
    app,
    buildOpenApiConfig(),
  );

  SwaggerModule.setup('docs', app, openApiDocument, SWAGGER_UI_OPTIONS);

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap().catch((error: unknown) => {
  console.error('Fatal error during application bootstrap', error);
  process.exit(1);
});
