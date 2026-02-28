import type { Env, Room, UserSession } from '../../../../src/lib/types';
import { writeAudit } from '../../../../src/lib/audit';

const BUILTIN_ROOMS: Room[] = [
  { id: 'global', name: 'Global', locked: false, createdAt: '2024-01-01T00:00:00.000Z' },
];

// POST /api/rooms/:id/unlock — coordinator or admin only (enforced in middleware)
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { env, params } = context;
  const roomId = params['id'] as string;
  const user = (context.data as Record<string, unknown>).user as UserSession;
  const ip = (context.data as Record<string, unknown>).ip as string;

  // Load from KV, falling back to builtin
  let room = (await env.KV.get(`room:${roomId}`, 'json')) as Room | null;
  if (!room) {
    const builtin = BUILTIN_ROOMS.find((r) => r.id === roomId);
    if (!builtin) {
      return new Response(JSON.stringify({ error: 'Room not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    room = { ...builtin };
  }

  room.locked = false;
  await env.KV.put(`room:${roomId}`, JSON.stringify(room));

  context.waitUntil(
    writeAudit(env, { id: user.userId, name: user.name }, 'room.unlock', {
      ip,
      meta: { roomId },
    }),
  );

  return new Response(JSON.stringify({ room }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
