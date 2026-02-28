import { describe, it, expect } from 'vitest';
import {
  sha256,
  hmacSha256,
  hashPin,
  signToken,
  verifyToken,
  generateSessionId,
  generateUserId,
  parseCookies,
} from '../src/lib/crypto';
import { isValidPin, hasPermission } from '../src/lib/users';

describe('Crypto utilities', () => {
  it('sha256 produces consistent hashes', async () => {
    const h1 = await sha256('hello');
    const h2 = await sha256('hello');
    expect(h1).toBe(h2);
    expect(h1).toHaveLength(64); // SHA-256 hex = 64 chars
  });

  it('sha256 produces different hashes for different inputs', async () => {
    const h1 = await sha256('hello');
    const h2 = await sha256('world');
    expect(h1).not.toBe(h2);
  });

  it('hmacSha256 produces consistent output', async () => {
    const h1 = await hmacSha256('my-secret', 'my-message');
    const h2 = await hmacSha256('my-secret', 'my-message');
    expect(h1).toBe(h2);
    expect(h1).toHaveLength(64); // HMAC-SHA256 hex = 64 chars
  });

  it('hmacSha256 differs with different secrets', async () => {
    const h1 = await hmacSha256('secret-a', 'message');
    const h2 = await hmacSha256('secret-b', 'message');
    expect(h1).not.toBe(h2);
  });

  it('hmacSha256 differs with different messages', async () => {
    const h1 = await hmacSha256('secret', 'message-a');
    const h2 = await hmacSha256('secret', 'message-b');
    expect(h1).not.toBe(h2);
  });

  it('hashPin uses HMAC-SHA256 with userId embedded', async () => {
    const h1 = await hashPin('1234', 'salt', 'user-abc');
    const h2 = await hashPin('1234', 'salt', 'user-xyz');
    expect(h1).not.toBe(h2); // different userId = different hash
  });

  it('hashPin is deterministic with same args', async () => {
    const h1 = await hashPin('5678', 'my-salt', 'user-001');
    const h2 = await hashPin('5678', 'my-salt', 'user-001');
    expect(h1).toBe(h2);
  });

  it('hashPin uses HMAC(key=salt, msg=userId:pin)', async () => {
    const pin = '1234';
    const salt = 'test-salt';
    const userId = 'user-001';
    const expected = await hmacSha256(salt, `${userId}:${pin}`);
    const actual = await hashPin(pin, salt, userId);
    expect(actual).toBe(expected);
  });

  it('hashPin differs with different salt', async () => {
    const h1 = await hashPin('1234', 'salt-a', 'user-001');
    const h2 = await hashPin('1234', 'salt-b', 'user-001');
    expect(h1).not.toBe(h2);
  });
});

describe('Signed token utilities', () => {
  const SECRET = 'test-signing-secret';

  it('signToken produces a dot-separated token.signature string', async () => {
    const signed = await signToken('rawtoken123', SECRET);
    expect(signed).toMatch(/^rawtoken123\.[0-9a-f]{64}$/);
  });

  it('verifyToken returns rawToken for a valid signed token', async () => {
    const raw = 'myrawtoken';
    const signed = await signToken(raw, SECRET);
    const result = await verifyToken(signed, SECRET);
    expect(result).toBe(raw);
  });

  it('verifyToken returns null for a tampered token', async () => {
    const signed = await signToken('rawtoken', SECRET);
    const tampered = signed.slice(0, -4) + 'aaaa';
    const result = await verifyToken(tampered, SECRET);
    expect(result).toBeNull();
  });

  it('verifyToken returns null for wrong secret', async () => {
    const signed = await signToken('rawtoken', SECRET);
    const result = await verifyToken(signed, 'wrong-secret');
    expect(result).toBeNull();
  });

  it('verifyToken returns null for token without dot', async () => {
    const result = await verifyToken('nodothere', SECRET);
    expect(result).toBeNull();
  });
});

describe('ID generation', () => {
  it('generateSessionId produces 32-char hex string', () => {
    const id = generateSessionId();
    expect(id).toMatch(/^[0-9a-f]{32}$/);
  });

  it('generateSessionId produces unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateSessionId()));
    expect(ids.size).toBe(100);
  });

  it('generateUserId produces 16-char hex string', () => {
    const id = generateUserId();
    expect(id).toMatch(/^[0-9a-f]{16}$/);
  });
});

describe('Cookie parsing', () => {
  it('parseCookies parses cookie header', () => {
    const cookies = parseCookies('kinsen_session=abc123; other=xyz');
    expect(cookies.kinsen_session).toBe('abc123');
    expect(cookies.other).toBe('xyz');
  });

  it('parseCookies returns empty for null', () => {
    expect(parseCookies(null)).toEqual({});
  });
});

describe('PIN validation', () => {
  it('accepts valid 4-digit PINs', () => {
    expect(isValidPin('1234')).toBe(true);
    expect(isValidPin('0000')).toBe(true);
    expect(isValidPin('9999')).toBe(true);
  });

  it('rejects invalid PINs', () => {
    expect(isValidPin('123')).toBe(false); // too short
    expect(isValidPin('12345')).toBe(false); // too long
    expect(isValidPin('abcd')).toBe(false); // non-numeric
    expect(isValidPin('12 4')).toBe(false); // spaces
    expect(isValidPin('')).toBe(false); // empty
  });
});

describe('Role permissions', () => {
  it('admin has full access', () => {
    expect(hasPermission('admin', 'chat')).toBe(true);
    expect(hasPermission('admin', 'admin:users:write')).toBe(true);
    expect(hasPermission('admin', 'admin:users:read')).toBe(true);
    expect(hasPermission('admin', 'chat:lock')).toBe(true);
    expect(hasPermission('admin', 'shortcuts')).toBe(true);
    expect(hasPermission('admin', 'shortcuts:global')).toBe(true);
    expect(hasPermission('admin', 'admin:settings')).toBe(true);
  });

  it('coordinator can moderate but not manage users', () => {
    expect(hasPermission('coordinator', 'chat')).toBe(true);
    expect(hasPermission('coordinator', 'chat:lock')).toBe(true);
    expect(hasPermission('coordinator', 'chat:unlock')).toBe(true);
    expect(hasPermission('coordinator', 'admin:sessions')).toBe(true);
    expect(hasPermission('coordinator', 'admin:moderation')).toBe(true);
    expect(hasPermission('coordinator', 'admin:users:write')).toBe(false);
    expect(hasPermission('coordinator', 'admin:users:read')).toBe(false);
    expect(hasPermission('coordinator', 'admin:settings')).toBe(false);
    expect(hasPermission('coordinator', 'shortcuts:global')).toBe(false);
  });

  it('user has basic chat permissions only', () => {
    expect(hasPermission('user', 'chat')).toBe(true);
    expect(hasPermission('user', 'shortcuts')).toBe(true);
    expect(hasPermission('user', 'chat:history')).toBe(true);
    expect(hasPermission('user', 'chat:save')).toBe(true);
    expect(hasPermission('user', 'user:profile')).toBe(true);
    expect(hasPermission('user', 'chat:lock')).toBe(false);
    expect(hasPermission('user', 'chat:unlock')).toBe(false);
    expect(hasPermission('user', 'admin:users:write')).toBe(false);
    expect(hasPermission('user', 'admin:sessions')).toBe(false);
    expect(hasPermission('user', 'shortcuts:global')).toBe(false);
  });

  it('returns false for unknown permissions', () => {
    expect(hasPermission('admin', 'nonexistent')).toBe(false);
    expect(hasPermission('user', 'nonexistent')).toBe(false);
  });
});
