import type { Env, ChatMessage } from '../../../src/lib/types';

// GET /api/chat/history?sessionId=xxx → return conversation history
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;
  const url = new URL(context.request.url);
  const sessionId = url.searchParams.get('sessionId');

  if (!sessionId) {
    return new Response(JSON.stringify({ error: 'sessionId query parameter is required' }), {
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

  // Check lock status
  const isLocked = (await env.KV.get(`session:${sessionId}:locked`)) === 'true';

  // Get metadata
  const meta = (await env.KV.get(`session-meta:${sessionId}`, 'json')) as any;

  return new Response(
    JSON.stringify({
      sessionId,
      title: meta?.title || 'Untitled',
      locked: isLocked,
      messages: history,
      createdAt: meta?.createdAt,
      updatedAt: meta?.updatedAt,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  );
};
