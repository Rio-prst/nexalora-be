export interface ResponseMeta {
  requestId: string;
}

/** Success envelope defined in docs/API-CONTRACT.md section 1.2. */
export interface ApiResponse<T> {
  data: T;
  meta: ResponseMeta;
}

export const ERROR_CODES = [
  'VALIDATION_ERROR',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'VERSION_CONFLICT',
  'IDEMPOTENCY_KEY_REUSED',
  'DOMAIN_RULE_VIOLATION',
  'RATE_LIMITED',
  'INTERNAL_ERROR',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export interface ErrorBody {
  code: ErrorCode;
  message: string;
  details?: unknown;
  requestId: string;
}

/** Error envelope defined in docs/API-CONTRACT.md section 1.3. */
export interface ApiErrorResponse {
  error: ErrorBody;
}
