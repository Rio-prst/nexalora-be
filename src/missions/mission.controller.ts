import { Controller, Get, Inject, Param, Res } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ApiStandardPublicResponses } from '../common/decorators/api-standard-responses.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';
import { notFound } from '../common/errors/app-error.js';
import { readRequestId } from '../common/middleware/request-id.middleware.js';
import type { ApiResponse as ApiEnvelope } from '../common/types/api-response.js';
import { IMissionRepository } from './interfaces/mission.repository.interface.js';
import type {
  MissionDetail,
  MissionSummary,
} from './interfaces/mission.repository.interface.js';
import { MISSION_ROUTES } from './mission.routes.js';

@ApiTags('missions')
@Controller()
export class MissionController {
  constructor(
    @Inject(IMissionRepository) private readonly repository: IMissionRepository,
  ) {}

  @Public()
  @Get(MISSION_ROUTES.base)
  @ApiStandardPublicResponses()
  @ApiOperation({ summary: 'List published simulation missions.' })
  @ApiOkResponse({
    description: 'Published missions, with their major as cluster.',
  })
  async list(
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiEnvelope<MissionSummary[]>> {
    return {
      data: await this.repository.listPublished(),
      meta: { requestId: readRequestId(response) },
    };
  }

  @Public()
  @Get(MISSION_ROUTES.detail)
  @ApiStandardPublicResponses()
  @ApiOperation({
    summary: 'Read one mission including its five learning stages.',
  })
  @ApiOkResponse({ description: 'The mission detail.' })
  async detail(
    @Param('id') id: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiEnvelope<MissionDetail>> {
    const mission = await this.repository.findPublished(id);

    if (!mission) {
      throw notFound('Mission not found');
    }

    return {
      data: mission,
      meta: { requestId: readRequestId(response) },
    };
  }
}
