import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Put,
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
  COMPARISON_ROUTES,
  CreateScenarioSchema,
  SaveShortlistSchema,
  type CreateScenarioDto,
  type SaveShortlistDto,
} from './comparison.dto.js';
import { IComparisonService } from './interfaces/comparison.service.interface.js';
import type {
  ScenarioResult,
  ShortlistSnapshot,
} from './interfaces/comparison.repository.interface.js';

@ApiTags('comparisons')
@Controller()
export class ComparisonController {
  constructor(
    @Inject(IComparisonService)
    private readonly comparisonService: IComparisonService,
  ) {}

  @Get(COMPARISON_ROUTES.shortlist)
  @ApiStandardResponses()
  @ApiOperation({
    summary: 'Read the programs currently held for comparison.',
  })
  @ApiOkResponse({ description: 'At most three program ids.' })
  async getShortlist(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiEnvelope<ShortlistSnapshot>> {
    return {
      data: await this.comparisonService.getShortlist(user.userId),
      meta: { requestId: readRequestId(response) },
    };
  }

  @Put(COMPARISON_ROUTES.shortlist)
  @ApiStandardResponses()
  @ApiOperation({
    summary: 'Replace the comparison list with at most three programs.',
  })
  @ApiBody({ schema: toOpenApiSchema(SaveShortlistSchema), required: true })
  @ApiOkResponse({ description: 'The stored shortlist.' })
  async saveShortlist(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(SaveShortlistSchema))
    body: SaveShortlistDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiEnvelope<ShortlistSnapshot>> {
    return {
      data: await this.comparisonService.saveShortlist(user.userId, body),
      meta: { requestId: readRequestId(response) },
    };
  }

  @Post(COMPARISON_ROUTES.scenarios)
  @HttpCode(HttpStatus.CREATED)
  @ApiStandardResponses()
  @ApiOperation({
    summary: 'Recompute cost feasibility under temporary overrides.',
  })
  @ApiBody({ schema: toOpenApiSchema(CreateScenarioSchema), required: true })
  @ApiCreatedResponse({
    description: 'Baseline and scenario results; the profile is never written.',
  })
  async createScenario(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(CreateScenarioSchema))
    body: CreateScenarioDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiEnvelope<ScenarioResult>> {
    return {
      data: await this.comparisonService.createScenario(user.userId, body),
      meta: { requestId: readRequestId(response) },
    };
  }
}
