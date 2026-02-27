import type { Env } from '../../../src/lib/types';

// GET: fetch recent audit log entries
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10), 500);

  const list = await env.KV.list({ prefix: 'audit:', limit });
  const entries: any[] = [];

  const promises = list.keys.map((k) =>
    env.KV.get(k.name, 'json').then((val) => {
      if (val) entries.push(val);
    }),
  );
  await Promise.all(promises);

  // Sort by timestamp descending
  entries.sort((a: any, b: any) => (b.ts || '').localeCompare(a.ts || ''));

  return new Response(JSON.stringify({ count: entries.length, entries: entries.slice(0, limit) }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
