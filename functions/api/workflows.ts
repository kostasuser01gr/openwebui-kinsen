// Workflow engine API
import type { Env, WorkflowInstance } from '../../src/lib/types';
import { WORKFLOW_TEMPLATES } from '../../src/lib/workflows';

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const url = new URL(ctx.request.url);
  const id = url.searchParams.get('id');

  // Get specific instance
  if (id) {
    const raw = await ctx.env.KV.get(`workflow:${id}`);
    if (!raw) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
    const instance = JSON.parse(raw) as WorkflowInstance;
    const template = WORKFLOW_TEMPLATES.find(t => t.id === instance.templateId);
    return new Response(JSON.stringify({ instance, template }));
  }

  // List templates
  const templates = WORKFLOW_TEMPLATES.map(t => ({
    id: t.id,
    title: t.title,
    description: t.description,
    category: t.category,
    stepsCount: t.steps.length,
  }));

  return new Response(JSON.stringify({ templates }));
};

// Create new workflow instance or advance step
export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const user = (ctx.data as Record<string, unknown>).user as { userId: string } | undefined;
  const body = await ctx.request.json() as {
    action: 'start' | 'advance' | 'abandon';
    templateId?: string;
    instanceId?: string;
    data?: Record<string, unknown>;
    nextStepId?: string;
  };

  if (body.action === 'start') {
    if (!body.templateId) return new Response(JSON.stringify({ error: 'templateId required' }), { status: 400 });
    const template = WORKFLOW_TEMPLATES.find(t => t.id === body.templateId);
    if (!template) return new Response(JSON.stringify({ error: 'Template not found' }), { status: 404 });

    const instance: WorkflowInstance = {
      id: `WF-${Date.now().toString(36).toUpperCase()}`,
      templateId: body.templateId,
      userId: user?.userId || 'anonymous',
      currentStepId: template.initialStepId,
      data: body.data || {},
      completedSteps: [],
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await ctx.env.KV.put(`workflow:${instance.id}`, JSON.stringify(instance), { expirationTtl: 30 * 86400 });

    // Add to user's active workflows index
    const userId = user?.userId || 'anonymous';
    const indexRaw = await ctx.env.KV.get(`workflow:index:${userId}`);
    const index: string[] = indexRaw ? JSON.parse(indexRaw) : [];
    index.unshift(instance.id);
    if (index.length > 50) index.length = 50;
    await ctx.env.KV.put(`workflow:index:${userId}`, JSON.stringify(index));

    return new Response(JSON.stringify({ ok: true, instance, template }), { status: 201 });
  }

  if (body.action === 'advance') {
    if (!body.instanceId) return new Response(JSON.stringify({ error: 'instanceId required' }), { status: 400 });
    const raw = await ctx.env.KV.get(`workflow:${body.instanceId}`);
    if (!raw) return new Response(JSON.stringify({ error: 'Instance not found' }), { status: 404 });

    const instance = JSON.parse(raw) as WorkflowInstance;
    const template = WORKFLOW_TEMPLATES.find(t => t.id === instance.templateId);
    if (!template) return new Response(JSON.stringify({ error: 'Template not found' }), { status: 404 });

    // Save step data
    if (body.data) {
      instance.data = { ...instance.data, ...body.data };
    }

    // Mark current step as completed
    if (!instance.completedSteps.includes(instance.currentStepId)) {
      instance.completedSteps.push(instance.currentStepId);
    }

    // Determine next step
    const currentStep = template.steps.find(s => s.id === instance.currentStepId);
    let nextStepId = body.nextStepId || currentStep?.nextStepId;

    if (!nextStepId) {
      // No next step — workflow complete
      instance.status = 'completed';
    } else {
      instance.currentStepId = nextStepId;
    }

    instance.updatedAt = new Date().toISOString();
    await ctx.env.KV.put(`workflow:${body.instanceId}`, JSON.stringify(instance), { expirationTtl: 30 * 86400 });

    return new Response(JSON.stringify({ ok: true, instance, template }));
  }

  if (body.action === 'abandon') {
    if (!body.instanceId) return new Response(JSON.stringify({ error: 'instanceId required' }), { status: 400 });
    const raw = await ctx.env.KV.get(`workflow:${body.instanceId}`);
    if (!raw) return new Response(JSON.stringify({ error: 'Instance not found' }), { status: 404 });

    const instance = JSON.parse(raw) as WorkflowInstance;
    instance.status = 'abandoned';
    instance.updatedAt = new Date().toISOString();
    await ctx.env.KV.put(`workflow:${body.instanceId}`, JSON.stringify(instance), { expirationTtl: 30 * 86400 });

    return new Response(JSON.stringify({ ok: true, instance }));
  }

  return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 });
};
