// Middleware: auth check + rate limiting + RBAC for all /api/* routes
import type { Env, UserRole } from '../../src/lib/types';
import { parseCookies } from '../../src/lib/crypto';
import { hasPermission } from '../../src/lib/users';

const RATE_LIMIT_WINDOW = 60; // seconds
const RATE_LIMIT_MAX = 30;
const AUTH_RATE_LIMIT_MAX = 12;
const BRUTE_FORCE_MAX = 5;
const BRUTE_FORCE_WINDOW = 900; // 15 minute lockout

// Map URL paths to required permissions
function getRequiredPermission(path: string, method: string): string | null {
  if (path === '/api/health') return null;
  if (path.startsWith('/api/auth/login')) return null;
  if (path.startsWith('/api/auth/me') || path.startsWith('/api/auth/logout')) return 'chat';
  if (path.startsWith('/api/admin/users')) {
    return method === 'GET' ? 'admin:users:read' : 'admin:users:write';
  }
  if (path === '/api/users' && method === 'POST') return 'admin:users:write';
  if (path.startsWith('/api/users/')) return 'chat';
  if (path === '/api/chat/lock' || path === '/api/chat/unlock') return 'chat:lock';
  if (path === '/api/chat/history') return 'chat:history';
  if (path === '/api/chat/save') return 'chat:save';
  if (path === '/api/chat/sessions') return 'chat';
  if (path === '/api/chat') return 'chat';
  if (path === '/api/shortcuts' && method === 'GET') return 'shortcuts';
  if (path === '/api/shortcuts' && method === 'POST') return 'shortcuts';
  if (path.startsWith('/api/shortcuts/') && method === 'DELETE') return 'shortcuts';
  if (path.startsWith('/api/user/profile')) return 'user:profile';
  if (path.startsWith('/api/notifications')) return 'chat';
  if (path.startsWith('/api/preferences')) return 'chat';
  if (path.startsWith('/api/sessions')) return 'admin:sessions';
  return 'chat';
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const isAuthEndpoint = url.pathname.startsWith('/api/auth/login');

  // CORS + security headers
  const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Origin': url.origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy':
      "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const ip =
    request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || 'unknown';

  // Enforce same-origin for state-changing requests
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    const origin = request.headers.get('Origin');
    if (origin && origin !== url.origin) {
      return new Response(JSON.stringify({ error: 'Cross-origin request blocked' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  // Rate limiting by IP
  const rateLimitCap = isAuthEndpoint ? AUTH_RATE_LIMIT_MAX : RATE_LIMIT_MAX;
  const rateBucket = Math.floor(Date.now() / (RATE_LIMIT_WINDOW * 1000));
  const rateLimitKey = `ratelimit:${isAuthEndpoint ? 'auth' : 'api'}:${ip}:${rateBucket}`;
  try {
    const current = await env.KV.get(rateLimitKey);
    const count = current ? parseInt(current, 10) : 0;
    if (count >= rateLimitCap) {
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
      env.KV.put(rateLimitKey, String(count + 1), { expirationTtl: RATE_LIMIT_WINDOW * 2 }),
    );
  } catch {
    /* allow through on KV error */
  }

  // Brute-force protection for auth endpoint
  if (isAuthEndpoint && request.method === 'POST') {
    const bruteKey = `brute:${ip}`;
    const attempts = await env.KV.get(bruteKey);
    if (attempts && parseInt(attempts, 10) >= BRUTE_FORCE_MAX) {
      return new Response(
        JSON.stringify({ error: 'Too many failed attempts. Try again in 15 minutes.' }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }
  }

  // Determine required permission for this route
  const requiredPermission = getRequiredPermission(url.pathname, request.method);

  // Public endpoints: no auth needed
  if (requiredPermission === null) {
    const response = await context.next();
    const newResponse = new Response(response.body, response);
    for (const [key, value] of Object.entries(corsHeaders)) {
      newResponse.headers.set(key, value);
    }

    // Track failed auth attempts
    if (isAuthEndpoint && response.status === 401) {
      const bruteKey = `brute:${ip}`;
      const attempts = await env.KV.get(bruteKey);
      const count = attempts ? parseInt(attempts, 10) : 0;
      context.waitUntil(
        env.KV.put(bruteKey, String(count + 1), { expirationTtl: BRUTE_FORCE_WINDOW }),
      );
    } else if (isAuthEndpoint && response.status >= 200 && response.status < 300) {
      context.waitUntil(env.KV.delete(`brute:${ip}`));
    }

    return newResponse;
  }

  // Resolve session token from: Authorization Bearer header → cookie fallback
  const authHeader = request.headers.get('Authorization');
  let sessionToken: string | null = null;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    // Check if it's the static ADMIN_TOKEN (admin API automation)
    if (
      token === env.ADMIN_TOKEN &&
      (url.pathname.startsWith('/api/admin') || url.pathname === '/api/users')
    ) {
      const response = await context.next();
      const newResponse = new Response(response.body, response);
      for (const [key, value] of Object.entries(corsHeaders)) {
        newResponse.headers.set(key, value);
      }
      return newResponse;
    }
    // Otherwise treat as user session token
    sessionToken = token;
  }

  // Fallback to cookie-based session
  if (!sessionToken) {
    const cookies = parseCookies(request.headers.get('Cookie'));
    sessionToken = cookies['kinsen_session'] || null;
  }

  if (!sessionToken) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const session = (await env.KV.get(`session:${sessionToken}`, 'json')) as any;
  if (!session) {
    return new Response(JSON.stringify({ error: 'Session expired' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // RBAC check
  const userRole = (session.role || 'user') as UserRole;
  if (!hasPermission(userRole, requiredPermission)) {
    return new Response(
      JSON.stringify({ error: 'Insufficient permissions', required: requiredPermission }),
      {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }

  // Pass user info to downstream handlers
  (context.data as Record<string, unknown>).user = {
    userId: session.userId,
    name: session.name || 'User',
    role: userRole,
  };

  const response = await context.next();
  const newResponse = new Response(response.body, response);
  for (const [key, value] of Object.entries(corsHeaders)) {
    newResponse.headers.set(key, value);
  }
  return newResponse;
};
