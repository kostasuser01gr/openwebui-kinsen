import type { Env, UserSession } from '../../../../../src/lib/types';
import { getUserById, isValidPin, resetPinForUser } from '../../../../../src/lib/users';
import { writeAudit } from '../../../../../src/lib/audit';

// POST /api/admin/users/:id/reset-pin — admin resets a user's PIN (no old PIN required)
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { env, params, request } = context;
  const targetId = params['id'] as string;
  const actor = (context.data as Record<string, unknown>).user as UserSession;

  let newPin = '';
  try {
    const body = (await request.json()) as { pin?: string };
    newPin = (body.pin ?? '').trim();
  } catch {
    /* empty */
  }

  if (!isValidPin(newPin)) {
    return new Response(JSON.stringify({ error: 'pin must be exactly 4 digits' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const target = await getUserById(env, targetId);
  if (!target) {
    return new Response(JSON.stringify({ error: 'User not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  await resetPinForUser(env, targetId, newPin);

  context.waitUntil(
    writeAudit(env, { id: actor.userId, name: actor.name }, 'admin.reset_pin', {
      targetId,
      targetType: 'user',
      meta: { targetName: target.name },
      ip: request.headers.get('CF-Connecting-IP') ?? undefined,
      ua: request.headers.get('User-Agent') ?? undefined,
    }),
  );

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
