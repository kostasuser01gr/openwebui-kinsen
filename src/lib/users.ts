import type { User, UserRole, UserSession, Env } from './types';
import { sha256, generateSessionId } from './crypto';

// Permissions matrix: which roles can access which features
const PERMISSIONS: Record<string, UserRole[]> = {
  chat: ['agent', 'supervisor', 'manager', 'admin'],
  macros: ['agent', 'supervisor', 'manager', 'admin'],
  checklists: ['agent', 'supervisor', 'manager', 'admin'],
  feedback: ['agent', 'supervisor', 'manager', 'admin'],
  'admin:knowledge:read': ['supervisor', 'manager', 'admin'],
  'admin:knowledge:write': ['manager', 'admin'],
  'admin:analytics': ['supervisor', 'manager', 'admin'],
  'admin:users:read': ['manager', 'admin'],
  'admin:users:write': ['admin'],
  'admin:export': ['manager', 'admin'],
  'admin:audit': ['admin'],
  'admin:seed': ['admin'],
  'admin:settings': ['admin'],
};

export function hasPermission(role: UserRole, permission: string): boolean {
  const allowedRoles = PERMISSIONS[permission];
  if (!allowedRoles) return false;
  return allowedRoles.includes(role);
}

export async function hashPassword(password: string): Promise<string> {
  // Use SHA-256 with a prefix salt (simple but works for internal tool)
  return sha256(`kinsen:${password}`);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const computed = await hashPassword(password);
  return computed === hash;
}

export async function createUser(
  env: Env,
  email: string,
  name: string,
  password: string,
  role: UserRole = 'agent',
): Promise<User> {
  const id = email.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const passwordHash = await hashPassword(password);
  const user: User = {
    id,
    email: email.toLowerCase(),
    name,
    role,
    passwordHash,
    active: true,
    createdAt: new Date().toISOString(),
  };

  await env.KV.put(`user:${id}`, JSON.stringify(user));

  // Update user index
  const index = (await env.KV.get('user:index', 'json')) as string[] | null;
  const ids = index || [];
  if (!ids.includes(id)) {
    ids.push(id);
    await env.KV.put('user:index', JSON.stringify(ids));
  }

  return user;
}

export async function getUserById(env: Env, id: string): Promise<User | null> {
  return env.KV.get(`user:${id}`, 'json') as Promise<User | null>;
}

export async function getUserByEmail(env: Env, email: string): Promise<User | null> {
  const id = email.toLowerCase().replace(/[^a-z0-9]/g, '-');
  return getUserById(env, id);
}

export async function getAllUsers(env: Env): Promise<User[]> {
  const index = (await env.KV.get('user:index', 'json')) as string[] | null;
  if (!index || index.length === 0) return [];
  const users = await Promise.all(index.map((id) => getUserById(env, id)));
  return users.filter(Boolean) as User[];
}

export async function loginUser(
  env: Env,
  email: string,
  password: string,
  ip: string,
): Promise<{ session: UserSession; token: string } | null> {
  const user = await getUserByEmail(env, email);
  if (!user || !user.active) return null;

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return null;

  // Update last login
  user.lastLoginAt = new Date().toISOString();
  await env.KV.put(`user:${user.id}`, JSON.stringify(user));

  // Create session
  const token = generateSessionId();
  const session: UserSession = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: new Date().toISOString(),
    ip,
  };

  await env.KV.put(`session:${token}`, JSON.stringify(session), { expirationTtl: 86400 });
  return { session, token };
}

export async function getSession(env: Env, token: string): Promise<UserSession | null> {
  return env.KV.get(`session:${token}`, 'json') as Promise<UserSession | null>;
}
