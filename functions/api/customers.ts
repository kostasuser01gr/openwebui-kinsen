// Customer & Booking lookup API
import type { Env, Customer, Booking } from '../../src/lib/types';

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const url = new URL(ctx.request.url);
  const q = (url.searchParams.get('q') || '').toLowerCase().trim();
  const type = url.searchParams.get('type') || 'all'; // 'customer' | 'booking' | 'all'
  const id = url.searchParams.get('id');

  // Single lookup by ID
  if (id) {
    const raw = (await ctx.env.KV.get(`customer:${id}`)) || (await ctx.env.KV.get(`booking:${id}`));
    if (!raw) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
    return new Response(raw);
  }

  const results: { customers: Customer[]; bookings: Booking[] } = { customers: [], bookings: [] };

  if (type === 'customer' || type === 'all') {
    const custIndex = await ctx.env.KV.get('customer:index');
    const custIds: string[] = custIndex ? JSON.parse(custIndex) : [];
    for (const cid of custIds) {
      const raw = await ctx.env.KV.get(`customer:${cid}`);
      if (raw) {
        const cust = JSON.parse(raw) as Customer;
        if (
          !q ||
          cust.name.toLowerCase().includes(q) ||
          cust.email.toLowerCase().includes(q) ||
          cust.phone.includes(q) ||
          cust.id.toLowerCase().includes(q) ||
          cust.driverLicense.toLowerCase().includes(q)
        ) {
          results.customers.push(cust);
        }
      }
    }
  }

  if (type === 'booking' || type === 'all') {
    const bkIndex = await ctx.env.KV.get('booking:index');
    const bkIds: string[] = bkIndex ? JSON.parse(bkIndex) : [];
    for (const bid of bkIds) {
      const raw = await ctx.env.KV.get(`booking:${bid}`);
      if (raw) {
        const bk = JSON.parse(raw) as Booking;
        if (
          !q ||
          bk.id.toLowerCase().includes(q) ||
          bk.vehiclePlate.toLowerCase().includes(q) ||
          bk.customerId.toLowerCase().includes(q) ||
          bk.vehicleClass.toLowerCase().includes(q)
        ) {
          results.bookings.push(bk);
        }
      }
    }
  }

  return new Response(JSON.stringify(results));
};

// Seed customers and bookings
export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const { SAMPLE_CUSTOMERS, SAMPLE_BOOKINGS } = await import('../../src/lib/seed-customers');

  const custIds: string[] = [];
  for (const c of SAMPLE_CUSTOMERS) {
    await ctx.env.KV.put(`customer:${c.id}`, JSON.stringify(c));
    custIds.push(c.id);
  }
  await ctx.env.KV.put('customer:index', JSON.stringify(custIds));

  const bkIds: string[] = [];
  for (const b of SAMPLE_BOOKINGS) {
    await ctx.env.KV.put(`booking:${b.id}`, JSON.stringify(b));
    bkIds.push(b.id);
  }
  await ctx.env.KV.put('booking:index', JSON.stringify(bkIds));

  return new Response(
    JSON.stringify({ ok: true, customers: custIds.length, bookings: bkIds.length }),
  );
};
