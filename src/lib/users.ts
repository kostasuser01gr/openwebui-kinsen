import type { User, UserRole, UserSession, Env } from './types';
import { hashPin, generateSessionId, generateUserId } from './crypto';

// Permissions matrix: which roles can access which features
const PERMISSIONS: Record<string, UserRole[]> = {
  chat: ['user', 'coordinator', 'admin'],
  shortcuts: ['user', 'coordinator', 'admin'],
  'shortcuts:global': ['admin'],
  'chat:lock': ['coordinator', 'admin'],
  'chat:unlock': ['coordinator', 'admin'],
  'chat:history': ['user', 'coordinator', 'admin'],
  'chat:save': ['user', 'coordinator', 'admin'],
  'chat:view_all': ['coordinator', 'admin'],
  'user:profile': ['user', 'coordinator', 'admin'],
  'admin:users:read': ['admin'],
  'admin:users:write': ['admin'],
  'admin:sessions': ['coordinator', 'admin'],
  'admin:moderation': ['coordinator', 'admin'],
  'admin:settings': ['admin'],
};

export function hasPermission(role: UserRole, permission: string): boolean {
  const allowedRoles = PERMISSIONS[permission];
  if (!allowedRoles) return false;
  return allowedRoles.includes(role);
}

export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

export async function createUser(
  env: Env,
  name: string,
  role: UserRole,
  pin: string,
): Promise<User> {
  const id = generateUserId();
  const pinHash = await hashPin(pin, env.PIN_SALT_SECRET);

  const user: User = {
    id,
    name,
    role,
    active: true,
    createdAt: new Date().toISOString(),
  };

  await env.KV.put(`user:${id}`, JSON.stringify(user));
  await env.KV.put(`auth:${id}`, pinHash);

  // Update user index
  const index = ((await env.KV.get('user:index', 'json')) as string[] | null) || [];
  if (!index.includes(id)) {
    index.push(id);
    await env.KV.put('user:index', JSON.stringify(index));
  }

  return user;
}

export async function getUserById(env: Env, id: string): Promise<User | null> {
  return env.KV.get(`user:${id}`, 'json') as Promise<User | null>;
}

export async function getAllUsers(env: Env): Promise<User[]> {
  const index = ((await env.KV.get('user:index', 'json')) as string[] | null) || [];
  if (index.length === 0) return [];
  const users = await Promise.all(index.map((id) => getUserById(env, id)));
  return users.filter(Boolean) as User[];
}

export async function loginUser(
  env: Env,
  userId: string,
  pin: string,
  ip: string,
): Promise<{ session: UserSession; token: string } | null> {
  const user = await getUserById(env, userId);
  if (!user || !user.active) return null;

  const storedHash = await env.KV.get(`auth:${userId}`);
  if (!storedHash) return null;

  const pinHash = await hashPin(pin, env.PIN_SALT_SECRET);
  if (pinHash !== storedHash) return null;

  // Update last login
  user.lastLoginAt = new Date().toISOString();
  await env.KV.put(`user:${user.id}`, JSON.stringify(user));

  // Create session
  const token = generateSessionId();
  const session: UserSession = {
    userId: user.id,
    name: user.name,
    role: user.role,
    createdAt: new Date().toISOString(),
    ip,
  };

  await env.KV.put(`session:${token}`, JSON.stringify(session), { expirationTtl: 86400 });
  return { session, token };
}

export async function loginUserByName(
  env: Env,
  name: string,
  pin: string,
  ip: string,
): Promise<{ session: UserSession; token: string; user: User } | null> {
  const allUsers = await getAllUsers(env);
  const user = allUsers.find((u) => u.name.toLowerCase() === name.toLowerCase() && u.active);
  if (!user) return null;

  const result = await loginUser(env, user.id, pin, ip);
  if (!result) return null;
  return { ...result, user };
}
