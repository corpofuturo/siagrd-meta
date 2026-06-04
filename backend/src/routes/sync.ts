import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { procesarSync } from '../services/sync.service.js';
import { ValidationError } from '../utils/errors.js';

const SyncEventoSchema = z.object({
  id: z.string().uuid(),
  tabla: z.string(),
  operacion: z.enum(['INSERT', 'UPDATE', 'DELETE']),
  registro_id: z.string().uuid().optional(),
  payload: z.record(z.unknown()),
  timestamp_local: z.number().int().positive(),
});

const SyncPayloadSchema = z.object({
  device_id: z.string().min(1).max(128),
  eventos: z.array(SyncEventoSchema).max(500),
  last_sync_timestamp: z.number().int().positive().optional(),
});

export async function syncRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    '/sync',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const parsed = SyncPayloadSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new ValidationError(
          parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
        );
      }

      const result = await procesarSync(parsed.data, request.user!.id);
      return reply.status(200).send(result);
    },
  );
}
