import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import type {
  AuthTokenResponse,
  AuthUserPayload,
  LoginDto,
  RefreshTokenResponse,
  RegisterDto,
} from '../auth.dto.js';

export interface IAuthService {
  resolvePrincipal(accessToken: string): AuthenticatedUser;
  register(dto: RegisterDto): Promise<AuthTokenResponse>;
  login(dto: LoginDto): Promise<AuthTokenResponse>;
  logout(userId: string): Promise<{ message: string }>;
  me(userId: string): Promise<AuthUserPayload>;
  refresh(refreshToken: string): Promise<RefreshTokenResponse>;
}

export const IAuthService = Symbol('IAuthService');
