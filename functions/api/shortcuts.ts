import type { Env, Shortcut } from '../../src/lib/types';
import { generateSessionId } from '../../src/lib/crypto';

// GET /api/shortcuts → list user shortcuts + global shortcuts
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;
  const user = (context.data as Record<string, any>).user;
  const userId = user?.userId || 'anonymous';

  // Get user shortcuts
  const userShortcuts =
    ((await env.KV.get(`shortcuts:${userId}`, 'json')) as Shortcut[] | null) || [];

  // Get global shortcuts
  const globalShortcuts =
    ((await env.KV.get('shortcuts:global', 'json')) as Shortcut[] | null) || [];

  return new Response(JSON.stringify([...globalShortcuts, ...userShortcuts]), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

// POST /api/shortcuts → create a shortcut
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const user = (context.data as Record<string, any>).user;
  const userId = user?.userId || 'anonymous';

  try {
    const body = (await request.json()) as {
      label?: string;
      prompt?: string;
      global?: boolean;
    };

    const label = (body.label || '').trim();
    const prompt = (body.prompt || '').trim();
    const isGlobal = body.global === true;

    if (!label || !prompt) {
      return new Response(JSON.stringify({ error: 'label and prompt are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Global shortcuts require admin role
    if (isGlobal && user?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Only admins can create global shortcuts' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const shortcut: Shortcut = {
      id: generateSessionId(),
      label,
      prompt,
      global: isGlobal,
      userId: isGlobal ? undefined : userId,
      createdAt: new Date().toISOString(),
    };

    if (isGlobal) {
      const globalShortcuts =
        ((await env.KV.get('shortcuts:global', 'json')) as Shortcut[] | null) || [];
      globalShortcuts.push(shortcut);
      await env.KV.put('shortcuts:global', JSON.stringify(globalShortcuts));
    } else {
      const userShortcuts =
        ((await env.KV.get(`shortcuts:${userId}`, 'json')) as Shortcut[] | null) || [];
      userShortcuts.push(shortcut);
      await env.KV.put(`shortcuts:${userId}`, JSON.stringify(userShortcuts));
    }

    return new Response(JSON.stringify({ ok: true, shortcut }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// DELETE /api/shortcuts?id=xxx → delete a shortcut
export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const { env } = context;
  const user = (context.data as Record<string, any>).user;
  const userId = user?.userId || 'anonymous';
  const url = new URL(context.request.url);
  const shortcutId = url.searchParams.get('id');

  if (!shortcutId) {
    return new Response(JSON.stringify({ error: 'id query parameter is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Try user shortcuts first
  const userShortcuts =
    ((await env.KV.get(`shortcuts:${userId}`, 'json')) as Shortcut[] | null) || [];
  const userIdx = userShortcuts.findIndex((s) => s.id === shortcutId);
  if (userIdx !== -1) {
    userShortcuts.splice(userIdx, 1);
    await env.KV.put(`shortcuts:${userId}`, JSON.stringify(userShortcuts));
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Admin can delete global shortcuts
  if (user?.role === 'admin') {
    const globalShortcuts =
      ((await env.KV.get('shortcuts:global', 'json')) as Shortcut[] | null) || [];
    const globalIdx = globalShortcuts.findIndex((s) => s.id === shortcutId);
    if (globalIdx !== -1) {
      globalShortcuts.splice(globalIdx, 1);
      await env.KV.put('shortcuts:global', JSON.stringify(globalShortcuts));
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  return new Response(JSON.stringify({ error: 'Shortcut not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
};
