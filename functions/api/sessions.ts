import type { Env } from '../../src/lib/types';

// GET /api/sessions — list chat sessions for sidebar
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get('id');

  // Get a specific session's messages
  if (sessionId) {
    const history = await env.KV.get(`chat:${sessionId}`, 'json');
    return new Response(JSON.stringify({ sessionId, messages: history || [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // List recent sessions (using KV list with prefix)
  const list = await env.KV.list({ prefix: 'chat:', limit: 50 });
  const sessions = list.keys.map(k => ({
    id: k.name.replace('chat:', ''),
    expiration: k.expiration,
  }));

  return new Response(JSON.stringify({ sessions }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
