// Escalation API — POST create, GET list, PUT update
import type { Env, Escalation } from '../../src/lib/types';

interface EscalationRequest {
  sessionId: string;
  reason: string;
  priority?: string;
  lastMessage: string;
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const body = (await ctx.request.json()) as EscalationRequest;
  const user = (ctx.data as Record<string, unknown>).user as
    | { userId: string; name: string; role: string }
    | undefined;
  if (!body.sessionId || !body.reason) {
    return new Response(JSON.stringify({ error: 'sessionId and reason required' }), {
      status: 400,
    });
  }

  const id = `ESC-${Date.now().toString(36).toUpperCase()}`;
  const escalation: Escalation = {
    id,
    sessionId: body.sessionId,
    fromUserId: user?.userId || 'anonymous',
    fromUserName: user?.name || 'Staff',
    status: 'open',
    priority: (body.priority as Escalation['priority']) || 'medium',
    reason: body.reason,
    lastMessage: body.lastMessage,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await ctx.env.KV.put(`escalation:${id}`, JSON.stringify(escalation), {
    expirationTtl: 30 * 86400,
  });

  // Add to index
  const indexRaw = await ctx.env.KV.get('escalation:index');
  const index: string[] = indexRaw ? JSON.parse(indexRaw) : [];
  index.unshift(id);
  if (index.length > 200) index.length = 200;
  await ctx.env.KV.put('escalation:index', JSON.stringify(index));

  // Create notification for supervisors
  const notif = {
    id: `notif-${Date.now()}`,
    userId: '__supervisors__',
    type: 'escalation',
    title: `Escalation: ${body.reason.slice(0, 50)}`,
    body: `From ${escalation.fromUserName}: ${body.lastMessage.slice(0, 100)}`,
    link: `/escalations/${id}`,
    read: false,
    createdAt: new Date().toISOString(),
  };
  await ctx.env.KV.put(`notification:${notif.id}`, JSON.stringify(notif), {
    expirationTtl: 7 * 86400,
  });
  const notifIndex = await ctx.env.KV.get('notification:index:__supervisors__');
  const nIdx: string[] = notifIndex ? JSON.parse(notifIndex) : [];
  nIdx.unshift(notif.id);
  if (nIdx.length > 100) nIdx.length = 100;
  await ctx.env.KV.put('notification:index:__supervisors__', JSON.stringify(nIdx));

  return new Response(JSON.stringify({ ok: true, escalation }), { status: 201 });
};

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const url = new URL(ctx.request.url);
  const status = url.searchParams.get('status');
  const indexRaw = await ctx.env.KV.get('escalation:index');
  const index: string[] = indexRaw ? JSON.parse(indexRaw) : [];

  const escalations: Escalation[] = [];
  for (const id of index.slice(0, 50)) {
    const raw = await ctx.env.KV.get(`escalation:${id}`);
    if (raw) {
      const esc = JSON.parse(raw) as Escalation;
      if (!status || esc.status === status) escalations.push(esc);
    }
  }

  return new Response(JSON.stringify(escalations));
};

export const onRequestPut: PagesFunction<Env> = async (ctx) => {
  const body = (await ctx.request.json()) as {
    id: string;
    status?: string;
    assignedTo?: string;
    resolution?: string;
  };
  const user = (ctx.data as Record<string, unknown>).user as
    | { userId: string; name: string }
    | undefined;
  if (!body.id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400 });

  const raw = await ctx.env.KV.get(`escalation:${body.id}`);
  if (!raw) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });

  const esc = JSON.parse(raw) as Escalation;
  if (body.status) esc.status = body.status as Escalation['status'];
  if (body.assignedTo) esc.assignedTo = body.assignedTo;
  if (body.resolution) {
    esc.resolution = body.resolution;
    esc.resolvedAt = new Date().toISOString();
  }
  esc.updatedAt = new Date().toISOString();
  if (!esc.assignedTo && user) esc.assignedTo = user.userId;

  await ctx.env.KV.put(`escalation:${body.id}`, JSON.stringify(esc), { expirationTtl: 30 * 86400 });
  return new Response(JSON.stringify({ ok: true, escalation: esc }));
};
