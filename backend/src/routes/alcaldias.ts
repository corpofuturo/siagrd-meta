import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { db } from '../lib/db.js';
import { authMiddleware } from '../middleware/auth.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../utils/errors.js';
import type { RolUsuario } from '../types/domain.js';

const ROLES_ADMIN: RolUsuario[] = ['ADMIN', 'CDGRD'];

export async function alcaldiasRoutes(app: FastifyInstance): Promise<void> {

  // ── POST /alcaldias ───────────────────────────────────────────────────────────
  app.post('/alcaldias', { preHandler: authMiddleware }, async (request, reply) => {
    const user = request.user!;
    if (!ROLES_ADMIN.includes(user.rol)) throw new ForbiddenError('Solo ADMIN/CDGRD pueden crear alcaldías');

    const body = request.body as {
      nombre: string;
      municipio_id: string;
      lider_id?: string;
      correo?: string;
      telefono?: string;
      direccion?: string;
    };

    if (!body?.nombre?.trim()) throw new ValidationError('nombre es requerido');
    if (!body?.municipio_id) throw new ValidationError('municipio_id es requerido');

    const [mun] = await db`SELECT id FROM municipios WHERE id = ${body.municipio_id}`;
    if (!mun) throw new ValidationError('municipio_id no existe');

    const [row] = await db`
      INSERT INTO alcaldias (nombre, municipio_id, lider_id, correo, telefono, direccion, activo, created_at, updated_at)
      VALUES (
        ${body.nombre.trim()},
        ${body.municipio_id},
        ${body.lider_id ?? null},
        ${body.correo ?? null},
        ${body.telefono ?? null},
        ${body.direccion ?? null},
        true, NOW(), NOW()
      )
      RETURNING *
    `;

    return reply.status(201).send(row);
  });

  // ── GET /alcaldias ────────────────────────────────────────────────────────────
  app.get('/alcaldias', { preHandler: authMiddleware }, async (request, reply) => {
    const user = request.user!;
    const { municipio_id, activo, limit: limitStr, offset: offsetStr } = request.query as {
      municipio_id?: string;
      activo?: string;
      limit?: string;
      offset?: string;
    };

    const limit  = Math.min(parseInt(limitStr  ?? '50', 10), 200);
    const offset = parseInt(offsetStr ?? '0', 10);

    // Usuarios no-admin ven solo la alcaldía de su municipio
    const mid = ROLES_ADMIN.includes(user.rol) ? (municipio_id ?? null) : (user.municipio_id ?? null);

    const rows = await db`
      SELECT a.*, m.nombre AS municipio_nombre,
             p.nombre AS lider_nombre, p.apellido AS lider_apellido, p.email AS lider_email
      FROM alcaldias a
      LEFT JOIN municipios m ON m.id = a.municipio_id
      LEFT JOIN profiles p ON p.id = a.lider_id
      WHERE TRUE
        ${mid ? db`AND a.municipio_id = ${mid}` : db``}
        ${activo !== undefined ? db`AND a.activo = ${activo === 'true'}` : db``}
      ORDER BY a.nombre
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [{ total }] = await db`
      SELECT COUNT(*) AS total FROM alcaldias
      WHERE TRUE
        ${mid ? db`AND municipio_id = ${mid}` : db``}
        ${activo !== undefined ? db`AND activo = ${activo === 'true'}` : db``}
    `;

    return reply.send({ data: rows, total: Number(total), limit, offset });
  });

  // ── GET /alcaldias/:id ────────────────────────────────────────────────────────
  app.get('/alcaldias/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const [row] = await db`
      SELECT a.*, m.nombre AS municipio_nombre,
             p.nombre AS lider_nombre, p.apellido AS lider_apellido, p.email AS lider_email
      FROM alcaldias a
      LEFT JOIN municipios m ON m.id = a.municipio_id
      LEFT JOIN profiles p ON p.id = a.lider_id
      WHERE a.id = ${id}
    `;
    if (!row) throw new NotFoundError('Alcaldía no encontrada');

    const miembros = await db`
      SELECT id, email, nombre, apellido, documento, celular, rol, activo, created_at
      FROM profiles
      WHERE alcaldia_id = ${id}
      ORDER BY apellido, nombre
    `;

    return reply.send({ ...row, miembros });
  });

  // ── PATCH /alcaldias/:id ──────────────────────────────────────────────────────
  app.patch('/alcaldias/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };

    const [alc] = await db`SELECT id, lider_id FROM alcaldias WHERE id = ${id}`;
    if (!alc) throw new NotFoundError('Alcaldía no encontrada');

    const esLider = alc.lider_id === user.id && user.rol === 'ALCALDIA';
    if (!ROLES_ADMIN.includes(user.rol) && !esLider) {
      throw new ForbiddenError('Sin permiso para editar esta alcaldía');
    }

    const body = request.body as Record<string, unknown>;
    const allowed = ['nombre', 'municipio_id', 'correo', 'telefono', 'direccion', 'activo', 'lider_id'];
    const updates: Record<string, unknown> = {};
    for (const k of allowed) {
      if (body[k] !== undefined) updates[k] = body[k];
    }
    if (Object.keys(updates).length === 0) throw new ValidationError('Sin campos para actualizar');

    // lider_id solo lo puede cambiar ADMIN/CDGRD
    if (updates.lider_id && !ROLES_ADMIN.includes(user.rol)) {
      throw new ForbiddenError('Solo ADMIN/CDGRD pueden cambiar el líder');
    }

    updates.updated_at = new Date();

    const sets = Object.entries(updates).map(([k, v]) => db`${db(k)} = ${v as any}`);
    const [updated] = await db`
      UPDATE alcaldias SET ${sets.reduce((a, b) => db`${a}, ${b}`)} WHERE id = ${id} RETURNING *
    `;

    return reply.send(updated);
  });

  // ── DELETE /alcaldias/:id — soft delete ────────────────────────────────────────
  app.delete('/alcaldias/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const user = request.user!;
    if (!ROLES_ADMIN.includes(user.rol)) throw new ForbiddenError('Solo ADMIN/CDGRD pueden desactivar alcaldías');

    const { id } = request.params as { id: string };
    const [alc] = await db`SELECT id FROM alcaldias WHERE id = ${id}`;
    if (!alc) throw new NotFoundError('Alcaldía no encontrada');

    await db`UPDATE alcaldias SET activo = false, updated_at = NOW() WHERE id = ${id}`;
    return reply.status(204).send();
  });

  // ── GET /alcaldias/:id/usuarios ───────────────────────────────────────────────
  app.get('/alcaldias/:id/usuarios', { preHandler: authMiddleware }, async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };

    const [alc] = await db`SELECT id, lider_id FROM alcaldias WHERE id = ${id}`;
    if (!alc) throw new NotFoundError('Alcaldía no encontrada');

    const esLider = alc.lider_id === user.id;
    if (!ROLES_ADMIN.includes(user.rol) && !esLider && user.rol !== 'ALCALDIA') {
      throw new ForbiddenError('Sin acceso a usuarios de esta alcaldía');
    }

    const rows = await db`
      SELECT id, email, nombre, apellido, documento, celular, rol, activo, created_at
      FROM profiles
      WHERE alcaldia_id = ${id}
      ORDER BY apellido, nombre
    `;

    return reply.send({ data: rows, total: rows.length });
  });

  // ── POST /alcaldias/:id/usuarios ──────────────────────────────────────────────
  app.post('/alcaldias/:id/usuarios', { preHandler: authMiddleware }, async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };

    const [alc] = await db`SELECT id, lider_id, municipio_id FROM alcaldias WHERE id = ${id} AND activo = true`;
    if (!alc) throw new NotFoundError('Alcaldía no encontrada o inactiva');

    const esLider = alc.lider_id === user.id && user.rol === 'ALCALDIA';
    if (!ROLES_ADMIN.includes(user.rol) && !esLider) {
      throw new ForbiddenError('Solo el líder de la alcaldía o un administrador puede agregar miembros');
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

    const hash = await bcrypt.hash(body.password, 10);
    const [nuevo] = await db`
      INSERT INTO profiles (email, password_hash, nombre, apellido, documento, celular, rol, municipio_id, alcaldia_id, activo, created_at)
      VALUES (
        ${emailLower},
        ${hash},
        ${body.nombre.trim()},
        ${body.apellido.trim()},
        ${body.documento ?? null},
        ${body.celular ?? null},
        'ALCALDIA',
        ${alc.municipio_id ?? null},
        ${id},
        true,
        NOW()
      )
      RETURNING id, email, nombre, apellido, documento, celular, rol, municipio_id, alcaldia_id, activo, created_at
    `;

    return reply.status(201).send(nuevo);
  });

  // ── PATCH /alcaldias/:alc_id/usuarios/:user_id ────────────────────────────────
  app.patch('/alcaldias/:alc_id/usuarios/:user_id', { preHandler: authMiddleware }, async (request, reply) => {
    const user = request.user!;
    const { alc_id, user_id } = request.params as { alc_id: string; user_id: string };

    const [alc] = await db`SELECT id, lider_id FROM alcaldias WHERE id = ${alc_id}`;
    if (!alc) throw new NotFoundError('Alcaldía no encontrada');

    const esLider = alc.lider_id === user.id && user.rol === 'ALCALDIA';
    if (!ROLES_ADMIN.includes(user.rol) && !esLider) {
      throw new ForbiddenError('Sin permiso');
    }

    const [perfil] = await db`SELECT id, alcaldia_id FROM profiles WHERE id = ${user_id}`;
    if (!perfil || perfil.alcaldia_id !== alc_id) throw new NotFoundError('Usuario no pertenece a esta alcaldía');

    const body = request.body as Record<string, unknown>;
    const allowed = ROLES_ADMIN.includes(user.rol)
      ? ['nombre', 'apellido', 'documento', 'celular', 'activo', 'rol']
      : ['nombre', 'apellido', 'documento', 'celular', 'activo'];
    const updates: Record<string, unknown> = {};
    for (const k of allowed) {
      if (body[k] !== undefined) updates[k] = body[k];
    }
    if (Object.keys(updates).length === 0) throw new ValidationError('Sin campos para actualizar');

    const sets = Object.entries(updates).map(([k, v]) => db`${db(k)} = ${v as any}`);
    const [updated] = await db`
      UPDATE profiles SET ${sets.reduce((a, b) => db`${a}, ${b}`)} WHERE id = ${user_id}
      RETURNING id, email, nombre, apellido, documento, celular, rol, activo
    `;

    return reply.send(updated);
  });

  // ── POST /gobernacion ────────────────────────────────────────────────────────
  app.post('/gobernacion', { preHandler: authMiddleware }, async (request, reply) => {
    const user = request.user!;
    if (!ROLES_ADMIN.includes(user.rol)) throw new ForbiddenError('Solo ADMIN/CDGRD pueden crear la gobernación');

    const body = request.body as {
      nombre: string;
      departamento_id: string;
      lider_id?: string;
      correo?: string;
      telefono?: string;
      direccion?: string;
    };

    if (!body?.nombre?.trim()) throw new ValidationError('nombre es requerido');
    if (!body?.departamento_id) throw new ValidationError('departamento_id es requerido');

    const [dep] = await db`SELECT id FROM departamentos WHERE id = ${body.departamento_id}`;
    if (!dep) throw new ValidationError('departamento_id no existe');

    const [row] = await db`
      INSERT INTO gobernacion_departamental (nombre, departamento_id, lider_id, correo, telefono, direccion, activo, created_at, updated_at)
      VALUES (
        ${body.nombre.trim()},
        ${body.departamento_id},
        ${body.lider_id ?? null},
        ${body.correo ?? null},
        ${body.telefono ?? null},
        ${body.direccion ?? null},
        true, NOW(), NOW()
      )
      RETURNING *
    `;

    return reply.status(201).send(row);
  });

  // ── GET /gobernacion ─────────────────────────────────────────────────────────
  app.get('/gobernacion', { preHandler: authMiddleware }, async (_request, reply) => {
    const [row] = await db`
      SELECT g.*, d.nombre AS departamento_nombre,
             p.nombre AS lider_nombre, p.apellido AS lider_apellido, p.email AS lider_email
      FROM gobernacion_departamental g
      LEFT JOIN departamentos d ON d.id = g.departamento_id
      LEFT JOIN profiles p ON p.id = g.lider_id
      WHERE g.activo = true
      LIMIT 1
    `;

    return reply.send(row ?? null);
  });

  // ── PATCH /gobernacion/:id ───────────────────────────────────────────────────
  app.patch('/gobernacion/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };

    const [gov] = await db`SELECT id, lider_id FROM gobernacion_departamental WHERE id = ${id}`;
    if (!gov) throw new NotFoundError('Gobernación no encontrada');

    const esLider = gov.lider_id === user.id && user.rol === 'GOBERNACION';
    if (!ROLES_ADMIN.includes(user.rol) && !esLider) {
      throw new ForbiddenError('Sin permiso para editar la gobernación');
    }

    const body = request.body as Record<string, unknown>;
    const allowed = ['nombre', 'departamento_id', 'correo', 'telefono', 'direccion', 'activo', 'lider_id'];
    const updates: Record<string, unknown> = {};
    for (const k of allowed) {
      if (body[k] !== undefined) updates[k] = body[k];
    }
    if (Object.keys(updates).length === 0) throw new ValidationError('Sin campos para actualizar');

    if (updates.lider_id && !ROLES_ADMIN.includes(user.rol)) {
      throw new ForbiddenError('Solo ADMIN/CDGRD pueden cambiar el líder');
    }

    updates.updated_at = new Date();

    const sets = Object.entries(updates).map(([k, v]) => db`${db(k)} = ${v as any}`);
    const [updated] = await db`
      UPDATE gobernacion_departamental SET ${sets.reduce((a, b) => db`${a}, ${b}`)} WHERE id = ${id} RETURNING *
    `;

    return reply.send(updated);
  });

  // ── GET /gobernacion/:id/usuarios ────────────────────────────────────────────
  app.get('/gobernacion/:id/usuarios', { preHandler: authMiddleware }, async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };

    const [gov] = await db`SELECT id, lider_id FROM gobernacion_departamental WHERE id = ${id}`;
    if (!gov) throw new NotFoundError('Gobernación no encontrada');

    const esLider = gov.lider_id === user.id;
    if (!ROLES_ADMIN.includes(user.rol) && !esLider && user.rol !== 'GOBERNACION') {
      throw new ForbiddenError('Sin acceso a usuarios de la gobernación');
    }

    const rows = await db`
      SELECT id, email, nombre, apellido, documento, celular, rol, activo, created_at
      FROM profiles
      WHERE gobernacion_id = ${id}
      ORDER BY apellido, nombre
    `;

    return reply.send({ data: rows, total: rows.length });
  });

  // ── POST /gobernacion/:id/usuarios ───────────────────────────────────────────
  app.post('/gobernacion/:id/usuarios', { preHandler: authMiddleware }, async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };

    const [gov] = await db`SELECT id, lider_id, departamento_id FROM gobernacion_departamental WHERE id = ${id} AND activo = true`;
    if (!gov) throw new NotFoundError('Gobernación no encontrada o inactiva');

    const esLider = gov.lider_id === user.id && user.rol === 'GOBERNACION';
    if (!ROLES_ADMIN.includes(user.rol) && !esLider) {
      throw new ForbiddenError('Solo el líder de gobernación o un administrador puede agregar miembros');
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

    const hash = await bcrypt.hash(body.password, 10);
    const [nuevo] = await db`
      INSERT INTO profiles (email, password_hash, nombre, apellido, documento, celular, rol, gobernacion_id, activo, created_at)
      VALUES (
        ${emailLower},
        ${hash},
        ${body.nombre.trim()},
        ${body.apellido.trim()},
        ${body.documento ?? null},
        ${body.celular ?? null},
        'GOBERNACION',
        ${id},
        true,
        NOW()
      )
      RETURNING id, email, nombre, apellido, documento, celular, rol, gobernacion_id, activo, created_at
    `;

    return reply.status(201).send(nuevo);
  });
}
