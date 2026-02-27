// Email generator API — generate customer-facing emails from context
import type { Env, GeneratedEmail } from '../../src/lib/types';

interface EmailRequest {
  template: string;
  variables: Record<string, string>;
  customSubject?: string;
  customBody?: string;
}

const EMAIL_TEMPLATES: Record<string, { subject: string; body: string }> = {
  'late-return': {
    subject: 'Reminder: Vehicle Return Overdue — {{vehiclePlate}}',
    body: `Dear {{customerName}},

We hope you are enjoying your rental experience with Kinsen Car Rental.

This is a friendly reminder that your rental vehicle **{{vehiclePlate}}** ({{vehicleClass}}) was scheduled for return at **{{scheduledTime}}** on **{{scheduledDate}}** at our **{{branch}}** location.

As per our late return policy:
- Up to 1 hour: Grace period (no charge)
- 1–4 hours: 50% of daily rate
- Over 4 hours: Full extra day charge

Your current daily rate is **€{{dailyRate}}**.

Please return the vehicle at your earliest convenience or contact us to extend your rental.

📞 Emergency: +30-210-555-0000
📧 Email: support@kinsen.gr

Kind regards,
{{agentName}}
Kinsen Car Rental`,
  },
  'damage-notification': {
    subject: 'Vehicle Damage Report — Rental {{bookingId}}',
    body: `Dear {{customerName}},

Following the return inspection of your rental vehicle **{{vehiclePlate}}** (Booking: {{bookingId}}), we have identified the following damage:

**Damage Description:**
{{damageDescription}}

**Damage Location:** {{damageLocation}}
**Estimated Repair Cost:** €{{estimatedCost}}
**Your Insurance Package:** {{insurancePackage}}
**Your Liability (Deductible):** €{{customerCharge}}

{{#if customerCharge > 0}}
This amount will be charged to the credit card on file. If you wish to dispute this charge or provide additional information, please contact us within 7 days.
{{else}}
As you have Full Coverage insurance, this damage is fully covered and no charge will be applied.
{{/if}}

Photos of the damage are available upon request.

📞 Claims Department: +30-210-555-0001
📧 Email: claims@kinsen.gr

Kind regards,
{{agentName}}
Kinsen Car Rental`,
  },
  'booking-confirmation': {
    subject: 'Booking Confirmed — {{bookingId}}',
    body: `Dear {{customerName}},

Your car rental booking has been confirmed! Here are the details:

📋 **Booking Details**
- Booking ID: {{bookingId}}
- Vehicle Class: {{vehicleClass}}
- Pick-up: {{pickupDate}} at {{pickupBranch}}
- Return: {{returnDate}} at {{returnBranch}}
- Daily Rate: €{{dailyRate}}
- Insurance: {{insurancePackage}}
- Extras: {{extras}}
- Estimated Total: €{{totalAmount}}

📄 **What to Bring**
- Valid driver's license
- Credit card in driver's name
- Passport or national ID

⚠️ **Important**
- Please arrive 15 minutes before pick-up time
- A deposit hold of €{{depositAmount}} will be placed on your credit card
- Cancellation is free up to 48 hours before pick-up

We look forward to serving you!

📞 Reservations: +30-210-555-0000
📧 Email: bookings@kinsen.gr

Kind regards,
{{agentName}}
Kinsen Car Rental`,
  },
  'cancellation-confirmation': {
    subject: 'Cancellation Confirmed — {{bookingId}}',
    body: `Dear {{customerName}},

Your booking **{{bookingId}}** has been successfully cancelled.

**Cancellation Details:**
- Original Pick-up: {{pickupDate}} at {{pickupBranch}}
- Vehicle Class: {{vehicleClass}}
- Cancellation Fee: {{cancellationFee}}
- Refund Amount: €{{refundAmount}}

{{#if refundAmount > 0}}
The refund of **€{{refundAmount}}** will be processed to your original payment method within 5-10 business days.
{{/if}}

If you'd like to rebook in the future, visit kinsen.gr or call us directly.

Kind regards,
{{agentName}}
Kinsen Car Rental`,
  },
  'refund-confirmation': {
    subject: 'Refund Processed — {{bookingId}}',
    body: `Dear {{customerName}},

We have processed a refund for your rental booking **{{bookingId}}**.

**Refund Details:**
- Refund Amount: €{{refundAmount}}
- Reason: {{refundReason}}
- Payment Method: Original card ending in {{cardLast4}}
- Expected Processing Time: 5-10 business days

Reference Number: {{refundReference}}

If you have any questions about this refund, please don't hesitate to contact us.

Kind regards,
{{agentName}}
Kinsen Car Rental`,
  },
  custom: {
    subject: '{{subject}}',
    body: '{{body}}',
  },
};

function fillTemplate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }
  // Clean up unfilled conditionals
  result = result.replace(/\{\{#if[^}]*\}\}[\s\S]*?\{\{\/if\}\}/g, '');
  // Clean up remaining template vars
  result = result.replace(/\{\{[^}]+\}\}/g, '[N/A]');
  return result;
}

export const onRequestGet: PagesFunction<Env> = async () => {
  const templates = Object.entries(EMAIL_TEMPLATES).map(([id, t]) => ({
    id,
    subject: t.subject,
    preview: t.body.slice(0, 100) + '...',
  }));
  return new Response(JSON.stringify(templates));
};

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const body = (await ctx.request.json()) as EmailRequest;

  const tmpl = EMAIL_TEMPLATES[body.template];
  if (!tmpl) {
    return new Response(JSON.stringify({ error: `Unknown template: ${body.template}` }), {
      status: 400,
    });
  }

  const email: GeneratedEmail = {
    subject: fillTemplate(body.customSubject || tmpl.subject, body.variables),
    body: fillTemplate(body.customBody || tmpl.body, body.variables),
    to: body.variables.customerEmail,
    templateUsed: body.template,
  };

  return new Response(JSON.stringify(email));
};
