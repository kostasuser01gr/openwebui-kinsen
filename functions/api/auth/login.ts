import type { Env } from '../../../src/lib/types';
import { buildSessionCookie, createSession, isSecureRequest } from '../../lib/auth-session';
import { loginUserByName } from '../../../src/lib/users';
import { writeAudit } from '../../../src/lib/audit';

interface LoginBody {
  name?: string;
  pin?: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  try {
    const body = (await request.json()) as LoginBody;
    const name = (body.name ?? '').trim();
    const pin = body.pin ?? '';

    if (!name || !pin) {
      return new Response(JSON.stringify({ error: 'name and pin are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!/^\d{4}$/.test(pin)) {
      return new Response(JSON.stringify({ error: 'PIN must be exactly 4 digits' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
    const result = await loginUserByName(env, name, pin, ip);

    if (!result) {
      return new Response(JSON.stringify({ error: 'Invalid name or PIN' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create signed session token
    const signedToken = await createSession(env, result.session);

    context.waitUntil(
      writeAudit(env, { id: result.user.id, name: result.user.name }, 'auth.login', {
        ip,
        ua: request.headers.get('User-Agent') ?? undefined,
      }),
    );

    return new Response(
      JSON.stringify({
        ok: true,
        token: signedToken,
        user: { id: result.user.id, name: result.user.name, role: result.user.role },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': buildSessionCookie(signedToken, isSecureRequest(request)),
        },
      },
    );
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
