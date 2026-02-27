import { useState, useEffect } from 'react';
import type { FeatureFlag } from '../../lib/types';

export default function FlagsTab() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadFlags(); }, []);

  const loadFlags = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/flags', { credentials: 'include' });
      if (res.ok) setFlags(await res.json() as FeatureFlag[]);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const toggleFlag = async (id: string, enabled: boolean) => {
    await fetch('/api/admin/flags', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, enabled }),
    });
    setFlags(prev => prev.map(f => f.id === id ? { ...f, enabled } : f));
  };

  const resetDefaults = async () => {
    if (!confirm('Reset all flags to defaults?')) return;
    const res = await fetch('/api/admin/flags', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) {
      const data = await res.json() as { flags: FeatureFlag[] };
      setFlags(data.flags);
    }
  };

  if (loading) return <div className="loading-text">Loading flags...</div>;

  return (
    <div className="flags-tab">
      <div className="flags-header">
        <h3>Feature Flags</h3>
        <button className="btn-secondary btn-small" onClick={resetDefaults}>Reset to Defaults</button>
      </div>
      <div className="flags-list">
        {flags.map(flag => (
          <div key={flag.id} className={`flag-card ${flag.enabled ? 'enabled' : 'disabled'}`}>
            <div className="flag-card-header">
              <strong>{flag.name}</strong>
              <label className="toggle-switch">
                <input type="checkbox" checked={flag.enabled} onChange={e => toggleFlag(flag.id, e.target.checked)} />
                <span className="toggle-slider" />
              </label>
            </div>
            <div className="flag-description">{flag.description}</div>
            {flag.updatedAt && (
              <div className="flag-meta">Last updated: {new Date(flag.updatedAt).toLocaleString()} by {flag.updatedBy}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
