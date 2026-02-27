import type { Env, ChatMessage } from '../../../src/lib/types';

// POST /api/chat/save → archive a session (copy to permanent storage)
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const user = (context.data as Record<string, any>).user;

  try {
    const { sessionId } = (await request.json()) as { sessionId?: string };

    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'sessionId is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const historyKey = `session:${sessionId}`;
    const history = (await env.KV.get(historyKey, 'json')) as ChatMessage[] | null;

    if (!history) {
      return new Response(JSON.stringify({ error: 'Session not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const meta = (await env.KV.get(`session-meta:${sessionId}`, 'json')) as any;

    // Archive with longer TTL (90 days)
    const archiveData = {
      sessionId,
      title: meta?.title || 'Untitled',
      userId: user?.userId || 'unknown',
      messages: history,
      archivedAt: new Date().toISOString(),
      originalCreatedAt: meta?.createdAt,
    };

    await env.KV.put(`archive:${sessionId}`, JSON.stringify(archiveData), {
      expirationTtl: 86400 * 90,
    });

    // Add to user's archive index
    if (user?.userId) {
      const archiveIndexKey = `archive-index:${user.userId}`;
      const archiveIndex = ((await env.KV.get(archiveIndexKey, 'json')) as string[] | null) || [];
      if (!archiveIndex.includes(sessionId)) {
        archiveIndex.push(sessionId);
        await env.KV.put(archiveIndexKey, JSON.stringify(archiveIndex), {
          expirationTtl: 86400 * 90,
        });
      }
    }

    return new Response(
      JSON.stringify({ ok: true, sessionId, archivedAt: archiveData.archivedAt }),
      {
        status: 200,
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
