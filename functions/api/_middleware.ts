// Middleware: auth check + rate limiting + RBAC for all /api/* routes
import type { Env, UserRole } from '../../src/lib/types';
import { parseCookies } from '../../src/lib/crypto';
import { hasPermission } from '../../src/lib/users';

const RATE_LIMIT_WINDOW = 60; // seconds
const RATE_LIMIT_MAX = 30; // requests per window
const BRUTE_FORCE_MAX = 5; // max failed auth attempts
const BRUTE_FORCE_WINDOW = 900; // 15 minute lockout

// Map URL paths to required permissions
function getRequiredPermission(path: string, method: string): string | null {
  if (path === '/api/auth' || path === '/api/health') return null; // public
  if (path.startsWith('/api/admin/seed')) return 'admin:seed';
  if (path.startsWith('/api/admin/knowledge')) {
    return method === 'GET' ? 'admin:knowledge:read' : 'admin:knowledge:write';
  }
  if (path.startsWith('/api/admin/analytics')) return 'admin:analytics';
  if (path.startsWith('/api/admin/users')) {
    return method === 'GET' ? 'admin:users:read' : 'admin:users:write';
  }
  if (path.startsWith('/api/admin/export')) return 'admin:export';
  if (path.startsWith('/api/admin/audit')) return 'admin:audit';
  if (path.startsWith('/api/admin/flags')) {
    return method === 'GET' ? 'admin:knowledge:read' : 'admin:settings';
  }
  if (path.startsWith('/api/admin/webhooks')) return 'admin:settings';
  if (path.startsWith('/api/admin/versions')) {
    return method === 'GET' ? 'admin:knowledge:read' : 'admin:knowledge:write';
  }
  if (path.startsWith('/api/admin/settings')) return 'admin:settings';
  if (path.startsWith('/api/feedback')) return 'feedback';
  if (path.startsWith('/api/macros')) return 'macros';
  if (path.startsWith('/api/checklists')) return 'checklists';
  if (path.startsWith('/api/workflows')) return 'chat';
  if (path.startsWith('/api/escalations')) return 'chat';
  if (path.startsWith('/api/customers')) return 'chat';
  if (path.startsWith('/api/vehicles')) return 'chat';
  if (path.startsWith('/api/fleet')) return 'chat';
  if (path.startsWith('/api/email')) return 'chat';
  if (path.startsWith('/api/notifications')) return 'chat';
  if (path.startsWith('/api/preferences')) return 'chat';
  if (path.startsWith('/api/suggest')) return 'chat';
  if (path.startsWith('/api/user-sessions')) return 'chat';
  return 'chat';
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);

  // CORS + security headers
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

  const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || 'unknown';

  // Rate limiting by IP
  const rateLimitKey = `ratelimit:${ip}:${Math.floor(Date.now() / (RATE_LIMIT_WINDOW * 1000))}`;
  try {
    const current = await env.KV.get(rateLimitKey);
    const count = current ? parseInt(current, 10) : 0;
    if (count >= RATE_LIMIT_MAX) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': String(RATE_LIMIT_WINDOW) },
      });
    }
    context.waitUntil(
      env.KV.put(rateLimitKey, String(count + 1), { expirationTtl: RATE_LIMIT_WINDOW * 2 })
    );
  } catch { /* allow through on KV error */ }

  // Brute-force protection for auth endpoint
  if (url.pathname === '/api/auth' && request.method === 'POST') {
    const bruteKey = `brute:${ip}`;
    const attempts = await env.KV.get(bruteKey);
    if (attempts && parseInt(attempts, 10) >= BRUTE_FORCE_MAX) {
      return new Response(JSON.stringify({ error: 'Too many failed attempts. Try again in 15 minutes.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
    if (url.pathname === '/api/auth' && response.status === 401) {
      const bruteKey = `brute:${ip}`;
      const attempts = await env.KV.get(bruteKey);
      const count = attempts ? parseInt(attempts, 10) : 0;
      context.waitUntil(env.KV.put(bruteKey, String(count + 1), { expirationTtl: BRUTE_FORCE_WINDOW }));
    } else if (url.pathname === '/api/auth' && response.status === 200) {
      // Reset brute force counter on success
      context.waitUntil(env.KV.delete(`brute:${ip}`));
    }

    return newResponse;
  }

  // Admin endpoints: check Authorization header first (API token)
  if (url.pathname.startsWith('/api/admin')) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader === `Bearer ${env.ADMIN_TOKEN}`) {
      // API token auth — full admin access, proceed
      const response = await context.next();
      const newResponse = new Response(response.body, response);
      for (const [key, value] of Object.entries(corsHeaders)) {
        newResponse.headers.set(key, value);
      }
      // Audit log
      logAudit(context, env, url.pathname, request.method, ip, 'api-token');
      return newResponse;
    }
  }

  // Session-based auth for all other endpoints
  const cookies = parseCookies(request.headers.get('Cookie'));
  const sessionToken = cookies['kinsen_session'];
  if (!sessionToken) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const session = await env.KV.get(`session:${sessionToken}`, 'json') as any;
  if (!session) {
    return new Response(JSON.stringify({ error: 'Session expired' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // RBAC check
  const userRole = (session.role || 'agent') as UserRole;
  if (!hasPermission(userRole, requiredPermission)) {
    return new Response(JSON.stringify({ error: 'Insufficient permissions', required: requiredPermission }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Pass user info to downstream handlers
  (context.data as Record<string, unknown>).user = {
    userId: session.userId || 'passcode-user',
    email: session.email,
    name: session.name || 'Staff',
    role: userRole,
  };

  // Audit log
  logAudit(context, env, url.pathname, request.method, ip, session.email || session.userId || 'passcode-user');

  const response = await context.next();
  const newResponse = new Response(response.body, response);
  for (const [key, value] of Object.entries(corsHeaders)) {
    newResponse.headers.set(key, value);
  }
  return newResponse;
};

function logAudit(
  context: EventContext<Env, any, any>,
  env: Env,
  path: string,
  method: string,
  ip: string,
  user: string
) {
  const auditEntry = JSON.stringify({
    ts: new Date().toISOString(),
    method,
    path,
    ip,
    user,
  });
  const auditKey = `audit:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  context.waitUntil(env.KV.put(auditKey, auditEntry, { expirationTtl: 86400 * 30 }));
}
