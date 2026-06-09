import { FastifyInstance } from 'fastify';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { db } from '../lib/db.js';

export async function dispararWebhook(
  evento: string,
  datos: Record<string, unknown>,
  municipio_id?: string
): Promise<void> {
  try {
    let rows: { id: string; url: string }[];
    if (municipio_id) {
      rows = await db`
        SELECT id, url FROM webhook_subscriptions
        WHERE activo = true
          AND ${ evento } = ANY(eventos)
          AND (municipio_id = ${ municipio_id } OR municipio_id IS NULL)
      `;
    } else {
      rows = await db`
        SELECT id, url FROM webhook_subscriptions
        WHERE activo = true
          AND ${ evento } = ANY(eventos)
      `;
    }

    const payload = JSON.stringify({ tipo: evento, datos, timestamp: new Date().toISOString() });

    for (const row of rows) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      fetch(row.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        signal: controller.signal,
      })
        .catch(() => {})
        .finally(() => clearTimeout(timer));
    }
  } catch {
    // fire and forget — silent catch
  }
}

export async function webhooksRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('preHandler', authMiddleware);

  // POST /webhooks/registrar
  fastify.post('/webhooks/registrar', {
    preHandler: requireRole(['ADMIN']),
  }, async (request, reply) => {
    const { url, eventos, municipio_id, descripcion } = request.body as {
      url: string;
      eventos: string[];
      municipio_id?: string;
      descripcion?: string;
    };

    const user = (request as any).user;

    const [row] = await db`
      INSERT INTO webhook_subscriptions (url, eventos, municipio_id, descripcion, creado_por)
      VALUES (
        ${ url },
        ${ db.array(eventos) },
        ${ municipio_id ?? null },
        ${ descripcion ?? null },
        ${ user.id }
      )
      RETURNING *
    `;

    return reply.code(201).send(row);
  });

  // GET /webhooks
  fastify.get('/webhooks', {
    preHandler: requireRole(['ADMIN']),
  }, async (_request, reply) => {
    const rows = await db`
      SELECT * FROM webhook_subscriptions
      ORDER BY created_at DESC
    `;
    return reply.send(rows);
  });

  // DELETE /webhooks/:id
  fastify.delete('/webhooks/:id', {
    preHandler: requireRole(['ADMIN']),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const [row] = await db`
      UPDATE webhook_subscriptions
      SET activo = false, updated_at = NOW()
      WHERE id = ${ id }
      RETURNING id
    `;

    if (!row) {
      return reply.code(404).send({ error: 'Webhook no encontrado' });
    }

    return reply.send({ ok: true });
  });

  // POST /webhooks/test/:id
  fastify.post('/webhooks/test/:id', {
    preHandler: requireRole(['ADMIN']),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const [webhook] = await db`
      SELECT id, url FROM webhook_subscriptions WHERE id = ${ id }
    `;

    if (!webhook) {
      return reply.code(404).send({ error: 'Webhook no encontrado' });
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    try {
      const res = await fetch(webhook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'ping' }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      return reply.send({ ok: res.ok, status_code: res.status });
    } catch (err: any) {
      clearTimeout(timer);
      return reply.send({ ok: false, error: err?.message ?? 'Error desconocido' });
    }
  });
}
