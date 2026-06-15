import type { FastifyInstance } from 'fastify';
import { db } from '../lib/db.js';
import { logger } from '../utils/logger.js';
import * as ideam from '../services/ideam.service.js';
import * as sgc from '../services/sgc.service.js';

const IS_PROD = process.env.NODE_ENV === 'production';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  // GET /health — healthcheck del contenedor (siempre 200)
  // En producción devuelve solo status/timestamp para no exponer topología interna.
  app.get('/health', async (_req, reply) => {
    const start = Date.now();

    // Liveness check mínimo — siempre necesario para Docker/nginx health probe
    let dbStatus: 'ok' | 'down' = 'ok';
    let overallStatus: 'ok' | 'degraded' | 'down' = 'ok';
    try {
      await db`SELECT 1`;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      logger.error({ err: msg }, 'health: db down');
      dbStatus = 'down';
      overallStatus = 'down';
    }

    // En producción devolver respuesta mínima (no exponer topología)
    if (IS_PROD) {
      return reply.status(200).send({
        status: overallStatus,
        response_ms: Date.now() - start,
        timestamp: new Date().toISOString(),
      });
    }

    // En dev/staging: detalle completo
    const services: Record<string, string> = {};
    services.db = dbStatus;
    services.storage = 'local';
    services.ideam = `mock (last_check: ${ideam.getLastCheck() || 'never'})`;
    services.sgc = `mock (last_check: ${sgc.getLastCheck() || 'never'})`;

    let syncPendientes = 0;
    try {
      const [row] = await db`SELECT COUNT(*)::int AS n FROM sync_queue WHERE procesado = false`;
      syncPendientes = row?.n ?? 0;
    } catch { /* no bloquear */ }

    return reply.status(200).send({
      status: overallStatus,
      services,
      sync_queue: { pendientes: syncPendientes },
      uptime_seconds: Math.floor(process.uptime()),
      response_ms: Date.now() - start,
      timestamp: new Date().toISOString(),
    });
  });
}
