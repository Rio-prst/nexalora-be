import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
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
import { Public } from '../common/decorators/public.decorator.js';
import { readRequestId } from '../common/middleware/request-id.middleware.js';
import { toOpenApiSchema } from '../common/openapi/zod-openapi.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import type { ApiResponse as ApiEnvelope } from '../common/types/api-response.js';
import type { AuthenticatedUser } from '../common/types/authenticated-user.js';
import {
  AUTH_ROUTES,
  LoginSchema,
  RefreshTokenSchema,
  RegisterSchema,
  type AuthTokenResponse,
  type AuthUserPayload,
  type LoginDto,
  type RefreshTokenDto,
  type RefreshTokenResponse,
  type RegisterDto,
} from './auth.dto.js';
import { IAuthService } from './interfaces/auth.service.interface.js';

@ApiTags('auth')
@Controller()
export class AuthController {
  constructor(
    @Inject(IAuthService) private readonly authService: IAuthService,
  ) {}

  @Public()
  @Post(AUTH_ROUTES.register)
  @HttpCode(HttpStatus.CREATED)
  @ApiStandardResponses()
  @ApiOperation({ summary: 'Register a new student account.' })
  @ApiBody({ schema: toOpenApiSchema(RegisterSchema), required: true })
  @ApiCreatedResponse({
    description: 'Account created with initial access and refresh tokens.',
  })
  async register(
    @Body(new ZodValidationPipe(RegisterSchema)) body: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiEnvelope<AuthTokenResponse>> {
    return {
      data: await this.authService.register(body),
      meta: { requestId: readRequestId(response) },
    };
  }

  @Public()
  @Post(AUTH_ROUTES.login)
  @HttpCode(HttpStatus.OK)
  @ApiStandardResponses()
  @ApiOperation({ summary: 'Log in with email and password.' })
  @ApiBody({ schema: toOpenApiSchema(LoginSchema), required: true })
  @ApiOkResponse({
    description: 'Logged in successfully with access and refresh tokens.',
  })
  async login(
    @Body(new ZodValidationPipe(LoginSchema)) body: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiEnvelope<AuthTokenResponse>> {
    return {
      data: await this.authService.login(body),
      meta: { requestId: readRequestId(response) },
    };
  }

  @Post(AUTH_ROUTES.logout)
  @HttpCode(HttpStatus.OK)
  @ApiStandardResponses()
  @ApiOperation({ summary: 'Log out and invalidate current refresh session.' })
  @ApiOkResponse({ description: 'Logged out successfully.' })
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiEnvelope<{ message: string }>> {
    return {
      data: await this.authService.logout(user.userId),
      meta: { requestId: readRequestId(response) },
    };
  }

  @Get(AUTH_ROUTES.me)
  @ApiStandardResponses()
  @ApiOperation({ summary: 'Get current authenticated user profile.' })
  @ApiOkResponse({ description: 'The authenticated user identity.' })
  async me(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiEnvelope<AuthUserPayload>> {
    return {
      data: await this.authService.me(user.userId),
      meta: { requestId: readRequestId(response) },
    };
  }

  @Public()
  @Post(AUTH_ROUTES.refresh)
  @HttpCode(HttpStatus.OK)
  @ApiStandardResponses()
  @ApiOperation({ summary: 'Refresh access and refresh tokens.' })
  @ApiBody({ schema: toOpenApiSchema(RefreshTokenSchema), required: true })
  @ApiOkResponse({ description: 'New token pair generated.' })
  async refresh(
    @Body(new ZodValidationPipe(RefreshTokenSchema)) body: RefreshTokenDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiEnvelope<RefreshTokenResponse>> {
    return {
      data: await this.authService.refresh(body.refreshToken),
      meta: { requestId: readRequestId(response) },
    };
  }
}
