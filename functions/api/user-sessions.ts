import type { Env } from '../../src/lib/types';

// Session management: list active sessions, revoke sessions

export const onRequestGet: PagesFunction<Env> = async ({ request, env, data }) => {
  const user = (data as any).user;
  if (!user?.userId) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // List sessions for current user (stored with user reference)
  const sessionList = await env.KV.list({ prefix: 'session:', limit: 50 });
  const sessions: Array<{
    token: string;
    ip: string;
    createdAt: string;
    current: boolean;
  }> = [];

  const cookie = request.headers.get('Cookie') || '';
  const currentToken = cookie.match(/kinsen_session=([^;]+)/)?.[1] || '';

  for (const key of sessionList.keys) {
    const session = await env.KV.get(key.name, 'json') as any;
    if (session && (session.userId === user.userId || session.email === user.email)) {
      const token = key.name.replace('session:', '');
      sessions.push({
        token: token.slice(0, 8) + '…',
        ip: session.ip || 'unknown',
        createdAt: session.createdAt,
        current: token === currentToken,
      });
    }
  }

  return Response.json(sessions);
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, data }) => {
  const user = (data as any).user;
  if (!user?.userId) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const url = new URL(request.url);
  const tokenPrefix = url.searchParams.get('token'); // First 8 chars

  if (tokenPrefix === 'all') {
    // Revoke all sessions for this user (except current)
    const cookie = request.headers.get('Cookie') || '';
    const currentToken = cookie.match(/kinsen_session=([^;]+)/)?.[1] || '';

    const sessionList = await env.KV.list({ prefix: 'session:', limit: 50 });
    let revoked = 0;
    for (const key of sessionList.keys) {
      const session = await env.KV.get(key.name, 'json') as any;
      const token = key.name.replace('session:', '');
      if (session && (session.userId === user.userId || session.email === user.email) && token !== currentToken) {
        await env.KV.delete(key.name);
        revoked++;
      }
    }
    return Response.json({ revoked });
  }

  if (!tokenPrefix) {
    return Response.json({ error: 'Token prefix required' }, { status: 400 });
  }

  // Revoke specific session by prefix match
  const sessionList = await env.KV.list({ prefix: 'session:', limit: 50 });
  for (const key of sessionList.keys) {
    const token = key.name.replace('session:', '');
    if (token.startsWith(tokenPrefix)) {
      const session = await env.KV.get(key.name, 'json') as any;
      if (session && (session.userId === user.userId || session.email === user.email)) {
        await env.KV.delete(key.name);
        return Response.json({ revoked: 1 });
      }
    }
  }

  return Response.json({ error: 'Session not found' }, { status: 404 });
};
