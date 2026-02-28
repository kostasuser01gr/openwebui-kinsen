import type { Env } from '../../../src/lib/types';
import {
  clearSessionCookie,
  deleteSessionBySignedToken,
  getSignedTokenFromRequest,
  isSecureRequest,
} from '../../lib/auth-session';
import { writeAudit } from '../../../src/lib/audit';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const signedToken = getSignedTokenFromRequest(request);
  const user = (context.data as Record<string, unknown>).user as
    | { userId: string; name: string }
    | undefined;

  if (signedToken) {
    await deleteSessionBySignedToken(env, signedToken);
  }

  if (user) {
    context.waitUntil(
      writeAudit(env, { id: user.userId, name: user.name }, 'auth.logout', {
        ip: request.headers.get('CF-Connecting-IP') ?? undefined,
      }),
    );
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': clearSessionCookie(isSecureRequest(request)),
    },
  });
};
