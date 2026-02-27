// Webhook dispatch with HMAC-SHA256 signing, retry, delivery logging
import type { Env, Webhook, WebhookEvent } from '../../src/lib/types';

export async function dispatchWebhooks(
  env: Env,
  event: WebhookEvent,
  payload: Record<string, unknown>,
): Promise<void> {
  const indexRaw = await env.KV.get('webhook:index');
  const ids: string[] = indexRaw ? JSON.parse(indexRaw) : [];

  for (const id of ids) {
    const raw = await env.KV.get(`webhook:${id}`);
    if (!raw) continue;
    const wh = JSON.parse(raw) as Webhook;
    if (!wh.active || !wh.events.includes(event)) continue;

    deliverWebhook(env, wh, event, payload).catch(() => {});
  }
}

async function deliverWebhook(
  env: Env,
  webhook: Webhook,
  event: WebhookEvent,
  payload: Record<string, unknown>,
  attempt = 1,
): Promise<void> {
  const deliveryId = crypto.randomUUID();
  const body = JSON.stringify({
    event,
    timestamp: new Date().toISOString(),
    deliveryId,
    payload,
  });

  const signature = await signPayload(body, webhook.secret);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Kinsen-Event': event,
    'X-Kinsen-Signature': `sha256=${signature}`,
    'X-Kinsen-Delivery': deliveryId,
  };

  const logEntry: Record<string, unknown> = {
    webhookId: webhook.id,
    event,
    attempt,
    timestamp: new Date().toISOString(),
  };

  try {
    const res = await fetch(webhook.url, {
      method: 'POST',
      headers,
      body,
    });

    logEntry.status = res.status;
    logEntry.success = res.ok;

    if (!res.ok && attempt < 3) {
      await new Promise((r) => setTimeout(r, attempt * attempt * 1000));
      return deliverWebhook(env, webhook, event, payload, attempt + 1);
    }

    if (!res.ok) {
      const raw = await env.KV.get(`webhook:${webhook.id}`);
      if (raw) {
        const wh = JSON.parse(raw) as Webhook;
        wh.failCount = (wh.failCount || 0) + 1;
        if (wh.failCount >= 10) wh.active = false;
        await env.KV.put(`webhook:${webhook.id}`, JSON.stringify(wh));
      }
    } else {
      const raw = await env.KV.get(`webhook:${webhook.id}`);
      if (raw) {
        const wh = JSON.parse(raw) as Webhook;
        if (wh.failCount > 0) {
          wh.failCount = 0;
          await env.KV.put(`webhook:${webhook.id}`, JSON.stringify(wh));
        }
      }
    }
  } catch (err) {
    logEntry.success = false;
    logEntry.error = String(err);

    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, attempt * attempt * 1000));
      return deliverWebhook(env, webhook, event, payload, attempt + 1);
    }
  }

  // Save delivery log
  const logKey = `webhook:log:${webhook.id}`;
  const existing = (await env.KV.get(logKey, 'json')) as unknown[] | null;
  const log = existing || [];
  log.unshift(logEntry);
  await env.KV.put(logKey, JSON.stringify(log.slice(0, 100)), {
    expirationTtl: 86400 * 30,
  });
}

async function signPayload(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
