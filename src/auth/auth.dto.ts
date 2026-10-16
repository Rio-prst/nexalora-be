import { z } from 'zod';

export const AUTH_ROUTES = {
  register: 'auth/register',
  login: 'auth/login',
  logout: 'auth/logout',
  me: 'auth/me',
  refresh: 'auth/refresh',
} as const;

export const RegisterSchema = z
  .object({
    email: z.string().email().max(255),
    password: z
      .string()
      .min(6, 'Password must be at least 6 characters')
      .max(100),
    fullName: z.string().min(1).max(120).optional(),
  })
  .strict();

export const LoginSchema = z
  .object({
    email: z.string().email().max(255),
    password: z.string().min(1, 'Password is required').max(100),
  })
  .strict();

export const RefreshTokenSchema = z
  .object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  })
  .strict();

export type RegisterDto = z.infer<typeof RegisterSchema>;
export type LoginDto = z.infer<typeof LoginSchema>;
export type RefreshTokenDto = z.infer<typeof RefreshTokenSchema>;

export type AuthUserPayload = {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  createdAt: string;
};

export type AuthTokenResponse = {
  accessToken: string;
  refreshToken: string;
  user: AuthUserPayload;
};

export type RefreshTokenResponse = {
  accessToken: string;
  refreshToken: string;
};
