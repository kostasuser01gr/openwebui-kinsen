import type { Env } from '../../src/lib/types';
import { MACROS, executeMacro } from '../../src/lib/macros';

// GET: list all macros
export const onRequestGet: PagesFunction<Env> = async () => {
  // Return macros without formulas (client doesn't need them)
  const clientMacros = MACROS.map(({ formula, ...rest }) => rest);
  return new Response(JSON.stringify(clientMacros), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

// POST: execute a macro with variables
export const onRequestPost: PagesFunction<Env> = async ({ request }) => {
  try {
    const { macroId, variables } = (await request.json()) as {
      macroId: string;
      variables: Record<string, string>;
    };

    const macro = MACROS.find((m) => m.id === macroId);
    if (!macro) {
      return new Response(JSON.stringify({ error: 'Macro not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate required slots
    for (const slot of macro.slots) {
      if (slot.required && (!variables[slot.name] || variables[slot.name].trim() === '')) {
        return new Response(JSON.stringify({ error: `Missing required field: ${slot.label}` }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    const result = executeMacro(macro, variables);

    return new Response(JSON.stringify({ result, macroId, title: macro.title }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Bad request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
