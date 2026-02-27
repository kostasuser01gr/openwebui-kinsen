import type { Env, ChatMessage } from '../../src/lib/types';
import { generateSessionId } from '../../src/lib/crypto';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const user = (context.data as Record<string, any>).user;

  try {
    const { message, sessionId: clientSessionId } = (await request.json()) as {
      message: string;
      sessionId?: string;
    };

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Message required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const trimmedMessage = message.trim().slice(0, 2000);
    const sessionId = clientSessionId || generateSessionId();

    // Check if session is locked
    const lockKey = `session:${sessionId}:locked`;
    const isLocked = await env.KV.get(lockKey);
    if (isLocked === 'true') {
      return new Response(
        JSON.stringify({ error: 'This session is locked by a coordinator or admin' }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    // Retrieve existing history
    const historyKey = `session:${sessionId}`;
    const existingHistory = (await env.KV.get(historyKey, 'json')) as ChatMessage[] | null;
    const history = existingHistory || [];

    // Build messages for AI
    const aiMessages: { role: string; content: string }[] = [
      {
        role: 'system',
        content:
          'You are Kinsen Station AI, a helpful, knowledgeable assistant. Answer questions clearly and concisely. Be friendly and professional.',
      },
    ];

    // Include recent history for context (last 6 messages = 3 turns)
    const recentHistory = history.slice(-6);
    for (const msg of recentHistory) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        aiMessages.push({ role: msg.role, content: msg.content });
      }
    }
    aiMessages.push({ role: 'user', content: trimmedMessage });

    // Call Cloudflare Workers AI
    let reply: string;
    try {
      const aiResult = (await env.AI.run(
        '@cf/meta/llama-3.1-8b-instruct' as Parameters<typeof env.AI.run>[0],
        {
          messages: aiMessages,
          max_tokens: 1024,
        } as any,
      )) as { response?: string };
      reply = aiResult.response || 'I could not generate a response. Please try again.';
    } catch {
      reply = 'AI service is temporarily unavailable. Please try again in a moment.';
    }

    // Append to history
    const now = new Date().toISOString();
    history.push({ role: 'user', content: trimmedMessage, timestamp: now });
    history.push({ role: 'assistant', content: reply, timestamp: now });

    // Trim to last 100 messages and persist
    const trimmedHistory = history.slice(-100);
    await env.KV.put(historyKey, JSON.stringify(trimmedHistory), { expirationTtl: 604800 });

    // Store session metadata for listing
    const metaKey = `session-meta:${sessionId}`;
    const existingMeta = (await env.KV.get(metaKey, 'json')) as any;
    const sessionMeta = {
      id: sessionId,
      title: existingMeta?.title || trimmedMessage.slice(0, 50),
      userId: user?.userId || 'anonymous',
      locked: false,
      createdAt: existingMeta?.createdAt || now,
      updatedAt: now,
      messageCount: trimmedHistory.length,
    };
    await env.KV.put(metaKey, JSON.stringify(sessionMeta), { expirationTtl: 604800 });

    // Track session in user's session index
    if (user?.userId) {
      const userSessionsKey = `user-sessions:${user.userId}`;
      const userSessions = ((await env.KV.get(userSessionsKey, 'json')) as string[] | null) || [];
      if (!userSessions.includes(sessionId)) {
        userSessions.push(sessionId);
        await env.KV.put(userSessionsKey, JSON.stringify(userSessions), {
          expirationTtl: 604800,
        });
      }
    }

    return new Response(
      JSON.stringify({
        reply,
        sessionId,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  } catch {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
