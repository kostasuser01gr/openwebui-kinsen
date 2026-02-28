import type { Env, UserSession } from '../../src/lib/types';
import { generateSessionId, signToken, verifyToken, parseCookies } from '../../src/lib/crypto';

const SESSION_TTL = 86400; // 24 hours
const COOKIE_NAME = 'kinsen_session';

export function isSecureRequest(request: Request): boolean {
  return new URL(request.url).protocol === 'https:';
}

export function buildSessionCookie(signedToken: string, secure = true): string {
  return [
    `${COOKIE_NAME}=${signedToken}`,
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${SESSION_TTL}`,
    'Path=/',
    ...(secure ? ['Secure'] : []),
  ].join('; ');
}

export function clearSessionCookie(secure = true): string {
  return [
    `${COOKIE_NAME}=`,
    'HttpOnly',
    'SameSite=Strict',
    'Max-Age=0',
    'Path=/',
    ...(secure ? ['Secure'] : []),
  ].join('; ');
}

/** Create session in KV; return signed token for transport */
export async function createSession(env: Env, session: UserSession): Promise<string> {
  const rawToken = generateSessionId();
  await env.KV.put(`session:${rawToken}`, JSON.stringify(session), {
    expirationTtl: SESSION_TTL,
  });
  return signToken(rawToken, env.SESSION_SIGNING_SECRET);
}

/** Extract signed token from Authorization Bearer header, then cookie fallback */
export function getSignedTokenFromRequest(request: Request): string | null {
  const auth = request.headers.get('Authorization');
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  const cookies = parseCookies(request.headers.get('Cookie'));
  return cookies[COOKIE_NAME] ?? null;
}

/** Verify signature + KV lookup → UserSession or null */
export async function getSessionFromSignedToken(
  env: Env,
  signedToken: string,
): Promise<UserSession | null> {
  const rawToken = await verifyToken(signedToken, env.SESSION_SIGNING_SECRET);
  if (!rawToken) return null;
  return env.KV.get(`session:${rawToken}`, 'json') as Promise<UserSession | null>;
}

/** Delete KV session (logout) */
export async function deleteSessionBySignedToken(env: Env, signedToken: string): Promise<void> {
  const rawToken = await verifyToken(signedToken, env.SESSION_SIGNING_SECRET);
  if (rawToken) await env.KV.delete(`session:${rawToken}`);
}

// ── Legacy shims (keep middleware working) ─────────────────
export function getSessionTokenFromRequest(request: Request): string | null {
  return getSignedTokenFromRequest(request);
}

export async function getSessionFromRequest(
  request: Request,
  env: Env,
): Promise<UserSession | null> {
  const token = getSignedTokenFromRequest(request);
  if (!token) return null;
  return getSessionFromSignedToken(env, token);
}
