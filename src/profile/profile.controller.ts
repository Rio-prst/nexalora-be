import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Patch,
  Res,
} from '@nestjs/common';
import {
  ApiBody,
  ApiConflictResponse,
  ApiOkResponse,
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
import type { ProfileSnapshot } from './dto/profile.response.dto.js';
import type { UpdateProfileDto } from './dto/update-profile.dto.js';
import { UpdateProfileSchema } from './dto/update-profile.dto.js';
import { IProfileService } from './interfaces/profile.service.interface.js';
import { PROFILE_ROUTES } from './profile.routes.js';

@ApiTags('profile')
@Controller()
export class ProfileController {
  constructor(
    @Inject(IProfileService) private readonly profileService: IProfileService,
  ) {}

  @Get(PROFILE_ROUTES.base)
  @ApiStandardResponses()
  @ApiOperation({ summary: 'Read the authenticated student profile.' })
  @ApiOkResponse({
    description: 'The profile, its academic records, and its consent history.',
  })
  async getProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiEnvelope<ProfileSnapshot>> {
    return {
      data: await this.profileService.getProfile(user.userId),
      meta: { requestId: readRequestId(response) },
    };
  }

  @Patch(PROFILE_ROUTES.base)
  @ApiStandardResponses()
  @ApiOperation({
    summary:
      'Update the profile, academic records, and consent in one transaction.',
  })
  @ApiBody({ schema: toOpenApiSchema(UpdateProfileSchema), required: true })
  @ApiOkResponse({ description: 'The updated profile snapshot.' })
  @ApiConflictResponse({
    description: 'expectedVersion does not match the stored version.',
  })
  @ApiUnauthorizedResponse({ description: 'Authentication is required.' })
  async updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(UpdateProfileSchema)) body: UpdateProfileDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiEnvelope<ProfileSnapshot>> {
    return {
      data: await this.profileService.updateProfile(user.userId, body),
      meta: { requestId: readRequestId(response) },
    };
  }

  @Delete(PROFILE_ROUTES.accountData)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiStandardResponses()
  @ApiOperation({
    summary:
      'Delete every private record belonging to the authenticated account.',
  })
  @ApiOkResponse({ description: 'Deleted. Body is empty.' })
  async deleteAccountData(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.profileService.deleteAccountData(user.userId);
  }
}
