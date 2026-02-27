import type { Env, KnowledgeNote, KnowledgeVersion } from '../../../src/lib/types';

// Save version snapshot before edit
async function saveVersion(
  env: Env,
  noteId: string,
  existing: KnowledgeNote,
  editedBy: string,
  changeNote?: string,
) {
  const indexKey = `knowledge:versions:${noteId}`;
  const indexRaw = await env.KV.get(indexKey);
  const index: string[] = indexRaw ? JSON.parse(indexRaw) : [];
  const version = index.length + 1;
  const versionKey = `knowledge:version:${noteId}:${version}`;

  const snapshot: KnowledgeVersion = {
    noteId,
    version,
    content: existing.content,
    title: existing.title,
    keywords: existing.keywords,
    category: existing.category,
    editedBy,
    editedAt: new Date().toISOString(),
    changeNote,
  };

  await env.KV.put(versionKey, JSON.stringify(snapshot), { expirationTtl: 365 * 86400 });
  index.push(versionKey);
  await env.KV.put(indexKey, JSON.stringify(index));
}

// GET: list all knowledge notes (or get one by ?id=)
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const noteId = url.searchParams.get('id');

  if (noteId) {
    const note = (await env.KV.get(`knowledge:${noteId}`, 'json')) as KnowledgeNote | null;
    if (!note) {
      return new Response(JSON.stringify({ error: 'Note not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify(note), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const index = (await env.KV.get('knowledge:index', 'json')) as string[] | null;
  if (!index || index.length === 0) {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const notes = await Promise.all(index.map((id) => env.KV.get(`knowledge:${id}`, 'json')));
  return new Response(JSON.stringify(notes.filter(Boolean)), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

// POST: create a new knowledge note
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const note = (await request.json()) as KnowledgeNote;
    if (!note.id || !note.title || !note.content) {
      return new Response(JSON.stringify({ error: 'id, title, and content are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    note.updatedAt = new Date().toISOString().slice(0, 10);
    note.keywords = note.keywords || [];
    note.category = note.category || 'general';

    await env.KV.put(`knowledge:${note.id}`, JSON.stringify(note));

    // Update index
    const index = (await env.KV.get('knowledge:index', 'json')) as string[] | null;
    const ids = index || [];
    if (!ids.includes(note.id)) {
      ids.push(note.id);
      await env.KV.put('knowledge:index', JSON.stringify(ids));
    }

    return new Response(JSON.stringify({ ok: true, note }), {
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

// PUT: update an existing note (with version tracking)
export const onRequestPut: PagesFunction<Env> = async (ctx) => {
  try {
    const note = (await ctx.request.json()) as KnowledgeNote & { changeNote?: string };
    if (!note.id) {
      return new Response(JSON.stringify({ error: 'id is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const existing = (await ctx.env.KV.get(`knowledge:${note.id}`, 'json')) as KnowledgeNote | null;
    if (!existing) {
      return new Response(JSON.stringify({ error: 'Note not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Save version snapshot before overwrite
    const user = (ctx.data as Record<string, unknown>).user as { name: string } | undefined;
    await saveVersion(ctx.env, note.id, existing, user?.name || 'admin', note.changeNote);

    note.updatedAt = new Date().toISOString().slice(0, 10);
    await ctx.env.KV.put(`knowledge:${note.id}`, JSON.stringify(note));

    return new Response(JSON.stringify({ ok: true, note }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// DELETE: remove a note
export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const noteId = url.searchParams.get('id');
  if (!noteId) {
    return new Response(JSON.stringify({ error: 'id query param required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  await env.KV.delete(`knowledge:${noteId}`);

  const index = (await env.KV.get('knowledge:index', 'json')) as string[] | null;
  if (index) {
    const updated = index.filter((id) => id !== noteId);
    await env.KV.put('knowledge:index', JSON.stringify(updated));
  }

  return new Response(JSON.stringify({ ok: true, deleted: noteId }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
