import type { FastifyInstance } from 'fastify';
import { db } from '../lib/db.js';
import { authMiddleware } from '../middleware/auth.js';
import { ForbiddenError, NotFoundError } from '../utils/errors.js';
import type { RolUsuario } from '../types/domain.js';

const ROLES_ADMIN: RolUsuario[] = ['CDGRD', 'ADMIN'];

export async function recursosRoutes(app: FastifyInstance): Promise<void> {
  // GET /recursos — público
  app.get('/recursos', async (request, reply) => {
    const { tipo, municipio, disponible } = request.query as {
      tipo?: string;
      municipio?: string;
      disponible?: string;
    };

    const rows = await db`
      SELECT id, nombre, tipo, disponible, cantidad, municipio_id, organismo_id, updated_at
      FROM recursos
      WHERE TRUE
        ${tipo ? db`AND tipo = ${tipo}` : db``}
        ${municipio ? db`AND municipio_id = ${municipio}` : db``}
        ${disponible !== undefined ? db`AND disponible = ${disponible === 'true'}` : db``}
      ORDER BY nombre ASC
    `;

    return reply.send({ data: rows, total: rows.length });
  });

  // PATCH /recursos/:id
  app.patch(
    '/recursos/:id',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const user = request.user!;
      const { id } = request.params as { id: string };

      const [recurso] = await db`
        SELECT id, organismo_id FROM recursos WHERE id = ${id}
      `;
      if (!recurso) throw new NotFoundError('Recurso no encontrado');

      const esSuOrganismo =
        user.organismo_id != null && user.organismo_id === recurso.organismo_id;
      const esAdmin = ROLES_ADMIN.includes(user.rol);

      if (!esAdmin && !esSuOrganismo) {
        throw new ForbiddenError('Sin permiso para modificar este recurso');
      }

      const body = request.body as Record<string, unknown>;
      const fields = Object.entries(body).filter(([k]) => k !== 'id');

      if (fields.length === 0) {
        const [current] = await db`SELECT * FROM recursos WHERE id = ${id}`;
        return reply.send({ data: current });
      }

      const setClauses = fields.map(([k, v]) => db`${db(k)} = ${v as string}`);
      const setFragment = setClauses.reduce((acc, clause, i) =>
        i === 0 ? clause : db`${acc}, ${clause}`,
      );

      const [updated] = await db`
        UPDATE recursos
        SET ${setFragment}, updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;

      return reply.send({ data: updated });
    },
  );
}
