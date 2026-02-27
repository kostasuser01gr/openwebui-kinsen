import type { Env } from '../../../src/lib/types';

// POST /api/chat/lock → lock a session (coordinator/admin only)
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

    // Verify session exists
    const historyKey = `session:${sessionId}`;
    const exists = await env.KV.get(historyKey);
    if (exists === null) {
      return new Response(JSON.stringify({ error: 'Session not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await env.KV.put(`session:${sessionId}:locked`, 'true', { expirationTtl: 604800 });

    // Update session metadata
    const metaKey = `session-meta:${sessionId}`;
    const meta = (await env.KV.get(metaKey, 'json')) as any;
    if (meta) {
      meta.locked = true;
      meta.updatedAt = new Date().toISOString();
      await env.KV.put(metaKey, JSON.stringify(meta), { expirationTtl: 604800 });
    }

    return new Response(JSON.stringify({ ok: true, sessionId, locked: true }), {
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
