import { Controller, Get, Inject, Res } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ApiStandardPublicResponses } from '../common/decorators/api-standard-responses.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';
import { readRequestId } from '../common/middleware/request-id.middleware.js';
import type { ApiResponse as ApiEnvelope } from '../common/types/api-response.js';
import { IInterestQuestionRepository } from './interest-question.repository.js';
import type { InterestInstrument } from './interest-question.repository.js';
import { INTEREST_SUBMISSION_ROUTES } from './interest-submission.routes.js';

@ApiTags('interests')
@Controller()
export class InterestQuestionController {
  constructor(
    @Inject(IInterestQuestionRepository)
    private readonly repository: IInterestQuestionRepository,
  ) {}

  @Public()
  @Get(INTEREST_SUBMISSION_ROUTES.questions)
  @ApiStandardPublicResponses()
  @ApiOperation({
    summary: 'Read the 12 activity-interest items and their answer scale.',
  })
  @ApiOkResponse({ description: 'The instrument definition.' })
  async list(
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiEnvelope<InterestInstrument>> {
    const instrument = await this.repository.listQuestions();

    return {
      data: instrument ?? {
        instrumentVersion: 'v0.1',
        scale: {
          answered: { min: 1, max: 5 },
          states: ['ANSWERED', 'UNKNOWN', 'SKIPPED'],
        },
        questions: [],
      },
      meta: { requestId: readRequestId(response) },
    };
  }
}
