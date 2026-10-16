import type { Role } from './role.js';

export interface AuthenticatedUser {
  userId: string;
  role: Role;
}

/** Payload shape expected from `express.Request` once a guard has run. */
export interface RequestWithUser {
  headers: Record<string, string | string[] | undefined>;
  user?: AuthenticatedUser;
}
