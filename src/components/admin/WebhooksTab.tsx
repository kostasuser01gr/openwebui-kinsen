import { useState, useEffect } from 'react';
import type { Webhook, WebhookEvent } from '../../lib/types';

const ALL_EVENTS: WebhookEvent[] = [
  'chat.message',
  'escalation.created',
  'escalation.resolved',
  'feedback.submitted',
  'knowledge.updated',
  'checklist.completed',
  'vehicle.status_changed',
];

export default function WebhooksTab() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newEvents, setNewEvents] = useState<WebhookEvent[]>([]);

  useEffect(() => {
    loadWebhooks();
  }, []);

  const loadWebhooks = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/webhooks', { credentials: 'include' });
      if (res.ok) setWebhooks((await res.json()) as Webhook[]);
    } catch {
      /* ignore */
    }
    setLoading(false);
  };

  const createWebhook = async () => {
    if (!newUrl || !newEvents.length) return;
    await fetch('/api/admin/webhooks', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: newUrl, events: newEvents }),
    });
    setShowForm(false);
    setNewUrl('');
    setNewEvents([]);
    loadWebhooks();
  };

  const toggleActive = async (id: string, active: boolean) => {
    await fetch('/api/admin/webhooks', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, active }),
    });
    setWebhooks((prev) => prev.map((w) => (w.id === id ? { ...w, active } : w)));
  };

  const deleteWebhook = async (id: string) => {
    if (!confirm('Delete this webhook?')) return;
    await fetch(`/api/admin/webhooks?id=${id}`, { method: 'DELETE', credentials: 'include' });
    setWebhooks((prev) => prev.filter((w) => w.id !== id));
  };

  const toggleEvent = (event: WebhookEvent) => {
    setNewEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event],
    );
  };

  if (loading) return <div className="loading-text">Loading webhooks...</div>;

  return (
    <div className="webhooks-tab">
      <div className="webhooks-header">
        <h3>Webhooks</h3>
        <button className="btn-primary btn-small" onClick={() => setShowForm(true)}>
          + Add Webhook
        </button>
      </div>

      {showForm && (
        <div className="webhook-form">
          <div className="workflow-field">
            <label>Endpoint URL</label>
            <input
              type="url"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className="workflow-field">
            <label>Events</label>
            <div className="webhook-events-grid">
              {ALL_EVENTS.map((event) => (
                <label key={event} className="webhook-event-checkbox">
                  <input
                    type="checkbox"
                    checked={newEvents.includes(event)}
                    onChange={() => toggleEvent(event)}
                  />
                  {event}
                </label>
              ))}
            </div>
          </div>
          <div className="escalation-form-actions">
            <button className="btn-primary" onClick={createWebhook}>
              Create Webhook
            </button>
            <button className="btn-secondary" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="webhooks-list">
        {webhooks.length === 0 && <div className="escalation-empty">No webhooks configured</div>}
        {webhooks.map((wh) => (
          <div key={wh.id} className={`webhook-card ${wh.active ? '' : 'inactive'}`}>
            <div className="webhook-card-header">
              <code className="webhook-url">{wh.url}</code>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={wh.active}
                  onChange={(e) => toggleActive(wh.id, e.target.checked)}
                />
                <span className="toggle-slider" />
              </label>
            </div>
            <div className="webhook-events">
              {wh.events.map((e) => (
                <span key={e} className="webhook-event-tag">
                  {e}
                </span>
              ))}
            </div>
            <div className="webhook-meta">
              <span>Created: {new Date(wh.createdAt).toLocaleDateString()}</span>
              {wh.lastTriggered && (
                <span>Last fired: {new Date(wh.lastTriggered).toLocaleString()}</span>
              )}
              {wh.failCount > 0 && (
                <span className="webhook-fails">⚠️ {wh.failCount} failures</span>
              )}
              <button className="btn-small btn-danger" onClick={() => deleteWebhook(wh.id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
