import type { Env } from '../../../src/lib/types';
import { buildSessionCookie, isSecureRequest } from '../../lib/auth-session';
import { loginUserByName } from '../../../src/lib/users';

interface LoginBody {
  name?: string;
  pin?: string;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const body = (await request.json()) as LoginBody;
    const name = (body.name || '').trim();
    const pin = body.pin || '';

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

    const result = await loginUserByName(
      env,
      name,
      pin,
      request.headers.get('CF-Connecting-IP') || 'unknown',
    );

    if (!result) {
      return new Response(JSON.stringify({ error: 'Invalid name or PIN' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        token: result.token,
        user: {
          id: result.user.id,
          name: result.user.name,
          role: result.user.role,
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': buildSessionCookie(result.token, isSecureRequest(request)),
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
