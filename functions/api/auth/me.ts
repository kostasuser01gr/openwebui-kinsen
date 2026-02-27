import type { Env } from '../../../src/lib/types';

export const onRequestGet: PagesFunction<Env> = async ({ data }) => {
  const user = data.user as { name?: string; email?: string; role?: string } | undefined;
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
        name: user.name || 'Staff',
        email: user.email,
        role: user.role || 'agent',
      },
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  );
};
