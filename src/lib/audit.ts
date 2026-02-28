import type { Env, AuditEntry } from './types';
import { generateId } from './crypto';

const AUDIT_TTL = 90 * 24 * 60 * 60; // 90 days

export async function writeAudit(
  env: Env,
  actor: { id: string; name?: string },
  action: string,
  opts: {
    targetId?: string;
    targetType?: string;
    meta?: Record<string, unknown>;
    ip?: string;
    ua?: string;
  } = {},
): Promise<void> {
  try {
    const ts = new Date().toISOString();
    const id = generateId(8);
    const entry: AuditEntry = {
      id,
      ts,
      actorId: actor.id,
      actorName: actor.name,
      action,
      targetId: opts.targetId,
      targetType: opts.targetType,
      meta: opts.meta,
      ip: opts.ip ?? 'unknown',
      ua: opts.ua,
    };
    // Key format allows lexicographic time-order listing
    await env.KV.put(`audit:${ts}:${id}`, JSON.stringify(entry), {
      expirationTtl: AUDIT_TTL,
    });
  } catch {
    // Audit must not block the main flow
  }
}

export async function listAuditEntries(env: Env, limit = 100): Promise<AuditEntry[]> {
  const list = await env.KV.list({ prefix: 'audit:', limit });
  if (!list.keys.length) return [];
  // Keys are time-ordered; sort descending (newest first)
  const sorted = list.keys.sort((a, b) => b.name.localeCompare(a.name));
  const entries = await Promise.all(
    sorted.map((k) => env.KV.get(k.name, 'json') as Promise<AuditEntry | null>),
  );
  return entries.filter(Boolean) as AuditEntry[];
}
