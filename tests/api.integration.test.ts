import { describe, expect, it } from 'vitest';
import type { Env } from '../src/lib/types';
import { createMockEnv } from './helpers/mock-env';

import { onRequest as middleware } from '../functions/api/_middleware';
import { onRequestGet as healthGet } from '../functions/api/health';
import { onRequestPost as authLegacyPost } from '../functions/api/auth';
import { onRequestPost as authSignupPost } from '../functions/api/auth/signup';
import { onRequestPost as authLoginPost } from '../functions/api/auth/login';
import { onRequestPost as authLogoutPost } from '../functions/api/auth/logout';
import { onRequestGet as authMeGet } from '../functions/api/auth/me';
import { onRequestPost as chatPost } from '../functions/api/chat';

type Handler = (ctx: any) => Promise<Response>;

const ROUTES: Record<string, Handler> = {
  'GET /api/health': healthGet as Handler,
  'POST /api/auth': authLegacyPost as Handler,
  'POST /api/auth/signup': authSignupPost as Handler,
  'POST /api/auth/login': authLoginPost as Handler,
  'POST /api/auth/logout': authLogoutPost as Handler,
  'GET /api/auth/me': authMeGet as Handler,
  'POST /api/chat': chatPost as Handler,
};

async function dispatch(ctx: any): Promise<Response> {
  const url = new URL(ctx.request.url);
  const key = `${ctx.request.method.toUpperCase()} ${url.pathname}`;
  const handler = ROUTES[key];
  if (!handler) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return handler(ctx);
}

async function invoke(
  env: Env,
  pathname: string,
  init?: RequestInit,
  opts?: { cookie?: string; origin?: string },
): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (opts?.cookie) headers.set('Cookie', opts.cookie);
  if (opts?.origin) headers.set('Origin', opts.origin);
  const req = new Request(`https://app.local${pathname}`, { ...init, headers });

  const ctx: any = {
    request: req,
    env,
    data: {},
    waitUntil: (_promise: Promise<unknown>) => undefined,
    next: async () => dispatch(ctx),
  };

  return middleware(ctx);
}

function extractSessionCookie(response: Response): string {
  const raw = response.headers.get('Set-Cookie');
  return raw ? raw.split(';')[0] : '';
}

describe('API integration (middleware + handlers)', () => {
  it('returns health payload', async () => {
    const env = createMockEnv();
    const response = await invoke(env, '/api/health', { method: 'GET' });
    expect(response.status).toBe(200);
    const data = (await response.json()) as { status: string };
    expect(data.status).toBe('healthy');
  });

  it('supports signup -> me -> logout flow with cookie session', async () => {
    const env = createMockEnv();
    const user = {
      name: 'Agent One',
      email: 'agent.one@example.com',
      password: 'StrongPass1',
    };

    const signup = await invoke(
      env,
      '/api/auth/signup',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user),
      },
      { origin: 'https://app.local' },
    );
    expect(signup.status).toBe(201);

    const sessionCookie = extractSessionCookie(signup);
    expect(sessionCookie.startsWith('kinsen_session=')).toBe(true);

    const me = await invoke(env, '/api/auth/me', { method: 'GET' }, { cookie: sessionCookie });
    expect(me.status).toBe(200);
    const meBody = (await me.json()) as { ok?: boolean; user?: { email?: string } };
    expect(meBody.ok).toBe(true);
    expect(meBody.user?.email).toBe(user.email);

    const logout = await invoke(
      env,
      '/api/auth/logout',
      { method: 'POST' },
      { cookie: sessionCookie, origin: 'https://app.local' },
    );
    expect(logout.status).toBe(200);

    const meAfterLogout = await invoke(
      env,
      '/api/auth/me',
      { method: 'GET' },
      { cookie: sessionCookie },
    );
    expect(meAfterLogout.status).toBe(401);
  });

  it('supports login -> chat happy path', async () => {
    const env = createMockEnv();
    const user = {
      name: 'Agent Two',
      email: 'agent.two@example.com',
      password: 'StrongPass2',
    };

    const signup = await invoke(
      env,
      '/api/auth/signup',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user),
      },
      { origin: 'https://app.local' },
    );
    expect(signup.status).toBe(201);

    const login = await invoke(
      env,
      '/api/auth/login',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, password: user.password }),
      },
      { origin: 'https://app.local' },
    );

    expect(login.status).toBe(200);
    const sessionCookie = extractSessionCookie(login);
    expect(sessionCookie.startsWith('kinsen_session=')).toBe(true);

    const chat = await invoke(
      env,
      '/api/chat',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'What is the late return policy?' }),
      },
      { cookie: sessionCookie, origin: 'https://app.local' },
    );
    expect(chat.status).toBe(200);
    const chatBody = (await chat.json()) as { reply?: string };
    expect(typeof chatBody.reply).toBe('string');
    expect(chatBody.reply?.length).toBeGreaterThan(0);
  });

  it('blocks cross-origin mutation requests', async () => {
    const env = createMockEnv();
    const response = await invoke(
      env,
      '/api/auth/login',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'fake@example.com', password: 'x' }),
      },
      { origin: 'https://attacker.example' },
    );
    expect(response.status).toBe(403);
  });
});
