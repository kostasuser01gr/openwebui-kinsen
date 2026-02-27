import { useState, useEffect } from 'react';

interface OnboardingTourProps {
  onComplete: () => void;
}

const STEPS = [
  {
    title: 'Welcome to Kinsen Chat! 🚗',
    description: 'Your all-in-one car rental operations platform. Ask questions about policies, run calculators, complete checklists, and manage your fleet.',
    icon: '👋',
  },
  {
    title: 'Smart Chat',
    description: 'Type any question about car rental operations. Get instant, citation-backed answers from your knowledge base. Use 👍/👎 to rate answers.',
    icon: '💬',
  },
  {
    title: 'Tools & Calculators',
    description: 'Open the side panel for macros (late fee calculator, fuel charges, email templates), checklists (pickup, return, accident), and guided workflows.',
    icon: '🧮',
  },
  {
    title: 'Keyboard Shortcuts',
    description: '⌘K — Command palette · ↑ — Edit last message · ⌘⇧M — Macros · Esc — Clear input. You\'re ready to go!',
    icon: '⌨️',
  },
];

export default function OnboardingTour({ onComplete }: OnboardingTourProps) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const done = localStorage.getItem('kinsen-onboarding-done');
    if (done) { setVisible(false); onComplete(); }
  }, [onComplete]);

  if (!visible) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const finish = () => {
    localStorage.setItem('kinsen-onboarding-done', 'true');
    setVisible(false);
    onComplete();
  };

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-card">
        <div className="onboarding-progress">
          {STEPS.map((_, i) => (
            <div key={i} className={`onboarding-dot ${i === step ? 'active' : i < step ? 'done' : ''}`} />
          ))}
        </div>
        <div className="onboarding-icon">{current.icon}</div>
        <h2 className="onboarding-title">{current.title}</h2>
        <p className="onboarding-desc">{current.description}</p>
        <div className="onboarding-actions">
          <button className="btn-secondary" onClick={finish}>Skip</button>
          {isLast ? (
            <button className="btn-primary" onClick={finish}>Get Started</button>
          ) : (
            <button className="btn-primary" onClick={() => setStep(s => s + 1)}>Next →</button>
          )}
        </div>
        <div className="onboarding-step-count">{step + 1} of {STEPS.length}</div>
      </div>
    </div>
  );
}
