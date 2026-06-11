import type { FastifyInstance } from 'fastify';
import { db } from '../lib/db.js';
import { authMiddleware } from '../middleware/auth.js';
import { ForbiddenError, NotFoundError } from '../utils/errors.js';
import type { RolUsuario } from '../types/domain.js';

const ROLES_PERMITIDOS: RolUsuario[] = ['CDGRD', 'CMGRD', 'SOCORRO', 'ADMIN'];
const ROLES_ADMIN: RolUsuario[] = ['CDGRD', 'ADMIN'];

export async function damnificadosRoutes(app: FastifyInstance): Promise<void> {
  // GET /damnificados
  app.get(
    '/damnificados',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const user = request.user!;

      if (!ROLES_PERMITIDOS.includes(user.rol)) {
        throw new ForbiddenError('Sin acceso al registro de damnificados');
      }

      const { municipio, limit } = request.query as {
        municipio?: string;
        limit?: string;
      };

      const limitNum = Math.min(limit ? parseInt(limit, 10) : 100, 500);

      // CMGRD y SOCORRO solo ven su municipio
      const municipioFiltro =
        !ROLES_ADMIN.includes(user.rol) && user.municipio_id
          ? user.municipio_id
          : municipio ?? null;

      const rows = municipioFiltro
        ? await db`
            SELECT * FROM damnificados
            WHERE municipio_id = ${municipioFiltro}
            ORDER BY created_at DESC
            LIMIT ${limitNum}
          `
        : await db`
            SELECT * FROM damnificados
            ORDER BY created_at DESC
            LIMIT ${limitNum}
          `;

      return reply.send({ data: rows, total: rows.length });
    },
  );

  // GET /damnificados/:id
  app.get(
    '/damnificados/:id',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const user = request.user!;
      const { id } = request.params as { id: string };

      if (!ROLES_PERMITIDOS.includes(user.rol)) {
        throw new ForbiddenError('Sin acceso al registro de damnificados');
      }

      const restrictMunicipio = !ROLES_ADMIN.includes(user.rol) && user.municipio_id;

      const rows = restrictMunicipio
        ? await db`
            SELECT * FROM damnificados
            WHERE id = ${id} AND municipio_id = ${user.municipio_id!}
          `
        : await db`SELECT * FROM damnificados WHERE id = ${id}`;

      if (!rows[0]) throw new NotFoundError('Damnificado no encontrado');

      return reply.send({ data: rows[0] });
    },
  );

  // POST /damnificados
  app.post(
    '/damnificados',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const user = request.user!;

      if (!ROLES_PERMITIDOS.includes(user.rol)) {
        throw new ForbiddenError('Sin permiso para registrar damnificados');
      }

      const body = request.body as Record<string, unknown>;

      // CMGRD y SOCORRO solo pueden registrar en su municipio
      if (!ROLES_ADMIN.includes(user.rol) && user.municipio_id) {
        body['municipio_id'] = user.municipio_id;
      }

      const municipio_id = body['municipio_id'] as string;
      const nombre = body['nombre'] as string;
      const documento = (body['documento'] ?? null) as string | null;
      const incidente_id = (body['incidente_id'] ?? null) as string | null;
      const telefono = (body['telefono'] ?? null) as string | null;
      const direccion = (body['direccion'] ?? null) as string | null;
      const condicion = (body['condicion'] ?? null) as string | null;
      const extra = { ...body } as Record<string, unknown>;
      // Quitar campos ya extraídos
      for (const k of ['municipio_id', 'nombre', 'documento', 'incidente_id', 'telefono', 'direccion', 'condicion']) {
        delete extra[k];
      }

      const [row] = await db`
        INSERT INTO damnificados (
          municipio_id, nombre, documento, incidente_id, telefono, direccion, condicion,
          registrado_por, created_at, updated_at
        )
        VALUES (
          ${municipio_id}, ${nombre}, ${documento}, ${incidente_id}, ${telefono},
          ${direccion}, ${condicion}, ${user.id}, NOW(), NOW()
        )
        RETURNING *
      `;

      return reply.status(201).send({ data: row });
    },
  );

  // PATCH /damnificados/:id
  app.patch(
    '/damnificados/:id',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const user = request.user!;
      const { id } = request.params as { id: string };

      if (!ROLES_PERMITIDOS.includes(user.rol)) {
        throw new ForbiddenError('Sin permiso para actualizar damnificados');
      }

      const restrictMunicipio = !ROLES_ADMIN.includes(user.rol) && user.municipio_id;

      const existing = restrictMunicipio
        ? await db`
            SELECT id FROM damnificados
            WHERE id = ${id} AND municipio_id = ${user.municipio_id!}
          `
        : await db`SELECT id FROM damnificados WHERE id = ${id}`;

      if (!existing[0]) throw new NotFoundError('Damnificado no encontrado');

      const body = request.body as Record<string, unknown>;
      const fields = Object.entries(body).filter(([k]) => k !== 'id');

      if (fields.length === 0) {
        const [current] = await db`SELECT * FROM damnificados WHERE id = ${id}`;
        return reply.send({ data: current });
      }

      // Construir SET dinámico usando postgres.js
      const setClauses = fields.map(([k, v]) => db`${db(k)} = ${v as string}`);
      const setFragment = setClauses.reduce((acc, clause, i) =>
        i === 0 ? clause : db`${acc}, ${clause}`,
      );

      const [updated] = await db`
        UPDATE damnificados
        SET ${setFragment}, updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;

      return reply.send({ data: updated });
    },
  );
}
