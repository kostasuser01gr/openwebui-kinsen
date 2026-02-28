import type { Env, Thread, Message, UserSession } from '../../../../src/lib/types';
import { generateId } from '../../../../src/lib/crypto';
import { writeAudit } from '../../../../src/lib/audit';

const AI_MODEL = '@cf/meta/llama-3.1-8b-instruct';
const MAX_CONTEXT = 10; // messages sent to AI as context
const MAX_STORED = 100; // messages kept in KV per thread
const MSG_TTL = 7 * 24 * 60 * 60;
const THREAD_TTL = 30 * 24 * 60 * 60;

const SYSTEM_PROMPT = `You are Kinsen, a helpful AI assistant in the Kinsen Station collaborative workspace.
Be concise, accurate, and professional. Use markdown formatting when it improves clarity.
For code, use fenced code blocks with the language identifier.`;

// GET /api/threads/:threadId/messages
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, params } = context;
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

  return new Response(JSON.stringify(messages), {
    headers: { 'Content-Type': 'application/json' },
  });
};

// POST /api/threads/:threadId/messages — send message, get AI reply (streaming or not)
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { env, params, request } = context;
  const threadId = params['threadId'] as string;
  const user = (context.data as Record<string, unknown>).user as UserSession;
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';

  const thread = (await env.KV.get(`thread:${threadId}`, 'json')) as Thread | null;
  if (!thread) {
    return new Response(JSON.stringify({ error: 'Thread not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (thread.locked && !['coordinator', 'admin'].includes(user.role)) {
    return new Response(JSON.stringify({ error: 'Thread is locked' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (thread.userId !== user.userId && !['coordinator', 'admin'].includes(user.role)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let content = '';
  try {
    const body = (await request.json()) as { content?: string };
    content = (body.content ?? '').trim();
  } catch {
    /* empty */
  }

  if (!content) {
    return new Response(JSON.stringify({ error: 'content is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const existing =
    ((await env.KV.get(`thread:messages:${threadId}`, 'json')) as Message[] | null) ?? [];

  const userMsg: Message = {
    id: generateId(),
    threadId,
    role: 'user',
    content,
    userId: user.userId,
    createdAt: new Date().toISOString(),
  };

  const aiMessages = [
    { role: 'system' as const, content: SYSTEM_PROMPT },
    ...existing.slice(-MAX_CONTEXT).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user' as const, content },
  ];

  const aiProvider = env.AI_PROVIDER ?? 'workers_ai';
  const wantsStream = (request.headers.get('Accept') ?? '').includes('text/event-stream');

  // ── No-AI mode ─────────────────────────────────────────────
  if (aiProvider === 'none') {
    const assistantMsg: Message = {
      id: generateId(),
      threadId,
      role: 'assistant',
      content: '*(AI is disabled — set AI_PROVIDER=workers_ai to enable)*',
      createdAt: new Date().toISOString(),
    };
    const updated = [...existing, userMsg, assistantMsg].slice(-MAX_STORED);
    await env.KV.put(`thread:messages:${threadId}`, JSON.stringify(updated), {
      expirationTtl: MSG_TTL,
    });
    await bumpThread(env, thread, updated.length);
    return new Response(JSON.stringify({ reply: assistantMsg.content }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ── Streaming mode ─────────────────────────────────────────
  if (wantsStream) {
    let aiStream: ReadableStream;
    try {
      aiStream = (await (env.AI as any).run(AI_MODEL, {
        messages: aiMessages,
        stream: true,
        max_tokens: 1024,
      })) as ReadableStream;
    } catch {
      return new Response(JSON.stringify({ error: 'AI unavailable' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Tee: one branch to client, one to persist after stream ends
    const [clientStream, saveStream] = aiStream.tee();

    context.waitUntil(
      (async () => {
        const reader = saveStream.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';
        let buf = '';
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            const lines = buf.split('\n');
            buf = lines.pop() ?? '';
            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const data = line.slice(6).trim();
              if (data === '[DONE]') continue;
              try {
                const parsed = JSON.parse(data) as { response?: string };
                accumulated += parsed.response ?? '';
              } catch {
                /* skip malformed chunk */
              }
            }
          }
        } finally {
          if (accumulated) {
            const assistantMsg: Message = {
              id: generateId(),
              threadId,
              role: 'assistant',
              content: accumulated,
              createdAt: new Date().toISOString(),
            };
            const updated = [...existing, userMsg, assistantMsg].slice(-MAX_STORED);
            await env.KV.put(`thread:messages:${threadId}`, JSON.stringify(updated), {
              expirationTtl: MSG_TTL,
            });
            await bumpThread(env, thread, updated.length);
          }
          await writeAudit(env, { id: user.userId, name: user.name }, 'thread.message', {
            targetId: threadId,
            targetType: 'thread',
            ip,
          });
        }
      })(),
    );

    return new Response(clientStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
        'Transfer-Encoding': 'chunked',
      },
    });
  }

  // ── Non-streaming mode ─────────────────────────────────────
  try {
    const aiResult = (await (env.AI as any).run(AI_MODEL, {
      messages: aiMessages,
      max_tokens: 1024,
    })) as { response?: string };

    const reply = aiResult.response ?? '*(no response)*';
    const assistantMsg: Message = {
      id: generateId(),
      threadId,
      role: 'assistant',
      content: reply,
      createdAt: new Date().toISOString(),
    };

    const updated = [...existing, userMsg, assistantMsg].slice(-MAX_STORED);
    await env.KV.put(`thread:messages:${threadId}`, JSON.stringify(updated), {
      expirationTtl: MSG_TTL,
    });
    await bumpThread(env, thread, updated.length);

    context.waitUntil(
      writeAudit(env, { id: user.userId, name: user.name }, 'thread.message', {
        targetId: threadId,
        targetType: 'thread',
        ip,
      }),
    );

    return new Response(JSON.stringify({ reply, messageId: assistantMsg.id }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'AI request failed' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

async function bumpThread(env: Env, thread: Thread, messageCount: number): Promise<void> {
  await env.KV.put(
    `thread:${thread.id}`,
    JSON.stringify({ ...thread, updatedAt: new Date().toISOString(), messageCount }),
    { expirationTtl: THREAD_TTL },
  );
}
