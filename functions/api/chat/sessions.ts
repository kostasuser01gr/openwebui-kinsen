import type { Env } from '../../../src/lib/types';

// GET /api/chat/sessions → list sessions for the current user
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;
  const user = (context.data as Record<string, any>).user;

  if (!user?.userId) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const userSessionsKey = `user-sessions:${user.userId}`;
  const sessionIds = ((await env.KV.get(userSessionsKey, 'json')) as string[] | null) || [];

  const sessions = [];
  for (const sid of sessionIds) {
    const meta = (await env.KV.get(`session-meta:${sid}`, 'json')) as any;
    if (meta) {
      const isLocked = (await env.KV.get(`session:${sid}:locked`)) === 'true';
      sessions.push({
        id: meta.id,
        title: meta.title,
        locked: isLocked,
        messageCount: meta.messageCount || 0,
        createdAt: meta.createdAt,
        updatedAt: meta.updatedAt,
      });
    }
  }

  // Sort by most recently updated
  sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return new Response(JSON.stringify(sessions), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
