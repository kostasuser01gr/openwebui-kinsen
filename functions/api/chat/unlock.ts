import type { Env } from '../../../src/lib/types';

// POST /api/chat/unlock → unlock a session (coordinator/admin only)
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const { sessionId } = (await request.json()) as { sessionId?: string };

    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'sessionId is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await env.KV.delete(`session:${sessionId}:locked`);

    // Update session metadata
    const metaKey = `session-meta:${sessionId}`;
    const meta = (await env.KV.get(metaKey, 'json')) as any;
    if (meta) {
      meta.locked = false;
      meta.updatedAt = new Date().toISOString();
      await env.KV.put(metaKey, JSON.stringify(meta), { expirationTtl: 604800 });
    }

    return new Response(JSON.stringify({ ok: true, sessionId, locked: false }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
