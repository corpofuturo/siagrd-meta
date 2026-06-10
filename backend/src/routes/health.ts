import type { FastifyInstance } from 'fastify';
import { db } from '../lib/db.js';
import { logger } from '../utils/logger.js';
import * as ideam from '../services/ideam.service.js';
import * as sgc from '../services/sgc.service.js';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async (_req, reply) => {
    const start = Date.now();
    const services: Record<string, string> = {};
    let overallStatus: 'ok' | 'degraded' | 'down' = 'ok';

    try {
      await db`SELECT 1`;
      services.db = 'ok';
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      logger.error({ err: msg }, 'health: db down');
      services.db = 'down';
      overallStatus = 'down';
    }

    services.storage = 'local';
    services.redis = 'not_configured';
    services.sms = 'disabled';
    services.fcm = process.env.FIREBASE_PROJECT_ID ? 'configured' : 'not_configured';
    services.ideam = `mock (last_check: ${ideam.getLastCheck() || 'never'})`;
    services.sgc = `mock (last_check: ${sgc.getLastCheck() || 'never'})`;

    let syncPendientes = 0;
    try {
      const [row] = await db`SELECT COUNT(*)::int AS n FROM sync_queue WHERE procesado = false`;
      syncPendientes = row?.n ?? 0;
    } catch { /* no bloquear */ }

    return reply.status(overallStatus === 'down' ? 503 : 200).send({
      status: overallStatus,
      services,
      sync_queue: { pendientes: syncPendientes },
      uptime_seconds: Math.floor(process.uptime()),
      response_ms: Date.now() - start,
      timestamp: new Date().toISOString(),
    });
  });
}
