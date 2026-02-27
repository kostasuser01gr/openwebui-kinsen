// Vehicle status board API
import type { Env, Vehicle } from '../../src/lib/types';

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const url = new URL(ctx.request.url);
  const id = url.searchParams.get('id');
  const branch = url.searchParams.get('branch');
  const status = url.searchParams.get('status');
  const vehicleClass = url.searchParams.get('class');

  if (id) {
    const raw = await ctx.env.KV.get(`vehicle:${id}`);
    if (!raw) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
    return new Response(raw);
  }

  const indexRaw = await ctx.env.KV.get('vehicle:index');
  const index: string[] = indexRaw ? JSON.parse(indexRaw) : [];

  const vehicles: Vehicle[] = [];
  for (const vid of index) {
    const raw = await ctx.env.KV.get(`vehicle:${vid}`);
    if (raw) {
      const v = JSON.parse(raw) as Vehicle;
      if (branch && v.branch !== branch) continue;
      if (status && v.status !== status) continue;
      if (vehicleClass && v.class !== vehicleClass) continue;
      vehicles.push(v);
    }
  }

  // Summary stats
  const summary = {
    total: vehicles.length,
    available: vehicles.filter(v => v.status === 'available').length,
    rented: vehicles.filter(v => v.status === 'rented').length,
    maintenance: vehicles.filter(v => v.status === 'maintenance').length,
    cleaning: vehicles.filter(v => v.status === 'cleaning').length,
    reserved: vehicles.filter(v => v.status === 'reserved').length,
    damaged: vehicles.filter(v => v.status === 'damaged').length,
  };

  return new Response(JSON.stringify({ vehicles, summary }));
};

export const onRequestPut: PagesFunction<Env> = async (ctx) => {
  const body = await ctx.request.json() as { id: string } & Partial<Vehicle>;
  if (!body.id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400 });

  const raw = await ctx.env.KV.get(`vehicle:${body.id}`);
  if (!raw) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });

  const vehicle = JSON.parse(raw) as Vehicle;
  const oldStatus = vehicle.status;

  if (body.status) vehicle.status = body.status;
  if (body.mileage) vehicle.mileage = body.mileage;
  if (body.fuelLevel !== undefined) vehicle.fuelLevel = body.fuelLevel;
  if (body.branch) vehicle.branch = body.branch;
  if (body.notes !== undefined) vehicle.notes = body.notes;
  if (body.currentBookingId !== undefined) vehicle.currentBookingId = body.currentBookingId;

  await ctx.env.KV.put(`vehicle:${body.id}`, JSON.stringify(vehicle));

  // Track status change for webhooks
  if (oldStatus !== vehicle.status) {
    await ctx.env.KV.put(
      `webhook:event:${Date.now()}`,
      JSON.stringify({ event: 'vehicle.status_changed', vehicleId: body.id, from: oldStatus, to: vehicle.status }),
      { expirationTtl: 86400 }
    );
  }

  return new Response(JSON.stringify({ ok: true, vehicle }));
};

// Seed vehicles
export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const { SAMPLE_VEHICLES } = await import('../../src/lib/seed-customers');

  const ids: string[] = [];
  for (const v of SAMPLE_VEHICLES) {
    await ctx.env.KV.put(`vehicle:${v.id}`, JSON.stringify(v));
    ids.push(v.id);
  }
  await ctx.env.KV.put('vehicle:index', JSON.stringify(ids));

  return new Response(JSON.stringify({ ok: true, vehicles: ids.length }));
};
