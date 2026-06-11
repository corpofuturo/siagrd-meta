import type { FastifyInstance } from 'fastify';
import { db } from '../lib/db.js';
import { authMiddleware } from '../middleware/auth.js';
import { ForbiddenError } from '../utils/errors.js';
import type { RolUsuario } from '../types/domain.js';

const ROLES_LECTURA: RolUsuario[] = ['CDGRD', 'CMGRD', 'SOCORRO', 'ADMIN'];

export async function reportesRoutes(app: FastifyInstance): Promise<void> {
  // GET /reportes-ciudadanos — solo CDGRD/CMGRD/SOCORRO/ADMIN
  app.get(
    '/reportes-ciudadanos',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const user = request.user!;

      if (!ROLES_LECTURA.includes(user.rol)) {
        throw new ForbiddenError('Sin acceso a reportes ciudadanos');
      }

      const { estado, municipio, limit } = request.query as {
        estado?: string;
        municipio?: string;
        limit?: string;
      };

      const limitNum = limit ? parseInt(limit, 10) : 50;

      const rows = await db`
        SELECT * FROM reportes_ciudadanos
        WHERE TRUE
          ${estado ? db`AND estado = ${estado}` : db``}
          ${municipio ? db`AND municipio_id = ${municipio}` : db``}
        ORDER BY created_at DESC
        LIMIT ${limitNum}
      `;

      return reply.send({ data: rows, total: rows.length });
    },
  );

  // POST /reportes-ciudadanos — público (incluye anónimos)
  // Rate limit diferenciado (Ley 1581):
  //   - Anónimos  → máx 3 reportes/hora por IP
  //   - Autenticados → máx 10 reportes/hora por token
  app.post(
    '/reportes-ciudadanos',
    {
      config: {
        rateLimit: {
          timeWindow: '1 hour',
          // max como función: 10 para autenticados, 3 para anónimos
          max: (request) =>
            request.headers.authorization?.startsWith('Bearer ') ? 10 : 3,
          // keyGenerator: clave distinta para anónimos (IP) y autenticados (token)
          keyGenerator: (request) => {
            const token = request.headers.authorization;
            if (token?.startsWith('Bearer ')) {
              // Usar el token completo como clave — suficientemente único por sesión
              return `auth:${token.slice(7, 47)}`; // primeros 40 chars del JWT
            }
            const ip =
              request.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ??
              request.ip ??
              'unknown';
            return `anon:${ip}`;
          },
          errorResponseBuilder: () => ({
            statusCode: 429,
            error: 'Too Many Requests',
            message: 'Límite de reportes excedido. Intente nuevamente en una hora.',
            code: 'RATE_LIMIT_EXCEEDED',
          }),
        },
      },
    },
    async (request, reply) => {
      const body = request.body as Record<string, unknown>;

      let reportante_id: string | null = null;
      let anonimo = true;

      if (body.anonimo === true) {
        anonimo = true;
        reportante_id = null;
      } else {
        const header = request.headers.authorization;
        if (header?.startsWith('Bearer ')) {
          try {
            await authMiddleware(request, reply);
            reportante_id = request.user?.id ?? null;
            anonimo = reportante_id === null;
          } catch {
            reportante_id = null;
            anonimo = true;
          }
        }
      }

      // Marcar si es anónimo para que audit.ts omita la IP (Ley 1581)
      (request as any).__reporte_anonimo = anonimo;

      const [row] = await db`
        INSERT INTO reportes_ciudadanos (
          descripcion, tipo, municipio_id, ubicacion, anonimo, reportante_id, estado,
          created_at, updated_at
        )
        VALUES (
          ${body.descripcion as string},
          ${body.tipo as string},
          ${body.municipio_id as string},
          ${body.ubicacion ? JSON.stringify(body.ubicacion) : null},
          ${anonimo},
          ${reportante_id},
          'PENDIENTE',
          NOW(), NOW()
        )
        RETURNING *
      `;

      return reply.status(201).send({ data: row });
    },
  );
}
