import { DocumentBuilder } from '@nestjs/swagger';

export function buildOpenApiConfig() {
  return new DocumentBuilder()
    .setTitle('Nexalora API')
    .setDescription(
      'Study and career exploration backend for senior high school students. ' +
        'Responses use a { data, meta } envelope on success and ' +
        '{ error } on failure.',
    )
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
    .build();
}

export const SWAGGER_UI_OPTIONS = {
  swaggerOptions: { persistAuthorization: true },
} as const;

export const SWAGGER_UI_CDN =
  'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.33.0';

export const SWAGGER_UI_CDN_OPTIONS = {
  swaggerOptions: { persistAuthorization: true },
  customCssUrl: `${SWAGGER_UI_CDN}/swagger-ui.css`,
  customJs: [
    `${SWAGGER_UI_CDN}/swagger-ui-bundle.js`,
    `${SWAGGER_UI_CDN}/swagger-ui-standalone-preset.js`,
  ],
};
