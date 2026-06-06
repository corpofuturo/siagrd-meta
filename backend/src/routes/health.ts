import type { FastifyInstance } from 'fastify';
import { supabaseAdmin } from '../lib/supabase.js';
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
      services.db = error ? 'degraded' : 'ok';
    } catch {
      services.db = 'down';
      overallStatus = 'down';
    }

    // Verificar Storage (listar buckets)
    try {
      const { error } = await supabaseAdmin.storage.listBuckets();
      services.storage = error ? 'degraded' : 'ok';
    } catch {
      services.storage = 'degraded';
      if (overallStatus === 'ok') overallStatus = 'degraded';
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

    if (services.db === 'down') overallStatus = 'down';
    else if (Object.values(services).some((s) => s === 'degraded') && overallStatus === 'ok') {
      overallStatus = 'degraded';
    }

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
