import type { FastifyInstance } from 'fastify';
import { db } from '../lib/db.js';
import { authMiddleware } from '../middleware/auth.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../utils/errors.js';
import type { RolUsuario } from '../types/domain.js';

const ROLES_ADMIN: RolUsuario[] = ['ADMIN', 'CDGRD'];

type TipoComite = 'CONGRD' | 'CDGRD' | 'SDGRD' | 'CMGRD';

export async function comitesRoutes(app: FastifyInstance): Promise<void> {

  // ── GET /comites ─────────────────────────────────────────────────────────────
  app.get('/comites', { preHandler: authMiddleware }, async (request, reply) => {
    const user = request.user!;
    const { tipo, municipio_id, activo } = request.query as {
      tipo?: TipoComite;
      municipio_id?: string;
      activo?: string;
    };

    let rows: any[];

    if (ROLES_ADMIN.includes(user.rol)) {
      rows = await db`
        SELECT c.*, m.nombre AS municipio_nombre
        FROM comites_gestion_riesgo c
        LEFT JOIN municipios m ON m.id = c.municipio_id
        WHERE (${ tipo        ? db`c.tipo = ${tipo}`                        : db`TRUE` })
          AND (${ municipio_id ? db`c.municipio_id = ${municipio_id}`       : db`TRUE` })
          AND (${ activo !== undefined ? db`c.activo = ${activo === 'true'}` : db`TRUE` })
        ORDER BY c.nombre
      `;
    } else {
      const mid = user.municipio_id;
      if (!mid) return reply.send({ data: [], total: 0 });
      rows = await db`
        SELECT c.*, m.nombre AS municipio_nombre
        FROM comites_gestion_riesgo c
        LEFT JOIN municipios m ON m.id = c.municipio_id
        WHERE c.municipio_id = ${mid} AND c.activo = true
          AND (${ tipo ? db`c.tipo = ${tipo}` : db`TRUE` })
        ORDER BY c.nombre
      `;
    }

    return reply.send({ data: rows, total: rows.length });
  });

  // ── GET /comites/:id ─────────────────────────────────────────────────────────
  app.get('/comites/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const [row] = await db`
      SELECT c.*, m.nombre AS municipio_nombre
      FROM comites_gestion_riesgo c
      LEFT JOIN municipios m ON m.id = c.municipio_id
      WHERE c.id = ${id}
    `;
    if (!row) throw new NotFoundError('Comité no encontrado');

    return reply.send(row);
  });

  // ── POST /comites ────────────────────────────────────────────────────────────
  app.post('/comites', { preHandler: authMiddleware }, async (request, reply) => {
    const user = request.user!;
    if (!ROLES_ADMIN.includes(user.rol)) throw new ForbiddenError('Solo ADMIN/CDGRD pueden crear comités');

    const body = request.body as {
      tipo: TipoComite;
      nombre: string;
      municipio_id?: string;
      presidente?: string;
      secretario?: string;
      correo?: string;
      telefono?: string;
      direccion?: string;
      activo?: boolean;
    };

    if (!body?.tipo) throw new ValidationError('tipo es requerido');
    if (!body?.nombre?.trim()) throw new ValidationError('nombre es requerido');

    const tiposValidos: TipoComite[] = ['CONGRD', 'CDGRD', 'SDGRD', 'CMGRD'];
    if (!tiposValidos.includes(body.tipo)) throw new ValidationError(`tipo debe ser uno de: ${tiposValidos.join(', ')}`);

    const [row] = await db`
      INSERT INTO comites_gestion_riesgo
        (tipo, nombre, municipio_id, presidente, secretario, correo, telefono, direccion, activo, created_at, updated_at)
      VALUES (
        ${body.tipo},
        ${body.nombre.trim()},
        ${body.municipio_id ?? null},
        ${body.presidente ?? null},
        ${body.secretario ?? null},
        ${body.correo ?? null},
        ${body.telefono ?? null},
        ${body.direccion ?? null},
        ${body.activo ?? true},
        NOW(), NOW()
      )
      RETURNING *
    `;

    return reply.status(201).send(row);
  });

  // ── PATCH /comites/:id ───────────────────────────────────────────────────────
  app.patch('/comites/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const user = request.user!;
    if (!ROLES_ADMIN.includes(user.rol)) throw new ForbiddenError('Solo ADMIN/CDGRD pueden editar comités');

    const { id } = request.params as { id: string };
    const [existing] = await db`SELECT id FROM comites_gestion_riesgo WHERE id = ${id}`;
    if (!existing) throw new NotFoundError('Comité no encontrado');

    const body = request.body as Record<string, unknown>;
    const allowed = ['tipo', 'nombre', 'municipio_id', 'presidente', 'lider_id', 'secretario', 'correo', 'telefono', 'direccion', 'activo'];
    const updates: Record<string, unknown> = {};
    for (const k of allowed) {
      if (body[k] !== undefined) updates[k] = body[k];
    }
    if (Object.keys(updates).length === 0) throw new ValidationError('Sin campos para actualizar');

    if (updates.tipo) {
      const tiposValidos: TipoComite[] = ['CONGRD', 'CDGRD', 'SDGRD', 'CMGRD'];
      if (!tiposValidos.includes(updates.tipo as TipoComite)) throw new ValidationError(`tipo inválido`);
    }

    updates.updated_at = new Date();

    const sets = Object.entries(updates).map(([k, v]) => db`${db(k)} = ${v as any}`);
    const [updated] = await db`
      UPDATE comites_gestion_riesgo
      SET ${sets.reduce((a, b) => db`${a}, ${b}`)}
      WHERE id = ${id}
      RETURNING *
    `;

    return reply.send(updated);
  });

  // ── DELETE /comites/:id ──────────────────────────────────────────────────────
  app.delete('/comites/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const user = request.user!;
    if (user.rol !== 'ADMIN') throw new ForbiddenError('Solo ADMIN puede eliminar comités');

    const { id } = request.params as { id: string };
    const [existing] = await db`SELECT id FROM comites_gestion_riesgo WHERE id = ${id}`;
    if (!existing) throw new NotFoundError('Comité no encontrado');

    await db`UPDATE comites_gestion_riesgo SET activo = false, updated_at = NOW() WHERE id = ${id}`;
    return reply.status(204).send();
  });
}
