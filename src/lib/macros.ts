import type { MacroTemplate } from './types';

/**
 * Built-in car rental macro templates and calculators.
 */
export const MACROS: MacroTemplate[] = [
  {
    id: 'late-fee-calc',
    title: 'Late Return Fee Calculator',
    category: 'calculator',
    description: 'Calculate the late return fee based on hours late and daily rate.',
    slots: [
      { name: 'hours_late', label: 'Hours Late', type: 'number', required: true },
      { name: 'daily_rate', label: 'Daily Rate (€)', type: 'number', required: true },
    ],
    template: '**Late Return Fee Calculation**\nHours late: {{hours_late}}h\nDaily rate: €{{daily_rate}}\n\n{{result}}',
    formula: `
      const hours = Number(vars.hours_late);
      const rate = Number(vars.daily_rate);
      if (hours <= 0) return 'No late fee — within grace period.';
      if (hours <= 0.48) return 'Within 29-min grace period. No charge.';
      if (hours <= 4) return 'Fee: €' + (rate * 0.5).toFixed(2) + ' (50% of daily rate for 30min–4h late)';
      if (hours <= 24) return 'Fee: €' + rate.toFixed(2) + ' (full extra day charge for 4h+ late)';
      const extraDays = Math.ceil(hours / 24);
      return 'Fee: €' + (rate * extraDays).toFixed(2) + ' (' + extraDays + ' extra day(s) charged)';
    `,
  },
  {
    id: 'fuel-charge-calc',
    title: 'Fuel Charge Calculator',
    category: 'calculator',
    description: 'Calculate the refueling charge for a vehicle not returned full.',
    slots: [
      { name: 'missing_litres', label: 'Missing Litres', type: 'number', required: true },
      { name: 'is_electric', label: 'Electric Vehicle?', type: 'select', options: ['No', 'Yes'], required: true },
      { name: 'missing_kwh', label: 'Missing kWh (EV only)', type: 'number', required: false },
    ],
    template: '**Fuel/Charge Calculation**\n\n{{result}}',
    formula: `
      if (vars.is_electric === 'Yes') {
        const kwh = Number(vars.missing_kwh) || 0;
        const fee = kwh * 0.35 + 15;
        return 'EV charge fee: €' + fee.toFixed(2) + ' (' + kwh + ' kWh × €0.35 + €15 service fee)';
      }
      const litres = Number(vars.missing_litres);
      const fee = litres * 2.50 + 25;
      return 'Fuel charge: €' + fee.toFixed(2) + ' (' + litres + 'L × €2.50 + €25 service fee)';
    `,
  },
  {
    id: 'mileage-overage-calc',
    title: 'Mileage Overage Calculator',
    category: 'calculator',
    description: 'Calculate excess mileage charges.',
    slots: [
      { name: 'km_driven', label: 'Total KM Driven', type: 'number', required: true },
      { name: 'km_included', label: 'KM Included in Rental', type: 'number', required: true },
      { name: 'vehicle_class', label: 'Vehicle Class', type: 'select', options: ['Economy', 'Compact', 'Midsize', 'SUV', 'Premium', 'Luxury'], required: true },
    ],
    template: '**Mileage Overage Calculation**\nDriven: {{km_driven}} km | Included: {{km_included}} km\nVehicle class: {{vehicle_class}}\n\n{{result}}',
    formula: `
      const driven = Number(vars.km_driven);
      const included = Number(vars.km_included);
      const excess = Math.max(0, driven - included);
      if (excess === 0) return '✅ No overage — ' + driven + ' km driven, ' + included + ' km included.';
      const premium = ['Premium', 'Luxury'].includes(vars.vehicle_class);
      const rate = premium ? 0.45 : 0.25;
      const fee = excess * rate;
      return '⚠️ Excess: ' + excess + ' km × €' + rate.toFixed(2) + '/km = **€' + fee.toFixed(2) + '**';
    `,
  },
  {
    id: 'deposit-lookup',
    title: 'Deposit Amount Lookup',
    category: 'calculator',
    description: 'Look up the required deposit based on vehicle class.',
    slots: [
      { name: 'vehicle_class', label: 'Vehicle Class', type: 'select', options: ['Economy', 'Compact', 'Midsize', 'SUV', 'Premium', 'Luxury'], required: true },
    ],
    template: '**Deposit Requirement**\nVehicle class: {{vehicle_class}}\n\n{{result}}',
    formula: `
      const deposits = { Economy: 300, Compact: 300, Midsize: 500, SUV: 500, Premium: 1000, Luxury: 1000 };
      const amount = deposits[vars.vehicle_class] || 500;
      return '💳 Required deposit hold: **€' + amount + '**\\n- Credit card required\\n- Released 5–10 business days after return';
    `,
  },
  {
    id: 'cancellation-fee-calc',
    title: 'Cancellation Fee Calculator',
    category: 'calculator',
    description: 'Calculate the cancellation fee based on notice period and booking type.',
    slots: [
      { name: 'hours_before', label: 'Hours Before Pickup', type: 'number', required: true },
      { name: 'daily_rate', label: 'First Day Rate (€)', type: 'number', required: true },
      { name: 'booking_type', label: 'Booking Type', type: 'select', options: ['Pay at Counter', 'Prepaid'], required: true },
      { name: 'total_prepaid', label: 'Total Prepaid (€, if prepaid)', type: 'number', required: false },
    ],
    template: '**Cancellation Fee**\nNotice: {{hours_before}}h before pickup | Booking: {{booking_type}}\n\n{{result}}',
    formula: `
      const hours = Number(vars.hours_before);
      const daily = Number(vars.daily_rate);
      const prepaid = Number(vars.total_prepaid) || 0;
      if (hours >= 48) return '✅ **Free cancellation** — more than 48 hours notice.';
      if (hours >= 24) return '⚠️ Fee: **€' + (daily * 0.5).toFixed(2) + '** (50% of first day for 24–48h notice)';
      if (vars.booking_type === 'Prepaid') {
        const fee = Math.max(prepaid * 0.2, 50);
        return '⚠️ Prepaid cancellation fee: **€' + fee.toFixed(2) + '** (20% of total or €50, whichever greater)';
      }
      return '⚠️ Fee: **€' + daily.toFixed(2) + '** (full first day — less than 24h notice)';
    `,
  },
  {
    id: 'email-late-return',
    title: 'Late Return Notification Email',
    category: 'template',
    description: 'Email template for notifying a customer about their late return.',
    slots: [
      { name: 'customer_name', label: 'Customer Name', type: 'text', required: true },
      { name: 'vehicle', label: 'Vehicle (e.g., VW Golf AB-1234)', type: 'text', required: true },
      { name: 'scheduled_time', label: 'Scheduled Return Time', type: 'text', required: true },
      { name: 'branch', label: 'Branch Name', type: 'text', required: true },
    ],
    template: `Subject: Kinsen Rentals — Overdue Vehicle Return

Dear {{customer_name}},

We noticed that your rental vehicle ({{vehicle}}) was scheduled for return at {{scheduled_time}} at our {{branch}} branch.

As per our Late Return Policy:
- 30 min – 4 hours late: 50% of daily rate
- Over 4 hours: full extra day charge

Please return the vehicle at your earliest convenience or contact us to extend your rental.

📞 Call us: +30-210-555-0100
📧 Email: ops@kinsen-rentals.com

Thank you for choosing Kinsen Rentals.

Best regards,
{{branch}} Branch Team`,
  },
  {
    id: 'email-damage-notification',
    title: 'Damage Report Email to Customer',
    category: 'template',
    description: 'Email to notify customer of damage found at return.',
    slots: [
      { name: 'customer_name', label: 'Customer Name', type: 'text', required: true },
      { name: 'vehicle', label: 'Vehicle', type: 'text', required: true },
      { name: 'rental_id', label: 'Rental ID', type: 'text', required: true },
      { name: 'damage_description', label: 'Damage Description', type: 'text', required: true },
      { name: 'estimated_cost', label: 'Estimated Cost (€)', type: 'number', required: true },
      { name: 'insurance_package', label: 'Insurance Package', type: 'select', options: ['Basic (€1,200 deductible)', 'Plus (€400 deductible)', 'Full Protection (€0)', 'Premium+ (€0)'], required: true },
    ],
    template: `Subject: Kinsen Rentals — Damage Report (Rental #{{rental_id}})

Dear {{customer_name}},

During our return inspection of {{vehicle}} (Rental #{{rental_id}}), the following damage was identified:

**Damage:** {{damage_description}}
**Estimated Repair Cost:** €{{estimated_cost}}
**Your Coverage:** {{insurance_package}}

Your card on file will be charged the applicable deductible amount. Photos from the inspection are attached.

If you wish to dispute this, please respond within 14 days with any evidence.

For questions, contact: damage@kinsen-rentals.com

Regards,
Kinsen Rentals Damage Team`,
  },
  {
    id: 'upsell-script-counter',
    title: 'Insurance Upsell Script (At Counter)',
    category: 'template',
    description: 'Script for upselling insurance packages at the pickup counter.',
    slots: [
      { name: 'customer_name', label: 'Customer Name', type: 'text', required: true },
      { name: 'current_package', label: 'Current Package', type: 'select', options: ['Basic', 'Plus'], required: true },
      { name: 'rental_days', label: 'Rental Days', type: 'number', required: true },
    ],
    template: `**Upsell Script for {{customer_name}}**
Current package: {{current_package}} | Rental: {{rental_days}} days

---

"Welcome {{customer_name}}! I see you have our {{current_package}} coverage. {{result}}"

---
**Objection Handling:**
- "My credit card covers it" → "That's a great backup! But card coverage usually requires you to pay out of pocket first and claim back later, which can take months. With Full Protection, you walk away with zero out-of-pocket."
- "I'm a careful driver" → "Absolutely, and most claims aren't from driving — they're from parking lot incidents, gravel chips, or other drivers. Full Protection gives you peace of mind for the unexpected."
- "It's too expensive" → "Over {{rental_days}} days, that's just €{{cost_per_day}} per day for complete peace of mind. One small scratch without coverage could cost €200+."`,
    formula: `
      const days = Number(vars.rental_days);
      if (vars.current_package === 'Basic') {
        const upgrade_cost = 15 * days;
        return 'For just €' + (15).toFixed(0) + '/day (€' + upgrade_cost + ' total), I can upgrade you to Full Protection — that brings your deductible from €1,200 down to €0, and includes tire, windshield, and a free additional driver.';
      }
      const upgrade_cost = 5 * days;
      return 'For just €' + (5).toFixed(0) + '/day more (€' + upgrade_cost + ' total), I can upgrade you to Full Protection — zero deductible on everything including theft.';
    `,
  },
];

/**
 * Execute a macro formula with the given variables.
 */
export function executeMacro(
  macro: MacroTemplate,
  variables: Record<string, string>
): string {
  let output = macro.template;

  // Replace slot placeholders
  for (const [key, value] of Object.entries(variables)) {
    output = output.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }

  // Execute formula if present
  if (macro.formula) {
    try {
      const fn = new Function('vars', macro.formula);
      const result = fn(variables);
      output = output.replace(/\{\{result\}\}/g, result || '');
      // Also make result available for templates that reference computed values
      output = output.replace(/\{\{cost_per_day\}\}/g, '15');
    } catch (err) {
      output = output.replace(/\{\{result\}\}/g, '⚠️ Calculation error');
    }
  }

  // Clean up any remaining placeholders
  output = output.replace(/\{\{[^}]+\}\}/g, '—');

  return output;
}
