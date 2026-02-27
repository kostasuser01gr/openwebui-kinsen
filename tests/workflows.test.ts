import { describe, it, expect } from 'vitest';
import { WORKFLOW_TEMPLATES } from '../src/lib/workflows';

describe('WORKFLOW_TEMPLATES', () => {
  it('has at least 3 workflow templates', () => {
    expect(WORKFLOW_TEMPLATES.length).toBeGreaterThanOrEqual(3);
  });

  it('each template has required fields', () => {
    for (const wf of WORKFLOW_TEMPLATES) {
      expect(wf.id).toBeTruthy();
      expect(wf.title).toBeTruthy();
      expect(wf.description).toBeTruthy();
      expect(wf.category).toBeTruthy();
      expect(wf.steps.length).toBeGreaterThan(0);
      expect(wf.initialStepId).toBeTruthy();
    }
  });

  it('initial step exists in steps array', () => {
    for (const wf of WORKFLOW_TEMPLATES) {
      const initialStep = wf.steps.find(s => s.id === wf.initialStepId);
      expect(initialStep).toBeDefined();
    }
  });

  it('all nextStepId references point to existing steps', () => {
    for (const wf of WORKFLOW_TEMPLATES) {
      const stepIds = new Set(wf.steps.map(s => s.id));
      for (const step of wf.steps) {
        if (step.nextStepId) {
          expect(stepIds.has(step.nextStepId)).toBe(true);
        }
        if (step.choices) {
          for (const choice of step.choices) {
            expect(stepIds.has(choice.nextStepId)).toBe(true);
          }
        }
      }
    }
  });

  it('damage-claim workflow has branching', () => {
    const wf = WORKFLOW_TEMPLATES.find(w => w.id === 'damage-claim')!;
    const choiceSteps = wf.steps.filter(s => s.type === 'choice');
    expect(choiceSteps.length).toBeGreaterThanOrEqual(1);
  });

  it('new-rental-walkthrough has all expected step types', () => {
    const wf = WORKFLOW_TEMPLATES.find(w => w.id === 'new-rental-walkthrough')!;
    const types = new Set(wf.steps.map(s => s.type));
    expect(types.has('input')).toBe(true);
    expect(types.has('checklist')).toBe(true);
    expect(types.has('choice')).toBe(true);
  });
});

describe('Customer seed data', () => {
  it('has sample customers', async () => {
    const { SAMPLE_CUSTOMERS } = await import('../src/lib/seed-customers');
    expect(SAMPLE_CUSTOMERS.length).toBeGreaterThanOrEqual(5);
    for (const c of SAMPLE_CUSTOMERS) {
      expect(c.id).toBeTruthy();
      expect(c.name).toBeTruthy();
      expect(c.email).toBeTruthy();
      expect(c.loyaltyTier).toMatch(/^(bronze|silver|gold|platinum)$/);
    }
  });

  it('has sample bookings', async () => {
    const { SAMPLE_BOOKINGS } = await import('../src/lib/seed-customers');
    expect(SAMPLE_BOOKINGS.length).toBeGreaterThanOrEqual(5);
    for (const b of SAMPLE_BOOKINGS) {
      expect(b.id).toBeTruthy();
      expect(b.customerId).toBeTruthy();
      expect(b.vehicleClass).toBeTruthy();
      expect(b.dailyRate).toBeGreaterThan(0);
    }
  });

  it('has sample vehicles', async () => {
    const { SAMPLE_VEHICLES } = await import('../src/lib/seed-customers');
    expect(SAMPLE_VEHICLES.length).toBeGreaterThanOrEqual(10);
    for (const v of SAMPLE_VEHICLES) {
      expect(v.id).toBeTruthy();
      expect(v.plate).toBeTruthy();
      expect(v.status).toMatch(/^(available|rented|reserved|maintenance|cleaning|damaged)$/);
    }
  });

  it('bookings reference valid customers', async () => {
    const { SAMPLE_CUSTOMERS, SAMPLE_BOOKINGS } = await import('../src/lib/seed-customers');
    const custIds = new Set(SAMPLE_CUSTOMERS.map(c => c.id));
    for (const b of SAMPLE_BOOKINGS) {
      expect(custIds.has(b.customerId)).toBe(true);
    }
  });
});

describe('Feature flags', () => {
  it('has default flags', async () => {
    const { DEFAULT_FLAGS } = await import('../src/lib/feature-flags');
    expect(DEFAULT_FLAGS.length).toBeGreaterThanOrEqual(10);
    for (const f of DEFAULT_FLAGS) {
      expect(f.id).toBeTruthy();
      expect(f.name).toBeTruthy();
      expect(typeof f.enabled).toBe('boolean');
    }
  });

  it('openai flag is disabled by default', async () => {
    const { DEFAULT_FLAGS } = await import('../src/lib/feature-flags');
    const openai = DEFAULT_FLAGS.find(f => f.id === 'openai');
    expect(openai?.enabled).toBe(false);
  });
});
