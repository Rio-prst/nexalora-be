import type { AuthenticatedUser } from './authenticated-user.js';

/**
 * JwtAuthGuard attaches the resolved principal to `request.user`. Augmenting
 * Express here means every module can read `request.user` without casting, and
 * `CurrentUser` stays a thin decorator over the same field.
 */
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};
