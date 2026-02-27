import { describe, it, expect } from 'vitest';
import { hasPermission, hashPassword, verifyPassword } from '../src/lib/users';

describe('RBAC permissions', () => {
  it('agent can access chat', () => {
    expect(hasPermission('agent', 'chat')).toBe(true);
  });

  it('agent cannot access admin:knowledge:write', () => {
    expect(hasPermission('agent', 'admin:knowledge:write')).toBe(false);
  });

  it('supervisor can access admin:knowledge:read', () => {
    expect(hasPermission('supervisor', 'admin:knowledge:read')).toBe(true);
  });

  it('supervisor cannot access admin:users:write', () => {
    expect(hasPermission('supervisor', 'admin:users:write')).toBe(false);
  });

  it('manager can access admin:users:read', () => {
    expect(hasPermission('manager', 'admin:users:read')).toBe(true);
  });

  it('admin can access everything', () => {
    const permissions = [
      'chat', 'macros', 'checklists', 'feedback',
      'admin:knowledge:read', 'admin:knowledge:write',
      'admin:analytics', 'admin:users:read', 'admin:users:write',
      'admin:export', 'admin:audit', 'admin:seed',
    ];
    for (const perm of permissions) {
      expect(hasPermission('admin', perm)).toBe(true);
    }
  });

  it('returns false for unknown permission', () => {
    expect(hasPermission('admin', 'nonexistent')).toBe(false);
  });
});

describe('password hashing', () => {
  it('hashes and verifies correctly', async () => {
    const hash = await hashPassword('testPassword123');
    expect(hash).toHaveLength(64); // SHA-256 hex
    expect(await verifyPassword('testPassword123', hash)).toBe(true);
    expect(await verifyPassword('wrongPassword', hash)).toBe(false);
  });

  it('produces different hashes for different passwords', async () => {
    const hash1 = await hashPassword('password1');
    const hash2 = await hashPassword('password2');
    expect(hash1).not.toBe(hash2);
  });
});
