import { Controller, Get, Inject, Param, Res } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ApiStandardPublicResponses } from '../common/decorators/api-standard-responses.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';
import { notFound } from '../common/errors/app-error.js';
import { readRequestId } from '../common/middleware/request-id.middleware.js';
import type { ApiResponse as ApiEnvelope } from '../common/types/api-response.js';
import { CATALOG_DIRECTORY_ROUTES } from './catalog-directory.routes.js';
import { ICatalogDirectoryRepository } from './interfaces/catalog-directory.repository.interface.js';
import type {
  StudyProgramDetail,
  StudyProgramSummary,
  UniversitySummary,
} from './interfaces/catalog-directory.repository.interface.js';

@ApiTags('catalog')
@Controller()
export class CatalogDirectoryController {
  constructor(
    @Inject(ICatalogDirectoryRepository)
    private readonly repository: ICatalogDirectoryRepository,
  ) {}

  @Public()
  @Get(CATALOG_DIRECTORY_ROUTES.universities)
  @ApiStandardPublicResponses()
  @ApiOperation({
    summary:
      'List universities with accreditation, city, and institution type.',
  })
  @ApiOkResponse({ description: 'Every university in the catalogue.' })
  async universities(
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiEnvelope<UniversitySummary[]>> {
    return {
      data: await this.repository.listUniversities(),
      meta: { requestId: readRequestId(response) },
    };
  }

  @Public()
  @Get(CATALOG_DIRECTORY_ROUTES.studyPrograms)
  @ApiStandardPublicResponses()
  @ApiOperation({
    summary: 'List study programs with quota, passing grade, and UKT range.',
  })
  @ApiOkResponse({ description: 'Published programs.' })
  async studyPrograms(
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiEnvelope<StudyProgramSummary[]>> {
    return {
      data: await this.repository.listStudyPrograms(),
      meta: { requestId: readRequestId(response) },
    };
  }

  @Public()
  @Get(CATALOG_DIRECTORY_ROUTES.studyProgramDetail)
  @ApiStandardPublicResponses()
  @ApiOperation({
    summary:
      'Read one study program by id, name slug, or university-plus-name slug.',
  })
  @ApiOkResponse({
    description:
      'The program with featured courses, related careers, and scholarships.',
  })
  async studyProgram(
    @Param('slugOrId') slugOrId: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiEnvelope<StudyProgramDetail>> {
    const program = await this.repository.findStudyProgram(slugOrId);

    if (!program) {
      throw notFound('Study program not found');
    }

    return {
      data: program,
      meta: { requestId: readRequestId(response) },
    };
  }
}
