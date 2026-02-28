import type { User, UserRole, UserSession, Env } from './types';
import { hashPin, generateSessionId, generateUserId } from './crypto';

// Permission matrix
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
  const allowed = PERMISSIONS[permission];
  return !!allowed && allowed.includes(role);
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
  const pinHash = await hashPin(pin, env.PIN_SALT_SECRET, id);

  const user: User = {
    id,
    name,
    role,
    active: true,
    createdAt: new Date().toISOString(),
  };

  await env.KV.put(`user:${id}`, JSON.stringify(user));
  await env.KV.put(`auth:${id}`, pinHash);

  const index = ((await env.KV.get('user:index', 'json')) as string[] | null) ?? [];
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
  const index = ((await env.KV.get('user:index', 'json')) as string[] | null) ?? [];
  if (!index.length) return [];
  const users = await Promise.all(index.map((id) => getUserById(env, id)));
  return users.filter(Boolean) as User[];
}

/** Admin-initiated PIN reset — no old PIN required */
export async function resetPinForUser(
  env: Env,
  userId: string,
  newPin: string,
): Promise<void> {
  const pinHash = await hashPin(newPin, env.PIN_SALT_SECRET, userId);
  await env.KV.put(`auth:${userId}`, pinHash);
}

/** User-initiated PIN change — must supply correct old PIN */
export async function changePinWithVerification(
  env: Env,
  userId: string,
  oldPin: string,
  newPin: string,
): Promise<boolean> {
  const storedHash = await env.KV.get(`auth:${userId}`);
  if (!storedHash) return false;
  const oldHash = await hashPin(oldPin, env.PIN_SALT_SECRET, userId);
  if (oldHash !== storedHash) return false;
  const newHash = await hashPin(newPin, env.PIN_SALT_SECRET, userId);
  await env.KV.put(`auth:${userId}`, newHash);
  return true;
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

  const pinHash = await hashPin(pin, env.PIN_SALT_SECRET, userId);
  if (pinHash !== storedHash) return null;

  user.lastLoginAt = new Date().toISOString();
  await env.KV.put(`user:${user.id}`, JSON.stringify(user));

  const rawToken = generateSessionId();
  const session: UserSession = {
    userId: user.id,
    name: user.name,
    role: user.role,
    createdAt: new Date().toISOString(),
    ip,
  };
  await env.KV.put(`session:${rawToken}`, JSON.stringify(session), { expirationTtl: 86400 });

  return { session, token: rawToken };
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
