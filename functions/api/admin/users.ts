import type { Env } from '../../../src/lib/types';
import { getAllUsers } from '../../../src/lib/users';

// GET /api/admin/users → list all users (admin only)
export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const users = await getAllUsers(env);

  // Strip sensitive data
  const safeUsers = users.map((u) => ({
    id: u.id,
    name: u.name,
    role: u.role,
    active: u.active,
    createdAt: u.createdAt,
    lastLoginAt: u.lastLoginAt,
  }));

  return new Response(JSON.stringify(safeUsers), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
