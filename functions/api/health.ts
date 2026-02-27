import type { Env } from '../../src/lib/types';

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const startTime = Date.now();

  try {
    const kvStart = Date.now();
    const userIndex = (await env.KV.get('user:index', 'json')) as string[] | null;
    const kvLatency = Date.now() - kvStart;
    const userCount = userIndex?.length ?? 0;

    return new Response(
      JSON.stringify({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        platform: 'Kinsen Station AI',
        latency: { kv: kvLatency, total: Date.now() - startTime },
        counts: { users: userCount },
        features: {
          aiChat: true,
          sessionLocking: true,
          shortcuts: true,
          roleBasedAccess: true,
          darkMode: true,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        status: 'degraded',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        error: String(err),
        latency: { total: Date.now() - startTime },
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    );
  }
};
