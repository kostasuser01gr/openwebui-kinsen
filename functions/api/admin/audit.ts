import type { Env } from '../../../src/lib/types';
import { listAuditEntries } from '../../../src/lib/audit';

// GET /api/admin/audit?limit=100
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, request } = context;
  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '100', 10), 500);

  const entries = await listAuditEntries(env, limit);
  return new Response(JSON.stringify(entries), {
    headers: { 'Content-Type': 'application/json' },
  });
};
