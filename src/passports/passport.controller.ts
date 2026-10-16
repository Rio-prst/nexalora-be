import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
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
import { IPassportService } from './interfaces/passport.service.interface.js';
import type { PassportRecord } from './interfaces/passport.repository.interface.js';
import {
  CreatePassportSchema,
  PASSPORT_ROUTES,
  type CreatePassportDto,
} from './passport.dto.js';

@ApiTags('passports')
@Controller()
export class PassportController {
  constructor(
    @Inject(IPassportService)
    private readonly passportService: IPassportService,
  ) {}

  @Post(PASSPORT_ROUTES.base)
  @HttpCode(HttpStatus.CREATED)
  @ApiStandardResponses()
  @ApiOperation({
    summary:
      'Create an immutable passport snapshot with server-side redaction.',
  })
  @ApiBody({ schema: toOpenApiSchema(CreatePassportSchema), required: true })
  @ApiCreatedResponse({ description: 'The stored passport snapshot.' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(CreatePassportSchema))
    body: CreatePassportDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiEnvelope<PassportRecord>> {
    return {
      data: await this.passportService.create(user.userId, body),
      meta: { requestId: readRequestId(response) },
    };
  }

  @Get(PASSPORT_ROUTES.detail)
  @ApiStandardResponses()
  @ApiOperation({
    summary: 'Read a passport snapshot for the printable page.',
  })
  @ApiOkResponse({ description: 'The immutable stored snapshot.' })
  async get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiEnvelope<PassportRecord>> {
    return {
      data: await this.passportService.get(user.userId, id),
      meta: { requestId: readRequestId(response) },
    };
  }
}
