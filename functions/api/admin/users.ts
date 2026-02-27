import type { Env, User, UserRole } from '../../../src/lib/types';
import { createUser, getAllUsers, getUserById } from '../../../src/lib/users';

// GET: list all users
export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const users = await getAllUsers(env);
  // Strip password hashes
  const safe = users.map(({ passwordHash, ...rest }) => rest);
  return new Response(JSON.stringify(safe), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

// POST: create a new user
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const body = (await request.json()) as {
      email: string;
      name: string;
      password: string;
      role?: UserRole;
    };

    if (!body.email || !body.name || !body.password) {
      return new Response(JSON.stringify({ error: 'email, name, and password are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const validRoles: UserRole[] = ['agent', 'supervisor', 'manager', 'admin'];
    const role = body.role && validRoles.includes(body.role) ? body.role : 'agent';

    const user = await createUser(env, body.email, body.name, body.password, role);
    const { passwordHash, ...safe } = user;

    return new Response(JSON.stringify({ ok: true, user: safe }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to create user', details: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// PUT: update user role or active status
export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const body = (await request.json()) as {
      id: string;
      role?: UserRole;
      active?: boolean;
      name?: string;
    };

    if (!body.id) {
      return new Response(JSON.stringify({ error: 'User id is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const user = await getUserById(env, body.id);
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (body.role) user.role = body.role;
    if (body.active !== undefined) user.active = body.active;
    if (body.name) user.name = body.name;

    await env.KV.put(`user:${user.id}`, JSON.stringify(user));
    const { passwordHash, ...safe } = user;

    return new Response(JSON.stringify({ ok: true, user: safe }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
