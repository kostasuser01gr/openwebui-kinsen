import type { Env } from '../../../src/lib/types';
import { DEFAULT_PASSWORD_POLICY, validatePassword } from '../../../src/lib/errors';
import { createUser, getUserByEmail } from '../../../src/lib/users';
import { buildSessionCookie, createSession, isSecureRequest } from '../../lib/auth-session';

interface SignupBody {
  name?: string;
  email?: string;
  password?: string;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const body = (await request.json()) as SignupBody;
    const name = (body.name || '').trim();
    const email = (body.email || '').trim().toLowerCase();
    const password = body.password || '';

    if (!name || !email || !password) {
      return new Response(JSON.stringify({ error: 'name, email, and password are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email address' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const passwordValidation = validatePassword(password, DEFAULT_PASSWORD_POLICY);
    if (!passwordValidation.valid) {
      return new Response(
        JSON.stringify({
          error: 'Password does not meet policy requirements',
          details: passwordValidation.errors,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    const existing = await getUserByEmail(env, email);
    if (existing) {
      return new Response(JSON.stringify({ error: 'User already exists' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const created = await createUser(env, email, name, password, 'agent');
    const token = await createSession(env, {
      userId: created.id,
      email: created.email,
      name: created.name,
      role: created.role,
      createdAt: new Date().toISOString(),
      ip: request.headers.get('CF-Connecting-IP') || 'unknown',
    });

    return new Response(
      JSON.stringify({
        ok: true,
        user: { name: created.name, email: created.email, role: created.role },
      }),
      {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': buildSessionCookie(token, isSecureRequest(request)),
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
