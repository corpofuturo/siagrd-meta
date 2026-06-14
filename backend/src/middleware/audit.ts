import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../lib/db.js';

const WRITE_METHODS = new Set(['POST', 'PATCH', 'DELETE', 'PUT']);

function inferTable(url: string): string {
  return url.split('/').filter(Boolean)[0] ?? 'unknown';
}

/**
 * Registra en audit_log todas las operaciones de escritura (POST/PATCH/DELETE/PUT).
 * Ley 1581/2012: no almacena IP para reportes anónimos.
 * Si el insert falla, no bloquea la petición.
 */
export async function auditMiddleware(app: FastifyInstance): Promise<void> {
  app.addHook(
    'onResponse',
    async (request: FastifyRequest, _reply: FastifyReply) => {
      const method = request.method.toUpperCase();
      if (!WRITE_METHODS.has(method)) return;
      if (request.url.startsWith('/health')) return;

      const usuario_id: string | null = (request as any).user?.id ?? null;
      const esReporteAnonimo = (request as any).__reporte_anonimo === true;
      const ip: string | null = esReporteAnonimo
        ? null
        : (request.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ??
           request.ip ??
           null);

      try {
        await db`
          INSERT INTO audit_log (tabla, metodo, url, usuario_id, ip, user_agent, timestamp)
          VALUES (
            ${inferTable(request.url)},
            ${method},
            ${request.url},
            ${usuario_id},
            ${ip},
            ${request.headers['user-agent'] ?? null},
            NOW()
          )
        `;
      } catch {
        // No bloquear la petición si falla el registro
      }
    },
  );
}
