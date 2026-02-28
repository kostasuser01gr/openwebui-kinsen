import { useState, useEffect, FormEvent, useRef } from 'react';

interface Macro {
  id: string;
  userId: string;
  title: string;
  promptTemplate: string;
  global: boolean;
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
  const [isGlobal, setIsGlobal] = useState(false);
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);
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
        global: isGlobal && userRole === 'admin',
      }),
    });
    if (res.ok) {
      setTitle('');
      setPromptTemplate('');
      setIsGlobal(false);
      load();
    } else {
      const d = (await res.json()) as { error?: string };
      setError(d.error ?? 'Failed to create macro.');
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
    <div className="macros-panel-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="macros-panel">
        <div className="macros-panel-header">
          <h2>⚡ Quick Actions (Macros)</h2>
          <button className="btn-icon" onClick={onClose}>✕</button>
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
            placeholder="Prompt template (e.g. 'Summarize the following:\n\n{{input}}')"
            value={promptTemplate}
            onChange={(e) => setPromptTemplate(e.target.value)}
            rows={3}
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
          <button type="submit" className="btn-primary">+ Create</button>
        </form>

        {/* Import / Export */}
        <div className="macros-io">
          <button className="btn-small" onClick={handleExport}>⬇ Export JSON</button>
          <button className="btn-small" onClick={() => fileRef.current?.click()} disabled={importing}>
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
              <div className="macro-item-header">
                <strong>{m.title}</strong>
                {m.global && <span className="macro-global-badge">global</span>}
              </div>
              <p className="macro-prompt">{m.promptTemplate.slice(0, 120)}…</p>
              <div className="macro-item-actions">
                {onUseMacro && (
                  <button className="btn-small" onClick={() => { onUseMacro(m.promptTemplate); onClose(); }}>
                    Use
                  </button>
                )}
                <button className="btn-small btn-danger" onClick={() => handleDelete(m.id)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
          {!macros.length && <li className="macro-empty">No quick actions yet.</li>}
        </ul>
      </div>
    </div>
  );
}
