// Structured error response factory for consistent API errors

export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'BAD_REQUEST'
  | 'RATE_LIMITED'
  | 'BRUTE_FORCE_LOCKED'
  | 'VALIDATION_ERROR'
  | 'SESSION_EXPIRED'
  | 'INVALID_CREDENTIALS'
  | 'SESSION_LOCKED'
  | 'INTERNAL_ERROR'
  | 'KV_ERROR';

interface ApiError {
  error: true;
  code: ErrorCode;
  message: string;
  retryAfter?: number;
  details?: Record<string, unknown>;
}

export function apiError(
  code: ErrorCode,
  message: string,
  status: number,
  opts?: { retryAfter?: number; details?: Record<string, unknown> },
): Response {
  const body: ApiError = {
    error: true,
    code,
    message,
    ...opts,
  };
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...(opts?.retryAfter ? { 'Retry-After': String(opts.retryAfter) } : {}),
    },
  });
}
