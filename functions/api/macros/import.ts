import type { Env, Macro, UserSession } from '../../../src/lib/types';
import { generateId } from '../../../src/lib/crypto';

// POST /api/macros/import — bulk import macros from JSON export
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { env, request } = context;
  const user = (context.data as Record<string, unknown>).user as UserSession;

  let body: { macros?: unknown[] };
  try {
    body = (await request.json()) as { macros?: unknown[] };
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const incoming = Array.isArray(body.macros) ? body.macros : [];
  if (!incoming.length) {
    return new Response(JSON.stringify({ error: 'No macros to import' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const created: Macro[] = [];
  const indexKey = `macro:index:${user.userId}`;
  const existingIds = ((await env.KV.get(indexKey, 'json')) as string[] | null) ?? [];

  for (const raw of incoming.slice(0, 200)) {
    const m = raw as Record<string, unknown>;
    const title = ((m.title as string) ?? '').trim().slice(0, 80);
    const promptTemplate = ((m.promptTemplate as string) ?? '').trim().slice(0, 2000);
    if (!title || !promptTemplate) continue;

    const id = generateId();
    const macro: Macro = {
      id,
      userId: user.userId,
      title,
      promptTemplate,
      global: false, // imported macros are always personal
      createdAt: new Date().toISOString(),
    };
    await env.KV.put(`macro:${id}`, JSON.stringify(macro));
    existingIds.push(id);
    created.push(macro);
  }

  await env.KV.put(indexKey, JSON.stringify(existingIds));

  return new Response(JSON.stringify({ ok: true, imported: created.length }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
