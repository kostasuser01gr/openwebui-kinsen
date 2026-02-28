import type { Env } from '../../../src/lib/types';
import { changePinWithVerification, isValidPin } from '../../../src/lib/users';
import { writeAudit } from '../../../src/lib/audit';

// PUT /api/user/pin — user changes own PIN (requires old PIN)
export const onRequestPut: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const user = (context.data as Record<string, unknown>).user as {
    userId: string;
    name: string;
  };

  let body: { oldPin?: string; newPin?: string };
  try {
    body = (await request.json()) as { oldPin?: string; newPin?: string };
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const oldPin = (body.oldPin ?? '').trim();
  const newPin = (body.newPin ?? '').trim();

  if (!isValidPin(oldPin) || !isValidPin(newPin)) {
    return new Response(JSON.stringify({ error: 'Both oldPin and newPin must be 4 digits' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (oldPin === newPin) {
    return new Response(JSON.stringify({ error: 'New PIN must differ from old PIN' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const ok = await changePinWithVerification(env, user.userId, oldPin, newPin);
  if (!ok) {
    return new Response(JSON.stringify({ error: 'Old PIN is incorrect' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  context.waitUntil(
    writeAudit(env, { id: user.userId, name: user.name }, 'user.pin_changed', {
      ip: request.headers.get('CF-Connecting-IP') ?? undefined,
    }),
  );

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
