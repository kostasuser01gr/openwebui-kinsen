import type { KnowledgeNote } from './types';

export const SEED_NOTES: KnowledgeNote[] = [
  {
    id: 'deposit-rules',
    title: 'Deposit & Hold Rules',
    category: 'billing',
    keywords: ['deposit', 'hold', 'credit card', 'authorization', 'block', 'preauth', 'security deposit', 'refund deposit'],
    relatedNotes: ['customer-verification', 'damage-procedure', 'cancellation-policy'],
    content: `## Deposit & Hold Policy
- A credit card authorization hold is placed at pickup:
  - Economy/Compact: €300
  - Midsize/SUV: €500
  - Premium/Luxury: €1,000
- Debit cards accepted only for Economy with proof of return flight.
- Hold released within 5–10 business days after return (bank-dependent).
- If damage found, hold is converted to charge; excess above insurance deductible applies.
- Cash deposits are NOT accepted.`,
    updatedAt: '2025-01-15',
  },
  {
    id: 'late-return',
    title: 'Late Return Policy',
    category: 'operations',
    keywords: ['late', 'return', 'overdue', 'grace period', 'extra day', 'late fee', 'delayed return'],
    relatedNotes: ['fuel-policy', 'cleaning-fee', 'no-show'],
    content: `## Late Return Policy
- Grace period: 29 minutes after scheduled return time.
- 30 min – 4 hours late: charged 50% of the daily rate.
- Over 4 hours late: charged a full extra day.
- Over 24 hours late with no contact: vehicle flagged as unreturned; security team notified.
- Always call the customer 1 hour after scheduled return to confirm status.
- Log all late returns in the Ops Dashboard under "Late Returns" tab.`,
    updatedAt: '2025-02-01',
  },
  {
    id: 'fuel-policy',
    title: 'Fuel Policy',
    category: 'operations',
    keywords: ['fuel', 'gas', 'petrol', 'diesel', 'tank', 'refuel', 'fuel charge', 'full-to-full'],
    relatedNotes: ['mileage-policy', 'cleaning-fee', 'late-return'],
    content: `## Fuel Policy
- Default policy: Full-to-Full. Vehicle delivered full, must be returned full.
- If returned not full: refueling charge = missing litres × €2.50/L + €25 service fee.
- Prepaid Fuel Option: customer pays upfront at €1.80/L (no refund for unused fuel).
- Always photograph the fuel gauge at pickup AND return.
- Electric vehicles: must be returned with ≥80% charge. Charging fee: €0.35/kWh + €15 service fee.`,
    updatedAt: '2025-01-20',
  },
  {
    id: 'mileage-policy',
    title: 'Mileage / Kilometre Allowance',
    category: 'billing',
    keywords: ['mileage', 'kilometre', 'km', 'unlimited', 'excess mileage', 'odometer', 'distance'],
    relatedNotes: ['fuel-policy', 'pricing-exception', 'cross-border'],
    content: `## Mileage Policy
- Standard rentals (1–7 days): 250 km/day included.
- Weekly rentals (7–30 days): 1,500 km/week included.
- Monthly rentals: 3,000 km/month included.
- Excess mileage: €0.25/km for Economy–Midsize; €0.45/km for Premium–Luxury.
- Unlimited mileage add-on available at booking for +€12/day.
- Record odometer at pickup and return; attach photo to rental record.`,
    updatedAt: '2025-01-18',
  },
  {
    id: 'cross-border',
    title: 'Cross-Border & One-Way Rentals',
    category: 'operations',
    keywords: ['cross-border', 'country', 'international', 'one-way', 'drop-off', 'different location', 'border'],
    relatedNotes: ['upsell-insurance', 'mileage-policy', 'deposit-rules'],
    content: `## Cross-Border & One-Way Policy
- Cross-border travel allowed to: EU countries, UK, Switzerland, Norway.
- NOT allowed to: Turkey, non-EU Balkans, Russia, Belarus, Ukraine.
- Cross-border fee: €50 flat + valid green card insurance (included for EU).
- One-way domestic drop-off fee: €75 within same region, €150 different region.
- One-way international drop-off: €250–€500 depending on destination.
- Customer must declare cross-border intent at booking. Undeclared crossing voids insurance.
- Luxury vehicles may NOT leave the country of origin.`,
    updatedAt: '2025-02-10',
  },
  {
    id: 'damage-procedure',
    title: 'Damage Inspection & Reporting Procedure',
    category: 'operations',
    keywords: ['damage', 'scratch', 'dent', 'inspection', 'report', 'body', 'windshield', 'tire', 'check'],
    relatedNotes: ['accident-workflow', 'upsell-insurance', 'deposit-rules'],
    content: `## Damage Procedure
1. Walk-around inspection at pickup with customer present; both sign checklist.
2. Use the Kinsen app to photograph all 4 sides + roof + interior.
3. At return: repeat inspection. Compare with pickup photos.
4. If NEW damage found:
   a. Show customer, get acknowledgment signature.
   b. Fill Damage Report Form (DRF) within 1 hour.
   c. Send DRF to damage@kinsen-rentals.com + notify manager.
   d. Charge damage deposit or insurance deductible to card on file.
5. Damage below €50 (minor scuffs): log but do not charge; flag for next service.
6. Windshield chips < 2cm: covered by basic insurance. Larger = full deductible.`,
    updatedAt: '2025-02-05',
  },
  {
    id: 'accident-workflow',
    title: 'Accident & Emergency Workflow',
    category: 'safety',
    keywords: ['accident', 'crash', 'collision', 'emergency', 'police', 'tow', 'breakdown', 'roadside'],
    relatedNotes: ['damage-procedure', 'upsell-insurance'],
    content: `## Accident & Emergency Workflow
1. Ensure safety of all parties; call 112 if injuries.
2. Customer must fill the European Accident Statement form (in glove box).
3. Customer calls Kinsen Emergency Line: +30-210-555-0199 (24/7).
4. DO NOT admit fault or negotiate with other party.
5. Take photos: damage, license plates, surroundings, other vehicle.
6. Kinsen Ops will:
   a. Dispatch replacement vehicle if available (within 90 min in metro areas).
   b. Arrange towing via partner (AutoHelp GR).
   c. Open insurance claim within 24 hours.
7. Roadside assistance (flat tire, battery, lockout): same emergency line; free for first 2 incidents per rental.`,
    updatedAt: '2025-01-25',
  },
  {
    id: 'upsell-insurance',
    title: 'Upsell Script — Insurance & Protection Packages',
    category: 'sales',
    keywords: ['upsell', 'insurance', 'CDW', 'SCDW', 'theft', 'protection', 'coverage', 'waiver', 'package', 'sell'],
    relatedNotes: ['damage-procedure', 'deposit-rules', 'loyalty-program'],
    content: `## Upsell Script: Insurance Packages
**At counter, after confirming reservation:**
"I see you have our Basic coverage which includes a €1,200 deductible. For just €15/day, I can upgrade you to our Full Protection package — that brings your deductible down to €0, includes tire and windshield, and covers a second driver free. Most of our customers choose this for peace of mind."

**Packages:**
| Package | Deductible | Tires/Glass | Theft | Price |
|---------|-----------|-------------|-------|-------|
| Basic (included) | €1,200 | No | €1,200 | Free |
| Plus | €400 | Yes | €400 | €10/day |
| Full Protection | €0 | Yes | €0 | €15/day |
| Premium+ | €0 + personal effects | Yes | €0 | €22/day |

**Objection handling:**
- "My credit card covers it" → "That's great as a backup, but credit card coverage often requires you to pay upfront and claim later, which can take months. Our Full Protection means you walk away with zero charges."`,
    updatedAt: '2025-02-12',
  },
  {
    id: 'customer-verification',
    title: 'Customer Verification Checklist',
    category: 'compliance',
    keywords: ['verification', 'ID', 'license', 'driving licence', 'passport', 'age', 'check', 'identity', 'document'],
    relatedNotes: ['deposit-rules', 'cross-border'],
    content: `## Customer Verification Checklist
At pickup, verify ALL of the following:
1. ☑ Valid driving licence (held ≥1 year). International Driving Permit required for non-Latin-alphabet licences.
2. ☑ Passport or national ID matching the name on the booking.
3. ☑ Credit card in the renter's name (for deposit hold).
4. ☑ Minimum age: 21 for Economy–Midsize; 25 for Premium–Luxury. Max age: 75.
5. ☑ Young driver surcharge (21–24): €10/day.
6. ☑ Additional drivers: must present licence + ID; add to contract (€8/day or free with Full Protection).
7. ☑ Scan all documents into Kinsen system; retain copies for 3 years per GDPR.
- If ANY document is missing or expired → DO NOT release vehicle. Offer to hold reservation for 24h.`,
    updatedAt: '2025-01-30',
  },
  {
    id: 'fleet-availability',
    title: 'Fleet Availability Response Template',
    category: 'sales',
    keywords: ['availability', 'fleet', 'available', 'car', 'vehicle', 'book', 'reservation', 'class', 'group'],
    relatedNotes: ['pricing-exception', 'upsell-insurance'],
    content: `## Fleet Availability Response Template
When a customer asks about availability, use this template:

"Thank you for your interest! Let me check availability for [DATES] at [LOCATION].

[If available:]
Great news! We have the following options for you:
- [Vehicle Group] [Example Model]: €[PRICE]/day — [KEY FEATURE]
- [Vehicle Group] [Example Model]: €[PRICE]/day — [KEY FEATURE]

All prices include basic insurance and [MILEAGE] km/day. Shall I proceed with a reservation?

[If not available:]
Unfortunately, [GROUP] is fully booked for those dates. However, I can offer:
- A free upgrade to [HIGHER GROUP] at the same rate (subject to availability at pickup)
- Alternative dates: [SUGGEST ±1-2 DAYS]
- Our [OTHER LOCATION] branch (15 min away) has availability."`,
    updatedAt: '2025-02-08',
  },
  {
    id: 'pricing-exception',
    title: 'Pricing Exception & Discount Approval Flow',
    category: 'billing',
    keywords: ['pricing', 'discount', 'exception', 'approval', 'override', 'rate', 'negotiation', 'corporate', 'coupon'],
    relatedNotes: ['cancellation-policy', 'loyalty-program', 'fleet-availability'],
    content: `## Pricing Exception Approval Flow
- Agents may apply up to 10% discount without approval.
- 11–20% discount: requires Shift Supervisor approval (Slack #pricing-approvals).
- 21–30% discount: requires Branch Manager approval (email + ticket).
- Over 30%: requires Regional Director approval — rarely granted.
- Corporate accounts: use pre-negotiated rates in the system (code: CORP-[COMPANY]).
- Coupon codes: validate in system; expired coupons cannot be manually overridden.
- Long-term rentals (30+ days): auto-apply 15% monthly discount.
- Loyalty members (Gold/Platinum): see loyalty rate card in Kinsen Portal > Rates.
- ALL exceptions must be logged with reason code in the booking notes.`,
    updatedAt: '2025-02-14',
  },
  {
    id: 'cancellation-policy',
    title: 'Cancellation & Modification Policy',
    category: 'billing',
    keywords: ['cancel', 'cancellation', 'refund', 'modify', 'change', 'amendment', 'reschedule'],
    relatedNotes: ['no-show', 'pricing-exception', 'deposit-rules'],
    content: `## Cancellation & Modification Policy
- Free cancellation: up to 48 hours before pickup.
- 24–48 hours before pickup: 50% of first day's rental charged.
- Less than 24 hours / no-show: full first day charged + any prepaid extras forfeited.
- Modifications (date/location change): free if made 24+ hours before original pickup.
- Downgrade: difference refunded if made 48+ hours before pickup.
- Upgrade at counter: charge difference; no refund if later downgraded.
- Prepaid bookings: cancellation fee = 20% of total or €50, whichever is greater.
- Refunds processed within 7–10 business days to original payment method.`,
    updatedAt: '2025-01-28',
  },
  {
    id: 'no-show',
    title: 'No-Show Procedure',
    category: 'operations',
    keywords: ['no-show', 'no show', 'didnt pick up', 'absent', 'missed pickup'],
    relatedNotes: ['cancellation-policy', 'late-return'],
    content: `## No-Show Procedure
1. After 1 hour past pickup time: attempt to contact customer (phone + email).
2. After 2 hours with no response: mark reservation as "No-Show" in system.
3. Charges applied:
   - Pay-at-counter bookings: first day charged to card on file.
   - Prepaid bookings: no refund for first day; remainder refundable minus €50 admin fee.
4. Vehicle released back to available fleet after no-show confirmed.
5. Send automated no-show email to customer with rebooking link (valid 30 days).
6. If customer contacts within 24 hours: offer to reinstate at same rate (subject to availability).`,
    updatedAt: '2025-02-03',
  },
  {
    id: 'cleaning-fee',
    title: 'Cleaning & Condition Fee Schedule',
    category: 'operations',
    keywords: ['cleaning', 'dirty', 'smoke', 'smoking', 'pet', 'animal', 'hair', 'stain', 'interior', 'fee', 'clean'],
    relatedNotes: ['damage-procedure', 'late-return'],
    content: `## Cleaning & Condition Fee Schedule
- Standard cleaning: included (normal wear).
- Excessive dirt/mud (interior): €40 surcharge.
- Food/drink stains requiring shampooing: €60.
- Smoking evidence (smell/ash/burns): €200 deep-clean fee.
- Pet hair removal: €80.
- Biohazard (vomit, blood): €150.
- Permanent damage to upholstery/carpet: charged at replacement cost.
- Always photograph interior condition at return before cleaning.
- Fees charged to card on file; customer notified via email with photos within 24 hours.
- Customer may dispute within 14 days; provide return inspection evidence.`,
    updatedAt: '2025-02-06',
  },
  {
    id: 'child-seat',
    title: 'Child Seat & Accessories Policy',
    category: 'operations',
    keywords: ['child seat', 'baby seat', 'booster', 'infant', 'child', 'accessory', 'GPS', 'navigation', 'wifi', 'extra'],
    relatedNotes: ['customer-verification', 'fleet-availability'],
    content: `## Child Seat & Accessories
**Child Seats (EU law requires for children under 135cm):**
| Type | Age/Weight | Price |
|------|-----------|-------|
| Infant (rear-facing) | 0–12 months / up to 13kg | €8/day (max €56/rental) |
| Toddler | 1–4 years / 9–18kg | €7/day (max €49/rental) |
| Booster | 4–12 years / 15–36kg | €5/day (max €35/rental) |

- Must be reserved at booking; limited stock — first come, first served.
- Staff must install the seat and demonstrate to customer (liability).
- Check seat for damage before each rental; replace if straps frayed or shell cracked.

**Other Accessories:**
- GPS Navigation: €6/day (max €42/rental)
- Mobile WiFi Hotspot: €8/day (max €56/rental)
- Snow chains: €10/day (mandatory Nov–Mar for mountain routes)
- Roof rack: €12/day — only on SUVs and wagons.`,
    updatedAt: '2025-02-11',
  },
  {
    id: 'loyalty-program',
    title: 'Kinsen Loyalty Program Tiers',
    category: 'sales',
    keywords: ['loyalty', 'rewards', 'points', 'gold', 'platinum', 'member', 'frequent', 'tier', 'VIP'],
    relatedNotes: ['pricing-exception', 'upsell-insurance', 'cancellation-policy'],
    content: `## Kinsen Loyalty Program
**Tiers:**
| Tier | Qualification | Benefits |
|------|--------------|----------|
| Silver | Sign up (free) | 5% off rack rate, priority email support |
| Gold | 10+ rental days/year | 10% off, free additional driver, priority pickup |
| Platinum | 30+ rental days/year | 15% off, free upgrade (subject to avail.), lounge access, dedicated account manager |

- Points: 1 point per €1 spent. Redemption: 500 points = €5 off.
- Gold/Platinum members: free cancellation up to 4 hours before pickup (override standard policy).
- Loyalty status displayed in booking system — always greet by name and tier.
- Refer-a-friend: both get 200 bonus points when friend completes first rental.`,
    updatedAt: '2025-02-15',
  },
];
