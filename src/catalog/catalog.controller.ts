import { Controller, Get, Inject, Param, Res } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ApiStandardPublicResponses } from '../common/decorators/api-standard-responses.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';
import { readRequestId } from '../common/middleware/request-id.middleware.js';
import type { ApiResponse as ApiEnvelope } from '../common/types/api-response.js';
import { CATALOG_ROUTES } from './catalog.routes.js';
import type {
  CatalogList,
  ProgramDetailRecord,
} from './dto/catalog-list.response.dto.js';
import { ICatalogService } from './interfaces/catalog.service.interface.js';

@ApiTags('catalog')
@Controller()
export class CatalogController {
  constructor(
    @Inject(ICatalogService) private readonly catalogService: ICatalogService,
  ) {}

  @Public()
  @Get(CATALOG_ROUTES.base)
  @ApiStandardPublicResponses()
  @ApiOperation({
    summary: 'List published majors and programs for public browsing.',
  })
  @ApiOkResponse({ description: 'Published majors and their programs.' })
  async list(
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiEnvelope<CatalogList>> {
    return {
      data: await this.catalogService.list(),
      meta: { requestId: readRequestId(response) },
    };
  }

  @Public()
  @Get(CATALOG_ROUTES.programDetail)
  @ApiStandardPublicResponses()
  @ApiOperation({
    summary: 'Read one published program with costs, curriculum, and evidence.',
  })
  @ApiOkResponse({
    description: 'The program, its cost profiles, curricula, and evidence.',
  })
  async getProgram(
    @Param('id') id: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiEnvelope<ProgramDetailRecord>> {
    return {
      data: await this.catalogService.getProgram(id),
      meta: { requestId: readRequestId(response) },
    };
  }
}
