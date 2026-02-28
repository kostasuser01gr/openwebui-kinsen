import type { Env, UserRole } from '../../src/lib/types';
import { createUser, isValidPin } from '../../src/lib/users';

// POST /api/users → create user (admin only)
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const body = (await request.json()) as {
      name?: string;
      role?: string;
      pin?: string;
    };

    const name = (body.name || '').trim();
    const role = (body.role || 'user') as UserRole;
    const pin = body.pin || '';

    if (!name || !pin) {
      return new Response(JSON.stringify({ error: 'name and pin are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!isValidPin(pin)) {
      return new Response(JSON.stringify({ error: 'PIN must be exactly 4 digits' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!['user', 'coordinator', 'admin'].includes(role)) {
      return new Response(JSON.stringify({ error: 'role must be user, coordinator, or admin' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const user = await createUser(env, name, role, pin);

    return new Response(
      JSON.stringify({
        ok: true,
        user: { id: user.id, name: user.name, role: user.role, createdAt: user.createdAt },
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

