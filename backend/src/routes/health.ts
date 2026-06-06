import type { FastifyInstance } from 'fastify';
import { supabaseAdmin } from '../lib/supabase.js';
import { logger } from '../utils/logger.js';
import * as ideam from '../services/ideam.service.js';
import * as sgc from '../services/sgc.service.js';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async (_req, reply) => {
    const start = Date.now();
    const services: Record<string, string> = {};
    let overallStatus: 'ok' | 'degraded' | 'down' = 'ok';

    // Verificar DB
    try {
      const { error } = await supabaseAdmin
        .from('municipios')
        .select('id')
        .limit(1);
      if (error) {
        logger.warn({ err: error.message, code: error.code }, 'health: db degraded');
        services.db = `degraded (${error.code ?? error.message})`;
      } else {
        services.db = 'ok';
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      logger.error({ err: msg }, 'health: db down');
      services.db = 'down';
      overallStatus = 'down';
    }

    // Verificar Storage (listar buckets) — no afecta overallStatus
    try {
      const { data, error } = await supabaseAdmin.storage.listBuckets();
      if (error) {
        logger.warn({ err: error.message }, 'health: storage degraded');
        services.storage = 'degraded';
      } else {
        services.storage = `ok (${data?.length ?? 0} buckets)`;
      }
    } catch (e) {
      logger.warn({ err: e }, 'health: storage exception');
      services.storage = 'degraded';
    }

    // Redis — verificar via variable de entorno
    try {
      if (process.env.UPSTASH_REDIS_REST_URL) {
        const { Redis } = await import('@upstash/redis');
        const redis = new Redis({
          url: process.env.UPSTASH_REDIS_REST_URL!,
          token: process.env.UPSTASH_REDIS_REST_TOKEN!,
        });
        await redis.ping();
        services.redis = 'ok';
      } else {
        services.redis = 'not_configured';
      }
    } catch {
      services.redis = 'down';
      if (overallStatus === 'ok') overallStatus = 'degraded';
    }

    // FCM
    services.fcm = process.env.FIREBASE_PROJECT_ID ? 'configured' : 'not_configured';

    // IDEAM y SGC (siempre mock por ahora)
    services.ideam = `mock (last_check: ${ideam.getLastCheck() || 'never'})`;
    services.sgc = `mock (last_check: ${sgc.getLastCheck() || 'never'})`;

    // Conteo sync_queue pendientes
    let syncPendientes = 0;
    try {
      const { count } = await supabaseAdmin
        .from('sync_queue')
        .select('*', { count: 'exact', head: true })
        .eq('procesado', false);
      syncPendientes = count ?? 0;
    } catch {
      // no bloquear health check
    }

    // Solo db afecta el estado global — storage/redis/fcm son informativos
    if (services.db === 'down') overallStatus = 'down';
    else if (services.db === 'degraded') overallStatus = 'degraded';

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
