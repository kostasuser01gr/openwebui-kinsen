import type { Env, Room, UserSession } from '../../../src/lib/types';
import { generateId } from '../../../src/lib/crypto';

const BUILTIN_ROOMS: Room[] = [
  { id: 'global', name: 'Global', locked: false, createdAt: '2024-01-01T00:00:00.000Z' },
];

// GET /api/rooms
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;

  const list = await env.KV.list({ prefix: 'room:' });
  const custom = (
    await Promise.all(
      list.keys.map((k) => env.KV.get(k.name, 'json') as Promise<Room | null>),
    )
  ).filter(Boolean) as Room[];

  // Merge built-ins with custom rooms, deduplicate by id
  const ids = new Set(custom.map((r) => r.id));
  const all = [...BUILTIN_ROOMS.filter((r) => !ids.has(r.id)), ...custom];

  return new Response(JSON.stringify(all), { headers: { 'Content-Type': 'application/json' } });
};

// POST /api/rooms — admin only (enforced in middleware)
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { env, request } = context;
  const user = (context.data as Record<string, unknown>).user as UserSession;

  let name = '';
  try {
    const body = (await request.json()) as { name?: string };
    name = (body.name ?? '').trim().slice(0, 50);
  } catch {
    /* empty */
  }

  if (!name) {
    return new Response(JSON.stringify({ error: 'name is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const id = generateId(8);
  const room: Room = { id, name, locked: false, createdAt: new Date().toISOString() };
  await env.KV.put(`room:${id}`, JSON.stringify(room));

  return new Response(JSON.stringify(room), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
