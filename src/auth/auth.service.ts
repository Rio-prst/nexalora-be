import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import jsonwebtoken from 'jsonwebtoken';
import type { JwtPayload } from 'jsonwebtoken';
import { unauthorized } from '../common/errors/app-error.js';
import { Role, isRole } from '../common/types/role.js';
import type { AuthenticatedUser } from '../common/types/authenticated-user.js';
import type { IAuthService } from './interfaces/auth.service.interface.js';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const DEFAULT_ROLE = Role.STUDENT;

@Injectable()
export class AuthService implements IAuthService {
  constructor(private readonly config: ConfigService) {}

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

    return isRole(claimed) ? claimed : DEFAULT_ROLE;
  }
}
