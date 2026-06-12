import type { FastifyInstance } from 'fastify';
import { db } from '../lib/db.js';
import { authMiddleware } from '../middleware/auth.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../utils/errors.js';
import type { RolUsuario } from '../types/domain.js';

const ROLES_ADMIN: RolUsuario[] = ['ADMIN', 'CDGRD'];

export async function jalRoutes(app: FastifyInstance): Promise<void> {

  // ── GET /jal ─────────────────────────────────────────────────────────────────
  app.get('/jal', { preHandler: authMiddleware }, async (request, reply) => {
    const { municipio_id, activo } = request.query as {
      municipio_id?: string;
      activo?: string;
    };

    const rows = await db`
      SELECT j.*, m.nombre AS municipio_nombre
      FROM juntas_accion_comunal j
      LEFT JOIN municipios m ON m.id = j.municipio_id
      WHERE (${ municipio_id ? db`j.municipio_id = ${municipio_id}`         : db`TRUE` })
        AND (${ activo !== undefined ? db`j.activo = ${activo === 'true'}` : db`TRUE` })
      ORDER BY j.nombre
    `;

    return reply.send({ data: rows, total: rows.length });
  });

  // ── GET /jal/:id ─────────────────────────────────────────────────────────────
  app.get('/jal/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const [row] = await db`
      SELECT j.*, m.nombre AS municipio_nombre
      FROM juntas_accion_comunal j
      LEFT JOIN municipios m ON m.id = j.municipio_id
      WHERE j.id = ${id}
    `;
    if (!row) throw new NotFoundError('JAL/JAC no encontrada');

    return reply.send(row);
  });

  // ── POST /jal ────────────────────────────────────────────────────────────────
  app.post('/jal', { preHandler: authMiddleware }, async (request, reply) => {
    const user = request.user!;
    if (!ROLES_ADMIN.includes(user.rol)) throw new ForbiddenError('Solo ADMIN/CDGRD pueden crear JAL/JAC');

    const body = request.body as {
      nombre: string;
      barrio_vereda?: string;
      municipio_id: string;
      presidente?: string;
      correo?: string;
      telefono?: string;
      activo?: boolean;
    };

    if (!body?.nombre?.trim()) throw new ValidationError('nombre es requerido');
    if (!body?.municipio_id) throw new ValidationError('municipio_id es requerido');

    const [row] = await db`
      INSERT INTO juntas_accion_comunal
        (nombre, barrio_vereda, municipio_id, presidente, correo, telefono, activo, created_at, updated_at)
      VALUES (
        ${body.nombre.trim()},
        ${body.barrio_vereda ?? null},
        ${body.municipio_id},
        ${body.presidente ?? null},
        ${body.correo ?? null},
        ${body.telefono ?? null},
        ${body.activo ?? true},
        NOW(), NOW()
      )
      RETURNING *
    `;

    return reply.status(201).send(row);
  });

  // ── PATCH /jal/:id ───────────────────────────────────────────────────────────
  app.patch('/jal/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const user = request.user!;
    if (!ROLES_ADMIN.includes(user.rol)) throw new ForbiddenError('Solo ADMIN/CDGRD pueden editar JAL/JAC');

    const { id } = request.params as { id: string };
    const [existing] = await db`SELECT id FROM juntas_accion_comunal WHERE id = ${id}`;
    if (!existing) throw new NotFoundError('JAL/JAC no encontrada');

    const body = request.body as Record<string, unknown>;
    const allowed = ['nombre', 'barrio_vereda', 'municipio_id', 'presidente', 'responsable_id', 'correo', 'telefono', 'activo'];
    const updates: Record<string, unknown> = {};
    for (const k of allowed) {
      if (body[k] !== undefined) updates[k] = body[k];
    }
    if (Object.keys(updates).length === 0) throw new ValidationError('Sin campos para actualizar');

    updates.updated_at = new Date();

    const sets = Object.entries(updates).map(([k, v]) => db`${db(k)} = ${v as any}`);
    const [updated] = await db`
      UPDATE juntas_accion_comunal
      SET ${sets.reduce((a, b) => db`${a}, ${b}`)}
      WHERE id = ${id}
      RETURNING *
    `;

    return reply.send(updated);
  });

  // ── GET /jal/:id/usuarios ────────────────────────────────────────────────────
  app.get('/jal/:id/usuarios', { preHandler: authMiddleware }, async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };

    const [jal] = await db`SELECT id, responsable_id FROM juntas_accion_comunal WHERE id = ${id}`;
    if (!jal) throw new NotFoundError('JAL/JAC no encontrada');

    const esResponsable = jal.responsable_id === user.id;
    if (!ROLES_ADMIN.includes(user.rol) && !esResponsable) {
      throw new ForbiddenError('Sin acceso a usuarios de esta JAL');
    }

    const rows = await db`
      SELECT id, email, nombre, apellido, documento, celular, rol, activo, created_at
      FROM profiles
      WHERE jal_id = ${id}
      ORDER BY apellido, nombre
    `;

    return reply.send({ data: rows, total: rows.length });
  });

  // ── POST /jal/:id/usuarios ───────────────────────────────────────────────────
  app.post('/jal/:id/usuarios', { preHandler: authMiddleware }, async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };

    const [jal] = await db`SELECT id, responsable_id, municipio_id FROM juntas_accion_comunal WHERE id = ${id} AND activo = true`;
    if (!jal) throw new NotFoundError('JAL/JAC no encontrada o inactiva');

    const esResponsable = jal.responsable_id === user.id;
    if (!ROLES_ADMIN.includes(user.rol) && !esResponsable) {
      throw new ForbiddenError('Solo el responsable de la JAL o un administrador puede asignar usuarios');
    }

    const body = request.body as {
      email: string;
      nombre: string;
      apellido: string;
      documento?: string;
      celular?: string;
      password: string;
    };

    if (!body?.email?.trim()) throw new ValidationError('email es requerido');
    if (!body?.nombre?.trim()) throw new ValidationError('nombre es requerido');
    if (!body?.apellido?.trim()) throw new ValidationError('apellido es requerido');
    if (!body?.password || body.password.length < 6) throw new ValidationError('password mínimo 6 caracteres');

    const emailLower = body.email.trim().toLowerCase();
    const [existing] = await db`SELECT id FROM profiles WHERE email = ${emailLower}`;
    if (existing) throw new ValidationError('El correo ya está registrado');

    const bcrypt = await import('bcryptjs');
    const hash = await bcrypt.default.hash(body.password, 10);

    const [nuevo] = await db`
      INSERT INTO profiles (email, password_hash, nombre, apellido, documento, celular, rol, municipio_id, jal_id, activo, created_at)
      VALUES (
        ${emailLower},
        ${hash},
        ${body.nombre.trim()},
        ${body.apellido.trim()},
        ${body.documento ?? null},
        ${body.celular ?? null},
        'CIUDADANO',
        ${jal.municipio_id ?? null},
        ${id},
        true,
        NOW()
      )
      RETURNING id, email, nombre, apellido, documento, celular, rol, municipio_id, jal_id, activo, created_at
    `;

    return reply.status(201).send(nuevo);
  });

  // ── DELETE /jal/:id ──────────────────────────────────────────────────────────
  app.delete('/jal/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const user = request.user!;
    if (user.rol !== 'ADMIN') throw new ForbiddenError('Solo ADMIN puede eliminar JAL/JAC');

    const { id } = request.params as { id: string };
    const [existing] = await db`SELECT id FROM juntas_accion_comunal WHERE id = ${id}`;
    if (!existing) throw new NotFoundError('JAL/JAC no encontrada');

    await db`UPDATE juntas_accion_comunal SET activo = false, updated_at = NOW() WHERE id = ${id}`;
    return reply.status(204).send();
  });
}
