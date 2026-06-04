import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { supabaseAdmin } from '../lib/supabase.js';

const WRITE_METHODS = new Set(['POST', 'PATCH', 'DELETE', 'PUT']);

/**
 * Infiere el nombre de tabla a partir de la URL de la peticion.
 * Ejemplo: /alertas/123 -> alertas
 */
function inferTable(url: string): string {
  const segment = url.split('/').filter(Boolean)[0] ?? 'unknown';
  return segment;
}

/**
 * Middleware de auditoria: registra en audit_log todas las operaciones
 * de escritura (POST/PATCH/DELETE/PUT) excepto el endpoint /health.
 * Si el insert falla, no bloquea la peticion.
 */
export async function auditMiddleware(app: FastifyInstance): Promise<void> {
  app.addHook(
    'onResponse',
    async (request: FastifyRequest, _reply: FastifyReply) => {
      const method = request.method.toUpperCase();

      if (!WRITE_METHODS.has(method)) return;
      if (request.url.startsWith('/health')) return;

      const usuario_id: string | null =
        (request as any).user?.id ?? null;

      const ip =
        request.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ??
        request.ip ??
        null;

      const user_agent = request.headers['user-agent'] ?? null;
      const tabla = inferTable(request.url);

      try {
        await supabaseAdmin.from('audit_log').insert({
          tabla,
          metodo: method,
          url: request.url,
          usuario_id,
          ip,
          user_agent,
          timestamp: new Date().toISOString(),
        });
      } catch {
        // No bloquear la peticion si falla el registro de auditoria
      }
    },
  );
}
