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
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ApiStandardResponses } from '../common/decorators/api-standard-responses.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { readRequestId } from '../common/middleware/request-id.middleware.js';
import { toOpenApiSchema } from '../common/openapi/zod-openapi.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import type { AuthenticatedUser } from '../common/types/authenticated-user.js';
import type { ApiResponse as ApiEnvelope } from '../common/types/api-response.js';
import type { InterestSubmissionRecord } from './dto/interest-submission.response.dto.js';
import type { SubmitInterestsDto } from './dto/submit-interests.dto.js';
import { SubmitInterestsSchema } from './dto/submit-interests.dto.js';
import { IInterestSubmissionService } from './interfaces/interest-submission.service.interface.js';
import { INTEREST_SUBMISSION_ROUTES } from './interest-submission.routes.js';

@ApiTags('interests')
@Controller()
export class InterestSubmissionController {
  constructor(
    @Inject(IInterestSubmissionService)
    private readonly service: IInterestSubmissionService,
  ) {}

  @Post(INTEREST_SUBMISSION_ROUTES.base)
  @HttpCode(HttpStatus.CREATED)
  @ApiStandardResponses()
  @ApiOperation({
    summary:
      'Submit the activity interest instrument. Submissions are immutable.',
  })
  @ApiBody({ schema: toOpenApiSchema(SubmitInterestsSchema), required: true })
  @ApiCreatedResponse({
    description: 'The stored submission together with its coverage summary.',
  })
  @ApiUnauthorizedResponse({ description: 'Authentication is required.' })
  async submit(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(SubmitInterestsSchema))
    body: SubmitInterestsDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiEnvelope<InterestSubmissionRecord>> {
    return {
      data: await this.service.submit(user.userId, body),
      meta: { requestId: readRequestId(response) },
    };
  }
}
