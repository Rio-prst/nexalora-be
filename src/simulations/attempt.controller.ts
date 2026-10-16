import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Res,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ApiStandardResponses } from '../common/decorators/api-standard-responses.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { IdempotencyKey } from '../common/decorators/idempotency-key.decorator.js';
import { readRequestId } from '../common/middleware/request-id.middleware.js';
import { toOpenApiSchema } from '../common/openapi/zod-openapi.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import type { ApiResponse as ApiEnvelope } from '../common/types/api-response.js';
import type { AuthenticatedUser } from '../common/types/authenticated-user.js';
import {
  CreateAttemptSchema,
  RunAttemptSchema,
  UpdateAttemptSchema,
  type CreateAttemptDto,
  type RunAttemptDto,
  type UpdateAttemptDto,
} from './dto/attempt.dto.js';
import { IAttemptService } from './interfaces/attempt.service.interface.js';
import type { AttemptSnapshot } from './interfaces/attempt.repository.interface.js';
import { SIMULATION_ROUTES } from './simulation.constants.js';

@ApiTags('simulations')
@Controller()
export class AttemptController {
  constructor(
    @Inject(IAttemptService) private readonly attemptService: IAttemptService,
  ) {}

  @Post(SIMULATION_ROUTES.base)
  @HttpCode(HttpStatus.CREATED)
  @ApiStandardResponses()
  @ApiOperation({
    summary: 'Start a simulation attempt. Requires an Idempotency-Key header.',
  })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    description:
      'Client-generated key. Repeating the same key returns the same attempt instead of creating a second one.',
  })
  @ApiBody({ schema: toOpenApiSchema(CreateAttemptSchema), required: true })
  @ApiCreatedResponse({ description: 'The created or replayed attempt.' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @IdempotencyKey() idempotencyKey: string,
    @Body(new ZodValidationPipe(CreateAttemptSchema))
    body: CreateAttemptDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiEnvelope<{ attempt: AttemptSnapshot; replayed: boolean }>> {
    return {
      data: await this.attemptService.create(user.userId, idempotencyKey, body),
      meta: { requestId: readRequestId(response) },
    };
  }

  @Get(SIMULATION_ROUTES.detail)
  @ApiStandardResponses()
  @ApiOperation({
    summary: 'Read an attempt together with its draft artifact and result.',
  })
  @ApiOkResponse({ description: 'The stored attempt.' })
  async get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiEnvelope<AttemptSnapshot>> {
    return {
      data: await this.attemptService.get(user.userId, id),
      meta: { requestId: readRequestId(response) },
    };
  }

  @Patch(SIMULATION_ROUTES.detail)
  @ApiStandardResponses()
  @ApiOperation({
    summary: 'Autosave the draft artifact against an expected revision.',
  })
  @ApiBody({ schema: toOpenApiSchema(UpdateAttemptSchema), required: true })
  @ApiOkResponse({ description: 'The attempt after the draft was stored.' })
  async saveDraft(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateAttemptSchema))
    body: UpdateAttemptDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiEnvelope<AttemptSnapshot>> {
    return {
      data: await this.attemptService.saveDraft(user.userId, id, body),
      meta: { requestId: readRequestId(response) },
    };
  }

  @Post(SIMULATION_ROUTES.run)
  @HttpCode(HttpStatus.OK)
  @ApiStandardResponses()
  @ApiOperation({
    summary: 'Run the server-side engine for a scenario and store the result.',
  })
  @ApiBody({ schema: toOpenApiSchema(RunAttemptSchema), required: true })
  @ApiOkResponse({ description: 'The attempt with its computed result.' })
  async run(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(RunAttemptSchema))
    body: RunAttemptDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiEnvelope<AttemptSnapshot>> {
    return {
      data: await this.attemptService.run(user.userId, id, body),
      meta: { requestId: readRequestId(response) },
    };
  }
}
