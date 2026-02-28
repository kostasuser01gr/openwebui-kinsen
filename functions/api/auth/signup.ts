import type { Env } from '../../../src/lib/types';
import { createUser, getAllUsers, isValidPin } from '../../../src/lib/users';
import { buildSessionCookie, createSession, isSecureRequest } from '../../lib/auth-session';
import { writeAudit } from '../../../src/lib/audit';

interface SignupBody {
  displayName?: string;
  pin?: string;
  confirmPin?: string;
  inviteCode?: string;
}

// POST /api/auth/signup  — PUBLIC (no auth required)
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';

  try {
    // ── Signup mode gate ──────────────────────────────────
    const signupMode = (env.SIGNUP_MODE ?? 'open').toLowerCase();

    if (signupMode === 'admin_only') {
      return new Response(
        JSON.stringify({
          error: 'Public sign-up is disabled. Contact an administrator to create your account.',
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // ── Parse + validate inputs ───────────────────────────
    const body = (await request.json()) as SignupBody;
    const displayName = (body.displayName ?? '').trim();
    const pin = body.pin ?? '';
    const confirmPin = body.confirmPin ?? '';
    const inviteCode = (body.inviteCode ?? '').trim();

    if (!displayName) {
      return new Response(JSON.stringify({ error: 'Display name is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (displayName.length < 2 || displayName.length > 50) {
      return new Response(
        JSON.stringify({ error: 'Display name must be between 2 and 50 characters' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    if (!isValidPin(pin)) {
      return new Response(JSON.stringify({ error: 'PIN must be exactly 4 digits' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (pin !== confirmPin) {
      return new Response(JSON.stringify({ error: 'PINs do not match' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ── Invite code check (invite_only mode) ──────────────
    if (signupMode === 'invite_only') {
      const expectedCode = env.INVITE_CODE ?? '';
      if (!expectedCode || inviteCode !== expectedCode) {
        return new Response(JSON.stringify({ error: 'Invalid or missing invite code' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // ── Duplicate name check ──────────────────────────────
    const existingUsers = await getAllUsers(env);
    const isDuplicate = existingUsers.some(
      (u) => u.name.toLowerCase() === displayName.toLowerCase(),
    );

    if (isDuplicate) {
      return new Response(
        JSON.stringify({ error: 'A user with that name already exists. Choose another.' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // ── Create user ───────────────────────────────────────
    const user = await createUser(env, displayName, 'user', pin);

    // ── Auto sign-in: issue session ───────────────────────
    const session = {
      userId: user.id,
      name: user.name,
      role: user.role,
      createdAt: new Date().toISOString(),
      ip,
    };

    const signedToken = await createSession(env, session);

    context.waitUntil(
      writeAudit(env, { id: user.id, name: user.name }, 'auth.signup', {
        ip,
        ua: request.headers.get('User-Agent') ?? undefined,
        meta: { signupMode },
      }),
    );

    return new Response(
      JSON.stringify({
        ok: true,
        token: signedToken,
        user: { id: user.id, name: user.name, role: user.role },
      }),
      {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': buildSessionCookie(signedToken, isSecureRequest(request)),
        },
      },
    );
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
