import { useState, useEffect, FormEvent, useRef } from 'react';

interface Macro {
  id: string;
  userId: string;
  title: string;
  promptTemplate: string;
  global: boolean;
  category?: string;
  order?: number;
  pinned?: boolean;
  createdAt: string;
}

interface MacrosPanelProps {
  token: string;
  userRole: string;
  onClose: () => void;
  onUseMacro?: (prompt: string) => void;
}

export function MacrosPanel({ token, userRole, onClose, onUseMacro }: MacrosPanelProps) {
  const [macros, setMacros] = useState<Macro[]>([]);
  const [title, setTitle] = useState('');
  const [promptTemplate, setPromptTemplate] = useState('');
  const [category, setCategory] = useState('');
  const [isGlobal, setIsGlobal] = useState(false);
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<Partial<Macro>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const auth = (extra?: Record<string, string>) => ({
    Authorization: `Bearer ${token}`,
    ...extra,
  });

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = async () => {
    const res = await fetch('/api/macros', { headers: auth() });
    if (res.ok) setMacros((await res.json()) as Macro[]);
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!title.trim() || !promptTemplate.trim()) {
      setError('Title and prompt are required.');
      return;
    }
    const res = await fetch('/api/macros', {
      method: 'POST',
      headers: auth({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        title: title.trim(),
        promptTemplate: promptTemplate.trim(),
        category: category.trim() || undefined,
        global: isGlobal && userRole === 'admin',
      }),
    });
    if (res.ok) {
      setTitle('');
      setPromptTemplate('');
      setCategory('');
      setIsGlobal(false);
      load();
    } else {
      const d = (await res.json()) as { error?: string };
      setError(d.error ?? 'Failed to create macro.');
    }
  };

  const startEdit = (m: Macro) => {
    setEditingId(m.id);
    setEditFields({
      title: m.title,
      promptTemplate: m.promptTemplate,
      category: m.category ?? '',
      order: m.order,
      pinned: m.pinned ?? false,
    });
  };

  const saveEdit = async (id: string) => {
    const res = await fetch('/api/macros', {
      method: 'PUT',
      headers: auth({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ id, ...editFields }),
    });
    if (res.ok) {
      setEditingId(null);
      load();
    } else {
      const d = (await res.json()) as { error?: string };
      setError(d.error ?? 'Failed to update macro.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this quick action?')) return;
    await fetch(`/api/macros?id=${id}`, { method: 'DELETE', headers: auth() });
    load();
  };

  const handleExport = async () => {
    const res = await fetch('/api/macros/export', { headers: auth() });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kinsen-macros.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;
      const res = await fetch('/api/macros/import', {
        method: 'POST',
        headers: auth({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(parsed),
      });
      const data = (await res.json()) as { imported?: number; error?: string };
      if (res.ok) {
        setError(`✓ Imported ${data.imported ?? 0} macros.`);
        load();
      } else {
        setError(data.error ?? 'Import failed.');
      }
    } catch {
      setError('Invalid JSON file.');
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div
      className="macros-panel-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="macros-panel">
        <div className="macros-panel-header">
          <h2>⚡ Quick Actions (Macros)</h2>
          <button className="btn-icon" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Create form */}
        <form className="macros-create-form" onSubmit={handleCreate}>
          <h3>New Quick Action</h3>
          <input
            placeholder="Title (e.g. 'Summarize this')"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            placeholder="Prompt template"
            value={promptTemplate}
            onChange={(e) => setPromptTemplate(e.target.value)}
            rows={3}
          />
          <input
            placeholder="Category (optional, e.g. 'Writing')"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
          {userRole === 'admin' && (
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={isGlobal}
                onChange={(e) => setIsGlobal(e.target.checked)}
              />
              Global (visible to all users)
            </label>
          )}
          {error && (
            <p className={error.startsWith('✓') ? 'success-text' : 'error-text'}>{error}</p>
          )}
          <button type="submit" className="btn-primary">
            + Create
          </button>
        </form>

        {/* Import / Export */}
        <div className="macros-io">
          <button className="btn-small" onClick={handleExport}>
            ⬇ Export JSON
          </button>
          <button
            className="btn-small"
            onClick={() => fileRef.current?.click()}
            disabled={importing}
          >
            {importing ? 'Importing…' : '⬆ Import JSON'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={handleImport}
          />
        </div>

        {/* List */}
        <ul className="macros-full-list">
          {macros.map((m) => (
            <li key={m.id} className="macro-item">
              {editingId === m.id ? (
                <div className="macro-edit-form">
                  <input
                    value={editFields.title ?? ''}
                    onChange={(e) => setEditFields((f) => ({ ...f, title: e.target.value }))}
                    placeholder="Title"
                  />
                  <textarea
                    value={editFields.promptTemplate ?? ''}
                    onChange={(e) =>
                      setEditFields((f) => ({ ...f, promptTemplate: e.target.value }))
                    }
                    rows={3}
                    placeholder="Prompt template"
                  />
                  <input
                    value={editFields.category ?? ''}
                    onChange={(e) => setEditFields((f) => ({ ...f, category: e.target.value }))}
                    placeholder="Category (optional)"
                  />
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={editFields.pinned ?? false}
                        onChange={(e) => setEditFields((f) => ({ ...f, pinned: e.target.checked }))}
                      />
                      Pinned
                    </label>
                    <input
                      type="number"
                      style={{ width: 80 }}
                      value={editFields.order ?? ''}
                      onChange={(e) =>
                        setEditFields((f) => ({
                          ...f,
                          order: e.target.value ? Number(e.target.value) : undefined,
                        }))
                      }
                      placeholder="Order"
                      min={0}
                    />
                  </div>
                  <div className="macro-edit-actions">
                    <button
                      type="button"
                      className="btn-small btn-primary"
                      onClick={() => saveEdit(m.id)}
                    >
                      Save
                    </button>
                    <button type="button" className="btn-small" onClick={() => setEditingId(null)}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="macro-item-header">
                    {m.pinned && <span className="macro-pinned-badge">📌</span>}
                    <strong>{m.title}</strong>
                    {m.global && <span className="macro-global-badge">global</span>}
                    {m.category && <span className="macro-category-badge">{m.category}</span>}
                  </div>
                  <p className="macro-prompt">{m.promptTemplate.slice(0, 120)}…</p>
                  <div className="macro-item-actions">
                    {onUseMacro && (
                      <button
                        className="btn-small"
                        onClick={() => {
                          onUseMacro(m.promptTemplate);
                          onClose();
                        }}
                      >
                        Use
                      </button>
                    )}
                    <button className="btn-small" onClick={() => startEdit(m)}>
                      Edit
                    </button>
                    <button className="btn-small btn-danger" onClick={() => handleDelete(m.id)}>
                      Delete
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
          {!macros.length && <li className="macro-empty">No quick actions yet.</li>}
        </ul>
      </div>
    </div>
  );
}
