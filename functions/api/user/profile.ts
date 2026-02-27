import type { Env, UserProfile } from '../../../src/lib/types';
import { getUserById } from '../../../src/lib/users';

// GET /api/user/profile → get current user profile
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;
  const user = (context.data as Record<string, any>).user;

  if (!user?.userId) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const profileData = (await env.KV.get(`profile:${user.userId}`, 'json')) as UserProfile | null;
  const userData = await getUserById(env, user.userId);

  const profile: UserProfile = profileData || {
    userId: user.userId,
    name: userData?.name || user.name,
    avatar: userData?.avatar,
    preferences: {
      userId: user.userId,
      darkMode: false,
      compactMode: false,
      language: 'en',
    },
  };

  return new Response(JSON.stringify(profile), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

// PUT /api/user/profile → update name/avatar/preferences
export const onRequestPut: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const user = (context.data as Record<string, any>).user;

  if (!user?.userId) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = (await request.json()) as Partial<UserProfile>;

    const existing: UserProfile = ((await env.KV.get(
      `profile:${user.userId}`,
      'json',
    )) as UserProfile | null) || {
      userId: user.userId,
      name: user.name,
      avatar: undefined,
      preferences: {
        userId: user.userId,
        darkMode: false,
        compactMode: false,
        language: 'en' as const,
      },
    };

    if (body.name) existing.name = body.name.trim();
    if (body.avatar !== undefined) existing.avatar = body.avatar;
    if (body.preferences) {
      existing.preferences = { ...existing.preferences, ...body.preferences };
    }

    await env.KV.put(`profile:${user.userId}`, JSON.stringify(existing));

    // Also update the user record name if changed
    if (body.name) {
      const userData = await getUserById(env, user.userId);
      if (userData) {
        userData.name = body.name.trim();
        if (body.avatar !== undefined) userData.avatar = body.avatar;
        await env.KV.put(`user:${user.userId}`, JSON.stringify(userData));
      }
    }

    return new Response(JSON.stringify({ ok: true, profile: existing }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
