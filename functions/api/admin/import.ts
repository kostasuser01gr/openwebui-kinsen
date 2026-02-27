// Bulk knowledge import from CSV or Markdown
import type { Env, KnowledgeNote } from '../../../src/lib/types';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const contentType = request.headers.get('Content-Type') || '';
  let notes: Partial<KnowledgeNote>[] = [];

  try {
    if (contentType.includes('text/csv') || contentType.includes('text/plain')) {
      const text = await request.text();
      notes = parseCSV(text);
    } else if (contentType.includes('text/markdown')) {
      const text = await request.text();
      notes = parseMarkdown(text);
    } else {
      // Default: JSON array
      const body = await request.json() as { notes: Partial<KnowledgeNote>[] };
      notes = body.notes || [];
    }
  } catch (err) {
    return Response.json({ error: 'Failed to parse input', details: String(err) }, { status: 400 });
  }

  if (notes.length === 0) {
    return Response.json({ error: 'No notes found in input' }, { status: 400 });
  }

  if (notes.length > 100) {
    return Response.json({ error: 'Maximum 100 notes per import' }, { status: 400 });
  }

  // Get existing index
  const indexRaw = await env.KV.get('knowledge:index', 'json') as string[] | null;
  const index = indexRaw || [];
  const imported: string[] = [];
  const errors: string[] = [];

  for (const note of notes) {
    if (!note.title || !note.content) {
      errors.push(`Skipped note without title/content: ${note.title || 'untitled'}`);
      continue;
    }

    const id = note.id || `note-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const full: KnowledgeNote = {
      id,
      title: note.title,
      content: note.content,
      category: note.category || 'general',
      keywords: note.keywords || extractKeywords(note.title + ' ' + note.content),
      updatedAt: new Date().toISOString(),
    };

    await env.KV.put(`knowledge:${id}`, JSON.stringify(full));
    if (!index.includes(id)) index.push(id);
    imported.push(id);
  }

  await env.KV.put('knowledge:index', JSON.stringify(index));

  return Response.json({
    imported: imported.length,
    errors: errors.length > 0 ? errors : undefined,
    ids: imported,
  }, { status: 201 });
};

function parseCSV(text: string): Partial<KnowledgeNote>[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/^"/, '').replace(/"$/, ''));
  const titleIdx = header.indexOf('title');
  const contentIdx = header.indexOf('content');
  const categoryIdx = header.indexOf('category');
  const keywordsIdx = header.indexOf('keywords');

  if (titleIdx === -1 || contentIdx === -1) return [];

  const notes: Partial<KnowledgeNote>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length <= Math.max(titleIdx, contentIdx)) continue;

    notes.push({
      title: cols[titleIdx],
      content: cols[contentIdx],
      category: categoryIdx >= 0 ? cols[categoryIdx] : 'general',
      keywords: keywordsIdx >= 0 ? cols[keywordsIdx].split(';').map(k => k.trim()).filter(Boolean) : undefined,
    });
  }
  return notes;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseMarkdown(text: string): Partial<KnowledgeNote>[] {
  // Split on ## headings — each section becomes a note
  const sections = text.split(/^## /m).filter(Boolean);
  const notes: Partial<KnowledgeNote>[] = [];

  for (const section of sections) {
    const lines = section.trim().split('\n');
    const title = lines[0].replace(/^#+\s*/, '').trim();
    if (!title) continue;

    // Extract optional metadata from YAML-like frontmatter at start of section
    let category = 'general';
    let keywords: string[] | undefined;
    let contentStart = 1;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('category:')) {
        category = line.replace('category:', '').trim();
        contentStart = i + 1;
      } else if (line.startsWith('keywords:')) {
        keywords = line.replace('keywords:', '').trim().split(',').map(k => k.trim()).filter(Boolean);
        contentStart = i + 1;
      } else if (line === '') {
        contentStart = i + 1;
      } else {
        break;
      }
    }

    const content = lines.slice(contentStart).join('\n').trim();
    if (content) {
      notes.push({ title, content, category, keywords });
    }
  }

  return notes;
}

function extractKeywords(text: string): string[] {
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
  const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'to', 'of', 'and', 'or', 'in', 'on', 'at', 'for', 'with', 'from', 'by', 'this', 'that', 'it']);
  const counts = new Map<string, number>();
  for (const w of words) {
    if (w.length < 3 || stopWords.has(w)) continue;
    counts.set(w, (counts.get(w) || 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([w]) => w);
}
