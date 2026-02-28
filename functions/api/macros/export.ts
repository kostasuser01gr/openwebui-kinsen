import type { Env, Macro, UserSession } from '../../../src/lib/types';

// GET /api/macros/export — download caller's macros as JSON
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;
  const user = (context.data as Record<string, unknown>).user as UserSession;

  const ids = ((await env.KV.get(`macro:index:${user.userId}`, 'json')) as string[] | null) ?? [];
  const macros = (
    await Promise.all(ids.map((id) => env.KV.get(`macro:${id}`, 'json') as Promise<Macro | null>))
  ).filter(Boolean) as Macro[];

  const payload = JSON.stringify(
    { version: 1, exportedAt: new Date().toISOString(), macros },
    null,
    2,
  );

  return new Response(payload, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="kinsen-macros-${user.userId}.json"`,
    },
  });
};
