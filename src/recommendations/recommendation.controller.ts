import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Res,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
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
import {
  CreateRecommendationSchema,
  type CreateRecommendationDto,
} from './dto/create-recommendation.dto.js';
import type { RecommendationRunPayload } from './dto/recommendation-run.response.dto.js';
import { IRecommendationService } from './interfaces/recommendation.service.interface.js';
import { RECOMMENDATION_ROUTES } from './recommendation.routes.js';

@ApiTags('recommendations')
@Controller()
export class RecommendationController {
  constructor(
    @Inject(IRecommendationService)
    private readonly recommendationService: IRecommendationService,
  ) {}

  @Post(RECOMMENDATION_ROUTES.base)
  @HttpCode(HttpStatus.CREATED)
  @ApiStandardResponses()
  @ApiOperation({
    summary: 'Compute and store a recommendation run from server-side data.',
  })
  @ApiBody({
    schema: toOpenApiSchema(CreateRecommendationSchema),
    required: true,
  })
  @ApiCreatedResponse({
    description:
      'The stored run with majors, programs, reasons, and cost status.',
  })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(CreateRecommendationSchema))
    body: CreateRecommendationDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiEnvelope<RecommendationRunPayload>> {
    return {
      data: await this.recommendationService.create(user.userId, body),
      meta: { requestId: readRequestId(response) },
    };
  }

  @Get(RECOMMENDATION_ROUTES.latest)
  @ApiStandardResponses()
  @ApiOperation({
    summary: 'Read the most recent stored recommendation run.',
  })
  @ApiOkResponse({ description: 'The latest stored run.' })
  async latest(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiEnvelope<RecommendationRunPayload>> {
    return {
      data: await this.recommendationService.latest(user.userId),
      meta: { requestId: readRequestId(response) },
    };
  }
}
