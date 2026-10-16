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
  ActivatePlanSchema,
  PreviewPlanSchema,
  UpdateTaskSchema,
  type ActivatePlanDto,
  type PreviewPlanDto,
  type UpdateTaskDto,
} from './dto/plan.dto.js';
import { IPlanService } from './interfaces/plan.service.interface.js';
import type {
  PlanSnapshot,
  PlanTaskSnapshot,
} from './interfaces/plan.repository.interface.js';
import type { PlanDraft } from './plan.constants.js';
import { PLAN_ROUTES } from './plan.constants.js';

@ApiTags('plans')
@Controller()
export class PlanController {
  constructor(
    @Inject(IPlanService) private readonly planService: IPlanService,
  ) {}

  @Post(PLAN_ROUTES.preview)
  @HttpCode(HttpStatus.OK)
  @ApiStandardResponses()
  @ApiOperation({
    summary: 'Generate a deterministic 30-day plan draft without storing it.',
  })
  @ApiBody({ schema: toOpenApiSchema(PreviewPlanSchema), required: true })
  @ApiOkResponse({ description: 'The generated draft.' })
  async preview(
    @Body(new ZodValidationPipe(PreviewPlanSchema))
    body: PreviewPlanDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiEnvelope<PlanDraft>> {
    return {
      data: await this.planService.preview(body),
      meta: { requestId: readRequestId(response) },
    };
  }

  @Post(PLAN_ROUTES.base)
  @HttpCode(HttpStatus.CREATED)
  @ApiStandardResponses()
  @ApiOperation({
    summary: 'Activate a 30-day plan. Requires an Idempotency-Key header.',
  })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    description:
      'Client-generated key. Repeating the same key returns the same plan instead of creating a second one.',
  })
  @ApiBody({ schema: toOpenApiSchema(ActivatePlanSchema), required: true })
  @ApiCreatedResponse({ description: 'The activated plan and its tasks.' })
  async activate(
    @CurrentUser() user: AuthenticatedUser,
    @IdempotencyKey() idempotencyKey: string,
    @Body(new ZodValidationPipe(ActivatePlanSchema))
    body: ActivatePlanDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiEnvelope<{ plan: PlanSnapshot; replayed: boolean }>> {
    return {
      data: await this.planService.activate(user.userId, idempotencyKey, body),
      meta: { requestId: readRequestId(response) },
    };
  }

  @Get(PLAN_ROUTES.active)
  @ApiStandardResponses()
  @ApiOperation({
    summary: 'Read the active 30-day plan and its tasks.',
  })
  @ApiOkResponse({ description: 'The active plan.' })
  async active(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiEnvelope<PlanSnapshot>> {
    return {
      data: await this.planService.active(user.userId),
      meta: { requestId: readRequestId(response) },
    };
  }

  @Patch(PLAN_ROUTES.task)
  @ApiStandardResponses()
  @ApiOperation({
    summary: 'Update a task status, due date, or evidence.',
  })
  @ApiBody({ schema: toOpenApiSchema(UpdateTaskSchema), required: true })
  @ApiOkResponse({ description: 'The updated task.' })
  async updateTask(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateTaskSchema))
    body: UpdateTaskDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiEnvelope<PlanTaskSnapshot>> {
    return {
      data: await this.planService.updateTask(user.userId, id, body),
      meta: { requestId: readRequestId(response) },
    };
  }
}
