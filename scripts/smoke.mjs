const baseUrl = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:8788';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function getSessionCookie(response) {
  const raw = response.headers.get('set-cookie');
  if (!raw) return '';
  return raw.split(';')[0];
}

async function request(path, init = {}, cookie = '') {
  const headers = new Headers(init.headers || {});
  if (cookie) headers.set('Cookie', cookie);
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes((init.method || 'GET').toUpperCase())) {
    headers.set('Origin', new URL(baseUrl).origin);
  }
  const response = await fetch(`${baseUrl}${path}`, { ...init, headers });
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // ignore non-json responses
  }
  return { response, json, text };
}

async function main() {
  const email = `smoke-${Date.now()}@example.com`;
  const password = 'StrongPass1';

  const health = await request('/api/health');
  assert(health.response.status === 200, `/api/health returned ${health.response.status}`);
  assert(health.json?.status === 'healthy', `/api/health status=${health.json?.status}`);

  const signup = await request('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Smoke Agent', email, password }),
  });
  assert(signup.response.status === 201, `/api/auth/signup returned ${signup.response.status}`);
  const signupCookie = getSessionCookie(signup.response);
  assert(signupCookie.startsWith('kinsen_session='), 'Signup did not set session cookie');

  const login = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  assert(login.response.status === 200, `/api/auth/login returned ${login.response.status}`);
  const cookie = getSessionCookie(login.response);
  assert(cookie.startsWith('kinsen_session='), 'Login did not set session cookie');

  const me = await request('/api/auth/me', {}, cookie);
  assert(me.response.status === 200, `/api/auth/me returned ${me.response.status}`);
  assert(me.json?.user?.email === email, `Unexpected /api/auth/me email: ${me.json?.user?.email}`);

  const chat = await request(
    '/api/chat',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Smoke test: fuel policy' }),
    },
    cookie,
  );
  assert(chat.response.status === 200, `/api/chat returned ${chat.response.status}`);
  assert(typeof chat.json?.reply === 'string' && chat.json.reply.length > 0, 'Chat reply is empty');

  const logout = await request('/api/auth/logout', { method: 'POST' }, cookie);
  assert(logout.response.status === 200, `/api/auth/logout returned ${logout.response.status}`);

  const meAfterLogout = await request('/api/auth/me', {}, cookie);
  assert(
    meAfterLogout.response.status === 401,
    `/api/auth/me after logout returned ${meAfterLogout.response.status}`,
  );

  console.log('Smoke test passed:', {
    health: health.json.status,
    signup: signup.response.status,
    login: login.response.status,
    me: me.response.status,
    chat: chat.response.status,
    logout: logout.response.status,
  });
}

main().catch((error) => {
  console.error('Smoke test failed:', error.message);
  process.exit(1);
});
