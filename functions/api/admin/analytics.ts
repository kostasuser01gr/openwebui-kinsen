import type { Env, AnalyticsSummary, StaffMetric } from '../../../src/lib/types';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const days = Math.min(parseInt(url.searchParams.get('days') || '30', 10), 90);

  const today = new Date();
  const dailyCounts: { date: string; count: number }[] = [];
  const intentCounts: Record<string, number> = {};
  const knowledgeGaps: string[] = [];
  const hourlyCounts = new Array(24).fill(0);

  const intents = [
    'deposit',
    'late-return',
    'fuel',
    'mileage',
    'cross-border',
    'damage',
    'accident',
    'insurance',
    'verification',
    'availability',
    'pricing',
    'cancellation',
    'no-show',
    'cleaning',
    'child-seat',
    'loyalty',
    'macro',
    'checklist',
    'general',
  ];

  // Fetch daily counts and intents for the period
  const promises: Promise<void>[] = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().slice(0, 10);

    promises.push(
      env.KV.get(`analytics:daily:${dateStr}`).then((val) => {
        const count = val ? parseInt(val, 10) : 0;
        dailyCounts.push({ date: dateStr, count });
      }),
    );

    for (const intent of intents) {
      promises.push(
        env.KV.get(`analytics:intent:${dateStr}:${intent}`).then((val) => {
          if (val) {
            intentCounts[intent] = (intentCounts[intent] || 0) + parseInt(val, 10);
          }
        }),
      );
    }

    // Hourly counts (for heatmap)
    for (let h = 0; h < 24; h++) {
      promises.push(
        env.KV.get(`analytics:hourly:${dateStr}:${h}`).then((val) => {
          if (val) hourlyCounts[h] += parseInt(val, 10);
        }),
      );
    }
  }

  await Promise.all(promises);

  // Feedback counts
  let feedbackUp = 0;
  let feedbackDown = 0;
  const feedbackPromises: Promise<void>[] = [];
  for (let i = 0; i < Math.min(days, 30); i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().slice(0, 10);

    feedbackPromises.push(
      env.KV.get(`analytics:feedback:${dateStr}:up`).then((val) => {
        if (val) feedbackUp += parseInt(val, 10);
      }),
    );
    feedbackPromises.push(
      env.KV.get(`analytics:feedback:${dateStr}:down`).then((val) => {
        if (val) feedbackDown += parseInt(val, 10);
      }),
    );
  }
  await Promise.all(feedbackPromises);

  // Knowledge gaps
  const gapList = await env.KV.list({ prefix: 'analytics:gap:', limit: 50 });
  const gapPromises = gapList.keys.map((k) =>
    env.KV.get(k.name).then((val) => {
      if (val) knowledgeGaps.push(val);
    }),
  );
  await Promise.all(gapPromises);

  // Staff metrics (per-user message counts)
  const staffMetrics: StaffMetric[] = [];
  const userIndex = (await env.KV.get('user:index', 'json')) as string[] | null;
  if (userIndex) {
    const staffPromises = userIndex.map(async (userId) => {
      const userData = (await env.KV.get(`user:${userId}`, 'json')) as any;
      if (!userData) return;
      const msgCount = await env.KV.get(`analytics:staff:${userId}:messages`);
      const fbUp = await env.KV.get(`analytics:staff:${userId}:feedback:up`);
      const fbDown = await env.KV.get(`analytics:staff:${userId}:feedback:down`);
      const escCount = await env.KV.get(`analytics:staff:${userId}:escalations`);
      const up = fbUp ? parseInt(fbUp, 10) : 0;
      const down = fbDown ? parseInt(fbDown, 10) : 0;
      const total = up + down;
      staffMetrics.push({
        userId,
        name: userData.name || userData.email,
        totalMessages: msgCount ? parseInt(msgCount, 10) : 0,
        avgSatisfaction: total > 0 ? Math.round((up / total) * 100) : 0,
        escalations: escCount ? parseInt(escCount, 10) : 0,
      });
    });
    await Promise.all(staffPromises);
  }

  // Knowledge effectiveness
  const knowledgeEffectiveness: {
    noteId: string;
    title: string;
    citations: number;
    thumbsDown: number;
  }[] = [];
  const noteIndex = (await env.KV.get('knowledge:index', 'json')) as string[] | null;
  if (noteIndex) {
    const kePromises = noteIndex.map(async (noteId) => {
      const note = (await env.KV.get(`knowledge:${noteId}`, 'json')) as any;
      const citCount = await env.KV.get(`analytics:knowledge:${noteId}:citations`);
      const tdCount = await env.KV.get(`analytics:knowledge:${noteId}:thumbsdown`);
      knowledgeEffectiveness.push({
        noteId,
        title: note?.title || noteId,
        citations: citCount ? parseInt(citCount, 10) : 0,
        thumbsDown: tdCount ? parseInt(tdCount, 10) : 0,
      });
    });
    await Promise.all(kePromises);
  }

  // Escalation SLA
  const slaData: { total: number; breached: number; avgResponseMin: number } = {
    total: 0,
    breached: 0,
    avgResponseMin: 0,
  };
  const escIndex = (await env.KV.get('escalation:index', 'json')) as string[] | null;
  if (escIndex) {
    let totalResponseTime = 0;
    let responseCount = 0;
    for (const escId of escIndex.slice(-50)) {
      const esc = (await env.KV.get(`escalation:${escId}`, 'json')) as any;
      if (!esc) continue;
      slaData.total++;
      if (esc.status !== 'open' && esc.updatedAt && esc.createdAt) {
        const responseTime =
          (new Date(esc.updatedAt).getTime() - new Date(esc.createdAt).getTime()) / 60000;
        totalResponseTime += responseTime;
        responseCount++;
        // SLA breach: critical > 30 min, high > 60 min
        if (
          (esc.priority === 'urgent' && responseTime > 30) ||
          (esc.priority === 'high' && responseTime > 60)
        ) {
          slaData.breached++;
        }
      }
    }
    slaData.avgResponseMin = responseCount > 0 ? Math.round(totalResponseTime / responseCount) : 0;
  }

  dailyCounts.sort((a, b) => a.date.localeCompare(b.date));

  const topIntents = Object.entries(intentCounts)
    .map(([intent, count]) => ({ intent, count }))
    .sort((a, b) => b.count - a.count);

  const totalMessages = dailyCounts.reduce((sum, d) => sum + d.count, 0);

  const summary: AnalyticsSummary & {
    knowledgeEffectiveness: typeof knowledgeEffectiveness;
    sla: typeof slaData;
  } = {
    period: `${days} days`,
    totalMessages,
    dailyCounts,
    topIntents,
    feedbackSummary: { up: feedbackUp, down: feedbackDown },
    knowledgeGaps: [...new Set(knowledgeGaps)].slice(0, 20),
    staffMetrics: staffMetrics.sort((a, b) => b.totalMessages - a.totalMessages),
    hourlyCounts,
    knowledgeEffectiveness: knowledgeEffectiveness.sort((a, b) => b.citations - a.citations),
    sla: slaData,
  };

  return new Response(JSON.stringify(summary), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
