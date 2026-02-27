import { useState, useEffect } from 'react';

interface KnowledgeNote {
  id: string;
  title: string;
  category: string;
  keywords: string[];
  content: string;
  updatedAt: string;
  relatedNotes?: string[];
}

export function KnowledgeTab() {
  const [notes, setNotes] = useState<KnowledgeNote[]>([]);
  const [filter, setFilter] = useState('');
  const [editing, setEditing] = useState<KnowledgeNote | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/knowledge', { credentials: 'include' });
      if (res.ok) {
        const data = (await res.json()) as KnowledgeNote[];
        setNotes(data);
      }
    } catch {
      /* ignore */
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const saveNote = async (note: KnowledgeNote) => {
    setSaving(true);
    try {
      const method = creating ? 'POST' : 'PUT';
      const res = await fetch('/api/admin/knowledge', {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(note),
      });
      if (res.ok) {
        setMessage(creating ? 'Note created!' : 'Note updated!');
        setEditing(null);
        setCreating(false);
        fetchNotes();
      } else {
        const data = (await res.json()) as { error: string };
        setMessage(`Error: ${data.error}`);
      }
    } catch {
      setMessage('Save failed');
    }
    setSaving(false);
    setTimeout(() => setMessage(''), 3000);
  };

  const deleteNote = async (id: string) => {
    if (!confirm(`Delete "${id}"?`)) return;
    try {
      await fetch(`/api/admin/knowledge?id=${id}`, { method: 'DELETE', credentials: 'include' });
      fetchNotes();
      setMessage('Note deleted');
      setTimeout(() => setMessage(''), 3000);
    } catch {
      /* ignore */
    }
  };

  const seedAll = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: '{}',
      });
      const data = (await res.json()) as { seeded: number };
      setMessage(`Seeded ${data.seeded} notes`);
      fetchNotes();
    } catch {
      setMessage('Seed failed');
    }
    setSaving(false);
    setTimeout(() => setMessage(''), 3000);
  };

  const exportBackup = () => {
    window.open('/api/admin/export', '_blank');
  };

  const filtered = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(filter.toLowerCase()) ||
      n.category.toLowerCase().includes(filter.toLowerCase()) ||
      n.keywords.some((k) => k.toLowerCase().includes(filter.toLowerCase())),
  );

  if (editing || creating) {
    return (
      <NoteEditor
        note={
          editing || {
            id: '',
            title: '',
            category: 'operations',
            keywords: [],
            content: '',
            updatedAt: '',
          }
        }
        onSave={saveNote}
        onCancel={() => {
          setEditing(null);
          setCreating(false);
        }}
        saving={saving}
        isNew={creating}
      />
    );
  }

  return (
    <div className="knowledge-tab">
      <div className="tab-toolbar">
        <input
          type="text"
          placeholder="Search notes…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="panel-search"
        />
        <div className="toolbar-actions">
          <button className="btn-secondary" onClick={() => setCreating(true)}>
            + New Note
          </button>
          <button className="btn-secondary" onClick={seedAll} disabled={saving}>
            🌱 Re-seed All
          </button>
          <button className="btn-secondary" onClick={exportBackup}>
            ⬇ Export
          </button>
        </div>
      </div>

      {message && <div className="tab-message">{message}</div>}

      {loading ? (
        <div className="tab-loading">Loading…</div>
      ) : (
        <div className="notes-grid">
          {filtered.map((note) => (
            <div key={note.id} className="note-card">
              <div className="note-card-header">
                <h4>{note.title}</h4>
                <span className="note-category">{note.category}</span>
              </div>
              <p className="note-preview">{note.content.slice(0, 120)}…</p>
              <div className="note-meta">
                <span>
                  {note.keywords.length} keywords · Updated {note.updatedAt}
                </span>
                <div className="note-actions">
                  <button className="btn-sm" onClick={() => setEditing(note)}>
                    Edit
                  </button>
                  <button className="btn-sm btn-danger" onClick={() => deleteNote(note.id)}>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="empty-state">
              No notes found. Click "New Note" or "Re-seed All" to get started.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function NoteEditor({
  note,
  onSave,
  onCancel,
  saving,
  isNew,
}: {
  note: KnowledgeNote;
  onSave: (note: KnowledgeNote) => void;
  onCancel: () => void;
  saving: boolean;
  isNew: boolean;
}) {
  const [form, setForm] = useState(note);
  const [keywordsText, setKeywordsText] = useState(note.keywords.join(', '));

  const handleSave = () => {
    onSave({
      ...form,
      keywords: keywordsText
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean),
    });
  };

  return (
    <div className="note-editor">
      <div className="panel-header">
        <h3>{isNew ? 'Create Note' : 'Edit Note'}</h3>
        <button className="icon-btn" onClick={onCancel}>
          ✕
        </button>
      </div>

      <div className="editor-form">
        <div className="form-row">
          <div className="form-field">
            <label>ID (slug)</label>
            <input
              type="text"
              value={form.id}
              onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))}
              disabled={!isNew}
              placeholder="e.g., deposit-rules"
            />
          </div>
          <div className="form-field">
            <label>Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            >
              <option value="billing">Billing</option>
              <option value="operations">Operations</option>
              <option value="sales">Sales</option>
              <option value="safety">Safety</option>
              <option value="compliance">Compliance</option>
              <option value="general">General</option>
            </select>
          </div>
        </div>

        <div className="form-field">
          <label>Title</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Note title"
          />
        </div>

        <div className="form-field">
          <label>Keywords (comma-separated)</label>
          <input
            type="text"
            value={keywordsText}
            onChange={(e) => setKeywordsText(e.target.value)}
            placeholder="deposit, hold, credit card, …"
          />
        </div>

        <div className="form-field">
          <label>Content (Markdown)</label>
          <textarea
            value={form.content}
            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            rows={15}
            placeholder="Write policy content in Markdown…"
          />
        </div>

        <div className="editor-actions">
          <button className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={saving || !form.id || !form.title}
          >
            {saving ? 'Saving…' : isNew ? 'Create Note' : 'Update Note'}
          </button>
        </div>
      </div>
    </div>
  );
}
