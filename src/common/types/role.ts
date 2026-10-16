/**
 * Application roles. Kept as a TypeScript union rather than a database enum:
 * roles come from the Supabase JWT (`app_metadata.role`), not from a column.
 *
 * Supabase issues `authenticated` / `anon` in the top-level `role` claim, which
 * maps differently from these product-level roles.
 */
export const Role = {
  STUDENT: 'STUDENT',
  DEMO: 'DEMO',
  CURATOR: 'CURATOR',
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const ROLES: readonly Role[] = Object.values(Role);

export function isRole(value: unknown): value is Role {
  return (
    typeof value === 'string' && (ROLES as readonly string[]).includes(value)
  );
}
