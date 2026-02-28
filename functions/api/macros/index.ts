import type { Env, Macro, UserSession } from '../../../src/lib/types';
import { generateId } from '../../../src/lib/crypto';

// GET /api/macros — returns caller's macros + global macros
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;
  const user = (context.data as Record<string, unknown>).user as UserSession;

  const [userIds, globalIds] = await Promise.all([
    env.KV.get(`macro:index:${user.userId}`, 'json') as Promise<string[] | null>,
    env.KV.get('macro:index:global', 'json') as Promise<string[] | null>,
  ]);

  const allIds = [...new Set([...(userIds ?? []), ...(globalIds ?? [])])];
  if (!allIds.length)
    return new Response(JSON.stringify([]), { headers: { 'Content-Type': 'application/json' } });

  const macros = (
    await Promise.all(
      allIds.map((id) => env.KV.get(`macro:${id}`, 'json') as Promise<Macro | null>),
    )
  ).filter(Boolean) as Macro[];

  macros.sort((a, b) => a.title.localeCompare(b.title));
  return new Response(JSON.stringify(macros), { headers: { 'Content-Type': 'application/json' } });
};

// POST /api/macros — create macro
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { env, request } = context;
  const user = (context.data as Record<string, unknown>).user as UserSession;

  let body: { title?: string; promptTemplate?: string; global?: boolean };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const title = (body.title ?? '').trim().slice(0, 80);
  const promptTemplate = (body.promptTemplate ?? '').trim().slice(0, 2000);

  if (!title || !promptTemplate) {
    return new Response(JSON.stringify({ error: 'title and promptTemplate are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Only admin can create global macros
  const isGlobal = !!body.global && user.role === 'admin';

  const id = generateId();
  const macro: Macro = {
    id,
    userId: user.userId,
    title,
    promptTemplate,
    global: isGlobal,
    createdAt: new Date().toISOString(),
  };

  await env.KV.put(`macro:${id}`, JSON.stringify(macro));

  const indexKey = isGlobal ? 'macro:index:global' : `macro:index:${user.userId}`;
  const ids = ((await env.KV.get(indexKey, 'json')) as string[] | null) ?? [];
  if (!ids.includes(id)) ids.push(id);
  await env.KV.put(indexKey, JSON.stringify(ids));

  return new Response(JSON.stringify(macro), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};

// DELETE /api/macros?id=xxx
export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const { env, request } = context;
  const user = (context.data as Record<string, unknown>).user as UserSession;

  const id = new URL(request.url).searchParams.get('id');
  if (!id) {
    return new Response(JSON.stringify({ error: 'id query param required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const macro = (await env.KV.get(`macro:${id}`, 'json')) as Macro | null;
  if (!macro) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (macro.userId !== user.userId && user.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  await env.KV.delete(`macro:${id}`);

  // Remove from index
  const indexKey = macro.global ? 'macro:index:global' : `macro:index:${macro.userId}`;
  const ids = ((await env.KV.get(indexKey, 'json')) as string[] | null) ?? [];
  await env.KV.put(indexKey, JSON.stringify(ids.filter((i) => i !== id)));

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
