import type { Env, Message, Thread, UserSession } from '../../../../src/lib/types';

// GET /api/threads/:threadId/export?format=json|md
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, params, request } = context;
  const threadId = params['threadId'] as string;
  const user = (context.data as Record<string, unknown>).user as UserSession;

  const thread = (await env.KV.get(`thread:${threadId}`, 'json')) as Thread | null;
  if (!thread) {
    return new Response(JSON.stringify({ error: 'Thread not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (thread.userId !== user.userId && !['coordinator', 'admin'].includes(user.role)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const messages =
    ((await env.KV.get(`thread:messages:${threadId}`, 'json')) as Message[] | null) ?? [];

  const format = new URL(request.url).searchParams.get('format') ?? 'json';

  if (format === 'md') {
    const lines: string[] = [
      `# ${thread.title}`,
      ``,
      `> Exported from Kinsen Station AI · ${new Date().toISOString()}`,
      ``,
    ];
    for (const msg of messages) {
      if (msg.deleted) continue;
      const author =
        msg.role === 'assistant' ? '🤖 Kinsen' : msg.role === 'system' ? 'System' : 'User';
      const time = new Date(msg.createdAt).toLocaleString();
      lines.push(`### ${author} — ${time}`);
      lines.push('');
      lines.push(msg.content);
      lines.push('');
    }
    const body = lines.join('\n');
    const filename = `kinsen-thread-${threadId.slice(0, 8)}.md`;
    return new Response(body, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  }

  // Default: JSON
  const payload = {
    thread: {
      id: thread.id,
      title: thread.title,
      roomId: thread.roomId,
      createdAt: thread.createdAt,
      exportedAt: new Date().toISOString(),
    },
    messages: messages.filter((m) => !m.deleted),
  };
  const filename = `kinsen-thread-${threadId.slice(0, 8)}.json`;
  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
};
