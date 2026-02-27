import type { Env, KnowledgeNote } from '../../../src/lib/types';
import { SEED_NOTES } from '../../../src/lib/seed-data';
import {
  SAMPLE_CUSTOMERS,
  SAMPLE_BOOKINGS,
  SAMPLE_VEHICLES,
} from '../../../src/lib/seed-customers';
import { DEFAULT_FLAGS } from '../../../src/lib/feature-flags';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const body = (await request.json().catch(() => null)) as {
      notes?: KnowledgeNote[];
      all?: boolean;
    } | null;
    const notes = body?.notes || SEED_NOTES;
    const seedAll = body?.all !== false; // default: seed everything

    const index: string[] = [];
    for (const note of notes) {
      await env.KV.put(`knowledge:${note.id}`, JSON.stringify(note));
      index.push(note.id);
    }
    await env.KV.put('knowledge:index', JSON.stringify(index));

    const result: Record<string, unknown> = { ok: true, seeded: index.length, ids: index };

    if (seedAll) {
      // Seed customers
      const custIds: string[] = [];
      for (const c of SAMPLE_CUSTOMERS) {
        await env.KV.put(`customer:${c.id}`, JSON.stringify(c));
        custIds.push(c.id);
      }
      await env.KV.put('customer:index', JSON.stringify(custIds));
      result.customers = custIds.length;

      // Seed bookings
      const bkIds: string[] = [];
      for (const b of SAMPLE_BOOKINGS) {
        await env.KV.put(`booking:${b.id}`, JSON.stringify(b));
        bkIds.push(b.id);
      }
      await env.KV.put('booking:index', JSON.stringify(bkIds));
      result.bookings = bkIds.length;

      // Seed vehicles
      const vhIds: string[] = [];
      for (const v of SAMPLE_VEHICLES) {
        await env.KV.put(`vehicle:${v.id}`, JSON.stringify(v));
        vhIds.push(v.id);
      }
      await env.KV.put('vehicle:index', JSON.stringify(vhIds));
      result.vehicles = vhIds.length;

      // Seed feature flags
      const now = new Date().toISOString();
      const flags = DEFAULT_FLAGS.map((f) => ({ ...f, updatedAt: now }));
      await env.KV.put('feature:flags', JSON.stringify(flags));
      result.featureFlags = flags.length;
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Seed failed', details: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
