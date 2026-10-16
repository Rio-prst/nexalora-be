import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse } from '@nestjs/swagger';

type ErrorResponse = { status: number; description: string };

const AUTH_ERROR_RESPONSES: ReadonlyArray<ErrorResponse> = [
  { status: 401, description: 'Missing, invalid, or expired access token' },
  {
    status: 403,
    description: 'Authenticated but not permitted to access this resource',
  },
];

const RESOURCE_ERROR_RESPONSES: ReadonlyArray<ErrorResponse> = [
  {
    status: 404,
    description:
      'Resource does not exist, or is hidden because it belongs to another account',
  },
  {
    status: 500,
    description: 'Internal error; the response body carries a requestId',
  },
];

/**
 * Attaches the standard Bearer auth documentation plus the error responses
 * that every protected endpoint can return, so controllers only have to
 * document the errors specific to their own route.
 */
export const ApiStandardResponses = (): MethodDecorator =>
  applyDecorators(
    ApiBearerAuth(),
    ...[...AUTH_ERROR_RESPONSES, ...RESOURCE_ERROR_RESPONSES].map((entry) =>
      ApiResponse({ status: entry.status, description: entry.description }),
    ),
  );

export const ApiStandardPublicResponses = (): MethodDecorator =>
  applyDecorators(
    ...RESOURCE_ERROR_RESPONSES.map((entry) =>
      ApiResponse({ status: entry.status, description: entry.description }),
    ),
  );
