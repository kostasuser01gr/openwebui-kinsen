// Central middleware: auth, RBAC, rate-limiting, brute-force, CORS
import type { Env, UserRole } from '../../src/lib/types';
import { getSignedTokenFromRequest, getSessionFromSignedToken } from '../lib/auth-session';
import { hasPermission } from '../../src/lib/users';

const RATE_LIMIT_WINDOW = 60;
const RATE_LIMIT_MAX = 30;
const AUTH_RATE_LIMIT_MAX = 12;
const BRUTE_FORCE_MAX = 5;
const BRUTE_FORCE_WINDOW = 900;

function getRequiredPermission(path: string, method: string): string | null {
  // Public
  if (path === '/api/health') return null;
  if (path === '/api/auth/login') return null;

  // Auth-only (any logged-in user)
  if (path.startsWith('/api/auth/')) return 'chat';

  // Threads
  if (/^\/api\/threads\/[^/]+\/lock$/.test(path)) return 'chat:lock';
  if (/^\/api\/threads\/[^/]+\/unlock$/.test(path)) return 'chat:lock';
  if (path.startsWith('/api/threads')) return 'chat';

  // Rooms
  if (path === '/api/rooms' && method === 'POST') return 'admin:users:write';
  if (path.startsWith('/api/rooms')) return 'chat';

  // Macros
  if (path.startsWith('/api/macros')) return 'shortcuts';

  // User profile & PIN change
  if (path === '/api/user/pin') return 'user:profile';
  if (path.startsWith('/api/user/')) return 'user:profile';

  // Admin
  if (/^\/api\/admin\/users\/[^/]+\/reset-pin$/.test(path)) return 'admin:users:write';
  if (path.startsWith('/api/admin/users') && method === 'GET') return 'admin:users:read';
  if (path.startsWith('/api/admin/users')) return 'admin:users:write';
  if (path.startsWith('/api/admin/audit')) return 'admin:sessions';
  if (path.startsWith('/api/admin')) return 'admin:users:read';

  // Users
  if (path === '/api/users' && method === 'POST') return 'admin:users:write';
  if (path.startsWith('/api/users/')) return 'chat';

  // Sessions list
  if (path.startsWith('/api/sessions')) return 'admin:sessions';

  // Legacy chat (keep working)
  if (path === '/api/chat/lock' || path === '/api/chat/unlock') return 'chat:lock';
  if (path.startsWith('/api/chat')) return 'chat';

  // Shortcuts (legacy)
  if (path.startsWith('/api/shortcuts')) return 'shortcuts';

  return 'chat';
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const isAuthEndpoint = url.pathname === '/api/auth/login';

  const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Origin': url.origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const ip =
    request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || 'unknown';

  // CSRF: block cross-origin state-changing requests
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    const origin = request.headers.get('Origin');
    if (origin && origin !== url.origin) {
      return new Response(JSON.stringify({ error: 'Cross-origin request blocked' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  // IP-based rate limiting
  const rateCap = isAuthEndpoint ? AUTH_RATE_LIMIT_MAX : RATE_LIMIT_MAX;
  const bucket = Math.floor(Date.now() / (RATE_LIMIT_WINDOW * 1000));
  const rlKey = `ratelimit:${isAuthEndpoint ? 'auth' : 'api'}:${ip}:${bucket}`;
  try {
    const cur = await env.KV.get(rlKey);
    const count = cur ? parseInt(cur, 10) : 0;
    if (count >= rateCap) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }), {
        status: 429,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Retry-After': String(RATE_LIMIT_WINDOW),
        },
      });
    }
    context.waitUntil(
      env.KV.put(rlKey, String(count + 1), { expirationTtl: RATE_LIMIT_WINDOW * 2 }),
    );
  } catch {
    /* allow through on KV error */
  }

  // Brute-force protection on login
  if (isAuthEndpoint && request.method === 'POST') {
    const maxAttempts = parseInt(env.RATE_LIMIT_MAX_ATTEMPTS ?? '5', 10);
    const bruteKey = `brute:${ip}`;
    const attempts = await env.KV.get(bruteKey);
    if (attempts && parseInt(attempts, 10) >= maxAttempts) {
      return new Response(
        JSON.stringify({ error: 'Too many failed attempts. Try again in 15 minutes.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
  }

  const requiredPermission = getRequiredPermission(url.pathname, request.method);

  // Public endpoint: passthrough
  if (requiredPermission === null) {
    const response = await context.next();
    const r = new Response(response.body, response);
    for (const [k, v] of Object.entries(corsHeaders)) r.headers.set(k, v);

    // Track brute-force attempts
    if (isAuthEndpoint && response.status === 401) {
      const bruteKey = `brute:${ip}`;
      const cur = await env.KV.get(bruteKey);
      const n = cur ? parseInt(cur, 10) : 0;
      context.waitUntil(env.KV.put(bruteKey, String(n + 1), { expirationTtl: BRUTE_FORCE_WINDOW }));
    } else if (isAuthEndpoint && response.status < 400) {
      context.waitUntil(env.KV.delete(`brute:${ip}`));
    }

    return r;
  }

  // Resolve signed session token
  const signedToken = getSignedTokenFromRequest(request);

  // Static ADMIN_TOKEN break-glass (admin/user endpoints only)
  if (
    signedToken &&
    env.ADMIN_TOKEN &&
    signedToken === env.ADMIN_TOKEN &&
    (url.pathname.startsWith('/api/admin') || url.pathname === '/api/users')
  ) {
    const response = await context.next();
    const r = new Response(response.body, response);
    for (const [k, v] of Object.entries(corsHeaders)) r.headers.set(k, v);
    return r;
  }

  if (!signedToken) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Validate signed token + KV session
  const session = await getSessionFromSignedToken(env, signedToken);
  if (!session) {
    return new Response(JSON.stringify({ error: 'Session expired or invalid' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // RBAC check
  const role = session.role as UserRole;
  if (!hasPermission(role, requiredPermission)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Inject session into context for handlers
  (context.data as Record<string, unknown>).user = session;
  (context.data as Record<string, unknown>).signedToken = signedToken;
  (context.data as Record<string, unknown>).ip = ip;

  const response = await context.next();
  const r = new Response(response.body, response);
  for (const [k, v] of Object.entries(corsHeaders)) r.headers.set(k, v);
  return r;
};
