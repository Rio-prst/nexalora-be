import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/bootstrap.js';
import { buildOpenApiConfig, SWAGGER_UI_OPTIONS } from '../src/openapi.config.js';

const app = configureApp(await NestFactory.create(AppModule));

const document = SwaggerModule.createDocument(app, buildOpenApiConfig());

SwaggerModule.setup('docs', app, document, SWAGGER_UI_OPTIONS);

await app.init();

export default app.getHttpAdapter().getInstance();