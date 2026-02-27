// Notification API — GET list, POST mark read
import type { Env, Notification } from '../../src/lib/types';

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const user = (ctx.data as Record<string, unknown>).user as { userId: string; role: string } | undefined;
  const userId = user?.userId || 'anonymous';
  const role = user?.role || 'agent';

  // Get personal + role-based notifications
  const targets = [userId];
  if (role === 'supervisor' || role === 'manager' || role === 'admin') targets.push('__supervisors__');
  if (role === 'manager' || role === 'admin') targets.push('__managers__');
  if (role === 'admin') targets.push('__admins__');
  targets.push('__all__');

  const notifications: Notification[] = [];
  for (const target of targets) {
    const indexRaw = await ctx.env.KV.get(`notification:index:${target}`);
    const ids: string[] = indexRaw ? JSON.parse(indexRaw) : [];
    for (const nid of ids.slice(0, 30)) {
      const raw = await ctx.env.KV.get(`notification:${nid}`);
      if (raw) notifications.push(JSON.parse(raw) as Notification);
    }
  }

  // Sort by date, newest first, limit 50
  notifications.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return new Response(JSON.stringify(notifications.slice(0, 50)));
};

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const body = await ctx.request.json() as { action: string; notificationId?: string; ids?: string[] };

  if (body.action === 'mark-read' && body.notificationId) {
    const raw = await ctx.env.KV.get(`notification:${body.notificationId}`);
    if (raw) {
      const notif = JSON.parse(raw) as Notification;
      notif.read = true;
      await ctx.env.KV.put(`notification:${body.notificationId}`, JSON.stringify(notif), { expirationTtl: 7 * 86400 });
    }
    return new Response(JSON.stringify({ ok: true }));
  }

  if (body.action === 'mark-all-read' && body.ids) {
    for (const nid of body.ids) {
      const raw = await ctx.env.KV.get(`notification:${nid}`);
      if (raw) {
        const notif = JSON.parse(raw) as Notification;
        notif.read = true;
        await ctx.env.KV.put(`notification:${nid}`, JSON.stringify(notif), { expirationTtl: 7 * 86400 });
      }
    }
    return new Response(JSON.stringify({ ok: true }));
  }

  return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 });
};
