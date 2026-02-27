import type { Env } from '../../../src/lib/types';

// GET: export full KV backup as JSON
export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const backup: Record<string, any> = { exportedAt: new Date().toISOString(), data: {} };

  // Export knowledge notes
  const noteIndex = await env.KV.get('knowledge:index', 'json') as string[] | null;
  if (noteIndex) {
    const notes = await Promise.all(noteIndex.map(id => env.KV.get(`knowledge:${id}`, 'json')));
    backup.data.knowledge = { index: noteIndex, notes: notes.filter(Boolean) };
  }

  // Export users (without password hashes)
  const userIndex = await env.KV.get('user:index', 'json') as string[] | null;
  if (userIndex) {
    const users = await Promise.all(userIndex.map(id => env.KV.get(`user:${id}`, 'json')));
    backup.data.users = users.filter(Boolean).map((u: any) => {
      const { passwordHash, ...safe } = u;
      return safe;
    });
  }

  // Export recent analytics
  const today = new Date();
  const analytics: any[] = [];
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().slice(0, 10);
    const count = await env.KV.get(`analytics:daily:${dateStr}`);
    if (count) analytics.push({ date: dateStr, messages: parseInt(count, 10) });
  }
  backup.data.analytics = analytics;

  return new Response(JSON.stringify(backup, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="kinsen-backup-${today.toISOString().slice(0, 10)}.json"`,
    },
  });
};
