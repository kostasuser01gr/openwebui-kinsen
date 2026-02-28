import type { Env, Thread, UserSession } from '../../../src/lib/types';
import { generateId } from '../../../src/lib/crypto';

const THREAD_TTL = 30 * 24 * 60 * 60; // 30 days

// GET /api/threads — list caller's threads
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;
  const user = (context.data as Record<string, unknown>).user as UserSession;

  const indexKey = `thread:index:${user.userId}`;
  const ids = ((await env.KV.get(indexKey, 'json')) as string[] | null) ?? [];
  if (!ids.length) return new Response(JSON.stringify([]), { headers: { 'Content-Type': 'application/json' } });

  const threads = (
    await Promise.all(ids.map((id) => env.KV.get(`thread:${id}`, 'json') as Promise<Thread | null>))
  ).filter(Boolean) as Thread[];

  // Newest first
  threads.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return new Response(JSON.stringify(threads), { headers: { 'Content-Type': 'application/json' } });
};

// POST /api/threads — create a new thread
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { env, request } = context;
  const user = (context.data as Record<string, unknown>).user as UserSession;

  let title = 'New Thread';
  let roomId = env.DEFAULT_ROOM_ID ?? 'global';
  try {
    const body = (await request.json()) as { title?: string; roomId?: string };
    if (body.title) title = body.title.slice(0, 100);
    if (body.roomId) roomId = body.roomId;
  } catch {
    /* defaults are fine */
  }

  const id = generateId(12);
  const now = new Date().toISOString();
  const thread: Thread = {
    id,
    title,
    userId: user.userId,
    roomId,
    locked: false,
    createdAt: now,
    updatedAt: now,
    messageCount: 0,
  };

  await env.KV.put(`thread:${id}`, JSON.stringify(thread), { expirationTtl: THREAD_TTL });

  // Update user's thread index
  const indexKey = `thread:index:${user.userId}`;
  const ids = ((await env.KV.get(indexKey, 'json')) as string[] | null) ?? [];
  if (!ids.includes(id)) ids.unshift(id);
  await env.KV.put(indexKey, JSON.stringify(ids.slice(0, 500)));

  return new Response(JSON.stringify(thread), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
