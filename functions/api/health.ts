import type { Env } from '../../src/lib/types';

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const startTime = Date.now();

  try {
    // KV latency test
    const kvStart = Date.now();
    const noteIndex = await env.KV.get('knowledge:index', 'json') as string[] | null;
    const kvLatency = Date.now() - kvStart;

    const noteCount = noteIndex?.length ?? 0;
    const userIndex = await env.KV.get('user:index', 'json') as string[] | null;
    const userCount = userIndex?.length ?? 0;
    const vehicleIndex = await env.KV.get('vehicle:index', 'json') as string[] | null;
    const customerIndex = await env.KV.get('customer:index', 'json') as string[] | null;
    const escalationIndex = await env.KV.get('escalation:index', 'json') as string[] | null;

    // Feature flags
    const flags = await env.KV.get('feature:flags', 'json') as Array<{ id: string; enabled: boolean }> | null;
    const flagMap: Record<string, boolean> = {};
    if (flags) {
      for (const f of flags) flagMap[f.id] = f.enabled;
    }

    const totalLatency = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '4.0.0',
        uptime: null,
        latency: {
          kv: kvLatency,
          total: totalLatency,
        },
        counts: {
          knowledgeNotes: noteCount,
          users: userCount,
          vehicles: vehicleIndex?.length ?? 0,
          customers: customerIndex?.length ?? 0,
          escalations: escalationIndex?.length ?? 0,
        },
        features: {
          userAccounts: true,
          macros: true,
          checklists: true,
          workflows: true,
          vehicleBoard: true,
          customerLookup: true,
          emailGenerator: true,
          escalations: true,
          notifications: true,
          commandPalette: true,
          tfidfRetrieval: true,
          fuzzyMatching: true,
          autoSuggest: true,
          toastNotifications: true,
          messageSearch: true,
          savedReplies: true,
          reactions: true,
          bookmarks: true,
          pinnedMessages: true,
          pwa: true,
          i18n: true,
          darkMode: true,
          voiceInput: true,
          featureFlags: true,
          webhooks: true,
          knowledgeVersioning: true,
          damageLog: true,
          maintenanceScheduler: true,
          staffDashboard: true,
          heatmap: true,
          csvExport: true,
          openai: flagMap['openai'] ?? false,
          ...flagMap,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        status: 'degraded',
        timestamp: new Date().toISOString(),
        version: '4.0.0',
        error: { code: 'KV_ERROR', message: String(err) },
        latency: { total: Date.now() - startTime },
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
