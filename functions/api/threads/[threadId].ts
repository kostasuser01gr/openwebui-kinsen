import type { Env, Thread, UserSession } from '../../../src/lib/types';

// GET /api/threads/:threadId
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, params } = context;
  const threadId = params['threadId'] as string;
  const user = (context.data as Record<string, unknown>).user as UserSession;

  const thread = (await env.KV.get(`thread:${threadId}`, 'json')) as Thread | null;
  if (!thread) {
    return new Response(JSON.stringify({ error: 'Thread not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Owner, coordinator, or admin can read
  if (thread.userId !== user.userId && !['coordinator', 'admin'].includes(user.role)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify(thread), { headers: { 'Content-Type': 'application/json' } });
};

// PUT /api/threads/:threadId — rename / update thread
export const onRequestPut: PagesFunction<Env> = async (context) => {
  const { env, params, request } = context;
  const threadId = params['threadId'] as string;
  const user = (context.data as Record<string, unknown>).user as UserSession;

  const thread = (await env.KV.get(`thread:${threadId}`, 'json')) as Thread | null;
  if (!thread) {
    return new Response(JSON.stringify({ error: 'Thread not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (thread.userId !== user.userId && !['coordinator', 'admin'].includes(user.role)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = (await request.json()) as { title?: string };
  if (body.title) thread.title = body.title.slice(0, 100);
  thread.updatedAt = new Date().toISOString();

  await env.KV.put(`thread:${threadId}`, JSON.stringify(thread));
  return new Response(JSON.stringify(thread), { headers: { 'Content-Type': 'application/json' } });
};

// DELETE /api/threads/:threadId
export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const { env, params } = context;
  const threadId = params['threadId'] as string;
  const user = (context.data as Record<string, unknown>).user as UserSession;

  const thread = (await env.KV.get(`thread:${threadId}`, 'json')) as Thread | null;
  if (!thread) {
    return new Response(JSON.stringify({ error: 'Thread not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (thread.userId !== user.userId && !['admin'].includes(user.role)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  await env.KV.delete(`thread:${threadId}`);
  await env.KV.delete(`thread:messages:${threadId}`);

  // Remove from index
  const indexKey = `thread:index:${thread.userId}`;
  const ids = ((await env.KV.get(indexKey, 'json')) as string[] | null) ?? [];
  await env.KV.put(indexKey, JSON.stringify(ids.filter((id) => id !== threadId)));

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
