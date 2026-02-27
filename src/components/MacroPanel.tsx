import { useState, useEffect } from 'react';

interface MacroSlot {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'date';
  options?: string[];
  required: boolean;
  default?: string;
}

interface Macro {
  id: string;
  title: string;
  category: string;
  description: string;
  slots: MacroSlot[];
  template: string;
}

interface Props {
  onResult: (result: string) => void;
  onClose: () => void;
}

export function MacroPanel({ onResult, onClose }: Props) {
  const [macros, setMacros] = useState<Macro[]>([]);
  const [selected, setSelected] = useState<Macro | null>(null);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    fetch('/api/macros', { credentials: 'include' })
      .then(r => r.json() as Promise<Macro[]>)
      .then(data => setMacros(data))
      .catch(() => {});
  }, []);

  const selectMacro = (macro: Macro) => {
    setSelected(macro);
    const defaults: Record<string, string> = {};
    for (const slot of macro.slots) {
      defaults[slot.name] = slot.default || '';
    }
    setVariables(defaults);
  };

  const executeMacro = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const res = await fetch('/api/macros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ macroId: selected.id, variables }),
      });
      const data = await res.json() as { result: string };
      if (data.result) {
        onResult(data.result);
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  const filteredMacros = macros.filter(m =>
    m.title.toLowerCase().includes(filter.toLowerCase()) ||
    m.category.toLowerCase().includes(filter.toLowerCase())
  );

  const categories = [...new Set(macros.map(m => m.category))];

  if (selected) {
    return (
      <div className="panel-content">
        <div className="panel-header">
          <button className="icon-btn" onClick={() => setSelected(null)}>←</button>
          <h3>{selected.title}</h3>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <p className="panel-desc">{selected.description}</p>
        <div className="macro-form">
          {selected.slots.map(slot => (
            <div key={slot.name} className="form-field">
              <label>{slot.label}{slot.required && ' *'}</label>
              {slot.type === 'select' && slot.options ? (
                <select
                  value={variables[slot.name] || ''}
                  onChange={e => setVariables(v => ({ ...v, [slot.name]: e.target.value }))}
                >
                  <option value="">Select…</option>
                  {slot.options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input
                  type={slot.type === 'number' ? 'number' : 'text'}
                  value={variables[slot.name] || ''}
                  onChange={e => setVariables(v => ({ ...v, [slot.name]: e.target.value }))}
                  placeholder={slot.label}
                />
              )}
            </div>
          ))}
          <button className="btn-primary" onClick={executeMacro} disabled={loading}>
            {loading ? 'Running…' : selected.category === 'calculator' ? '🔢 Calculate' : '📝 Generate'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="panel-content">
      <div className="panel-header">
        <h3>📋 Macros & Calculators</h3>
        <button className="icon-btn" onClick={onClose}>✕</button>
      </div>
      <input
        className="panel-search"
        type="text"
        placeholder="Search macros…"
        value={filter}
        onChange={e => setFilter(e.target.value)}
      />
      {categories.map(cat => {
        const catMacros = filteredMacros.filter(m => m.category === cat);
        if (catMacros.length === 0) return null;
        return (
          <div key={cat} className="macro-category">
            <h4>{cat === 'calculator' ? '🔢 Calculators' : '📝 Templates'}</h4>
            {catMacros.map(m => (
              <button key={m.id} className="macro-item" onClick={() => selectMacro(m)}>
                <span className="macro-item-title">{m.title}</span>
                <span className="macro-item-desc">{m.description}</span>
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );
}
