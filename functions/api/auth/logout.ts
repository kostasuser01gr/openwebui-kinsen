import type { Env } from '../../../src/lib/types';
import {
  clearSessionCookie,
  getSessionTokenFromRequest,
  isSecureRequest,
} from '../../lib/auth-session';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const token = getSessionTokenFromRequest(request);
  if (token) {
    await env.KV.delete(`session:${token}`);
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': clearSessionCookie(isSecureRequest(request)),
    },
  });
};
