import type { Env, KnowledgeNote, ChatMessage, ChatResponse } from '../../src/lib/types';
import { retrieveNotes, buildResponse, buildContextualQuery, generateFollowups, detectIntent } from '../../src/lib/retrieval';
import { parseCookies, generateSessionId } from '../../src/lib/crypto';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const { message, sessionId: clientSessionId } = await request.json() as {
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

    // --- Chat history for context ---
    const chatSessionId = clientSessionId || generateSessionId();
    const historyKey = `chat:${chatSessionId}`;
    const existingHistory = await env.KV.get(historyKey, 'json') as ChatMessage[] | null;
    const history = existingHistory || [];

    // --- Build context-aware query using conversation history ---
    const contextualQuery = buildContextualQuery(trimmedMessage, history, 3);

    // --- Retrieve knowledge notes from KV ---
    const noteIndex = await env.KV.get('knowledge:index', 'json') as string[] | null;
    const notes: KnowledgeNote[] = [];

    if (noteIndex && noteIndex.length > 0) {
      const notePromises = noteIndex.map(id => env.KV.get(`knowledge:${id}`, 'json'));
      const noteResults = await Promise.all(notePromises);
      for (const n of noteResults) {
        if (n) notes.push(n as KnowledgeNote);
      }
    }

    // --- Score and retrieve using contextual query ---
    const scoredNotes = retrieveNotes(contextualQuery, notes, 3);

    // --- Build reply ---
    let reply: string;

    if (env.OPENAI_ENABLED === 'true' && env.OPENAI_API_KEY && env.OPENAI_BASE_URL) {
      try {
        reply = await callOpenAI(env, trimmedMessage, scoredNotes.map(s => s.note), history);
      } catch {
        reply = buildResponse(trimmedMessage, scoredNotes);
      }
    } else {
      reply = buildResponse(trimmedMessage, scoredNotes);
    }

    const citations = scoredNotes.map(s => ({ id: s.note.id, title: s.note.title }));
    const confidence = scoredNotes.length > 0 ? scoredNotes[0].confidence : 'low';

    // --- Generate follow-up suggestions ---
    const suggestedFollowups = generateFollowups(trimmedMessage, scoredNotes, notes);

    // --- Save chat history ---
    const now = new Date().toISOString();
    history.push({ role: 'user', content: trimmedMessage, timestamp: now });
    history.push({
      role: 'assistant',
      content: reply,
      citations: citations.map(c => c.id),
      suggestedFollowups,
      timestamp: now,
    });

    const trimmedHistory = history.slice(-100);
    await env.KV.put(historyKey, JSON.stringify(trimmedHistory), { expirationTtl: 604800 });

    // --- Analytics ---
    const today = new Date().toISOString().slice(0, 10);
    const intent = detectIntent(trimmedMessage);

    const dailyKey = `analytics:daily:${today}`;
    const dailyCount = await env.KV.get(dailyKey);
    await env.KV.put(dailyKey, String((dailyCount ? parseInt(dailyCount, 10) : 0) + 1), {
      expirationTtl: 86400 * 90,
    });

    const intentKey = `analytics:intent:${today}:${intent}`;
    const intentCount = await env.KV.get(intentKey);
    await env.KV.put(intentKey, String((intentCount ? parseInt(intentCount, 10) : 0) + 1), {
      expirationTtl: 86400 * 90,
    });

    // Track zero-result queries for knowledge gap detection
    if (scoredNotes.length === 0) {
      const gapKey = `analytics:gap:${today}:${Date.now()}`;
      await env.KV.put(gapKey, trimmedMessage.slice(0, 200), { expirationTtl: 86400 * 30 });
    }

    // --- Staff metrics (per-user message count) ---
    const cookie = request.headers.get('Cookie') || '';
    const sessionToken = cookie.match(/kinsen_session=([^;]+)/)?.[1] || '';
    if (sessionToken) {
      const sess = await env.KV.get(`session:${sessionToken}`, 'json') as any;
      if (sess?.userId) {
        const staffMsgKey = `analytics:staff:${sess.userId}:messages`;
        const staffMsgCount = await env.KV.get(staffMsgKey);
        await env.KV.put(staffMsgKey, String((staffMsgCount ? parseInt(staffMsgCount, 10) : 0) + 1), {
          expirationTtl: 86400 * 90,
        });
      }
    }

    // --- Hourly counter for heatmap ---
    const hour = new Date().getUTCHours();
    const hourlyKey = `analytics:hourly:${today}:${hour}`;
    const hourlyCount = await env.KV.get(hourlyKey);
    await env.KV.put(hourlyKey, String((hourlyCount ? parseInt(hourlyCount, 10) : 0) + 1), {
      expirationTtl: 86400 * 90,
    });

    // --- Knowledge citation tracking ---
    for (const c of citations) {
      const citationKey = `analytics:knowledge:${c.id}:citations`;
      const citationCount = await env.KV.get(citationKey);
      await env.KV.put(citationKey, String((citationCount ? parseInt(citationCount, 10) : 0) + 1), {
        expirationTtl: 86400 * 90,
      });
    }

    const response: ChatResponse = { reply, citations, sessionId: chatSessionId, suggestedFollowups, confidence };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

async function callOpenAI(
  env: Env,
  userMessage: string,
  contextNotes: KnowledgeNote[],
  history: ChatMessage[] = []
): Promise<string> {
  const systemPrompt = `You are Kinsen, an internal assistant for a car rental company. Answer staff questions using ONLY the provided knowledge base context. Be concise and professional. If the context doesn't cover the question, say so.

Context:
${contextNotes.map(n => `[${n.title}]\n${n.content}`).join('\n\n---\n\n')}`;

  // Include recent conversation history for multi-turn context
  const messages: { role: string; content: string }[] = [
    { role: 'system', content: systemPrompt },
  ];

  const recentHistory = history.slice(-6); // last 3 turns
  for (const msg of recentHistory) {
    messages.push({ role: msg.role, content: msg.content });
  }
  messages.push({ role: 'user', content: userMessage });

  const res = await fetch(`${env.OPENAI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL || 'gpt-3.5-turbo',
      messages,
      max_tokens: 1000,
      temperature: 0.3,
    }),
  });

  if (!res.ok) throw new Error(`OpenAI API error: ${res.status}`);
  const data = await res.json() as any;
  return data.choices?.[0]?.message?.content || 'No response from AI.';
}
