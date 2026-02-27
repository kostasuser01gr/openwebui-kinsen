import type { Env, Feedback } from '../../src/lib/types';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const body = (await request.json()) as {
      sessionId: string;
      messageIndex: number;
      rating: 'up' | 'down';
      comment?: string;
    };

    if (
      !body.sessionId ||
      body.messageIndex === undefined ||
      !['up', 'down'].includes(body.rating)
    ) {
      return new Response(JSON.stringify({ error: 'Invalid feedback data' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const feedback: Feedback = {
      sessionId: body.sessionId,
      messageIndex: body.messageIndex,
      rating: body.rating,
      comment: body.comment,
      timestamp: new Date().toISOString(),
    };

    const feedbackKey = `feedback:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await env.KV.put(feedbackKey, JSON.stringify(feedback), { expirationTtl: 86400 * 90 });

    // Update daily feedback counters
    const today = new Date().toISOString().slice(0, 10);
    const counterKey = `analytics:feedback:${today}:${body.rating}`;
    const current = await env.KV.get(counterKey);
    await env.KV.put(counterKey, String((current ? parseInt(current, 10) : 0) + 1), {
      expirationTtl: 86400 * 90,
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Bad request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
