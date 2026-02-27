import { useState, useEffect } from 'react';
import type { Escalation } from '../lib/types';

interface EscalationPanelProps {
  onClose: () => void;
  sessionId?: string;
  lastMessage?: string;
}

export default function EscalationPanel({ onClose, sessionId, lastMessage }: EscalationPanelProps) {
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [showForm, setShowForm] = useState(!!sessionId);
  const [reason, setReason] = useState('');
  const [priority, setPriority] = useState<string>('medium');
  const [filter, setFilter] = useState('open');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadEscalations(); }, [filter]);

  const loadEscalations = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/escalations?status=${filter}`, { credentials: 'include' });
      if (res.ok) setEscalations(await res.json() as Escalation[]);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const createEscalation = async () => {
    if (!reason.trim()) return;
    await fetch('/api/escalations', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sessionId || 'manual', reason, priority, lastMessage: lastMessage || '' }),
    });
    setShowForm(false);
    setReason('');
    loadEscalations();
  };

  const updateEscalation = async (id: string, status: string, resolution?: string) => {
    await fetch('/api/escalations', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status, resolution }),
    });
    loadEscalations();
  };

  const priorityColors: Record<string, string> = {
    low: '#6b7280', medium: '#f59e0b', high: '#f97316', urgent: '#ef4444',
  };

  const statusIcons: Record<string, string> = {
    open: '🔴', claimed: '🟡', resolved: '🟢',
  };

  return (
    <div className="side-panel escalation-panel">
      <div className="side-panel-header">
        <h3>🔴 Escalations</h3>
        <button className="btn-small" onClick={onClose}>✕</button>
      </div>

      {/* Filter tabs */}
      <div className="escalation-filters">
        {['open', 'claimed', 'resolved'].map(s => (
          <button key={s} className={`btn-small ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>
            {statusIcons[s]} {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
        <button className="btn-primary btn-small" onClick={() => setShowForm(true)}>+ New</button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="escalation-form">
          <h4>Create Escalation</h4>
          <div className="workflow-field">
            <label>Reason <span className="required">*</span></label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} placeholder="Describe the issue..." />
          </div>
          <div className="workflow-field">
            <label>Priority</label>
            <select value={priority} onChange={e => setPriority(e.target.value)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div className="escalation-form-actions">
            <button className="btn-primary" onClick={createEscalation}>Submit Escalation</button>
            <button className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Escalation list */}
      <div className="escalation-list">
        {loading && <div className="loading-text">Loading...</div>}
        {!loading && escalations.length === 0 && (
          <div className="escalation-empty">No {filter} escalations</div>
        )}
        {escalations.map(esc => (
          <div key={esc.id} className="escalation-card">
            <div className="escalation-card-header">
              <span className="escalation-id">{esc.id}</span>
              <span className="escalation-priority" style={{ color: priorityColors[esc.priority] }}>
                ● {esc.priority}
              </span>
            </div>
            <div className="escalation-reason">{esc.reason}</div>
            <div className="escalation-meta">
              <span>From: {esc.fromUserName}</span>
              {esc.assignedTo && <span>Assigned: {esc.assignedTo}</span>}
              <span>{new Date(esc.createdAt).toLocaleString()}</span>
            </div>
            {esc.lastMessage && (
              <div className="escalation-last-msg">"{esc.lastMessage.slice(0, 100)}"</div>
            )}
            {esc.status === 'open' && (
              <div className="escalation-actions">
                <button className="btn-small" onClick={() => updateEscalation(esc.id, 'claimed')}>Claim</button>
              </div>
            )}
            {esc.status === 'claimed' && (
              <div className="escalation-actions">
                <button className="btn-primary btn-small" onClick={() => {
                  const res = prompt('Resolution note:');
                  if (res) updateEscalation(esc.id, 'resolved', res);
                }}>Resolve</button>
              </div>
            )}
            {esc.resolution && (
              <div className="escalation-resolution">✅ {esc.resolution}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
