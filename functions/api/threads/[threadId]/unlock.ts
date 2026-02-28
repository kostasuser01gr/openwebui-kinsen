import type { Env, Thread, UserSession } from '../../../../src/lib/types';
import { writeAudit } from '../../../../src/lib/audit';

// POST /api/threads/:threadId/unlock
export const onRequestPost: PagesFunction<Env> = async (context) => {
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

  if (!thread.locked) {
    return new Response(JSON.stringify({ ok: true, message: 'Already unlocked' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const updated: Thread = {
    ...thread,
    locked: false,
    lockedBy: undefined,
    lockedAt: undefined,
    updatedAt: new Date().toISOString(),
  };

  await env.KV.put(`thread:${threadId}`, JSON.stringify(updated));

  context.waitUntil(
    writeAudit(env, { id: user.userId, name: user.name }, 'thread.unlock', {
      targetId: threadId,
      targetType: 'thread',
      ip: request.headers.get('CF-Connecting-IP') ?? undefined,
    }),
  );

  return new Response(JSON.stringify({ ok: true, thread: updated }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
