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
  app.post('/reportes-ciudadanos', async (request, reply) => {
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
  });
}
