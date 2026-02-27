import { useState, useEffect } from 'react';
import type { WorkflowTemplate, WorkflowStep, WorkflowInstance } from '../lib/types';

interface WorkflowWizardProps {
  onClose: () => void;
}

export default function WorkflowWizard({ onClose }: WorkflowWizardProps) {
  const [templates, setTemplates] = useState<
    { id: string; title: string; description: string; category: string; stepsCount: number }[]
  >([]);
  const [instance, setInstance] = useState<WorkflowInstance | null>(null);
  const [template, setTemplate] = useState<WorkflowTemplate | null>(null);
  const [currentStep, setCurrentStep] = useState<WorkflowStep | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [checklistState, setChecklistState] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/workflows', { credentials: 'include' });
      if (res.ok) {
        const data = (await res.json()) as { templates: typeof templates };
        setTemplates(data.templates);
      }
    } catch {
      /* ignore */
    }
    setLoading(false);
  };

  const startWorkflow = async (templateId: string) => {
    const res = await fetch('/api/workflows', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'start', templateId }),
    });
    if (res.ok) {
      const data = (await res.json()) as { instance: WorkflowInstance; template: WorkflowTemplate };
      setInstance(data.instance);
      setTemplate(data.template);
      const step = data.template.steps.find((s) => s.id === data.instance.currentStepId);
      setCurrentStep(step || null);
      setFormData({});
      setChecklistState({});
    }
  };

  const advanceStep = async (nextStepId?: string) => {
    if (!instance) return;
    const res = await fetch('/api/workflows', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'advance',
        instanceId: instance.id,
        data: { ...formData, [`${currentStep?.id}_checklist`]: checklistState },
        nextStepId,
      }),
    });
    if (res.ok) {
      const data = (await res.json()) as { instance: WorkflowInstance; template: WorkflowTemplate };
      setInstance(data.instance);
      setTemplate(data.template);
      if (data.instance.status === 'completed') {
        setCurrentStep(null);
      } else {
        const step = data.template.steps.find((s) => s.id === data.instance.currentStepId);
        setCurrentStep(step || null);
      }
      setFormData({});
      setChecklistState({});
    }
  };

  const abandonWorkflow = async () => {
    if (!instance) return;
    await fetch('/api/workflows', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'abandon', instanceId: instance.id }),
    });
    setInstance(null);
    setTemplate(null);
    setCurrentStep(null);
  };

  // Template selection screen
  if (!instance) {
    return (
      <div className="side-panel workflow-panel">
        <div className="side-panel-header">
          <h3>📋 Guided Workflows</h3>
          <button className="btn-small" onClick={onClose}>
            ✕
          </button>
        </div>
        {loading ? (
          <div className="loading-text">Loading...</div>
        ) : (
          <div className="workflow-template-list">
            {templates.map((t) => (
              <div
                key={t.id}
                className="workflow-template-card"
                onClick={() => startWorkflow(t.id)}
              >
                <div className="workflow-template-title">{t.title}</div>
                <div className="workflow-template-desc">{t.description}</div>
                <div className="workflow-template-meta">
                  <span className="workflow-category">{t.category}</span>
                  <span>{t.stepsCount} steps</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Workflow completed
  if (instance.status === 'completed') {
    return (
      <div className="side-panel workflow-panel">
        <div className="side-panel-header">
          <h3>📋 {template?.title}</h3>
          <button className="btn-small" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="workflow-completed">
          <div className="workflow-completed-icon">✅</div>
          <h3>Workflow Complete!</h3>
          <p>All steps have been completed successfully.</p>
          <div className="workflow-completed-summary">
            <strong>Steps completed:</strong> {instance.completedSteps.length}
          </div>
          <button
            className="btn-primary"
            onClick={() => {
              setInstance(null);
              setTemplate(null);
            }}
          >
            Start Another Workflow
          </button>
        </div>
      </div>
    );
  }

  // Progress bar
  const totalSteps = template?.steps.length || 1;
  const completedCount = instance.completedSteps.length;
  const progress = Math.round((completedCount / totalSteps) * 100);

  return (
    <div className="side-panel workflow-panel">
      <div className="side-panel-header">
        <h3>📋 {template?.title}</h3>
        <button className="btn-small" onClick={onClose}>
          ✕
        </button>
      </div>

      {/* Progress */}
      <div className="workflow-progress">
        <div className="workflow-progress-bar">
          <div className="workflow-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="workflow-progress-text">
          Step {completedCount + 1} of {totalSteps} ({progress}%)
        </div>
      </div>

      {currentStep && (
        <div className="workflow-step">
          <h4 className="workflow-step-title">{currentStep.title}</h4>
          <p className="workflow-step-desc">{currentStep.description}</p>

          {/* Input fields */}
          {currentStep.type === 'input' && currentStep.fields && (
            <div className="workflow-fields">
              {currentStep.fields.map((field) => (
                <div key={field.name} className="workflow-field">
                  <label>
                    {field.label} {field.required && <span className="required">*</span>}
                  </label>
                  {field.type === 'textarea' ? (
                    <textarea
                      value={formData[field.name] || ''}
                      onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                      rows={3}
                    />
                  ) : field.type === 'select' ? (
                    <select
                      value={formData[field.name] || ''}
                      onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                    >
                      <option value="">Select...</option>
                      {field.options?.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type}
                      value={formData[field.name] || ''}
                      onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                    />
                  )}
                </div>
              ))}
              <button className="btn-primary" onClick={() => advanceStep()}>
                Continue →
              </button>
            </div>
          )}

          {/* Choice/branching */}
          {currentStep.type === 'choice' && currentStep.choices && (
            <div className="workflow-choices">
              {currentStep.choices.map((choice) => (
                <button
                  key={choice.nextStepId}
                  className="workflow-choice-btn"
                  onClick={() => advanceStep(choice.nextStepId)}
                >
                  {choice.label}
                </button>
              ))}
            </div>
          )}

          {/* Checklist */}
          {currentStep.type === 'checklist' && currentStep.checklistItems && (
            <div className="workflow-checklist">
              {currentStep.checklistItems.map((item, i) => (
                <label key={i} className="workflow-checklist-item">
                  <input
                    type="checkbox"
                    checked={checklistState[`item-${i}`] || false}
                    onChange={(e) =>
                      setChecklistState({ ...checklistState, [`item-${i}`]: e.target.checked })
                    }
                  />
                  <span>{item}</span>
                </label>
              ))}
              <button className="btn-primary" onClick={() => advanceStep()}>
                Continue →
              </button>
            </div>
          )}

          {/* Info step */}
          {currentStep.type === 'info' && (
            <button className="btn-primary" onClick={() => advanceStep()}>
              {currentStep.nextStepId ? 'Continue →' : 'Complete ✓'}
            </button>
          )}
        </div>
      )}

      <div className="workflow-actions">
        <button className="btn-secondary" onClick={abandonWorkflow}>
          Abandon Workflow
        </button>
      </div>
    </div>
  );
}
