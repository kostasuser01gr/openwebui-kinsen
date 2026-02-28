import type { Env } from '../../../src/lib/types';
import { getUserById } from '../../../src/lib/users';

// GET /api/users/:id → get user info
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, params } = context;
  const userId = params['id'] as string;

  if (!userId) {
    return new Response(JSON.stringify({ error: 'User ID required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const user = await getUserById(env, userId);
  if (!user) {
    return new Response(JSON.stringify({ error: 'User not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(
    JSON.stringify({
      id: user.id,
      name: user.name,
      role: user.role,
      active: user.active,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  );
};
