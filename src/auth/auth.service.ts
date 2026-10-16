import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import jsonwebtoken from 'jsonwebtoken';
import type { JwtPayload, SignOptions } from 'jsonwebtoken';
import { PrismaService } from '../infra/prisma/prisma.service.js';
import {
  AppError,
  notFound,
  unauthorized,
} from '../common/errors/app-error.js';
import { Role, isRole } from '../common/types/role.js';
import type { AuthenticatedUser } from '../common/types/authenticated-user.js';
import type {
  AuthTokenResponse,
  AuthUserPayload,
  LoginDto,
  RefreshTokenResponse,
  RegisterDto,
} from './auth.dto.js';
import type { IAuthService } from './interfaces/auth.service.interface.js';
import { hashPassword, verifyPassword } from './password.util.js';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const DEFAULT_ROLE = Role.STUDENT;

@Injectable()
export class AuthService implements IAuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  resolvePrincipal(accessToken: string): AuthenticatedUser {
    const payload = this.verify(accessToken);
    const subject = payload.sub;

    if (typeof subject !== 'string' || !UUID_PATTERN.test(subject)) {
      throw unauthorized('Token subject is missing or not a valid user id');
    }

    return {
      userId: subject,
      role: this.resolveRole(payload),
    };
  }

  async register(dto: RegisterDto): Promise<AuthTokenResponse> {
    const email = dto.email.trim().toLowerCase();

    const existing = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existing) {
      throw new AppError(
        'DOMAIN_RULE_VIOLATION',
        409,
        'Email is already registered',
      );
    }

    const passwordHash = hashPassword(dto.password);

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email,
          passwordHash,
          fullName: dto.fullName?.trim() || null,
          role: Role.STUDENT,
        },
      });

      await tx.profile.upsert({
        where: { userId: created.id },
        create: {
          userId: created.id,
          displayName: created.fullName,
        },
        update: {
          displayName: created.fullName,
        },
      });

      return created;
    });

    const role = isRole(user.role) ? user.role : Role.STUDENT;
    const tokens = this.generateTokens({
      id: user.id,
      email: user.email,
      role,
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: hashPassword(tokens.refreshToken) },
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
      },
    };
  }

  async login(dto: LoginDto): Promise<AuthTokenResponse> {
    const email = dto.email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || !verifyPassword(dto.password, user.passwordHash)) {
      throw unauthorized('Invalid email or password');
    }

    const role = isRole(user.role) ? user.role : Role.STUDENT;
    const tokens = this.generateTokens({
      id: user.id,
      email: user.email,
      role,
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: hashPassword(tokens.refreshToken) },
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
      },
    };
  }

  async logout(userId: string): Promise<{ message: string }> {
    await this.prisma.user.updateMany({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });

    return { message: 'Logged out successfully' };
  }

  async me(userId: string): Promise<AuthUserPayload> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw notFound('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    };
  }

  async refresh(refreshToken: string): Promise<RefreshTokenResponse> {
    const secret = this.config.getOrThrow<string>('JWT_SECRET');
    let payload: JwtPayload;

    try {
      payload = jsonwebtoken.verify(refreshToken, secret, {
        algorithms: ['HS256'],
      }) as JwtPayload;
    } catch {
      throw unauthorized('Invalid or expired refresh token');
    }

    const userId = payload.sub;
    if (typeof userId !== 'string' || payload['tokenType'] !== 'refresh') {
      throw unauthorized('Invalid refresh token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (
      !user ||
      !user.refreshTokenHash ||
      !verifyPassword(refreshToken, user.refreshTokenHash)
    ) {
      throw unauthorized('Invalid or expired refresh token');
    }

    const role = isRole(user.role) ? user.role : Role.STUDENT;
    const tokens = this.generateTokens({
      id: user.id,
      email: user.email,
      role,
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: hashPassword(tokens.refreshToken) },
    });

    return tokens;
  }

  private generateTokens(user: { id: string; email: string; role: Role }): {
    accessToken: string;
    refreshToken: string;
  } {
    const secret = this.config.getOrThrow<string>('JWT_SECRET');
    const accessExpiration = (this.config
      .get<string>('JWT_EXPIRES_IN')
      ?.trim() || '7d') as SignOptions['expiresIn'];

    const accessToken = jsonwebtoken.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        app_metadata: { role: user.role },
      },
      secret,
      {
        algorithm: 'HS256',
        expiresIn: accessExpiration,
      },
    );

    const refreshToken = jsonwebtoken.sign(
      {
        sub: user.id,
        tokenType: 'refresh',
      },
      secret,
      {
        algorithm: 'HS256',
        expiresIn: '30d',
      },
    );

    return { accessToken, refreshToken };
  }

  private verify(accessToken: string): JwtPayload {
    const secret = this.config.getOrThrow<string>('JWT_SECRET');

    try {
      return jsonwebtoken.verify(accessToken, secret, {
        algorithms: ['HS256'],
      }) as JwtPayload;
    } catch {
      throw unauthorized('Access token is invalid or has expired');
    }
  }

  private resolveRole(payload: JwtPayload): Role {
    const metadata = payload.app_metadata as { role?: unknown } | undefined;
    const claimed = metadata?.role;

    if (isRole(claimed)) return claimed;
    if (isRole(payload.role)) return payload.role;
    return DEFAULT_ROLE;
  }
}
