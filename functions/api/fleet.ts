import type { Env } from '../../src/lib/types';

// Vehicle damage log and maintenance scheduler

interface DamageEntry {
  id: string;
  vehicleId: string;
  bookingId?: string;
  customerId?: string;
  type: 'scratch' | 'dent' | 'crack' | 'mechanical' | 'interior' | 'other';
  severity: 'minor' | 'moderate' | 'major';
  description: string;
  location: string; // e.g., "front-left-bumper"
  repairCost?: number;
  repairStatus: 'pending' | 'scheduled' | 'repaired';
  reportedBy: string;
  reportedAt: string;
  repairedAt?: string;
  photos?: string[];
}

interface MaintenanceEntry {
  id: string;
  vehicleId: string;
  type:
    | 'oil_change'
    | 'tire_rotation'
    | 'inspection'
    | 'brake_service'
    | 'filter_change'
    | 'general';
  description: string;
  scheduledAt: string;
  completedAt?: string;
  mileageAtService?: number;
  nextDueDate?: string;
  nextDueMileage?: number;
  cost?: number;
  status: 'scheduled' | 'overdue' | 'completed';
  notes?: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const vehicleId = url.searchParams.get('vehicleId');
  const type = url.searchParams.get('type') || 'damage'; // damage | maintenance

  if (type === 'maintenance') {
    const index = (await env.KV.get('maintenance:index', 'json')) as string[] | null;
    if (!index) return Response.json([]);

    const entries = await Promise.all(
      index.map(
        (id) => env.KV.get(`maintenance:${id}`, 'json') as Promise<MaintenanceEntry | null>,
      ),
    );

    let results = entries.filter(Boolean) as MaintenanceEntry[];
    if (vehicleId) results = results.filter((e) => e.vehicleId === vehicleId);

    // Check for overdue entries
    const now = new Date().toISOString();
    results = results.map((e) => ({
      ...e,
      status:
        e.status === 'completed' ? 'completed' : e.scheduledAt < now ? 'overdue' : 'scheduled',
    }));

    return Response.json(results.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)));
  }

  // Default: damage log
  const index = (await env.KV.get('damage:index', 'json')) as string[] | null;
  if (!index) return Response.json([]);

  const entries = await Promise.all(
    index.map((id) => env.KV.get(`damage:${id}`, 'json') as Promise<DamageEntry | null>),
  );

  let results = entries.filter(Boolean) as DamageEntry[];
  if (vehicleId) results = results.filter((e) => e.vehicleId === vehicleId);

  return Response.json(results.sort((a, b) => b.reportedAt.localeCompare(a.reportedAt)));
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env, data }) => {
  const body = (await request.json()) as any;
  const user = (data as any).user || {};
  const type = body.type || 'damage';

  if (type === 'maintenance') {
    const entry: MaintenanceEntry = {
      id: `maint-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      vehicleId: body.vehicleId,
      type: body.maintenanceType || 'general',
      description: body.description || '',
      scheduledAt: body.scheduledAt || new Date().toISOString(),
      nextDueDate: body.nextDueDate,
      nextDueMileage: body.nextDueMileage,
      cost: body.cost,
      status: 'scheduled',
      notes: body.notes,
    };

    const index = ((await env.KV.get('maintenance:index', 'json')) as string[]) || [];
    index.push(entry.id);
    await env.KV.put('maintenance:index', JSON.stringify(index));
    await env.KV.put(`maintenance:${entry.id}`, JSON.stringify(entry), {
      expirationTtl: 86400 * 365,
    });

    return Response.json(entry, { status: 201 });
  }

  // Create damage entry
  const entry: DamageEntry = {
    id: `dmg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    vehicleId: body.vehicleId,
    bookingId: body.bookingId,
    customerId: body.customerId,
    type: body.damageType || 'other',
    severity: body.severity || 'minor',
    description: body.description || '',
    location: body.location || '',
    repairCost: body.repairCost,
    repairStatus: 'pending',
    reportedBy: user.name || 'Staff',
    reportedAt: new Date().toISOString(),
  };

  const index = ((await env.KV.get('damage:index', 'json')) as string[]) || [];
  index.push(entry.id);
  await env.KV.put('damage:index', JSON.stringify(index));
  await env.KV.put(`damage:${entry.id}`, JSON.stringify(entry), { expirationTtl: 86400 * 365 });

  return Response.json(entry, { status: 201 });
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  const body = (await request.json()) as any;
  const { id, type } = body;

  if (type === 'maintenance') {
    const entry = (await env.KV.get(`maintenance:${id}`, 'json')) as MaintenanceEntry | null;
    if (!entry) return Response.json({ error: 'Not found' }, { status: 404 });

    if (body.status) entry.status = body.status;
    if (body.completedAt) entry.completedAt = body.completedAt;
    if (body.mileageAtService) entry.mileageAtService = body.mileageAtService;
    if (body.cost !== undefined) entry.cost = body.cost;
    if (body.notes) entry.notes = body.notes;

    await env.KV.put(`maintenance:${id}`, JSON.stringify(entry), { expirationTtl: 86400 * 365 });
    return Response.json(entry);
  }

  // Update damage entry
  const entry = (await env.KV.get(`damage:${id}`, 'json')) as DamageEntry | null;
  if (!entry) return Response.json({ error: 'Not found' }, { status: 404 });

  if (body.repairStatus) entry.repairStatus = body.repairStatus;
  if (body.repairCost !== undefined) entry.repairCost = body.repairCost;
  if (body.repairStatus === 'repaired') entry.repairedAt = new Date().toISOString();

  await env.KV.put(`damage:${id}`, JSON.stringify(entry), { expirationTtl: 86400 * 365 });
  return Response.json(entry);
};
