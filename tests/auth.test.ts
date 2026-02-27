import { describe, it, expect } from 'vitest';
import {
  sha256,
  hashPin,
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

  it('hashPin uses salt correctly', async () => {
    const h1 = await hashPin('1234', 'salt-a');
    const h2 = await hashPin('1234', 'salt-b');
    expect(h1).not.toBe(h2); // different salts = different hashes
  });

  it('hashPin is deterministic with same salt', async () => {
    const h1 = await hashPin('5678', 'my-salt');
    const h2 = await hashPin('5678', 'my-salt');
    expect(h1).toBe(h2);
  });

  it('hashPin uses format SHA256(pin + salt) per spec', async () => {
    const pin = '1234';
    const salt = 'test-salt';
    const expected = await sha256(`${pin}${salt}`);
    const actual = await hashPin(pin, salt);
    expect(actual).toBe(expected);
  });

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
