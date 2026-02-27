// Knowledge version history API
import type { Env, KnowledgeVersion } from '../../../src/lib/types';

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const url = new URL(ctx.request.url);
  const noteId = url.searchParams.get('noteId');
  if (!noteId) return new Response(JSON.stringify({ error: 'noteId required' }), { status: 400 });

  const indexRaw = await ctx.env.KV.get(`knowledge:versions:${noteId}`);
  const index: string[] = indexRaw ? JSON.parse(indexRaw) : [];

  const versions: KnowledgeVersion[] = [];
  for (const key of index) {
    const raw = await ctx.env.KV.get(key);
    if (raw) versions.push(JSON.parse(raw) as KnowledgeVersion);
  }

  return new Response(JSON.stringify(versions));
};

// Rollback to a specific version
export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const body = (await ctx.request.json()) as { noteId: string; version: number };
  const user = (ctx.data as Record<string, unknown>).user as { name: string } | undefined;

  if (!body.noteId || body.version === undefined) {
    return new Response(JSON.stringify({ error: 'noteId and version required' }), { status: 400 });
  }

  const versionKey = `knowledge:version:${body.noteId}:${body.version}`;
  const raw = await ctx.env.KV.get(versionKey);
  if (!raw) return new Response(JSON.stringify({ error: 'Version not found' }), { status: 404 });

  const ver = JSON.parse(raw) as KnowledgeVersion;

  // Get current note
  const noteRaw = await ctx.env.KV.get(`knowledge:${body.noteId}`);
  if (!noteRaw) return new Response(JSON.stringify({ error: 'Note not found' }), { status: 404 });

  const note = JSON.parse(noteRaw);

  // Save current as a new version before rollback
  const indexRaw = await ctx.env.KV.get(`knowledge:versions:${body.noteId}`);
  const index: string[] = indexRaw ? JSON.parse(indexRaw) : [];
  const newVersion = index.length + 1;
  const newVersionKey = `knowledge:version:${body.noteId}:${newVersion}`;

  const snapshot: KnowledgeVersion = {
    noteId: body.noteId,
    version: newVersion,
    content: note.content,
    title: note.title,
    keywords: note.keywords,
    category: note.category,
    editedBy: user?.name || 'admin',
    editedAt: new Date().toISOString(),
    changeNote: `Pre-rollback snapshot (rolling back to v${body.version})`,
  };
  await ctx.env.KV.put(newVersionKey, JSON.stringify(snapshot));
  index.push(newVersionKey);

  // Apply rollback
  note.title = ver.title;
  note.content = ver.content;
  note.keywords = ver.keywords;
  note.category = ver.category;
  note.updatedAt = new Date().toISOString();
  await ctx.env.KV.put(`knowledge:${body.noteId}`, JSON.stringify(note));

  // Save rollback as another version
  const rollbackVersion = index.length + 1;
  const rollbackKey = `knowledge:version:${body.noteId}:${rollbackVersion}`;
  const rollbackSnap: KnowledgeVersion = {
    noteId: body.noteId,
    version: rollbackVersion,
    content: ver.content,
    title: ver.title,
    keywords: ver.keywords,
    category: ver.category,
    editedBy: user?.name || 'admin',
    editedAt: new Date().toISOString(),
    changeNote: `Rolled back to version ${body.version}`,
  };
  await ctx.env.KV.put(rollbackKey, JSON.stringify(rollbackSnap));
  index.push(rollbackKey);

  await ctx.env.KV.put(`knowledge:versions:${body.noteId}`, JSON.stringify(index));

  return new Response(JSON.stringify({ ok: true, note, rolledBackTo: body.version }));
};
