import { describe, it, expect } from 'vitest';
import { MACROS, executeMacro } from '../src/lib/macros';

describe('MACROS', () => {
  it('has at least 5 built-in macros', () => {
    expect(MACROS.length).toBeGreaterThanOrEqual(5);
  });

  it('each macro has required fields', () => {
    for (const macro of MACROS) {
      expect(macro.id).toBeTruthy();
      expect(macro.title).toBeTruthy();
      expect(macro.category).toBeTruthy();
      expect(macro.slots).toBeInstanceOf(Array);
      expect(macro.template).toBeTruthy();
    }
  });
});

describe('executeMacro', () => {
  it('calculates late fee for 2 hours at €50/day', () => {
    const macro = MACROS.find((m) => m.id === 'late-fee-calc')!;
    const result = executeMacro(macro, { hours_late: '2', daily_rate: '50' });
    expect(result).toContain('€25.00');
    expect(result).toContain('50%');
  });

  it('calculates late fee for 6 hours (full day)', () => {
    const macro = MACROS.find((m) => m.id === 'late-fee-calc')!;
    const result = executeMacro(macro, { hours_late: '6', daily_rate: '80' });
    expect(result).toContain('€80.00');
    expect(result).toContain('full extra day');
  });

  it('calculates fuel charge for 20 missing litres', () => {
    const macro = MACROS.find((m) => m.id === 'fuel-charge-calc')!;
    const result = executeMacro(macro, {
      missing_litres: '20',
      is_electric: 'No',
      missing_kwh: '0',
    });
    expect(result).toContain('€75.00');
  });

  it('calculates EV charge fee', () => {
    const macro = MACROS.find((m) => m.id === 'fuel-charge-calc')!;
    const result = executeMacro(macro, {
      missing_litres: '0',
      is_electric: 'Yes',
      missing_kwh: '30',
    });
    expect(result).toContain('EV');
    expect(result).toContain('€25.50');
  });

  it('calculates mileage overage for economy', () => {
    const macro = MACROS.find((m) => m.id === 'mileage-overage-calc')!;
    const result = executeMacro(macro, {
      km_driven: '1500',
      km_included: '1000',
      vehicle_class: 'Economy',
    });
    expect(result).toContain('500');
    expect(result).toContain('€125.00');
  });

  it('shows no overage when under limit', () => {
    const macro = MACROS.find((m) => m.id === 'mileage-overage-calc')!;
    const result = executeMacro(macro, {
      km_driven: '800',
      km_included: '1000',
      vehicle_class: 'Midsize',
    });
    expect(result).toContain('No overage');
  });

  it('calculates deposit lookup for luxury', () => {
    const macro = MACROS.find((m) => m.id === 'deposit-lookup')!;
    const result = executeMacro(macro, { vehicle_class: 'Luxury' });
    expect(result).toContain('€1000');
  });

  it('calculates free cancellation for 72h notice', () => {
    const macro = MACROS.find((m) => m.id === 'cancellation-fee-calc')!;
    const result = executeMacro(macro, {
      hours_before: '72',
      daily_rate: '60',
      booking_type: 'Pay at Counter',
      total_prepaid: '0',
    });
    expect(result).toContain('Free cancellation');
  });

  it('generates late return email template', () => {
    const macro = MACROS.find((m) => m.id === 'email-late-return')!;
    const result = executeMacro(macro, {
      customer_name: 'John Smith',
      vehicle: 'VW Golf AB-1234',
      scheduled_time: '14:00',
      branch: 'Athens Airport',
    });
    expect(result).toContain('John Smith');
    expect(result).toContain('VW Golf AB-1234');
    expect(result).toContain('Athens Airport');
  });

  it('replaces all template variables', () => {
    const macro = MACROS.find((m) => m.id === 'email-damage-notification')!;
    const result = executeMacro(macro, {
      customer_name: 'Maria',
      vehicle: 'Fiat 500',
      rental_id: 'RNT-001',
      damage_description: 'Rear bumper scratch',
      estimated_cost: '350',
      insurance_package: 'Basic (€1,200 deductible)',
    });
    expect(result).toContain('Maria');
    expect(result).toContain('Fiat 500');
    expect(result).toContain('RNT-001');
    expect(result).toContain('Rear bumper scratch');
    expect(result).not.toContain('{{');
  });
});
