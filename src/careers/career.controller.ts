import { Controller, Get, Inject, Param, Res } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ApiStandardPublicResponses } from '../common/decorators/api-standard-responses.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';
import { notFound } from '../common/errors/app-error.js';
import { readRequestId } from '../common/middleware/request-id.middleware.js';
import type { ApiResponse as ApiEnvelope } from '../common/types/api-response.js';
import { CAREER_ROUTES } from './career.routes.js';
import { ICareerRepository } from './interfaces/career.repository.interface.js';
import type {
  CareerDetail,
  CareerSummary,
} from './interfaces/career.repository.interface.js';

@ApiTags('careers')
@Controller()
export class CareerController {
  constructor(
    @Inject(ICareerRepository) private readonly repository: ICareerRepository,
  ) {}

  @Public()
  @Get(CAREER_ROUTES.base)
  @ApiStandardPublicResponses()
  @ApiOperation({ summary: 'List published career profiles.' })
  @ApiOkResponse({
    description:
      'Published careers. salaryRange.verified is false until a curator records a range.',
  })
  async list(
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiEnvelope<CareerSummary[]>> {
    return {
      data: await this.repository.listPublished(),
      meta: { requestId: readRequestId(response) },
    };
  }

  @Public()
  @Get(CAREER_ROUTES.detail)
  @ApiStandardPublicResponses()
  @ApiOperation({
    summary: 'Read one career with its skills and industry challenges.',
  })
  @ApiOkResponse({ description: 'The career detail.' })
  async detail(
    @Param('id') id: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiEnvelope<CareerDetail>> {
    const career = await this.repository.findPublished(id);

    if (!career) {
      throw notFound('Career not found');
    }

    return {
      data: career,
      meta: { requestId: readRequestId(response) },
    };
  }
}
