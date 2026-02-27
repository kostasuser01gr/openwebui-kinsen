// Webhook management API
import type { Env, Webhook, WebhookEvent } from '../../../src/lib/types';

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  // Check for delivery log request: ?log=webhookId
  const url = new URL(ctx.request.url);
  const logId = url.searchParams.get('log');
  if (logId) {
    const log = await ctx.env.KV.get(`webhook:log:${logId}`, 'json') as unknown[] | null;
    return new Response(JSON.stringify(log || []));
  }

  const indexRaw = await ctx.env.KV.get('webhook:index');
  const ids: string[] = indexRaw ? JSON.parse(indexRaw) : [];

  const webhooks: Webhook[] = [];
  for (const id of ids) {
    const raw = await ctx.env.KV.get(`webhook:${id}`);
    if (raw) webhooks.push(JSON.parse(raw) as Webhook);
  }

  return new Response(JSON.stringify(webhooks));
};

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const body = await ctx.request.json() as { url: string; events: WebhookEvent[]; secret?: string };

  if (!body.url || !body.events?.length) {
    return new Response(JSON.stringify({ error: 'url and events required' }), { status: 400 });
  }

  // Validate URL
  try { new URL(body.url); } catch {
    return new Response(JSON.stringify({ error: 'Invalid URL' }), { status: 400 });
  }

  const id = `wh-${Date.now().toString(36)}`;
  const webhook: Webhook = {
    id,
    url: body.url,
    events: body.events,
    secret: body.secret || crypto.randomUUID(),
    active: true,
    createdAt: new Date().toISOString(),
    failCount: 0,
  };

  await ctx.env.KV.put(`webhook:${id}`, JSON.stringify(webhook));

  const indexRaw = await ctx.env.KV.get('webhook:index');
  const index: string[] = indexRaw ? JSON.parse(indexRaw) : [];
  index.push(id);
  await ctx.env.KV.put('webhook:index', JSON.stringify(index));

  return new Response(JSON.stringify({ ok: true, webhook }), { status: 201 });
};

export const onRequestPut: PagesFunction<Env> = async (ctx) => {
  const body = await ctx.request.json() as { id: string; active?: boolean; events?: WebhookEvent[]; url?: string };
  if (!body.id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400 });

  const raw = await ctx.env.KV.get(`webhook:${body.id}`);
  if (!raw) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });

  const webhook = JSON.parse(raw) as Webhook;
  if (body.active !== undefined) webhook.active = body.active;
  if (body.events) webhook.events = body.events;
  if (body.url) webhook.url = body.url;

  await ctx.env.KV.put(`webhook:${body.id}`, JSON.stringify(webhook));
  return new Response(JSON.stringify({ ok: true, webhook }));
};

export const onRequestDelete: PagesFunction<Env> = async (ctx) => {
  const url = new URL(ctx.request.url);
  const id = url.searchParams.get('id');
  if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400 });

  await ctx.env.KV.delete(`webhook:${id}`);

  const indexRaw = await ctx.env.KV.get('webhook:index');
  const index: string[] = indexRaw ? JSON.parse(indexRaw) : [];
  const filtered = index.filter(i => i !== id);
  await ctx.env.KV.put('webhook:index', JSON.stringify(filtered));

  return new Response(JSON.stringify({ ok: true }));
};
