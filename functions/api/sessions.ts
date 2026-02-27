import type { Env } from '../../src/lib/types';

// GET /api/sessions — admin/coordinator: list all sessions
export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const list = await env.KV.list({ prefix: 'session-meta:', limit: 100 });
  const sessions = [];

  for (const key of list.keys) {
    const meta = (await env.KV.get(key.name, 'json')) as any;
    if (meta) {
      const sessionId = key.name.replace('session-meta:', '');
      const isLocked = (await env.KV.get(`session:${sessionId}:locked`)) === 'true';
      sessions.push({
        id: meta.id || sessionId,
        title: meta.title,
        userId: meta.userId,
        locked: isLocked,
        messageCount: meta.messageCount || 0,
        createdAt: meta.createdAt,
        updatedAt: meta.updatedAt,
      });
    }
  }

  sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return new Response(JSON.stringify(sessions), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
