// User preferences API
import type { Env, UserPreferences } from '../../src/lib/types';

const DEFAULT_PREFS: Omit<UserPreferences, 'userId'> = {
  pinnedMacros: [],
  recentSearches: [],
  language: 'en',
  compactMode: false,
  notificationsEnabled: true,
};

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const user = (ctx.data as Record<string, unknown>).user as { userId: string } | undefined;
  const userId = user?.userId || 'anonymous';

  const raw = await ctx.env.KV.get(`preferences:${userId}`);
  if (raw) return new Response(raw);

  return new Response(JSON.stringify({ userId, ...DEFAULT_PREFS }));
};

export const onRequestPut: PagesFunction<Env> = async (ctx) => {
  const user = (ctx.data as Record<string, unknown>).user as { userId: string } | undefined;
  const userId = user?.userId || 'anonymous';
  const body = (await ctx.request.json()) as Partial<UserPreferences>;

  const raw = await ctx.env.KV.get(`preferences:${userId}`);
  const current: UserPreferences = raw ? JSON.parse(raw) : { userId, ...DEFAULT_PREFS };

  if (body.pinnedMacros !== undefined) current.pinnedMacros = body.pinnedMacros;
  if (body.recentSearches !== undefined) {
    current.recentSearches = body.recentSearches.slice(0, 20);
  }
  if (body.language) current.language = body.language;
  if (body.defaultBranch !== undefined) current.defaultBranch = body.defaultBranch;
  if (body.compactMode !== undefined) current.compactMode = body.compactMode;
  if (body.notificationsEnabled !== undefined)
    current.notificationsEnabled = body.notificationsEnabled;

  await ctx.env.KV.put(`preferences:${userId}`, JSON.stringify(current));
  return new Response(JSON.stringify({ ok: true, preferences: current }));
};
