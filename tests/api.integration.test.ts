import { describe, it, expect } from 'vitest';
import { apiError } from '../src/lib/errors';

describe('API error responses', () => {
  it('apiError creates structured error response', () => {
    const res = apiError('BAD_REQUEST', 'Missing field', 400);
    expect(res.status).toBe(400);
    expect(res.headers.get('Content-Type')).toBe('application/json');
  });

  it('apiError includes retry-after header when specified', () => {
    const res = apiError('RATE_LIMITED', 'Too many requests', 429, { retryAfter: 60 });
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('60');
  });

  it('apiError body contains structured error', async () => {
    const res = apiError('UNAUTHORIZED', 'Not logged in', 401);
    const body = (await res.json()) as any;
    expect(body).toEqual({
      error: true,
      code: 'UNAUTHORIZED',
      message: 'Not logged in',
    });
  });

  it('apiError supports details field', async () => {
    const res = apiError('VALIDATION_ERROR', 'Invalid input', 400, {
      details: { field: 'pin', reason: 'must be 4 digits' },
    });
    const body = (await res.json()) as any;
    expect(body.details).toEqual({ field: 'pin', reason: 'must be 4 digits' });
  });
});

describe('Error codes cover all use cases', () => {
  const codes = [
    'UNAUTHORIZED',
    'FORBIDDEN',
    'NOT_FOUND',
    'BAD_REQUEST',
    'RATE_LIMITED',
    'BRUTE_FORCE_LOCKED',
    'VALIDATION_ERROR',
    'SESSION_EXPIRED',
    'INVALID_CREDENTIALS',
    'SESSION_LOCKED',
    'INTERNAL_ERROR',
    'KV_ERROR',
  ];

  for (const code of codes) {
    it(`supports error code: ${code}`, () => {
      const res = apiError(code as any, `Test ${code}`, 500);
      expect(res.status).toBe(500);
    });
  }
});
