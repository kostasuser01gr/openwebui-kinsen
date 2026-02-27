import type { Env } from '../../src/lib/types';
import { sha256, generateSessionId } from '../../src/lib/crypto';
import { loginUser } from '../../src/lib/users';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const body = await request.json() as {
      passcode?: string;
      email?: string;
      password?: string;
    };

    const url = new URL(request.url);
    const isSecure = url.protocol === 'https:';
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';

    // Mode 1: Individual user login (email + password)
    if (body.email && body.password) {
      const result = await loginUser(env, body.email, body.password, ip);
      if (!result) {
        return new Response(JSON.stringify({ error: 'Invalid email or password' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        ok: true,
        user: { name: result.session.name, email: result.session.email, role: result.session.role },
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': `kinsen_session=${result.token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400${isSecure ? '; Secure' : ''}`,
        },
      });
    }

    // Mode 2: Shared passcode login (legacy/simple mode)
    if (body.passcode) {
      const hash = await sha256(body.passcode);
      if (hash !== env.PASSCODE_HASH) {
        return new Response(JSON.stringify({ error: 'Invalid passcode' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const sessionId = generateSessionId();
      const sessionData = JSON.stringify({
        createdAt: new Date().toISOString(),
        ip,
        role: 'agent', // passcode users get agent role
      });

      await env.KV.put(`session:${sessionId}`, sessionData, { expirationTtl: 86400 });

      return new Response(JSON.stringify({ ok: true, user: { name: 'Staff', role: 'agent' } }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': `kinsen_session=${sessionId}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400${isSecure ? '; Secure' : ''}`,
        },
      });
    }

    return new Response(JSON.stringify({ error: 'Provide passcode or email+password' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Bad request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
