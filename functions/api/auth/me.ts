import type { Env } from '../../../src/lib/types';

export const onRequestGet: PagesFunction<Env> = async ({ data }) => {
  const user = data.user as { userId?: string; name?: string; role?: string } | undefined;
  if (!user) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(
    JSON.stringify({
      ok: true,
      user: {
        id: user.userId,
        name: user.name || 'User',
        role: user.role || 'user',
      },
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  );
};
