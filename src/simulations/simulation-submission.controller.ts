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
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ApiStandardResponses } from '../common/decorators/api-standard-responses.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { readRequestId } from '../common/middleware/request-id.middleware.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import type { ApiResponse as ApiEnvelope } from '../common/types/api-response.js';
import type { AuthenticatedUser } from '../common/types/authenticated-user.js';
import { Role } from '../common/types/role.js';
import { SimulationSubmissionService } from './simulation-submission.service.js';
import type {
  PassportRecord,
  SubmissionRecord,
} from './interfaces/simulation-submission.repository.interface.js';
import {
  ReviewSubmissionSchema,
  SubmitProjectSchema,
  type ReviewSubmissionDto,
  type SubmitProjectDto,
} from './simulation.dto.js';
import { SIMULATION_ROUTES } from './simulation.routes.js';

@ApiTags('simulations')
@Controller()
export class SimulationSubmissionController {
  constructor(
    @Inject(SimulationSubmissionService)
    private readonly service: SimulationSubmissionService,
  ) {}

  @Post(SIMULATION_ROUTES.submissions)
  @HttpCode(HttpStatus.CREATED)
  @ApiStandardResponses()
  @ApiOperation({
    summary: 'Store a project file for a mission. Review is left pending.',
  })
  @ApiCreatedResponse({ description: 'The stored submission.' })
  async submit(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(SubmitProjectSchema))
    body: SubmitProjectDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiEnvelope<SubmissionRecord>> {
    return {
      data: await this.service.submit(user.userId, body),
      meta: { requestId: readRequestId(response) },
    };
  }

  @Get(SIMULATION_ROUTES.mySubmissions)
  @ApiStandardResponses()
  @ApiOperation({
    summary:
      'List project submissions and review status for the authenticated student.',
  })
  @ApiOkResponse({ description: 'The student submission history.' })
  async mySubmissions(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiEnvelope<SubmissionRecord[]>> {
    return {
      data: await this.service.mySubmissions(user.userId),
      meta: { requestId: readRequestId(response) },
    };
  }

  @Get(SIMULATION_ROUTES.detail)
  @ApiStandardResponses()
  @ApiOperation({
    summary: 'Read a submission with ownership verification.',
  })
  @ApiOkResponse({ description: 'The requested submission.' })
  async getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiEnvelope<SubmissionRecord>> {
    return {
      data: await this.service.getById(user, id),
      meta: { requestId: readRequestId(response) },
    };
  }

  @Post(SIMULATION_ROUTES.downloadUrl)
  @HttpCode(HttpStatus.OK)
  @ApiStandardResponses()
  @ApiOperation({
    summary: 'Get a temporary download URL for the project submission file.',
  })
  @ApiOkResponse({ description: 'The download URL with metadata.' })
  async getDownloadUrl(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<
    ApiEnvelope<{
      downloadUrl: string;
      fileName: string;
      expiresInSeconds: number;
    }>
  > {
    return {
      data: await this.service.getDownloadUrl(user, id),
      meta: { requestId: readRequestId(response) },
    };
  }

  @Patch([SIMULATION_ROUTES.review, SIMULATION_ROUTES.adminReview])
  @Roles(Role.CURATOR)
  @ApiStandardResponses()
  @ApiOperation({
    summary: 'Record a reviewer verdict. Restricted to the CURATOR role.',
  })
  @ApiOkResponse({ description: 'The reviewed submission.' })
  async review(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ReviewSubmissionSchema))
    body: ReviewSubmissionDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiEnvelope<SubmissionRecord>> {
    return {
      data: await this.service.review(id, body),
      meta: { requestId: readRequestId(response) },
    };
  }

  @Get(SIMULATION_ROUTES.passports)
  @ApiStandardResponses()
  @ApiOperation({
    summary: 'List mini-course completions and certificate numbers.',
  })
  @ApiOkResponse({ description: 'The caller completion history.' })
  async passports(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiEnvelope<PassportRecord[]>> {
    return {
      data: await this.service.passports(user.userId),
      meta: { requestId: readRequestId(response) },
    };
  }
}
