import { useState } from 'react';
import type { GeneratedEmail } from '../lib/types';

interface EmailGeneratorProps {
  onClose: () => void;
  chatContext?: string;
}

const TEMPLATES = [
  { id: 'late-return', label: '⏰ Late Return Reminder', fields: ['customerName', 'vehiclePlate', 'vehicleClass', 'scheduledTime', 'scheduledDate', 'branch', 'dailyRate', 'agentName'] },
  { id: 'damage-notification', label: '⚠️ Damage Notification', fields: ['customerName', 'vehiclePlate', 'bookingId', 'damageDescription', 'damageLocation', 'estimatedCost', 'insurancePackage', 'customerCharge', 'agentName'] },
  { id: 'booking-confirmation', label: '✅ Booking Confirmation', fields: ['customerName', 'bookingId', 'vehicleClass', 'pickupDate', 'pickupBranch', 'returnDate', 'returnBranch', 'dailyRate', 'insurancePackage', 'extras', 'totalAmount', 'depositAmount', 'agentName'] },
  { id: 'cancellation-confirmation', label: '❌ Cancellation Confirmation', fields: ['customerName', 'bookingId', 'pickupDate', 'pickupBranch', 'vehicleClass', 'cancellationFee', 'refundAmount', 'agentName'] },
  { id: 'refund-confirmation', label: '💰 Refund Confirmation', fields: ['customerName', 'bookingId', 'refundAmount', 'refundReason', 'cardLast4', 'refundReference', 'agentName'] },
];

export default function EmailGenerator({ onClose, chatContext }: EmailGeneratorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [generated, setGenerated] = useState<GeneratedEmail | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const template = TEMPLATES.find(t => t.id === selectedTemplate);

  const generate = async () => {
    if (!selectedTemplate) return;
    setLoading(true);
    try {
      const res = await fetch('/api/email', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: selectedTemplate, variables }),
      });
      if (res.ok) setGenerated(await res.json() as GeneratedEmail);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const copyToClipboard = async () => {
    if (!generated) return;
    const text = `Subject: ${generated.subject}\n\n${generated.body}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatLabel = (field: string) =>
    field.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());

  return (
    <div className="side-panel email-generator-panel">
      <div className="side-panel-header">
        <h3>✉️ Email Generator</h3>
        <button className="btn-small" onClick={onClose}>✕</button>
      </div>

      {!generated ? (
        <>
          <div className="email-template-select">
            <label>Choose Template</label>
            <select value={selectedTemplate} onChange={e => { setSelectedTemplate(e.target.value); setVariables({}); }}>
              <option value="">Select a template...</option>
              {TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>

          {template && (
            <div className="email-fields">
              {template.fields.map(field => (
                <div key={field} className="email-field">
                  <label>{formatLabel(field)}</label>
                  <input
                    type="text"
                    value={variables[field] || ''}
                    onChange={e => setVariables({ ...variables, [field]: e.target.value })}
                    placeholder={formatLabel(field)}
                  />
                </div>
              ))}
              {chatContext && (
                <div className="email-context-note">
                  💡 Chat context available — fields may be auto-suggested
                </div>
              )}
              <button className="btn-primary" onClick={generate} disabled={loading}>
                {loading ? 'Generating...' : '✉️ Generate Email'}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="email-preview">
          <div className="email-preview-header">
            {generated.to && <div><strong>To:</strong> {generated.to}</div>}
            <div><strong>Subject:</strong> {generated.subject}</div>
          </div>
          <div className="email-preview-body">
            <pre>{generated.body}</pre>
          </div>
          <div className="email-preview-actions">
            <button className="btn-primary" onClick={copyToClipboard}>
              {copied ? '✅ Copied!' : '📋 Copy to Clipboard'}
            </button>
            <button className="btn-secondary" onClick={() => setGenerated(null)}>← Edit</button>
            <button className="btn-secondary" onClick={() => { setGenerated(null); setSelectedTemplate(''); setVariables({}); }}>New Email</button>
          </div>
        </div>
      )}
    </div>
  );
}
