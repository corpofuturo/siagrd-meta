import { FastifyInstance } from 'fastify';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { db } from '../lib/db.js';
import { dispararWebhook } from '../services/webhook.service.js';
import { logger } from '../utils/logger.js';

export { dispararWebhook };

export async function webhooksRoutes(fastify: FastifyInstance): Promise<void> {
  // Rutas públicas (sin autenticación JWT) — subplugin sin preHandler de auth
  fastify.register(async (pub) => {
    // POST /webhooks/telegram — recibe updates del bot; Telegram llama este endpoint sin auth
    pub.post('/webhooks/telegram', async (request, reply) => {
      const body = request.body as any;

      const message = body?.message;
      if (!message) {
        return reply.code(200).send({ ok: true });
      }

      const text: string = (message.text ?? '').trim();
      const chatId: string = String(message.chat?.id ?? '');

      if (!text.startsWith('/start')) {
        return reply.code(200).send({ ok: true });
      }

      // Formato esperado: /start email@ejemplo.com
      const parts = text.split(/\s+/);
      const email = parts[1]?.toLowerCase();

      if (!email) {
        logger.warn({ chat_id: chatId }, 'Telegram /start recibido sin email');
        return reply.code(200).send({ ok: true });
      }

      try {
        const [updated] = await db`
          UPDATE profiles
          SET telegram_chat_id = ${chatId}, updated_at = NOW()
          WHERE email = ${email}
          RETURNING id
        `;

        if (updated) {
          logger.info({ chat_id: chatId, email }, 'telegram_chat_id registrado en profiles');
        } else {
          logger.warn({ chat_id: chatId, email }, 'No se encontró profile con ese email para Telegram /start');
        }
      } catch (err) {
        logger.error({ err, chat_id: chatId, email }, 'Error actualizando telegram_chat_id');
      }

      return reply.code(200).send({ ok: true });
    });
  });

  fastify.addHook('preHandler', authMiddleware);

  // POST /webhooks/registrar
  fastify.post('/webhooks/registrar', {
    preHandler: requireRole(['ADMIN']),
  }, async (request, reply) => {
    const { url, eventos, municipio_id, descripcion, secret } = request.body as {
      url: string;
      eventos: string[];
      municipio_id?: string;
      descripcion?: string;
      secret?: string;
    };

    const user = (request as any).user;

    const [row] = await db`
      INSERT INTO webhook_subscriptions (url, eventos, municipio_id, descripcion, secret, creado_por)
      VALUES (
        ${ url },
        ${ db.array(eventos) },
        ${ municipio_id ?? null },
        ${ descripcion ?? null },
        ${ secret ?? null },
        ${ user.id }
      )
      RETURNING id, url, eventos, municipio_id, descripcion, activo, creado_por, created_at, updated_at
    `;

    return reply.code(201).send(row);
  });

  // GET /webhooks
  fastify.get('/webhooks', {
    preHandler: requireRole(['ADMIN']),
  }, async (_request, reply) => {
    const rows = await db`
      SELECT id, url, eventos, municipio_id, descripcion, activo, creado_por, created_at, updated_at
      FROM webhook_subscriptions
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

  // GET /webhooks/:id/deliveries
  fastify.get('/webhooks/:id/deliveries', {
    preHandler: requireRole(['ADMIN']),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const rows = await db`
      SELECT id, evento, attempt, status, status_code, error_message, duration_ms, created_at
      FROM webhook_deliveries
      WHERE subscription_id = ${ id }
      ORDER BY created_at DESC
      LIMIT 100
    `;

    return reply.send(rows);
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
    const timer = setTimeout(() => controller.abort(), 10_000);

    try {
      const res = await fetch(webhook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'ping', timestamp: new Date().toISOString() }),
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
