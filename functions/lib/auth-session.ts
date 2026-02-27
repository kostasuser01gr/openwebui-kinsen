import type { Env, UserSession } from '../../src/lib/types';
import { generateSessionId, parseCookies } from '../../src/lib/crypto';

export function isSecureRequest(request: Request): boolean {
  const url = new URL(request.url);
  return url.protocol === 'https:';
}

export function buildSessionCookie(token: string, secure: boolean): string {
  return `kinsen_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400${secure ? '; Secure' : ''}`;
}

export function clearSessionCookie(secure: boolean): string {
  return `kinsen_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure ? '; Secure' : ''}`;
}

export function getSessionTokenFromRequest(request: Request): string | null {
  const cookies = parseCookies(request.headers.get('Cookie'));
  return cookies.kinsen_session || null;
}

export async function createSession(env: Env, session: UserSession): Promise<string> {
  const token = generateSessionId();
  await env.KV.put(`session:${token}`, JSON.stringify(session), { expirationTtl: 86400 });
  return token;
}

export async function getSessionFromRequest(
  request: Request,
  env: Env,
): Promise<UserSession | null> {
  const token = getSessionTokenFromRequest(request);
  if (!token) return null;
  return env.KV.get(`session:${token}`, 'json') as Promise<UserSession | null>;
}
