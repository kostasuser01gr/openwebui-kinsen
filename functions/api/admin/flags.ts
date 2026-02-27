// Feature flags admin API
import type { Env, FeatureFlag } from '../../../src/lib/types';
import { DEFAULT_FLAGS } from '../../../src/lib/feature-flags';

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const raw = await ctx.env.KV.get('feature:flags');
  if (raw) return new Response(raw);

  // Return defaults
  return new Response(JSON.stringify(DEFAULT_FLAGS));
};

export const onRequestPut: PagesFunction<Env> = async (ctx) => {
  const body = (await ctx.request.json()) as { id: string; enabled: boolean };
  const user = (ctx.data as Record<string, unknown>).user as { name: string } | undefined;

  if (!body.id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400 });

  const raw = await ctx.env.KV.get('feature:flags');
  const flags: FeatureFlag[] = raw ? JSON.parse(raw) : [...DEFAULT_FLAGS];

  const flag = flags.find((f) => f.id === body.id);
  if (!flag) return new Response(JSON.stringify({ error: 'Flag not found' }), { status: 404 });

  flag.enabled = body.enabled;
  flag.updatedAt = new Date().toISOString();
  flag.updatedBy = user?.name || 'admin';

  await ctx.env.KV.put('feature:flags', JSON.stringify(flags));
  return new Response(JSON.stringify({ ok: true, flags }));
};

// Reset to defaults
export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const now = new Date().toISOString();
  const flags = DEFAULT_FLAGS.map((f) => ({ ...f, updatedAt: now }));
  await ctx.env.KV.put('feature:flags', JSON.stringify(flags));
  return new Response(JSON.stringify({ ok: true, flags }));
};
