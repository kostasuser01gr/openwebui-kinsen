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
  | 'PASSWORD_TOO_WEAK'
  | 'PASSWORD_EXPIRED'
  | 'PASSWORD_REUSED'
  | 'TOTP_REQUIRED'
  | 'TOTP_INVALID'
  | 'INTERNAL_ERROR'
  | 'KV_ERROR'
  | 'QUOTA_EXCEEDED';

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
  opts?: { retryAfter?: number; details?: Record<string, unknown> }
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

// Password policy enforcement
export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumber: boolean;
  requireSpecial: boolean;
  maxAgeDays: number;
  preventReuseCount: number;
}

export const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: false,
  maxAgeDays: 90,
  preventReuseCount: 5,
};

export function validatePassword(password: string, policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (password.length < policy.minLength) {
    errors.push(`Password must be at least ${policy.minLength} characters`);
  }
  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain an uppercase letter');
  }
  if (policy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain a lowercase letter');
  }
  if (policy.requireNumber && !/\d/.test(password)) {
    errors.push('Password must contain a number');
  }
  if (policy.requireSpecial && !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    errors.push('Password must contain a special character');
  }
  return { valid: errors.length === 0, errors };
}
