import type { Env, UserPreferences } from '../../src/lib/types';

const DEFAULT_PREFS: Omit<UserPreferences, 'userId'> = {
  darkMode: false,
  compactMode: false,
  language: 'en',
};

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const user = (ctx.data as Record<string, unknown>).user as { userId: string } | undefined;
  const userId = user?.userId || 'anonymous';

  const raw = await ctx.env.KV.get(`preferences:${userId}`);
  if (raw) {
    return new Response(raw, { headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ userId, ...DEFAULT_PREFS }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const onRequestPut: PagesFunction<Env> = async (ctx) => {
  const user = (ctx.data as Record<string, unknown>).user as { userId: string } | undefined;
  const userId = user?.userId || 'anonymous';
  const body = (await ctx.request.json()) as Partial<UserPreferences>;

  const raw = await ctx.env.KV.get(`preferences:${userId}`);
  const current: UserPreferences = raw ? JSON.parse(raw) : { userId, ...DEFAULT_PREFS };

  if (body.darkMode !== undefined) current.darkMode = body.darkMode;
  if (body.compactMode !== undefined) current.compactMode = body.compactMode;
  if (body.language) current.language = body.language;

  await ctx.env.KV.put(`preferences:${userId}`, JSON.stringify(current));
  return new Response(JSON.stringify({ ok: true, preferences: current }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
