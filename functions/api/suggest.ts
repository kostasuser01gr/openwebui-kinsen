import type { Env, KnowledgeNote } from '../../src/lib/types';
import { getAutoSuggestions } from '../../src/lib/retrieval';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const q = url.searchParams.get('q') || '';
  if (q.length < 2) {
    return new Response(JSON.stringify([]), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Load knowledge notes for title matching
  const noteIndex = await env.KV.get('knowledge:index', 'json') as string[] | null;
  const notes: KnowledgeNote[] = [];
  if (noteIndex) {
    const results = await Promise.all(noteIndex.map(id => env.KV.get(`knowledge:${id}`, 'json')));
    for (const n of results) {
      if (n) notes.push(n as KnowledgeNote);
    }
  }

  // Load user's recent searches from preferences
  const user = ((request as any).__userData || {}) as { userId?: string };
  let recentSearches: string[] = [];
  if (user.userId) {
    const prefs = await env.KV.get(`preferences:${user.userId}`, 'json') as any;
    if (prefs?.recentSearches) recentSearches = prefs.recentSearches;
  }

  const suggestions = getAutoSuggestions(q, notes, recentSearches);

  return new Response(JSON.stringify(suggestions), {
    headers: { 'Content-Type': 'application/json' },
  });
};
