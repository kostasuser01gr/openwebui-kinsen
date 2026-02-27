// API key management for external system integrations
import type { Env } from '../../../src/lib/types';

interface ApiKey {
  id: string;
  name: string;
  keyHash: string;
  prefix: string; // first 8 chars for display
  scopes: string[];
  createdAt: string;
  lastUsedAt?: string;
  expiresAt?: string;
  active: boolean;
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const indexRaw = (await env.KV.get('apikey:index', 'json')) as string[] | null;
  const ids = indexRaw || [];

  const keys: Omit<ApiKey, 'keyHash'>[] = [];
  for (const id of ids) {
    const raw = (await env.KV.get(`apikey:${id}`, 'json')) as ApiKey | null;
    if (raw) {
      const { keyHash: _, ...safe } = raw;
      keys.push(safe);
    }
  }

  return Response.json(keys);
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = (await request.json()) as {
    name: string;
    scopes?: string[];
    expiresInDays?: number;
  };

  if (!body.name) {
    return Response.json({ error: 'Name required' }, { status: 400 });
  }

  // Generate API key: kinsen_xxxxxxxxxxxxxxxxxxxx
  const rawKey = `kinsen_${crypto.randomUUID().replace(/-/g, '')}`;
  const keyHash = await hashKey(rawKey);
  const id = `ak-${Date.now().toString(36)}`;

  const apiKey: ApiKey = {
    id,
    name: body.name,
    keyHash,
    prefix: rawKey.slice(0, 15) + '…',
    scopes: body.scopes || ['chat', 'knowledge:read'],
    createdAt: new Date().toISOString(),
    expiresAt: body.expiresInDays
      ? new Date(Date.now() + body.expiresInDays * 86400000).toISOString()
      : undefined,
    active: true,
  };

  await env.KV.put(`apikey:${id}`, JSON.stringify(apiKey));

  const indexRaw = (await env.KV.get('apikey:index', 'json')) as string[] | null;
  const index = indexRaw || [];
  index.push(id);
  await env.KV.put('apikey:index', JSON.stringify(index));

  // Return full key ONCE — it cannot be retrieved again
  return Response.json(
    {
      ok: true,
      id,
      key: rawKey,
      prefix: apiKey.prefix,
      message: 'Save this key now — it will not be shown again.',
    },
    { status: 201 },
  );
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) return Response.json({ error: 'id required' }, { status: 400 });

  await env.KV.delete(`apikey:${id}`);
  const indexRaw = (await env.KV.get('apikey:index', 'json')) as string[] | null;
  const index = (indexRaw || []).filter((i) => i !== id);
  await env.KV.put('apikey:index', JSON.stringify(index));

  return Response.json({ ok: true });
};

// Validate an API key against stored hashes
export async function validateApiKey(env: Env, rawKey: string): Promise<ApiKey | null> {
  const indexRaw = (await env.KV.get('apikey:index', 'json')) as string[] | null;
  const ids = indexRaw || [];
  const hash = await hashKey(rawKey);

  for (const id of ids) {
    const raw = (await env.KV.get(`apikey:${id}`, 'json')) as ApiKey | null;
    if (!raw || !raw.active) continue;

    if (raw.expiresAt && new Date(raw.expiresAt) < new Date()) continue;

    if (raw.keyHash === hash) {
      // Update last used
      raw.lastUsedAt = new Date().toISOString();
      await env.KV.put(`apikey:${id}`, JSON.stringify(raw));
      return raw;
    }
  }

  return null;
}

async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
