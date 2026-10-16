import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';

export interface IAuthService {
  resolvePrincipal(accessToken: string): AuthenticatedUser;
}

export const IAuthService = Symbol('IAuthService');
