import type { Env, Message, Thread, UserSession } from '../../../../../src/lib/types';
import { writeAudit } from '../../../../../src/lib/audit';

function getMessages(env: Env, threadId: string): Promise<Message[] | null> {
  return env.KV.get(`thread:messages:${threadId}`, 'json') as Promise<Message[] | null>;
}

function putMessages(env: Env, threadId: string, msgs: Message[]): Promise<void> {
  const MSG_TTL = 7 * 24 * 60 * 60;
  return env.KV.put(`thread:messages:${threadId}`, JSON.stringify(msgs), {
    expirationTtl: MSG_TTL,
  });
}

// DELETE /api/threads/:threadId/messages/:msgId — soft-delete a message
// Allowed: message owner, coordinator, admin
export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const { env, params, request } = context;
  const threadId = params['threadId'] as string;
  const msgId = params['msgId'] as string;
  const user = (context.data as Record<string, unknown>).user as UserSession;
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';

  const thread = (await env.KV.get(`thread:${threadId}`, 'json')) as Thread | null;
  if (!thread) {
    return new Response(JSON.stringify({ error: 'Thread not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const messages = (await getMessages(env, threadId)) ?? [];
  const idx = messages.findIndex((m) => m.id === msgId);
  if (idx === -1) {
    return new Response(JSON.stringify({ error: 'Message not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const msg = messages[idx];
  const canDelete = msg.userId === user.userId || ['coordinator', 'admin'].includes(user.role);
  if (!canDelete) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Soft-delete: wipe content, flag as deleted
  messages[idx] = { ...msg, content: '[deleted]', deleted: true };
  await putMessages(env, threadId, messages);

  context.waitUntil(
    writeAudit(env, { id: user.userId, name: user.name }, 'message.delete', {
      ip,
      meta: { threadId, msgId },
    }),
  );

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

// PUT /api/threads/:threadId/messages/:msgId — pin or unpin a message
// Allowed: coordinator, admin
export const onRequestPut: PagesFunction<Env> = async (context) => {
  const { env, params, request } = context;
  const threadId = params['threadId'] as string;
  const msgId = params['msgId'] as string;
  const user = (context.data as Record<string, unknown>).user as UserSession;
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';

  if (!['coordinator', 'admin'].includes(user.role)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const thread = (await env.KV.get(`thread:${threadId}`, 'json')) as Thread | null;
  if (!thread) {
    return new Response(JSON.stringify({ error: 'Thread not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const messages = (await getMessages(env, threadId)) ?? [];
  const idx = messages.findIndex((m) => m.id === msgId);
  if (idx === -1) {
    return new Response(JSON.stringify({ error: 'Message not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: { pinned?: boolean } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    /* defaults */
  }

  const nextPinned = body.pinned ?? !messages[idx].pinned;
  messages[idx] = { ...messages[idx], pinned: nextPinned };
  await putMessages(env, threadId, messages);

  context.waitUntil(
    writeAudit(
      env,
      { id: user.userId, name: user.name },
      nextPinned ? 'message.pin' : 'message.unpin',
      {
        ip,
        meta: { threadId, msgId },
      },
    ),
  );

  return new Response(JSON.stringify({ ok: true, message: messages[idx] }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
