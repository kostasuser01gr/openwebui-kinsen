import { useState, useEffect } from 'react';

interface ChecklistItem {
  id: string;
  label: string;
  required: boolean;
  helpText?: string;
}

interface ChecklistTemplate {
  id: string;
  title: string;
  description: string;
  items: ChecklistItem[];
}

interface Props {
  onClose: () => void;
}

export function ChecklistPanel({ onClose }: Props) {
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [selected, setSelected] = useState<ChecklistTemplate | null>(null);
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [rentalId, setRentalId] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/checklists', { credentials: 'include' })
      .then((r) => r.json() as Promise<ChecklistTemplate[]>)
      .then((data) => setTemplates(data))
      .catch(() => {});
  }, []);

  const toggleItem = (itemId: string) => {
    setChecks((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
    setSaved(false);
  };

  const saveChecklist = async () => {
    if (!selected || !rentalId) return;
    setSaving(true);
    try {
      await fetch('/api/checklists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          templateId: selected.id,
          rentalId,
          items: checks,
        }),
      });
      setSaved(true);
    } catch {
      /* ignore */
    }
    setSaving(false);
  };

  if (selected) {
    const requiredItems = selected.items.filter((i) => i.required);
    const requiredDone = requiredItems.filter((i) => checks[i.id]).length;
    const totalChecked = Object.values(checks).filter(Boolean).length;
    const progress = Math.round((totalChecked / selected.items.length) * 100);
    const allRequiredDone = requiredDone === requiredItems.length;

    return (
      <div className="panel-content">
        <div className="panel-header">
          <button
            className="icon-btn"
            onClick={() => {
              setSelected(null);
              setChecks({});
              setRentalId('');
            }}
          >
            ←
          </button>
          <h3>{selected.title}</h3>
          <button className="icon-btn" onClick={onClose}>
            ✕
          </button>
        </div>
        <p className="panel-desc">{selected.description}</p>

        <div className="form-field">
          <label>Rental / Reference ID *</label>
          <input
            type="text"
            value={rentalId}
            onChange={(e) => setRentalId(e.target.value)}
            placeholder="e.g., RNT-2025-1234"
          />
        </div>

        <div className="checklist-progress">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span>
            {totalChecked}/{selected.items.length} items · {requiredDone}/{requiredItems.length}{' '}
            required
          </span>
        </div>

        <div className="checklist-items">
          {selected.items.map((item) => (
            <label key={item.id} className={`checklist-item ${checks[item.id] ? 'checked' : ''}`}>
              <input
                type="checkbox"
                checked={checks[item.id] || false}
                onChange={() => toggleItem(item.id)}
              />
              <div>
                <span className="checklist-label">
                  {item.label}
                  {item.required && <span className="required-badge">Required</span>}
                </span>
                {item.helpText && <small className="checklist-help">{item.helpText}</small>}
              </div>
            </label>
          ))}
        </div>

        <div className="checklist-actions">
          <button className="btn-primary" onClick={saveChecklist} disabled={saving || !rentalId}>
            {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Checklist'}
          </button>
          {allRequiredDone && rentalId && (
            <span className="checklist-complete">✅ All required items complete!</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="panel-content">
      <div className="panel-header">
        <h3>✅ Operational Checklists</h3>
        <button className="icon-btn" onClick={onClose}>
          ✕
        </button>
      </div>
      <div className="checklist-templates">
        {templates.map((t) => (
          <button key={t.id} className="macro-item" onClick={() => setSelected(t)}>
            <span className="macro-item-title">{t.title}</span>
            <span className="macro-item-desc">
              {t.description} · {t.items.length} items
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
