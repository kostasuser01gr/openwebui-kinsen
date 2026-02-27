import type { Env, ChecklistInstance } from '../../src/lib/types';
import { CHECKLISTS } from '../../src/lib/checklists';
import { parseCookies } from '../../src/lib/crypto';

// GET: list checklist templates, or get a specific instance
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const instanceId = url.searchParams.get('instanceId');

  if (instanceId) {
    const instance = await env.KV.get(`checklist:${instanceId}`, 'json');
    if (!instance) {
      return new Response(JSON.stringify({ error: 'Checklist instance not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify(instance), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify(CHECKLISTS), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

// POST: create or update a checklist instance
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const body = (await request.json()) as {
      templateId: string;
      rentalId: string;
      items?: Record<string, boolean>;
    };

    const template = CHECKLISTS.find((c) => c.id === body.templateId);
    if (!template) {
      return new Response(JSON.stringify({ error: 'Checklist template not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get user from session
    const cookies = parseCookies(request.headers.get('Cookie'));
    const sessionToken = cookies['kinsen_session'];
    const session = sessionToken
      ? ((await env.KV.get(`session:${sessionToken}`, 'json')) as any)
      : null;
    const userId = session?.userId || session?.email || 'anonymous';

    const instanceKey = `checklist:${body.templateId}:${body.rentalId}`;
    const existing = (await env.KV.get(instanceKey, 'json')) as ChecklistInstance | null;

    const items = body.items || {};
    const allRequiredDone = template.items.filter((i) => i.required).every((i) => items[i.id]);

    const instance: ChecklistInstance = {
      templateId: body.templateId,
      rentalId: body.rentalId,
      userId,
      items,
      completedAt: allRequiredDone ? new Date().toISOString() : undefined,
      createdAt: existing?.createdAt || new Date().toISOString(),
    };

    await env.KV.put(instanceKey, JSON.stringify(instance), { expirationTtl: 86400 * 90 });

    const totalItems = template.items.length;
    const checkedItems = Object.values(items).filter(Boolean).length;
    const requiredItems = template.items.filter((i) => i.required).length;
    const requiredChecked = template.items.filter((i) => i.required && items[i.id]).length;

    return new Response(
      JSON.stringify({
        ok: true,
        instance,
        progress: {
          total: totalItems,
          checked: checkedItems,
          requiredTotal: requiredItems,
          requiredChecked,
          complete: allRequiredDone,
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  } catch {
    return new Response(JSON.stringify({ error: 'Bad request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
