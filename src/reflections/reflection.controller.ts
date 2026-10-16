import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Res,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ApiStandardResponses } from '../common/decorators/api-standard-responses.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { readRequestId } from '../common/middleware/request-id.middleware.js';
import { toOpenApiSchema } from '../common/openapi/zod-openapi.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import type { ApiResponse as ApiEnvelope } from '../common/types/api-response.js';
import type { AuthenticatedUser } from '../common/types/authenticated-user.js';
import { IReflectionService } from './interfaces/reflection.service.interface.js';
import type {
  ReflectionPreview,
  ReflectionSnapshot,
} from './interfaces/reflection.repository.interface.js';
import {
  CreateReflectionSchema,
  REFLECTION_ROUTES,
  type CreateReflectionDto,
} from './reflection.dto.js';

@ApiTags('reflections')
@Controller()
export class ReflectionController {
  constructor(
    @Inject(IReflectionService)
    private readonly reflectionService: IReflectionService,
  ) {}

  @Post(REFLECTION_ROUTES.base)
  @HttpCode(HttpStatus.CREATED)
  @ApiStandardResponses()
  @ApiOperation({
    summary:
      'Store a post-mission reflection and preview its effect on ranking.',
  })
  @ApiBody({ schema: toOpenApiSchema(CreateReflectionSchema), required: true })
  @ApiCreatedResponse({
    description: 'The stored reflection and a non-applied ranking preview.',
  })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(CreateReflectionSchema))
    body: CreateReflectionDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<
    ApiEnvelope<{ reflection: ReflectionSnapshot; preview: ReflectionPreview }>
  > {
    return {
      data: await this.reflectionService.create(user.userId, body),
      meta: { requestId: readRequestId(response) },
    };
  }
}
